from fastapi import APIRouter, HTTPException
#api router damit man eine gruppe von endpunkten erstellen kann
#httpexception für errormessage
from datetime import datetime
# mit datetime wandelt man den unix timestamp in ein "normales" datum um
import httpx
#damit macht man http anfragen an die apis
#lowk wie fetch in js aber nur in python
import time
#time für den kurzen In-Memory-Cache des Speiseplans (Performance)

router = APIRouter(prefix="/api/mensa", tags = ["Mensa"])
# router wird mit präfix mensa definiert was bedeutet das alle endpunkte
# in der datei mit /api/mensa beginnen
HSMW_API_URL = "https://app.hs-mittweida.de/v2/speiseplan"
#URL der hsmw api

# ── [PERF] Kurzlebiger In-Memory-Cache für den Speiseplan ────────────────
# Die HSMW-API ist je nach Tageszeit langsam (~3 s pro Aufruf). Der Plan ändert
# sich aber höchstens täglich – deshalb halten wir die Roh-Antwort ein paar
# Minuten im Speicher. Folge-Requests (Dashboard-Widget, /heute, /) antworten
# dann praktisch sofort, statt jedes Mal die langsame Upstream-API zu treffen.
_SPEISEPLAN_CACHE = {"data": None, "ts": 0.0}
_SPEISEPLAN_TTL = 300.0  # Sekunden = 5 Minuten

async def _speiseplan_laden() -> dict:
    """Liefert die HSMW-Speiseplan-JSON – aus dem Cache, solange sie frisch ist."""
    jetzt = time.monotonic()
    cache = _SPEISEPLAN_CACHE
    if cache["data"] is not None and (jetzt - cache["ts"]) < _SPEISEPLAN_TTL:
        return cache["data"]
    async with httpx.AsyncClient(timeout=10.0) as client:
        antwort = await client.get(HSMW_API_URL)
        antwort.raise_for_status()
    daten = antwort.json()
    cache["data"] = daten
    cache["ts"] = jetzt
    return daten

def unix_zu_datum(timestamp: int) -> str:
    """
    Wandelt einen Unix Timestamp in ein lesbares deutsches Datum um
    Beispiel: 17772408000 -> "Montag, 24.04.2025"
    :param timestamp:
    :return:
    """
    # ICH KANN DOC STRINGS BENUTZEN TSCHÜÜÜSCHHH
    return datetime.fromtimestamp(timestamp).strftime("%A, %d.%m.%Y")
    # wandelt den unix timestamp in ein ordentlich lesbares datum um.

def preis_formatieren(prices: dict) -> str:
    """
    Gibt den Studierenden-Preis als formatierten String zurück.
    Die Preisgruppe "1" = Studierende.
    Beispiel: {"1": 4.1, "2": 7.1} → "4,10 €"
    :param prices:
    :return:
    """
    studierenden_preis = prices.get("1")
    # get gibt none zurück wenn der key nicht existiert
    if studierenden_preis is not None:
        return f"{studierenden_preis:.2f} €". replace(".", ",")
    return None

def menus_filtern(menus: list) -> list:
    """
    geht durch alle gerichte einer Kategorie durch und filtert:
    dummy = true hereaus (SB theke platzhalter also Nudelteller usw)
    inaktive Gerichte (active=false) werden NICHT mehr rausgefiltert,
    sondern mit dem Feld "active": False weitergegeben – das Frontend
    zeigt sie dann durchgestrichen / nicht verfügbar.
    :param menus:
    :return:
    """
    ergebnis = []
    # Leere Liste, hier am kommen die gefilterten Gerichte rein
    for menu in menus:
        # für jedes Gericht in der Liste...
        # Filter: dummy Einträge überspringen
        # .get("dummy", False) ->   gibt False zurück wenn "dummy" nicht vorhanden,
        if menu.get("dummy", False):
            continue # continue springt direkt zur nächsten iteration

        # Inaktive Gerichte bleiben drin – das Frontend kümmert sich um die Darstellung
        # wenn das gericht alle filter quote unquote überlebt hat dann wird es in ein
        # sauberes format umgewandelt
        ergebnis.append({
            "id": menu.get("id"),
            "name": menu.get("title_de", "Unbekannt"),
            "beschreibung": menu.get("description_de", ""),
            "preis": preis_formatieren(menu.get("prices", {})),
            "mealtypes": menu.get("mealtypes", []),
            "active": menu.get("active", True),
        })
    return ergebnis
    
def tag_verarbeiten(tag: dict) -> dict:
    """
    verarbeitet einen kompletten Tag aus der API geht durch alle gerichte durch und filtert

    :param tag:
    :return:
    """
    kategorien = []

    for kategorie in tag.get("categories",[]):
        gefilterte_menus = menus_filtern(kategorie.get("menus",[]))

        # kategorie nur hinzufügen wenn nach dem Filtern noch gerichte übrig sind
        if gefilterte_menus:
            kategorien.append({
                "titel": kategorie.get("title"),
                "menus": gefilterte_menus,
            })
    return{
        "datum_raw": tag.get("date"),
        "datum_label": unix_zu_datum(tag.get("date", 0)),
        "kategorien": kategorien,

    }

# endpointsssss
#FRONTEND MENSCHEN ACHTUNG hier könnt ihr die Urls abrufen

@router.get("/")
async def speiseplan_komplett():
    """
    GET /api/mensa
    gibt den Wochenplan für die mensa zurück
    :return:
    """
    # [PERF] Daten kommen aus dem Cache (siehe _speiseplan_laden) – nur der erste
    # Aufruf nach Ablauf der TTL trifft die langsame HSMW-API.
    try:
        daten = await _speiseplan_laden()
    except httpx.HTTPError as fehler:
        # Netzwerk- ODER HTTP-Fehler der Upstream-API → 503 (Service nicht verfügbar)
        raise HTTPException(status_code=503, detail=f"HSMW-API nicht erreichbar: {fehler}")
    tage = [tag_verarbeiten(tag) for tag in daten.get("day", [])]
    return {"tage": tage}

@router.get("/heute")
async def speiseplan_heute():
    """
    get /api/mensa/heute
    gibt nur den mensaplan für heute wieder
    :return:
    """
    try:
        daten = await _speiseplan_laden()
    except httpx.HTTPError as fehler:
        raise HTTPException(status_code=503, detail=f"HSMW-API nicht erreichbar: {fehler}")

    heute = datetime.now().date()
    for tag in daten.get("day", []):
        tag_datum = datetime.fromtimestamp(tag["date"]).date()
        if tag_datum == heute:
            return tag_verarbeiten(tag)

    # Kein heutiger Speiseplan = KEIN Fehler (z.B. Wochenende), nur "leer".
    # Deshalb 200 mit leerer Kategorienliste statt 404 – das Dashboard-Widget
    # kann so sauber "Heute kein Plan" anzeigen, statt auf einen 404 zu laufen.
    return {"datum_raw": None, "datum_label": None, "kategorien": [], "hinweis": "Kein Speiseplan für heute verfügbar"}
