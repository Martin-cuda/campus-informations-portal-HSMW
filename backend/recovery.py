from fastapi import APIRouter, Depends, BackgroundTasks, Request, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt, JWTError
import os
from dotenv import load_dotenv

from auth import create_access_token
from datenbank import get_db
from admin_table import Admin
from reset_attempts_table import PasswordResetAttempt
from pydantic import BaseModel
from mail_service import send_reset_email


load_dotenv()


router = APIRouter(tags=["Password Recovery"])


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"


RESET_TOKEN_EXPIRE_MINUTES = 15
RESET_COOLDOWN_MINUTES = 30


# =========================================================
# SECURITY LIMITS
# =========================================================

MAX_ATTEMPTS = 5
ATTEMPT_WINDOW_MINUTES = 30



# =========================================================
# REQUEST MODEL
# =========================================================

class ForgotPasswordRequest(BaseModel):
    username: str



# =========================================================
# TOKEN FUNCTIONS
# =========================================================

def create_reset_token(username: str):

    return create_access_token(
        data={
            "sub": username,
            "purpose": "password_reset"
        },
        expires_delta=timedelta(
            minutes=RESET_TOKEN_EXPIRE_MINUTES
        )
    )



def verify_reset_token(token: str):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )


        if payload.get("purpose") != "password_reset":
            return None


        return payload.get("sub")


    except JWTError:

        return None




# =========================================================
# IP RATE LIMIT
# =========================================================

def is_rate_limited(
    ip: str,
    db: Session
):

    window_start = (
        datetime.utcnow()
        -
        timedelta(minutes=ATTEMPT_WINDOW_MINUTES)
    )


    count = (
        db.query(PasswordResetAttempt)
        .filter(
            PasswordResetAttempt.ip == ip,
            PasswordResetAttempt.created_at >= window_start
        )
        .count()
    )


    return count >= MAX_ATTEMPTS





def log_attempt(
    username: str,
    ip: str,
    db: Session
):

    attempt = PasswordResetAttempt(
        username=username,
        ip=ip,
        created_at=datetime.utcnow()
    )


    db.add(attempt)
    db.commit()





def retry_after_seconds(
    ip: str,
    db: Session
):

    window_start = (
        datetime.utcnow()
        -
        timedelta(minutes=ATTEMPT_WINDOW_MINUTES)
    )


    oldest_attempt = (
        db.query(PasswordResetAttempt)
        .filter(
            PasswordResetAttempt.ip == ip,
            PasswordResetAttempt.created_at >= window_start
        )
        .order_by(
            PasswordResetAttempt.created_at.asc()
        )
        .first()
    )


    if not oldest_attempt:
        return 0


    unlock_time = (
        oldest_attempt.created_at
        +
        timedelta(minutes=ATTEMPT_WINDOW_MINUTES)
    )


    remaining = (
        unlock_time - datetime.utcnow()
    ).total_seconds()


    return max(
        0,
        int(remaining)
    )





# =========================================================
# ADMIN MAIL COOLDOWN
# =========================================================

def is_cooldown_active(
    user: Admin
):

    if not user.last_password_reset_request:
        return False


    difference = (
        datetime.utcnow()
        -
        user.last_password_reset_request
    )


    return difference < timedelta(
        minutes=RESET_COOLDOWN_MINUTES
    )





# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    request: Request = None
):

    ip = request.client.host



    # -----------------------------
    # IP RATE LIMIT
    # -----------------------------

    if is_rate_limited(
        ip,
        db
    ):

        retry = retry_after_seconds(
            ip,
            db
        )


        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={
                "Retry-After": str(retry)
            }
        )



    # Versuch speichern
    log_attempt(
        data.username,
        ip,
        db
    )



    user = (
        db.query(Admin)
        .filter(
            Admin.name == data.username
        )
        .first()
    )



    # -----------------------------
    # Gleiche Antwort für Sicherheit
    # -----------------------------

    if not user:

        return {
            "message":
            "Wenn der Account existiert, wurde eine E-Mail gesendet."
        }





    # -----------------------------
    # Admin Mail Cooldown
    # -----------------------------

    if is_cooldown_active(user):

        return {
            "message":
            "Wenn der Account existiert, wurde eine E-Mail gesendet."
        }





    # -----------------------------
    # Token + Mail
    # -----------------------------

    token = create_reset_token(
        user.name
    )


    background_tasks.add_task(
        send_reset_email,
        user.mail,
        token
    )



    user.last_password_reset_request = (
        datetime.utcnow()
    )


    db.commit()



    return {
        "message":
        "Wenn der Account existiert, wurde eine E-Mail gesendet."
    }





# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    token: str,
    new_password: str,
    db: Session = Depends(get_db)
):

    username = verify_reset_token(token)


    if not username:

        raise HTTPException(
            status_code=400,
            detail="Token ungültig oder abgelaufen"
        )



    user = (
        db.query(Admin)
        .filter(
            Admin.name == username
        )
        .first()
    )



    if not user:

        raise HTTPException(
            status_code=404,
            detail="User nicht gefunden"
        )



    from passlib.context import CryptContext


    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto"
    )



    user.password = pwd_context.hash(
        new_password
    )


    db.commit()



    return {
        "message":
        "Passwort erfolgreich geändert"
    }
