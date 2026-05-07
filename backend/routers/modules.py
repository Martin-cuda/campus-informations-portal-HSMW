"""
Module-Router

Verwaltet die Liste der zubuchbaren Dashboard-Module
(Stundenplan, Raumplan, Events, Bibliothek, Kontakt, Prüfungen,
plus eigene Module die User über die UI anlegen).

Speicherung in backend/data/modules.json – damit die hinzugefügten Module
persistent sind und für jeden User der das Frontend benutzt sichtbar.

Endpoints:
  GET    /api/modules         → Liste aller Module
  POST   /api/modules         body: Module-Objekt → fügt hinzu (oder updated, falls gleiche id)
  DELETE /api/modules/{id}    → entfernt Modul mit dieser id

Hinweis: später müsste hier eigentlich noch ein Admin-Auth-Check rein,
aktuell darf jeder User schreibend zugreifen.
"""

import json
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/modules", tags=["Modules"])

# Datenfile relativ zum Backend-Ordner
DATA_DIR  = Path(__file__).resolve().parent.parent / "data"
DATA_FILE = DATA_DIR / "modules.json"


# Untermodelle für reichhaltigen Modul-Inhalt
class ModuleSection(BaseModel):
    title: Optional[str] = ""
    body: Optional[str] = ""


class ModuleLink(BaseModel):
    label: Optional[str] = ""
    url: Optional[str] = ""


# Pydantic-Schema für ein Modul.
# - id:          eindeutiger Bezeichner (z.B. "stundenplan", "custom-sport-anmeldung")
# - label:       angezeigter Name
# - icon:        Emoji für die Sidebar/Kachel
# - path:        Frontend-Route, z.B. "/stundenplan"
# - tag:         "Neu" oder "Eigenes Modul"
# - description: kurzer Freitext, wird auf der Modul-Seite oben gezeigt
# - color:       Akzentfarbe (Hex) für Header / Buttons
# - banner:      optionale Banner-Bild-URL für die Modul-Seite
# - sections:    Freie Textabschnitte mit Titel + Body
# - links:       Externe Links (Label + URL), werden als Button-Reihe angezeigt
class Module(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=80)
    icon: str = Field(min_length=1, max_length=4)
    path: str = Field(min_length=2, max_length=80)
    tag: Optional[str] = ""
    description: Optional[str] = ""
    color: Optional[str] = "#3b82f6"
    banner: Optional[str] = ""
    sections: List[ModuleSection] = []
    links: List[ModuleLink] = []


def _load() -> List[dict]:
    """Liest die Module aus der JSON-Datei. Wenn nicht vorhanden: leere Liste."""
    if not DATA_FILE.exists():
        return []
    try:
        with DATA_FILE.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        # Datei kaputt → lieber leer liefern als crashen
        return []


def _save(modules: List[dict]) -> None:
    """Schreibt die Module-Liste atomar in die JSON-Datei."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(modules, f, ensure_ascii=False, indent=2)
    tmp.replace(DATA_FILE)


@router.get("/")
def list_modules():
    """GET /api/modules – gibt die persistierte Modul-Liste zurück."""
    return _load()


@router.post("/")
def upsert_module(mod: Module):
    """
    POST /api/modules – fügt Modul hinzu.
    Wenn die id schon existiert, wird das bestehende Modul ersetzt (Upsert-Verhalten).
    Damit funktioniert derselbe Endpoint sowohl fürs Erstellen als auch fürs Bearbeiten.
    """
    modules = _load()
    # Falls schon eins mit der id existiert: erst rauswerfen, dann das neue dranhängen.
    # So entstehen keine Duplikate und die Daten werden überschrieben.
    modules = [m for m in modules if m.get("id") != mod.id]
    modules.append(mod.model_dump())
    _save(modules)
    return mod


@router.delete("/{module_id}")
def delete_module(module_id: str):
    """DELETE /api/modules/{id} – entfernt das Modul mit dieser id."""
    modules = _load()
    # Liste ohne das zu löschende Element neu aufbauen
    neue = [m for m in modules if m.get("id") != module_id]
    # Wenn die Liste gleich groß geblieben ist, war die id gar nicht drin → 404
    if len(neue) == len(modules):
        raise HTTPException(status_code=404, detail=f"Modul '{module_id}' nicht gefunden.")
    _save(neue)
    return {"deleted": module_id}
