# ── JEROME (ORIGINAL – als Router adaptiert) ─────────────────────────────
# Originalcode aus Jerome's login.py und main.py.
# Jerome hatte zwei getrennte FastAPI-Instanzen (login.py + main.py),
# was zu Konflikten führen würde wenn beide in dasselbe Projekt eingebunden
# werden. Deshalb wurde der Code hier in einen APIRouter umgewandelt.
#
# [MERGE: Claude] Strukturelle Änderung: `app = FastAPI()` und
# `@app.post(...)` aus Jerome's login.py und main.py wurden in einen
# `APIRouter` umgewandelt. Kein Inhalt der Logik wurde verändert.
# Importpfade wurden an die Zielstruktur angepasst (datenbank, admin_table
# und auth liegen im backend-Root, nicht in routers/).
# ─────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

# Imports aus Jerome's Hilfs-Dateien die im backend-Root liegen
from datenbank import get_db
from admin_table import Admin
from auth import create_access_token, get_current_user

router = APIRouter(tags=["Auth"])


# ── JEROME: login endpoint (aus login.py + main.py) ──────────────────────
@router.post("/login")
def login(name: str, password: str, db: Session = Depends(get_db)):
    user = db.query(Admin).filter(Admin.name == name).first()

    if not user or user.password != password:
        raise HTTPException(status_code=401, detail="Falsche Login-Daten")

    token = create_access_token({"sub": user.name})

    return {"access_token": token, "token_type": "bearer"}


# ── JEROME: geschützter Test-Endpoint (aus main.py) ───────────────────────
@router.get("/protected")
def protected(user: str = Depends(get_current_user)):
    return {"message": f"Hallo {user}"}
