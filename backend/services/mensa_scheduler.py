# ── ARI: Mensa-Scheduler (Ticket 3 – täglicher Cronjob) ──────────────────
#
# Läuft im selben Prozess wie FastAPI über APScheduler. Wird in main.py
# beim Startup gestartet und beim Shutdown sauber heruntergefahren.
#
# Was er macht:
#   1. Jeden Tag um 08:00 Europe/Berlin lokal:
#      - holt den Speiseplan (HSMW-API)
#      - sucht den heutigen Tag heraus
#      - durchläuft alle aktiven, bestätigten Abos
#      - falls Keyword (case-insensitive) im Namen/Beschreibung eines Gerichts
#        gefunden wird → Mail über services/mailer.send_mail
#   2. Setzt last_sent_date so dass am gleichen Tag kein zweiter Versand
#      passiert (z.B. bei manuellem Re-Run).
#
# Zusätzlich gibt es check_now(force=True) → kann von einem Admin-Endpoint
# oder manuell vom Terminal aufgerufen werden, um Tests zu beschleunigen.
# ──────────────────────────────────────────────────────────────────────────

import logging
import asyncio
import httpx
from datetime import datetime, date
from typing import List, Dict

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from datenbank import SessionLocal
from models.mensa_subscription import MensaSubscription
# [Mensa-Mails laufen über Gmail-SMTP → services/mailer.py] 
from services.mailer import send_mail, render_match_mail


log = logging.getLogger("ari.mensa_scheduler")

# Quelle: gleicher Endpunkt den auch routers/mensa.py nutzt.
HSMW_MENSA_URL = "https://app.hs-mittweida.de/v2/speiseplan"


# Singleton-Scheduler. Wird in start() initialisiert.
_scheduler: BackgroundScheduler | None = None


# ── Helfer: Speiseplan ziehen und heutigen Tag extrahieren ───────────────

def _fetch_today_dishes() -> tuple[List[Dict], str]:
    """
    Holt den Speiseplan und gibt eine flache Liste aller heutigen Gerichte
    inkl. Datum-Label zurück.
    Format: [{ "name": str, "beschreibung": str, "kategorie": str }, ...]
    """
    try:
        # ── ARI: httpx sync-Client ist hier ok – wir laufen im Background-Thread
        # vom Scheduler, also kein Event-Loop-Block.
        with httpx.Client(timeout=15.0) as client:
            r = client.get(HSMW_MENSA_URL)
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        log.warning("Speiseplan konnte nicht geladen werden: %s", e)
        return [], ""

    heute = date.today()
    for tag in data.get("day", []):
        try:
            tag_date = datetime.fromtimestamp(tag.get("date", 0)).date()
        except Exception:
            continue
        if tag_date == heute:
            dishes: List[Dict] = []
            for kat in tag.get("categories", []):
                for m in kat.get("menus", []):
                    if m.get("dummy"):
                        continue
                    dishes.append({
                        "name":         m.get("title_de", "") or "",
                        "beschreibung": m.get("description_de", "") or "",
                        "kategorie":    kat.get("title", "") or "",
                    })
            label = heute.strftime("%d.%m.%Y")
            return dishes, label

    log.info("Kein Speiseplan-Tag für heute (%s) gefunden", heute)
    return [], ""


def _matches(keyword: str, dish: Dict) -> bool:
    """
    Case-insensitive Match auf Name + Beschreibung.

    -- ARI: Mehrere Tokens im Keyword werden mit AND verknuepft -- jedes
    Token muss als Substring im Haystack vorkommen, Reihenfolge egal.
    Damit triggert "Curry Wurst" sowohl bei "Currywurst" (eines der beiden
    Tokens ist Substring von "currywurst") als auch bei "Wurst mit Curry-
    Soße" (beide Tokens kommen vor). Einzelne Tokens verhalten sich wie
    vorher (reiner Substring-Match).
    """
    k = (keyword or "").strip().lower()
    if not k:
        return False
    haystack = f"{dish.get('name','')} {dish.get('beschreibung','')}".lower()
    # Whitespace-getrennte Tokens; leere rausfiltern.
    tokens = [t for t in k.split() if t]
    if not tokens:
        return False
    return all(t in haystack for t in tokens)


# ── Hauptlogik: Scan + Versand ───────────────────────────────────────────

def check_now(force: bool = False) -> Dict:
    """
    Scant den heutigen Speiseplan und versendet Mails für alle Matches.
    Gibt eine kleine Statistik zurück (für manuelle Aufrufe / Tests).

    force=True  → ignoriert last_sent_date (für Test-Endpoint).
    """
    dishes, date_label = _fetch_today_dishes()
    if not dishes:
        return {"checked": 0, "sent": 0, "skipped": 0, "reason": "no_plan_today"}

    today_str = date.today().isoformat()
    db: Session = SessionLocal()
    sent = 0
    skipped = 0
    checked = 0

    try:
        subs = (
            db.query(MensaSubscription)
              .filter(MensaSubscription.active.is_(True))
              .filter(MensaSubscription.confirmed.is_(True))
              .all()
        )
        for sub in subs:
            checked += 1

            # ── ARI: doppelten Versand am gleichen Tag verhindern ────────
            if not force and sub.last_sent_date == today_str:
                skipped += 1
                continue

            matching = [d for d in dishes if _matches(sub.keyword, d)]
            if not matching:
                continue

            # Schöne Anzeige: "Name (Kategorie)" mit kurzer Beschreibung.
            bullet_lines = []
            for d in matching:
                line = d["name"]
                if d["beschreibung"]:
                    line += f" — {d['beschreibung']}"
                if d["kategorie"]:
                    line += f"  ({d['kategorie']})"
                bullet_lines.append(line)

            subject, text, html = render_match_mail(
                email=sub.email,
                keyword=sub.keyword,
                dishes=bullet_lines,
                token=sub.token,
                date_label=date_label,
            )
            ok = send_mail(sub.email, subject, text, html)
            if ok:
                sent += 1
                sub.last_sent_date = today_str
                db.add(sub)

        db.commit()
    except Exception as e:
        log.exception("Mensa-Scheduler-Lauf fehlgeschlagen: %s", e)
        db.rollback()
    finally:
        db.close()

    return {"checked": checked, "sent": sent, "skipped": skipped, "reason": "ok"}


# ── Lifecycle ────────────────────────────────────────────────────────────

def start(timezone: str = "Europe/Berlin") -> None:
    """
    Startet den BackgroundScheduler. Wird in main.py @app.on_event("startup")
    aufgerufen. Idempotent – mehrmaliges start() ist harmlos.
    """
    global _scheduler
    if _scheduler is not None:
        return

    try:
        sched = BackgroundScheduler(timezone=timezone)
        # Jeden Tag um 08:00 lokal.
        sched.add_job(
            check_now,
            CronTrigger(hour=8, minute=0, timezone=timezone),
            id="mensa_daily_scan",
            replace_existing=True,
            misfire_grace_time=60 * 30,   # 30min Toleranz nach Aufwachen
        )
        sched.start()
        _scheduler = sched
        log.info("Mensa-Scheduler gestartet (cron 08:00 %s).", timezone)
    except Exception as e:
        # APScheduler nicht installiert / Fehler -> wir lassen die App trotzdem
        # starten. Ohne Scheduler funktioniert nur der manuelle Trigger nicht.
        log.warning("Mensa-Scheduler konnte nicht gestartet werden: %s", e)


def stop() -> None:
    """Sauberes Beenden fuer @app.on_event('shutdown')."""
    global _scheduler
    if _scheduler is None:
        return
    try:
        _scheduler.shutdown(wait=False)
    except Exception:
        pass
    _scheduler = None
    log.info("Mensa-Scheduler gestoppt.")
