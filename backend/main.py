"""
Campus-Informationsportal – HS Mittweida
Backend: FastAPI
Team: Martin Weber, Jerome Martin, Ari Richter, Fabian Busse
Modul: Informatik II

[MERGE: Claude] Gegenüber Ari's original main.py wurden folgende Änderungen vorgenommen:
  1. Jerome's Auth-Router (routers/login_router.py) importiert und eingebunden.
  2. Startup-Event hinzugefügt (aus Jerome's main.py) der die Admin-Tabelle
     in der Datenbank anlegt falls sie noch nicht existiert.
  3. Import von datenbank.engine + admin_table.Base für den Startup-Event.
  4. CORS-Origins um localhost:5174 ergänzt (Fallback falls Vite anderen Port nimmt).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── ARI: Mensa, Module, Kontakte Router ─────────────────────────────────
from routers.mensa import router as mensa_router
from routers.modules import router as modules_router
from routers.kontakte import router as kontakte_router
from routers.news import router as news_router

# ── FABIAN: Raeume-Router ─────────────────────────────────
from routers.raeume import router as raeume_router  
from routers.haeuser import router as haeuser_router   

# ── JEROME: Auth / Login Router ──────────────────────────────────────────
# [MERGE: Claude] Hinzugefügt. Jerome's Login-Endpunkte als Router eingebunden.
from routers.login_router import router as login_router
from recovery import router as recovery_router   

# ── ARI: zusätzliche Features (additiv, ändert Fabians Setup nicht) ──────
from fastapi.middleware.gzip import GZipMiddleware
from routers.admin_metrics import router as admin_metrics_router
from routers.mensa_notify import router as mensa_notify_router
from middleware.visit_logger import VisitLoggerMiddleware
from models import VisitLog, MensaSubscription  # noqa: F401  (für create_all)
from services import mensa_scheduler

# ── JEROME: DB-Startup (aus Jerome's main.py) ────────────────────────────
# [MERGE: Claude] Hinzugefügt. Erstellt die Admin-Tabelle beim Start falls
# sie noch nicht vorhanden ist. Kommt 1:1 aus Jerome's main.py.
from datenbank import engine, Base

app = FastAPI(
    title="Campus-Informationsportal API",
    description="REST-API für das modulare Campus-Portal der HS Mittweida.",
    version="0.2.0",  # [MERGE: Claude] Version auf 0.2.0 erhöht (Jerome-Features)
)


# ── JEROME: DB-Tabellen beim Start erstellen ─────────────────────────────
# [MERGE: Claude] Aus Jerome's main.py übernommen, unverändert.
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    # ── ARI: Mensa-Scheduler starten
    mensa_scheduler.start()


@app.on_event("shutdown")
def shutdown():
    # ── ARI: Scheduler sauber beenden
    mensa_scheduler.stop()


# ── ARI: CORS-Middleware ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    # [MERGE: Claude] :5174 als Fallback ergänzt (Vite wählt manchmal Alternativ-Port)
    allow_origins=["http://localhost:5173", "http://localhost:5174", "https://bttrhsmw-b3b60.web.app", "https://bttrhsmw-b3b60.firebaseapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ARI: Performance + Visit-Logging (additiv) ───────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(VisitLoggerMiddleware)

# ── ARI: Router einbinden ─────────────────────────────────────────────────
app.include_router(mensa_router)    # MENSA ROUTER – Ari
app.include_router(modules_router)  # MODULE ROUTER – Ari
app.include_router(kontakte_router) # KONTAKTE ROUTER – Ari
app.include_router(news_router)     # NEWS ROUTER

# ── FABIAN: Router einbinden ─────────────────────────────────────────────────
app.include_router(raeume_router)   # RAEUME ROUTER – Fabian
app.include_router(haeuser_router)  # HAEUSER ROUTER – Fabian

# ── JEROME: Auth-Router einbinden ─────────────────────────────────────────
# [MERGE: Claude] Hinzugefügt.
app.include_router(login_router)    # LOGIN/AUTH ROUTER – Jerome
app.include_router(recovery_router, prefix="/auth")

# ── ARI: Admin-Metrics + Mensa-Benachrichtigung ─────────────────────────
app.include_router(admin_metrics_router)  # ADMIN METRICS – Ari
app.include_router(mensa_notify_router)    # MENSA NOTIFY – Ari


# ── ARI: Health-Check Endpoints ───────────────────────────────────────────
@app.get("/", tags=["Status"])
def root():
    """Health-Check Endpoint – bestätigt, dass die API läuft."""
    return {
        "status": "ok",
        "message": "Campus-Informationsportal API läuft.",
        "version": "0.2.0",
    }


@app.get("/api/hello", tags=["Demo"])
def hello_world():
    """Hello-World-Endpoint für den Initial Commit."""
    return {"message": "Hello World vom Campus-Portal Backend!"}
