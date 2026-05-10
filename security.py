#Programm um Passwörter zu verschlüsseln
from passlib.context import CryptContext

#bcrypt
pwd_context = CryptContext(
    schemes = ["bcrypt"],
    deprecated = "auto"
)

#hashen der Passwörter
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

#Passwort prüfen
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)