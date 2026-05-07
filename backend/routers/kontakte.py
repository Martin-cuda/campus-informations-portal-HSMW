from tokenize import detect_encoding

from fastapi import APIRouter, HTTPException
import httpx
router = APIRouter(prefix="/api/contacts", tags = ["Kontakte"])

HSMW_CONTACTS_URL = "https://app.hs-mittweida.de/v2/contacts"

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
    }


def search_text(contact: dict) -> str:
    parts = [
        contact.get("id"),
        contact.get("displayname"),
        contact.get("title"),
        contact.get("gname"),
        contact.get("name"),
        contact.get("companyphone"),
    ]
    return " ".join(str(part) for part in parts if part).lower()


@router.get("/")
async def contacts_all(q: str = ""):
    """
    GET /api/contacts/
    Gibt alle Kontakte zurück. Optional kann mit ?q=... gesucht werden.
    """
    data = await fetch_hsmw_json(HSMW_CONTACTS_URL)
    contacts = [contact_preview(contact) for contact in data.get("contacts", [])]

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
