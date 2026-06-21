# ── ARI: VisitLogger Middleware (Ticket 2 – Admin Dashboard) ──────────────
#
# Hängt sich vor jeden Request, misst die Bearbeitungszeit, lässt den Request
# durch und schreibt _danach_ (BackgroundTask) einen VisitLog-Eintrag in die
# Datenbank.
#
# Wichtig für Ticket 1 (Performance):
#  * Wir messen die Zeit MIT call_next aber das DB-INSERT läuft als
#    Background-Task NACH der Response. Der User wartet also nicht aufs INSERT.
#  * Wir benutzen einen Best-Effort try/except damit ein DB-Ausfall niemals
#    den Request killt. "Erst Service, dann Logging."
#  * Statische / Health-Pfade ("/", "/docs", "/openapi.json") werden NICHT
#    geloggt – sonst füllt sich die Tabelle mit Browser-/CI-Pings.
#
# Antwort-Header X-Response-Time-ms wird gesetzt damit man im Browser-DevTools
# direkt sieht ob ein Endpunkt unter 1 Sekunde liegt (Ticket 1 DoD).
# ──────────────────────────────────────────────────────────────────────────

import time
import logging
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.background import BackgroundTask

from datenbank import SessionLocal
from models.visit_log import VisitLog


log = logging.getLogger("ari.visit_logger")

# Pfade, die NICHT geloggt werden (Health-Checks, Doku, Statics).
_BLACKLIST_EXACT = {
    "/",
    "/favicon.ico",
    "/docs",
    "/redoc",
    "/openapi.json",
}
_BLACKLIST_PREFIXES = (
    "/docs/",
    "/redoc/",
    "/static/",
    # Eigene Metrics-Endpoints nicht mitloggen → sonst lädt das Dashboard sich selbst
    # endlos in den Log und verzerrt die Statistik.
    "/api/admin/metrics",
)


def _should_log(path: str) -> bool:
    """Entscheidet ob ein Pfad in den VisitLog soll. Klein gehalten -> O(1)."""
    if path in _BLACKLIST_EXACT:
        return False
    for prefix in _BLACKLIST_PREFIXES:
        if path.startswith(prefix):
            return False
    return True


# ── [FIX] Entprellung: dieselbe IP + Methode + Pfad innerhalb eines kurzen
# Fensters zählt nur EINMAL. Verhindert, dass ein einzelner Seitenaufruf
# (mehrere parallele fetches, React-StrictMode-Doppelaufrufe im Dev, schnelles
# Hin-und-Her-Navigieren) die Besuchszahl unrealistisch hochtreibt.
_DEDUP_WINDOW_S = 60.0
_recent_hits: dict = {}


def _ist_duplikat(ip: str, method: str, path: str) -> bool:
    """True, wenn dieselbe IP+Methode+Pfad-Kombi gerade erst geloggt wurde."""
    now = time.monotonic()
    key = (ip, method, path)
    last = _recent_hits.get(key)
    _recent_hits[key] = now
    # gelegentlich aufräumen, damit der Speicher nicht unbegrenzt wächst
    if len(_recent_hits) > 2000:
        grenze = now - _DEDUP_WINDOW_S
        for k, t in list(_recent_hits.items()):
            if t < grenze:
                _recent_hits.pop(k, None)
    return last is not None and (now - last) < _DEDUP_WINDOW_S


def _client_ip(request: Request) -> str:
    """
    Erste IP aus X-Forwarded-For (falls hinter Proxy), sonst direkt vom Socket.
    Wird gekürzt auf 64 Zeichen damit IPv6+Forwarded-Chains die DB-Spalte nicht sprengen.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return (request.client.host if request.client else "unknown")[:64]


def _write_visit(record: dict) -> None:
    """
    Best-Effort INSERT. Wird als BackgroundTask aufgerufen, blockiert also
    nicht die Response. Wir öffnen hier bewusst eine eigene Session weil
    die Request-Session bei BackgroundTask-Ausführung schon zu sein kann.
    """
    try:
        db = SessionLocal()
        try:
            db.add(VisitLog(**record))
            db.commit()
        finally:
            db.close()
    except Exception as e:
        # Logging darf niemals den Service stören – bei DB-Down weiter sammeln
        # wäre auch falsch (memory bloat), also droppen und Bescheid sagen.
        log.warning("VisitLog INSERT failed: %s", e)


class VisitLoggerMiddleware(BaseHTTPMiddleware):
    """
    Misst Bearbeitungszeit und loggt Request-Metadaten asynchron.
    Eingebunden in main.py mit `app.add_middleware(VisitLoggerMiddleware)`.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        method = request.method
        start = time.perf_counter()

        # ── ARI: Request durchlassen (das ist der "service first"-Teil) ───
        response: Response = await call_next(request)

        elapsed_ms = int((time.perf_counter() - start) * 1000)

        # ── ARI: Performance-Header für Browser-DevTools (Ticket 1 DoD) ───
        response.headers["X-Response-Time-ms"] = str(elapsed_ms)

        # ── ARI: Filtern was wir loggen ───────────────────────────────────
        if not _should_log(path):
            return response

        # ── [FIX] Doppelte/rapide Requests derselben IP nicht mehrfach zählen ──
        client_ip = _client_ip(request)
        if _ist_duplikat(client_ip, method, path):
            return response

        record = {
            "path": path[:255],
            "method": method[:8],
            "status_code": int(response.status_code),
            "response_time_ms": elapsed_ms,
            "client_ip": client_ip,
            "user_agent": (request.headers.get("user-agent") or "")[:200],
        }

        # ── ARI: BackgroundTask anhängen – läuft NACH dem send().
        # Falls die Response schon eine Background-Task hatte (selten), nehmen
        # wir die letzte. FastAPI ist hier kooperativ.
        previous_bg = getattr(response, "background", None)
        if previous_bg is None:
            response.background = BackgroundTask(_write_visit, record)
        else:
            # Vorhandene Tasks beibehalten und unsere danach laufen lassen.
            async def _chain():
                if hasattr(previous_bg, "__call__"):
                    try:
                        await previous_bg()
                    except Exception:
                        pass
                _write_visit(record)
            response.background = BackgroundTask(_chain)

        return response
