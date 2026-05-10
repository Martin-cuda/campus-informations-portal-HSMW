from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from datenbank import get_db
from fastapi import FastAPI
from admin_table import Admin
from auth import create_access_token
from security import verify_password

def login(name: str, password: str, db: Session = Depends(get_db)):
    #user als Variable aus Datenbank entnehmen
    user = db.query(Admin).filter(Admin.name == name).first()

    #Schauen ob user existiert und Passwort prüfen
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Falsche Login-Daten")

    token = create_access_token({"sub": user.name})

    return {
        "access_token": token,
        "token_type": "bearer"
    }