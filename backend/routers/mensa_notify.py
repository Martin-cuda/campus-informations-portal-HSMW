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

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from datenbank import get_db
from models.mensa_subscription import MensaSubscription
# [Aktiviert: SendGrid-Mailer wie Jerome] 
from services.mailer_sendgrid import send_mail, render_confirm_mail
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

    # ── ARI [PERF: Ticket 1]: Bestätigungs-Mail in BackgroundTask schicken.
    # SMTP-Versand kann bei Gmail 10-20s dauern; das blockt den User-Response
    # nicht mehr -- Frontend kriegt sofort den 200er, Mail geht im Hintergrund.
    subject, text, html = render_confirm_mail(sub.email, sub.keyword, sub.token)
    background_tasks.add_task(send_mail, sub.email, subject, text, html)

    return SubscribeOut(
        message="Bestätigungs-Mail wurde versendet. Bitte E-Mail prüfen.",
        email=sub.email,
        keyword=sub.keyword,
        confirmed=sub.confirmed,
    )


@router.get("/confirm")
def confirm(token: str, db: Session = Depends(get_db)) -> HTMLResponse:
    """
    Bestätigt ein Abo per Token. Wird vom Nutzer durch Klick in der Mail
    aufgerufen → kleine HTML-Seite als Antwort, damit der Browser etwas
    Ordentliches zu sehen bekommt.
    """
    if not _TOKEN_RE.match(token or ""):
        return HTMLResponse(_inline_html(
            "Token ungültig",
            "Der Bestätigungs-Link sieht nicht richtig aus."
        ), status_code=400)

    sub = db.query(MensaSubscription).filter(MensaSubscription.token == token).first()
    if not sub:
        return HTMLResponse(_inline_html(
            "Token nicht gefunden",
            "Vielleicht hast du das Abo schon abbestellt?"
        ), status_code=404)

    sub.confirmed = True
    sub.active    = True
    db.add(sub)
    db.commit()

    return HTMLResponse(_inline_html(
        "Mensa-Benachrichtigung aktiv",
        f"Wir schicken dir eine E-Mail sobald „{sub.keyword}\" auf dem "
        f"Speiseplan steht. Du kannst dich jederzeit abmelden."
    ))


@router.get("/unsubscribe")
def unsubscribe(token: str, db: Session = Depends(get_db)) -> HTMLResponse:
    """Deaktiviert das Abo. Soft-Delete – Eintrag bleibt aber inaktiv."""
    if not _TOKEN_RE.match(token or ""):
        return HTMLResponse(_inline_html(
            "Token ungültig",
            "Der Link sieht nicht richtig aus."
        ), status_code=400)

    sub = db.query(MensaSubscription).filter(MensaSubscription.token == token).first()
    if not sub:
        # Nicht-existente Token nicht "verraten" – wir tun einfach so als wäre ok.
        return HTMLResponse(_inline_html(
            "Abo abgemeldet",
            "Du erhältst keine weiteren Mails."
        ))

    sub.active = False
    db.add(sub)
    db.commit()
    return HTMLResponse(_inline_html(
        "Abo abgemeldet",
        "Du erhältst keine weiteren Mensa-Mails."
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


# ── kleines HTML-Template für Bestätigungs-/Unsubscribe-Seiten ───────────

def _inline_html(title: str, message: str) -> str:
    return f"""\
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>{title} - bttrhsmw</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body {{ font-family: 'Open Sans', Arial, sans-serif; background: #f8fafc; color: #0f172a;
          display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }}
  .card {{ background:white; padding:32px 40px; border-radius:12px;
           box-shadow:0 8px 24px rgba(0,0,0,.06); max-width:520px; }}
  h1 {{ color:#2596be; margin-top:0; }}
  a {{ color:#2596be; }}
</style>
</head>
<body>
  <div class="card">
    <h1>{title}</h1>
    <p>{message}</p>
    <p><a href="/">&larr; Zurueck zum Campus-Portal</a></p>
  </div>
</body>
</html>"""
