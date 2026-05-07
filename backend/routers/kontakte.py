from tokenize import detect_encoding
import asyncio
import time

from fastapi import APIRouter, HTTPException
import httpx
router = APIRouter(prefix="/api/contacts", tags = ["Kontakte"])

HSMW_CONTACTS_URL = "https://app.hs-mittweida.de/v2/contacts"

# Einfacher In-Memory-Cache für die angereicherte Kontaktliste.
# Erster Aufruf zieht für jeden Kontakt den structure-Wert über die Detail-API
# (parallel, gedrosselt). Danach liegen die Daten 5 Minuten im Cache und alle
# folgenden Suchen gehen instant – inkl. Suche nach Fakultät/Bereich.
_KONTAKT_CACHE = {"data": None, "ts": 0.0}
CACHE_TTL_SEC = 300  # 5 Minuten

async def fetch_hsmw_json(url: str) -> dict:
    """
    führt einen asynchronen http get request gegen die angegeben url aus
    beinhaltet auch Fehlerhandling
    :param url:
    :return:
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            # löst exception aus falls http statuscode fehler gibt also 404 type shi
            response.raise_for_status()

        except httpx.HTTPStatusError as error:
            # spezifisches mapping von den http fehler der externen api
            # 404 not found beduetet das der kontakt extern nicht existiert, ie er wurde nicht gefunden
            if error.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Kontakt nicht gefunden")

            #alle anderen satus fehler werden als 502 bad gateway markiert
            #weil die das Upstream also bei der api also weiter oben ein problem ist (sollte uns tbh nicht jucken)
            raise HTTPException(status_code=502, detail="Upstream HSMW API lieferte einen fehlert")
        except httpx.RequestError as error:
            raise HTTPException(status_code=503, detail=f"Upstream HSMW API nicht erreichbar: {error}")
        # das fängt so usual netzwerk fehler ab wie z.b. DNS fehler timeouts oder verbindungsabbrüche
        # wird als 503 Service Unavailable also Dienst nich Verfügbar an den Client weitergegeben
        # dieser error wäre letzte woche aufgetreten wenn wir eine .de domain hätten weil
        # der provider die aktualisierten zertifikat keys nicht weitergeleitet hat loll

    return response.json()


def contact_preview(contact: dict) -> dict:
    return {
        "id": contact.get("id"),
        "displayname": contact.get("displayname"),
        "title": contact.get("title") or "",
        "gname": contact.get("gname") or "",
        "name": contact.get("name") or "",
        "companyphone": contact.get("companyphone"),
        "picture": contact.get("picture"),
        # für die Gruppierung im Frontend (Bereich/Fakultät)
        "structure": contact.get("structure") or "",
        "org": contact.get("org") or "",
    }


def search_text(contact: dict) -> str:
    parts = [
        contact.get("id"),
        contact.get("displayname"),
        contact.get("title"),
        contact.get("gname"),
        contact.get("name"),
        contact.get("companyphone"),
        # Bereich und Org auch durchsuchbar machen
        contact.get("structure"),
        contact.get("org"),
    ]
    return " ".join(str(part) for part in parts if part).lower()


async def _enrich_kontakt(client: httpx.AsyncClient, contact: dict, semaphore: asyncio.Semaphore) -> dict:
    """
    Wenn der Kontakt aus der Liste kein structure-Feld hat, wird über die
    Detail-API nachgeladen. semaphore drosselt die Concurrency damit wir die
    HSMW-API nicht mit 600 parallelen Requests überrennen.
    """
    if contact.get("structure"):
        return contact
    async with semaphore:
        try:
            r = await client.get(f"{HSMW_CONTACTS_URL}/{contact.get('id')}")
            r.raise_for_status()
            detail = r.json()
            return {
                **contact,
                "structure": detail.get("structure") or "",
                "org": detail.get("org") or contact.get("org") or "",
            }
        except Exception:
            # Wenn die Detail-API für einen Einzelnen mal nicht antwortet,
            # nehmen wir den Kontakt unangereichert weiter – kein Crash.
            return contact


async def _get_enriched_contacts() -> list:
    """
    Liefert die volle Kontaktliste inkl. structure/org für jeden Eintrag.
    Mit kleinem In-Memory-Cache (5 Minuten), damit nicht jede Suche neu fetcht.
    """
    now = time.time()
    if _KONTAKT_CACHE["data"] is not None and (now - _KONTAKT_CACHE["ts"]) < CACHE_TTL_SEC:
        return _KONTAKT_CACHE["data"]

    # Erstmal die normale Liste holen
    data = await fetch_hsmw_json(HSMW_CONTACTS_URL)
    raw_list = data.get("contacts", [])

    # Concurrency auf 12 begrenzen – schnell genug, aber höflich zur HSMW-API
    sem = asyncio.Semaphore(12)
    async with httpx.AsyncClient(timeout=10.0) as client:
        enriched = await asyncio.gather(
            *[_enrich_kontakt(client, c, sem) for c in raw_list],
            return_exceptions=False,
        )

    _KONTAKT_CACHE["data"] = list(enriched)
    _KONTAKT_CACHE["ts"]   = now
    return _KONTAKT_CACHE["data"]


@router.get("/")
async def contacts_all(q: str = ""):
    """
    GET /api/contacts/
    Gibt alle Kontakte zurück. Optional kann mit ?q=... gesucht werden.
    Suchfeld inkludiert auch structure/org (Bereich/Fakultät), die wir vorher
    via Detail-API anreichern und cachen.
    """
    raw = await _get_enriched_contacts()
    contacts = [contact_preview(contact) for contact in raw]

    if q.strip():
        query = q.strip().lower()
        contacts = [contact for contact in contacts if query in search_text(contact)]

    return {
        "count": len(contacts),
        "contacts": contacts,
    }


@router.get("/{nutzerkuerzel}")
async def contact_detail(nutzerkuerzel: str):
    """
    GET /api/contacts/{nutzerkuerzel}
    Gibt Detaildaten für einen einzelnen Kontakt zurück.
    """
    data = await fetch_hsmw_json(f"{HSMW_CONTACTS_URL}/{nutzerkuerzel}")

    return {
        "id": data.get("id"),
        "displayname": data.get("displayname"),
        "title": data.get("title") or "",
        "gname": data.get("gname") or "",
        "name": data.get("name") or "",
        "email": data.get("email"),
        "phone": data.get("phone"),
        "companyphone": data.get("companyphone"),
        "structure": data.get("structure"),
        "housename": data.get("housename"),
        "roomname": data.get("roomname"),
        "picture": data.get("picture"),
        "url": data.get("url"),
        "address": data.get("address"),
        "org": data.get("org"),
    }
