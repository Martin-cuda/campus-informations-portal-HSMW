# ──────────────────────────────────────────────────────────────────────────
# haeuser.py
# Router für Häuser und Räume.
# Verwaltet alle Gebäude und Räume der HSMW in der Datenbank.
# Endpoints:
#   GET  /api/haeuser          → alle Häuser mit Räumen zurückgeben
#   POST /api/haeuser          → neues Haus mit Räumen anlegen
#   POST /api/haeuser/bulk     → mehrere Häuser auf einmal anlegen
#   POST /api/haeuser/{id}/raeume → einzelnen Raum zu bestehendem Haus hinzufügen
# ──────────────────────────────────────────────────────────────────────────

from fastapi import APIRouter, Depends, HTTPException
# APIRouter für Endpunkt-Gruppierung
# Depends für Dependency Injection (Datenbankverbindung)
# HTTPException für Fehlermeldungen
from sqlalchemy.orm import Session
# Session für Datenbankzugriff
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
# Spalten-Typen für die Datenbank-Modelle
from sqlalchemy.orm import relationship
# relationship für Verknüpfung zwischen Häusern und Räumen
from pydantic import BaseModel
# BaseModel für Eingabe-Validierung
from typing import List, Optional
# List und Optional für Typen-Hints
from datenbank import Base, get_db
# Base für Datenbank-Modelle, get_db für Datenbankverbindung

router = APIRouter(prefix="/api/haeuser", tags=["Haeuser"])
# alle Endpunkte beginnen mit /api/haeuser

# ── Datenbank-Modelle ─────────────────────────────────────────────────────

class HausDB(Base):
    # Tabelle für Häuser in der Datenbank
    __tablename__ = "haeuser"
    id      = Column(String, primary_key=True, index=True)  # z.B. "haus1"
    name    = Column(String, nullable=False)                 # z.B. "Haus 1"
    raeume  = relationship("RaumDB", back_populates="haus", cascade="all, delete-orphan")
    # cascade bedeutet: wenn Haus gelöscht wird, werden auch alle Räume gelöscht

class RaumDB(Base):
    # Tabelle für Räume in der Datenbank
    __tablename__ = "raeume"
    id       = Column(String, primary_key=True, index=True)  # z.B. "1-019C"
    name     = Column(String, nullable=False)                 # z.B. "Raum 1-019C"
    etage    = Column(String, nullable=False)                 # z.B. "EG"
    haus_id  = Column(String, ForeignKey("haeuser.id"), nullable=False)
    # haus_id verknüpft den Raum mit einem Haus
    haus     = relationship("HausDB", back_populates="raeume")

# ── Pydantic Modelle (Eingabe/Ausgabe Validierung) ────────────────────────

class RaumSchema(BaseModel):
    # Schema für einen Raum (Eingabe und Ausgabe)
    id: str
    name: str
    etage: str

    class Config:
        from_attributes = True

class HausSchema(BaseModel):
    # Schema für ein Haus mit Räumen (Eingabe)
    id: str
    name: str
    raeume: List[RaumSchema] = []

    class Config:
        from_attributes = True

# ── Endpunkte ─────────────────────────────────────────────────────────────

@router.get("/")
def alle_haeuser(db: Session = Depends(get_db)):
    """
    GET /api/haeuser
    Gibt alle Häuser mit ihren Räumen zurück.
    """
    haeuser = db.query(HausDB).all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "raeume": [
                { "id": r.id, "name": r.name, "etage": r.etage, "belegt": False, "professor": "", "modul": "", "bis": "" }
                for r in h.raeume
            ]
        }
        for h in haeuser
    ]

@router.get("/leicht")
def alle_haeuser_leicht(db: Session = Depends(get_db)):
    """
    GET /api/haeuser/leicht
    Gibt alle Häuser NUR mit id und name zurück, ohne Räume.
    Schnell, da keine großen verschachtelten Daten geladen werden.
    Wird für die Haus-Auswahl-Buttons im Raumfinder genutzt.
    """
    haeuser = db.query(HausDB).all()
    return [{"id": h.id, "name": h.name} for h in haeuser]

@router.get("/{haus_id}/raeume")
def raeume_eines_hauses(haus_id: str, db: Session = Depends(get_db)):
    """
    GET /api/haeuser/{haus_id}/raeume
    Gibt nur die Räume EINES Hauses zurück (Lazy Loading).
    Wird aufgerufen, wenn der Nutzer im Raumfinder ein Haus anklickt.
    """
    haus = db.query(HausDB).filter(HausDB.id == haus_id).first()
    if not haus:
        raise HTTPException(status_code=404, detail="Haus nicht gefunden")
    return {
        "id": haus.id,
        "name": haus.name,
        "raeume": [
            { "id": r.id, "name": r.name, "etage": r.etage, "belegt": False, "professor": "", "modul": "", "bis": "" }
            for r in haus.raeume
        ]
    }

@router.post("/")
def haus_anlegen(haus: HausSchema, db: Session = Depends(get_db)):
    """
    POST /api/haeuser
    Legt ein neues Haus mit Räumen an.
    """
    # Prüfen ob Haus bereits existiert
    if db.query(HausDB).filter(HausDB.id == haus.id).first():
        raise HTTPException(status_code=400, detail=f"Haus {haus.id} existiert bereits")

    # Haus anlegen
    neues_haus = HausDB(id=haus.id, name=haus.name)
    db.add(neues_haus)

    # Räume anlegen
    for raum in haus.raeume:
        neuer_raum = RaumDB(id=raum.id, name=raum.name, etage=raum.etage, haus_id=haus.id)
        db.add(neuer_raum)

    db.commit()
    return {"message": f"Haus {haus.name} erfolgreich angelegt", "raeume": len(haus.raeume)}

@router.post("/bulk")
def haeuser_bulk_anlegen(haeuser: List[HausSchema], db: Session = Depends(get_db)):
    """
    POST /api/haeuser/bulk
    Legt mehrere Häuser auf einmal an.
    Nützlich um alle HSMW-Gebäude auf einmal einzupflegen.
    """
    ergebnis = []
    for haus in haeuser:
        # Bereits existierende Häuser überspringen
        if db.query(HausDB).filter(HausDB.id == haus.id).first():
            ergebnis.append({"id": haus.id, "status": "übersprungen (existiert bereits)"})
            continue

        neues_haus = HausDB(id=haus.id, name=haus.name)
        db.add(neues_haus)

        for raum in haus.raeume:
            neuer_raum = RaumDB(id=raum.id, name=raum.name, etage=raum.etage, haus_id=haus.id)
            db.add(neuer_raum)

        ergebnis.append({"id": haus.id, "status": "angelegt", "raeume": len(haus.raeume)})

    db.commit()
    return {"ergebnis": ergebnis}

@router.post("/{haus_id}/raeume")
def raum_hinzufuegen(haus_id: str, raum: RaumSchema, db: Session = Depends(get_db)):
    """
    POST /api/haeuser/{haus_id}/raeume
    Fügt einen einzelnen Raum zu einem bestehenden Haus hinzu.
    """
    haus = db.query(HausDB).filter(HausDB.id == haus_id).first()
    if not haus:
        raise HTTPException(status_code=404, detail="Haus nicht gefunden")
    if db.query(RaumDB).filter(RaumDB.id == raum.id).first():
        raise HTTPException(status_code=400, detail=f"Raum {raum.id} existiert bereits")
    neuer_raum = RaumDB(id=raum.id, name=raum.name, etage=raum.etage, haus_id=haus_id)
    db.add(neuer_raum)
    db.commit()
    return {"message": f"Raum {raum.name} erfolgreich hinzugefügt"}