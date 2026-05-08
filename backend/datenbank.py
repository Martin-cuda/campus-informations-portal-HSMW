from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# .env laden
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Engine erstellen (wichtig für Neon!)
engine = create_engine(
    DATABASE_URL,
    echo=True,           # zeigt SQL im Terminal (Debug)
    pool_pre_ping=True   # verhindert Verbindungsprobleme bei Neon
)

# Session Factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base-Klasse für Modelle
Base = declarative_base()


# Dependency für FastAPI (für später wichtig)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()