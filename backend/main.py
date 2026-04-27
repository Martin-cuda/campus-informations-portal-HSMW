"""
Campus-Informationsportal – HS Mittweida
Backend: FastAPI
Team: Martin Weber, Jerome, Ari, Fabian
Modul: Informatik II
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Campus-Informationsportal API",
    description="REST-API für das modulare Campus-Portal der HS Mittweida.",
    version="0.1.0",
)

# CORS erlauben (React-Dev-Server läuft auf anderem Port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Status"])
def root():
    """Health-Check Endpoint – bestätigt, dass die API läuft."""
    return {
        "status": "ok",
        "message": "Campus-Informationsportal API läuft.",
        "version": "0.1.0",
    }


@app.get("/api/hello", tags=["Demo"])
def hello_world():
    """Hello-World-Endpoint für den Initial Commit."""
    return {"message": "Hello World vom Campus-Portal Backend!"}


# Mensa-Endpoints folgen in mensa_router.py (Sprint 2)
# @app.include_router(mensa_router, prefix="/api/mensa")
