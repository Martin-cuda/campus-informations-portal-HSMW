from jose import jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

#aus env-Datei den Schlüssel 
SECRET_KEY = os.getenv("SECRET_KEY")

ALGORITHM = "HS256"

#Für Tokenprüfung
security = HTTPBearer()

def create_access_token(data: dict):
    #Userdaten
    to_encode = data.copy()
    #länge des Tokens
    expire = datetime.now(timezone.utc) + timedelta(hours=1)
    #Token schreiben
    to_encode.update({"exp": expire})
    #Token erzeugen 
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

#Prüfen ob Nutzer gültigen Token hat
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
):
    token = credentials.credentials

    try:
        #Token entschlüsseln und prüfen
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except:
        #Token ist abgelaufen oder ungültig / Bug passiert.
        # -> User ausloggen
        raise HTTPException(status_code=401, detail="Token ungültig oder abgelaufen")