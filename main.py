from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from datenbank import engine, Base, get_db


app = FastAPI()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "API läuft"}