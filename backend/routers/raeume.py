from fastapi import APIRouter, HTTPException
# APIRouter für die Gruppierung der Endpunkte
# HTTPException für Fehlermeldungen
from pydantic import BaseModel
# BaseModel für die Datenmodelle (Eingabe-Validierung)

router = APIRouter(prefix="/api/raeume", tags=["Raeume"])
# alle Endpunkte in dieser Datei beginnen mit /api/raeume

# ── Datenmodell für die Raumbelegung ─────────────────────────────────────
# Pydantic prüft automatisch ob die Eingabe korrekt ist
class Belegung(BaseModel):
    haus_id: str       # z.B. "haus1"
    raum_id: str       # z.B. "1-019C"
    professor: str     # z.B. "Prof. Dr. Roschke"
    modul: str         # z.B. "Informatik II"
    von: str           # z.B. "13:00"
    bis: str           # z.B. "14:30"

# ── Temporärer In-Memory Speicher ─────────────────────────────────────────
# Solange keine Datenbank vorhanden ist werden die Belegungen hier gespeichert.
# Achtung: beim Neustart des Servers werden alle Belegungen gelöscht.
# Später durch eine echte Datenbank ersetzen.
belegungen: dict = {}

# ── Endpunkte ─────────────────────────────────────────────────────────────

@router.get("/")
def alle_belegungen():
    """
    GET /api/raeume
    Gibt alle aktuellen Raumbelegungen zurück.
    """
    return {"belegungen": belegungen}

@router.post("/belegen")
def raum_belegen(belegung: Belegung):
    """
    POST /api/raeume/belegen
    Markiert einen Raum als belegt.
    """
    key = f"{belegung.haus_id}_{belegung.raum_id}"
    # key = eindeutiger Schlüssel aus Haus-ID und Raum-ID
    belegungen[key] = {
        "haus_id": belegung.haus_id,
        "raum_id": belegung.raum_id,
        "professor": belegung.professor,
        "modul": belegung.modul,
        "von": belegung.von,
        "bis": belegung.bis,
    }
    return {"message": "Raum erfolgreich belegt", "key": key}

@router.delete("/belegen/{haus_id}/{raum_id}")
def raum_freigeben(haus_id: str, raum_id: str):
    """
    DELETE /api/raeume/belegen/{haus_id}/{raum_id}
    Markiert einen Raum als frei.
    """
    key = f"{haus_id}_{raum_id}"
    if key not in belegungen:
        raise HTTPException(status_code=404, detail="Raum ist nicht belegt")
    del belegungen[key]
    return {"message": "Raum erfolgreich freigegeben"}