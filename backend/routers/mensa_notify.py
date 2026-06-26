# ── ARI: Mensa-Notification-Router (Ticket 3) ────────────────────────────
#
# REST-API für das Abo "Mail wenn Lieblingsgericht in der Mensa".
#
# Public-Endpoints (kein Login nötig):
#   POST  /api/mensa/notify/subscribe       body: { email, keyword }
#   GET   /api/mensa/notify/confirm?token=  → Doppel-Opt-In bestätigen
#   GET   /api/mensa/notify/unsubscribe?token=  → Abo deaktivieren
#
# Admin-Endpoints (JWT erforderlich):
#   GET   /api/mensa/notify/subscriptions   → Liste aller Abos
#   POST  /api/mensa/notify/run-now         → Scheduler-Lauf manuell triggern
#
# DoD-Mapping:
#   ✓ "Lieblingsgericht hinterlegen"  → /subscribe
#   ✓ "automatisierte Routine"        → services/mensa_scheduler.py
#   ✓ "E-Mail per SMTP"               → services/mailer.py
# ──────────────────────────────────────────────────────────────────────────

import re
import uuid
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from datenbank import get_db
from models.mensa_subscription import MensaSubscription
# [Mensa-Mails laufen über Gmail-SMTP → services/mailer.py] 
from services.mailer import send_mail, render_confirm_mail, mail_configured, last_send_error, frontend_base_url
from services import mensa_scheduler
from admin_guard import require_admin
from admin_table import Admin


log = logging.getLogger("ari.mensa_notify")

router = APIRouter(prefix="/api/mensa/notify", tags=["Mensa · Notify"])


# ── Pydantic-Schemas ─────────────────────────────────────────────────────

class SubscribeIn(BaseModel):
    email:   EmailStr
    keyword: str = Field(min_length=2, max_length=80)


class SubscribeOut(BaseModel):
    message: str
    email:   str
    keyword: str
    confirmed: bool


# ── Helper ───────────────────────────────────────────────────────────────

_TOKEN_RE = re.compile(r"^[a-f0-9]{16,64}$")


def _new_token() -> str:
    """Erzeugt ein URL-sicheres Random-Token (uuid4-hex)."""
    return uuid.uuid4().hex


def _normalized_keyword(s: str) -> str:
    """Whitespace trimmen, doppelte Leerzeichen kollabieren."""
    return re.sub(r"\s+", " ", (s or "").strip())


# ── Public Endpoints ─────────────────────────────────────────────────────

@router.post("/subscribe", response_model=SubscribeOut)
def subscribe(
    data: SubscribeIn,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db),
) -> SubscribeOut:
    """
    Legt ein neues Abo an (oder aktualisiert ein bestehendes auf dieselbe Mail).
    Versendet anschließend die Bestätigungs-Mail (Doppel-Opt-In).
    """
    keyword = _normalized_keyword(data.keyword)
    if len(keyword) < 2:
        raise HTTPException(status_code=400, detail="Keyword zu kurz (min. 2 Zeichen)")

    email = data.email.lower().strip()

    sub = db.query(MensaSubscription).filter(MensaSubscription.email == email).first()
    if sub:
        # Bestehendes Abo: Keyword aktualisieren, Confirm-Status zurücksetzen.
        sub.keyword   = keyword
        sub.active    = True
        sub.confirmed = False
        sub.token     = _new_token()
        sub.last_sent_date = None
    else:
        sub = MensaSubscription(
            email=email,
            keyword=keyword,
            active=True,
            confirmed=False,
            token=_new_token(),
            created_at=datetime.utcnow(),
        )
        db.add(sub)

    db.commit()
    db.refresh(sub)

    # Bestätigungs-Mail JETZT senden und das Ergebnis zurückmelden, damit ein
    # fehlgeschlagener oder "trockener" Versand nicht unsichtbar bleibt.
    # (subscribe ist eine sync-Route → läuft im Threadpool, blockt den Loop nicht.)
    subject, text, html = render_confirm_mail(sub.email, sub.keyword, sub.token, request)
    gesendet = send_mail(sub.email, subject, text, html)

    if not mail_configured():
        msg = ("Abo gespeichert. Der Mailversand läuft im Trockenmodus "
               "(kein Anbieter konfiguriert) – die Mail steht nur im Backend-Log.")
    elif gesendet:
        msg = "Bestätigungs-Mail wurde versendet. Bitte E-Mail prüfen (auch den Spam-Ordner)."
    else:
        msg = (f"Abo gespeichert, aber die Bestätigungs-Mail ging nicht raus: "
               f"{last_send_error()}.")

    return SubscribeOut(
        message=msg,
        email=sub.email,
        keyword=sub.keyword,
        confirmed=sub.confirmed,
    )


@router.get("/confirm")
def confirm(token: str, request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
    """
    Bestätigt ein Abo per Token. Wird vom Nutzer durch Klick in der Mail
    aufgerufen → kleine HTML-Seite als Antwort, damit der Browser etwas
    Ordentliches zu sehen bekommt.
    """
    if not _TOKEN_RE.match(token or ""):
        return HTMLResponse(_inline_html(
            "Token ungültig",
            "Der Bestätigungs-Link sieht nicht richtig aus.", request
        ), status_code=400)

    sub = db.query(MensaSubscription).filter(MensaSubscription.token == token).first()
    if not sub:
        return HTMLResponse(_inline_html(
            "Token nicht gefunden",
            "Vielleicht hast du das Abo schon abbestellt?", request
        ), status_code=404)

    sub.confirmed = True
    sub.active    = True
    db.add(sub)
    db.commit()

    return HTMLResponse(_inline_html(
        "Mensa-Benachrichtigung aktiv",
        f"Wir schicken dir eine E-Mail sobald „{sub.keyword}\" auf dem "
        f"Speiseplan steht. Du kannst dich jederzeit abmelden.", request
    ))


@router.get("/unsubscribe")
def unsubscribe(token: str, request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
    """Deaktiviert das Abo. Soft-Delete – Eintrag bleibt aber inaktiv."""
    if not _TOKEN_RE.match(token or ""):
        return HTMLResponse(_inline_html(
            "Token ungültig",
            "Der Link sieht nicht richtig aus.", request
        ), status_code=400)

    sub = db.query(MensaSubscription).filter(MensaSubscription.token == token).first()
    if not sub:
        # Nicht-existente Token nicht "verraten" – wir tun einfach so als wäre ok.
        return HTMLResponse(_inline_html(
            "Abo abgemeldet",
            "Du erhältst keine weiteren Mails.", request
        ))

    sub.active = False
    db.add(sub)
    db.commit()
    return HTMLResponse(_inline_html(
        "Abo abgemeldet",
        "Du erhältst keine weiteren Mensa-Mails.", request
    ))


# ── Admin Endpoints (geschützt) ──────────────────────────────────────────

@router.get("/subscriptions")
def list_subscriptions(
    db: Session = Depends(get_db),
    _admin: Admin = Depends(require_admin),
):
    """Liste aller Abos (nur Admins). Für späteres Admin-Tooling."""
    rows = db.query(MensaSubscription).order_by(MensaSubscription.created_at.desc()).all()
    return {
        "subscriptions": [
            {
                "id":             r.id,
                "email":          r.email,
                "keyword":        r.keyword,
                "active":         bool(r.active),
                "confirmed":      bool(r.confirmed),
                "last_sent_date": r.last_sent_date,
                "created_at":     r.created_at.isoformat() + "Z" if r.created_at else None,
            }
            for r in rows
        ]
    }


@router.post("/run-now")
def run_now(_admin: Admin = Depends(require_admin)):
    """
    Triggert den Scheduler-Lauf sofort (force=True ignoriert last_sent_date).
    Praktisch zum Testen ohne auf 08:00 zu warten.
    """
    stats = mensa_scheduler.check_now(force=True)
    return {"triggered": True, **stats}


@router.post("/test")
def send_test_mail(email: EmailStr, _admin: Admin = Depends(require_admin)):
    """
    Schickt SOFORT eine Test-Mail an `email` und meldet das Ergebnis zurueck.
    Aufruf (als Admin): POST /api/mensa/notify/test?email=du@example.com

    Antwort:
      configured = True  -> Gmail-SMTP ist scharf (echter Versand)
      dry_run    = True  -> nur Log, kein echter Versand (Keys fehlen)
      sent       = True  -> send_mail meldet Erfolg
    """
    subject = "Test - HSMW Mensa-Benachrichtigung"
    text = ("Das ist eine Test-Mail vom Campus-Portal. "
            "Wenn du das liest, funktioniert der E-Mail-Versand.")
    ok = send_mail(str(email), subject, text, "<p>" + text + "</p>")
    configured = mail_configured()
    return {
        "to":         str(email),
        "configured": configured,
        "dry_run":    not configured,
        "sent":       bool(ok),
        "reason":     last_send_error(),
    }


def _inline_html(title: str, message: str, request=None) -> str:
    return (
        '<!doctype html><html lang="de"><head><meta charset="utf-8">'
        '<title>' + title + ' - bttrhsmw</title>'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        "<style>body{font-family:'Open Sans',Arial,sans-serif;background:#f8fafc;"
        "color:#0f172a;display:flex;align-items:center;justify-content:center;"
        "min-height:100vh;margin:0;}.card{background:#fff;padding:32px 40px;"
        "border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.06);max-width:520px;}"
        "h1{color:#2596be;margin-top:0;}a{color:#2596be;}</style></head><body>"
        '<div class="card"><h1>' + title + '</h1><p>' + message + '</p>'
        '<p><a href="' + frontend_base_url(request) + '">&larr; Zurueck zum Campus-Portal</a></p></div></body></html>'
    )
