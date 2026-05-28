from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError
import os

from auth import create_access_token
from datenbank import get_db
from admin_table import Admin
from passlib.context import CryptContext
from pydantic import BaseModel

class ForgotPasswordRequest(BaseModel):
    username: str

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_MINUTES = 15

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────────
# RESET TOKEN ERSTELLEN
# ─────────────────────────────────────────────
def create_reset_token(username: str):
    return create_access_token(
        data={
            "sub": username,
            "purpose": "password_reset"
        },
        expires_delta=timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    )


# ─────────────────────────────────────────────
# TOKEN PRÜFEN
# ─────────────────────────────────────────────
def verify_reset_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("purpose") != "password_reset":
            return None

        return payload.get("sub")

    except JWTError:
        return None


# ─────────────────────────────────────────────
# 1. FORGOT PASSWORD
# ─────────────────────────────────────────────
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    username = data.username
    user = db.query(Admin).filter(Admin.name == username).first()

    # wichtig: keine User-Enumeration
    if not user:
        return {"message": "Wenn der Account existiert, wurde eine E-Mail gesendet."}

    token = create_reset_token(username)

    # TODO: echte Mail senden
    # send_email(user.mail, token)

    return {
        "message": "Wenn der Account existiert, wurde eine E-Mail gesendet.",
        "debug_token": token  # nur für Entwicklung!
    }


# ─────────────────────────────────────────────
# 2. RESET PASSWORD
# ─────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):

    username = verify_reset_token(token)

    if not username:
        raise HTTPException(status_code=400, detail="Ungültiger oder abgelaufener Token")

    user = db.query(Admin).filter(Admin.name == username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User nicht gefunden")

    # Passwort hashen
    hashed_password = pwd_context.hash(new_password)

    # DB UPDATE
    user.password = hashed_password
    db.commit()

    return {"message": "Passwort erfolgreich geändert"}
