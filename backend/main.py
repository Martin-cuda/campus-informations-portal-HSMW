"""
Campus-Informationsportal – HS Mittweida
Backend: FastAPI
Team: Martin Weber, Jerome Martin, Ari Richter, Fabian Busse
Modul: Informatik II

[MERGE: Claude] Zusammenfuehrung von git-Stand (Jerome + Fabian) und Aris Features.
  Beibehalten (unveraendert) aus git-Stand:
    - Jerome's Auth-Router (routers/login_router.py) + Recovery-Router.
    - Jerome's DB-Startup (Base.metadata.create_all).
    - Fabian's Raeume- und Haeuser-Router.
    - CORS-Konfiguration inkl. :5174-Fallback.
  Additiv ergaenzt (Ari, Tickets 1/2/3) – ohne bestehendes Verhalten zu aendern:
    1. GZipMiddleware – komprimiert Antworten > 500 Bytes (Ticket 1).
    2. VisitLoggerMiddleware – loggt jeden API-Request fuers Dashboard (Ticket 2).
    3. Admin-Metrics-Router + Mensa-Notify-Router (Ticket 2 + 3).
    4. Mensa-Scheduler startet beim Startup, stoppt beim Shutdown (Ticket 3).
    5. Modelle (VisitLog, MensaSubscription) importiert, damit create_all sie anlegt.
    6. CORS expose_headers=["X-Response-Time-ms"] fuer den Performance-Header.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# ── ARI: Ticket 1 – GZip-Komprimierung ────────────────────────────────────
from fastapi.middleware.gzip import GZipMiddleware

# ── ARI: Mensa, Module, Kontakte Router ─────────────────────────────────
from routers.mensa import router as mensa_router
from routers.modules import router as modules_router
from routers.kontakte import router as kontakte_router

# ── FABIAN: Raeume-Router ─────────────────────────────────
from routers.raeume import router as raeume_router  
from routers.haeuser import router as haeuser_router   

# ── JEROME: Auth / Login Router ──────────────────────────────────────────
# [MERGE: Claude] Hinzugefügt. Jerome's Login-Endpunkte als Router eingebunden.
from routers.login_router import router as login_router
from recovery import router as recovery_router   

# ── ARI: Ticket 2 + 3 – neue Router ──────────────────────────────────────
from routers.admin_metrics import router as admin_metrics_router
from routers.mensa_notify  import router as mensa_notify_router

# ── ARI: Ticket 2 – VisitLogger-Middleware + Modelle einbinden ────────────
# Wichtig: Modelle hier importieren damit Base.metadata.create_all() sie kennt.
from middleware.visit_logger import VisitLoggerMiddleware
from models import VisitLog, MensaSubscription  # noqa: F401

# ── ARI: Ticket 3 – Mensa-Scheduler (APScheduler) ─────────────────────────
from services import mensa_scheduler

# ── JEROME: DB-Startup (aus Jerome's main.py) ────────────────────────────
# [MERGE: Claude] Hinzugefügt. Erstellt die Tabellen beim Start falls
# sie noch nicht vorhanden sind. Kommt 1:1 aus Jerome's main.py.
from datenbank import engine, Base

app = FastAPI(
    title="Campus-Informationsportal API",
    description="REST-API für das modulare Campus-Portal der HS Mittweida.",
    version="0.3.0",  # [MERGE: Claude] auf 0.3.0 erhoeht (Jerome + Fabian + Ari-Features)
)


# ── JEROME: DB-Tabellen + ARI: Scheduler beim Start ──────────────────────
# [MERGE: Claude] Jerome's create_all unveraendert, Aris Scheduler-Start ergaenzt.
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    mensa_scheduler.start()


# ── ARI: Ticket 3 – Scheduler beim Shutdown sauber beenden ───────────────
@app.on_event("shutdown")
def shutdown():
    mensa_scheduler.stop()


# ── ARI: Ticket 1 – GZip-Komprimierung ───────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)

# ── ARI: Ticket 2 – Visit-Logger einhaengen ──────────────────────────────
app.add_middleware(VisitLoggerMiddleware)

# ── ARI: CORS-Middleware ──────────────────────────────────────────────────
# [MERGE: Claude] zuletzt hinzugefuegt = aeusserste Middleware (umschliesst GZip/VisitLogger).
app.add_middleware(
    CORSMiddleware,
    # [MERGE: Claude] :5174 als Fallback ergänzt (Vite wählt manchmal Alternativ-Port)
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # ── ARI: Ticket 1 – Performance-Header fuers Frontend lesbar machen.
    expose_headers=["X-Response-Time-ms"],
)

# ── ARI: Router einbinden ─────────────────────────────────────────────────
app.include_router(mensa_router)    # MENSA ROUTER – Ari
app.include_router(modules_router)  # MODULE ROUTER – Ari
app.include_router(kontakte_router) # KONTAKTE ROUTER – Ari

# ── FABIAN: Router einbinden ─────────────────────────────────────────────────
app.include_router(raeume_router)   # RAEUME ROUTER – Fabian
app.include_router(haeuser_router)  # HAEUSER ROUTER – Fabian

# ── JEROME: Auth-Router einbinden ─────────────────────────────────────────
# [MERGE: Claude] Hinzugefügt.
app.include_router(login_router)    # LOGIN/AUTH ROUTER – Jerome
app.include_router(recovery_router, prefix="/auth")

# ── ARI: Ticket 2 + 3 – neue Router einbinden ─────────────────────────────
app.include_router(admin_metrics_router)  # ADMIN METRICS ROUTER – Ari
app.include_router(mensa_notify_router)   # MENSA NOTIFY ROUTER – Ari


# ── ARI: Health-Check Endpoints ───────────────────────────────────────────
@app.get("/", tags=["Status"])
def root():
    """Health-Check Endpoint – bestätigt, dass die API läuft."""
    return {
        "status": "ok",
        "message": "Campus-Informationsportal API läuft.",
        "version": "0.3.0",
    }


@app.get("/api/hello", tags=["Demo"])
def hello_world():
    """Hello-World-Endpoint für den Initial Commit."""
    return {"message": "Hello World vom Campus-Portal Backend!"}
