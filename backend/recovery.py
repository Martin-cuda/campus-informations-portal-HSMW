from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

load_dotenv()

from auth import create_access_token
from datenbank import get_db
from admin_table import Admin
from pydantic import BaseModel
from mail_service import send_reset_email
from passlib.context import CryptContext

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_MINUTES = 15

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ForgotPasswordRequest(BaseModel):
    username: str


def create_reset_token(username: str):
    """Erstellt einen JWT Reset-Token"""
    return create_access_token(
        data={
            "sub": username,
            "purpose": "password_reset"
        },
        expires_delta=timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    )


def verify_reset_token(token: str):
    """Prüft einen Reset-Token und gibt den Username zurück"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload.get("sub")
    except JWTError as e:
        print("JWT ERROR:", e)
        return None


@router.post("/forgot-password")
async def forgot_password(
    
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    user = db.query(Admin).filter(Admin.name == data.username).first()
    print("Gefundener User:", user)

    if not user:
        print("User nicht gefunden – keine Mail gesendet")
        return {"message": "Wenn der Account existiert, wurde eine E-Mail gesendet."}

    token = create_reset_token(user.name)
    print("🔑 Reset-Token erstellt:", token)

    try:
        background_tasks.add_task(send_reset_email, user.mail, token)
        print("Mail Task hinzugefügt für:", user.mail)
    except Exception as e:
        print("Fehler beim Hinzufügen des Mail Tasks:", e)

    return {"message": "Wenn der Account existiert, wurde eine E-Mail gesendet."}


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    username = verify_reset_token(token)

    if not username:
        return {"error": "Token ungültig oder abgelaufen"}

    user = db.query(Admin).filter(Admin.name == username).first()
    print("Gefundener User für Passwort-Reset:", user)

    if not user:
        return {"error": "User nicht gefunden"}

    hashed_password = pwd_context.hash(new_password)
    user.password = hashed_password
    db.commit()
    print("Passwort erfolgreich geändert für:", username)

    return {"message": "Passwort erfolgreich geändert"}
