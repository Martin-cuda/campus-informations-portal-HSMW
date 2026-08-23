from fastapi import APIRouter, Depends, HTTPException
# APIRouter für die Gruppierung der Endpunkte
# Depends für die Datenbankverbindung und Login-Prüfung
# HTTPException für Fehlermeldungen
from sqlalchemy.orm import Session
# Session für den Datenbankzugriff
from sqlalchemy import Column, String, ForeignKey, Integer
# Spalten-Typen für das Datenbankmodell
from pydantic import BaseModel
# BaseModel für die Eingabe-Validierung
from datenbank import Base, get_db
# Base für das Datenbankmodell, get_db für die Verbindung
from auth import get_current_user
# get_current_user prüft ob der Nutzer eingeloggt ist

router = APIRouter(prefix="/api/raeume", tags=["Raeume"])
# alle Endpunkte in dieser Datei beginnen mit /api/raeume

# ── Datenbankmodell für Belegungen ────────────────────────────────────────
class BelegungDB(Base):
    __tablename__ = "belegungen"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    # id = eindeutiger Schlüssel, automatisch hochgezählt
    raum_id   = Column(String, ForeignKey("raeume.id"), nullable=False)
    # raum_id = Verweis auf den Raum (jetzt kein Primärschlüssel mehr)
    haus_id   = Column(String, ForeignKey("haeuser.id"), nullable=False)
    professor = Column(String, nullable=False)
    modul     = Column(String, nullable=False)
    von       = Column(String, nullable=False)
    bis       = Column(String, nullable=False)

# ── Pydantic Modell für die Eingabe-Validierung ───────────────────────────
class Belegung(BaseModel):
    haus_id:   str  # z.B. "haus1"
    raum_id:   str  # z.B. "1-019C"
    professor: str  # z.B. "Prof. Dr. Roschke"
    modul:     str  # z.B. "Informatik II"
    von:       str  # z.B. "13:00"
    bis:       str  # z.B. "14:30"

# ── Endpunkte ─────────────────────────────────────────────────────────────

@router.get("/")
def alle_belegungen(db: Session = Depends(get_db)):
    """
    GET /api/raeume
    Gibt alle aktuellen Raumbelegungen aus der Datenbank zurück.
    """
    belegungen = db.query(BelegungDB).all()
    return {
        "belegungen": [
            {
                "id":        b.id,
                # id der Belegung, wird zum Löschen gebraucht
                "haus_id":   b.haus_id,
                "raum_id":   b.raum_id,
                "professor": b.professor,
                "modul":     b.modul,
                "von":       b.von,
                "bis":       b.bis,
            }
            for b in belegungen
        ]
    }

@router.post("/belegen")
def raum_belegen(
    belegung: Belegung,
    db: Session = Depends(get_db),
    nutzer: str = Depends(get_current_user)  # Login-Schutz
):
    # Prüfen ob sich der neue Zeitslot mit einer bestehenden Belegung überschneidet
    # Überschneidung liegt vor wenn: neue_von < bestehende_bis UND neue_bis > bestehende_von
    ueberschneidung = db.query(BelegungDB).filter(
        BelegungDB.raum_id == belegung.raum_id,
        BelegungDB.von < belegung.bis,
        BelegungDB.bis > belegung.von,
    ).first()
    if ueberschneidung:
        raise HTTPException(
            status_code=400,
            detail=f"Dieser Zeitraum überschneidet sich mit einer bestehenden Belegung ({ueberschneidung.von}–{ueberschneidung.bis} Uhr)"
        )

    # Neue Belegung in der Datenbank speichern
    neue_belegung = BelegungDB(
        raum_id=belegung.raum_id,
        haus_id=belegung.haus_id,
        professor=belegung.professor,
        modul=belegung.modul,
        von=belegung.von,
        bis=belegung.bis,
    )
    db.add(neue_belegung)
    db.commit()
    return {"message": "Raum erfolgreich belegt"}

@router.delete("/belegen/{belegung_id}")
def raum_freigeben(
    belegung_id: int,
    db: Session = Depends(get_db),
    nutzer: str = Depends(get_current_user)  # Login-Schutz
):
    """
    DELETE /api/raeume/belegen/{belegung_id}
    Löscht eine einzelne Belegung anhand ihrer ID aus der Datenbank.
    Nur für eingeloggte Nutzer.
    """
    belegung = db.query(BelegungDB).filter(
        BelegungDB.id == belegung_id
    ).first()
    if not belegung:
        raise HTTPException(status_code=404, detail="Belegung nicht gefunden")
    db.delete(belegung)
    db.commit()
    return {"message": "Belegung erfolgreich gelöscht"}