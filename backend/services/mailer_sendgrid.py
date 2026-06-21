# ── ARI: Mailer auf SendGrid-Basis (Ticket 3) — AKTIV ────────────────────
#
# *** AKTIV: mensa_notify.py und mensa_scheduler.py importieren diese Datei. ***
# (Der alte SMTP-Mailer liegt weiterhin als services/mailer.py als Fallback bereit.)
#
# Diese Datei ist ein 1:1-Ersatz fuer services/mailer.py, verschickt die Mails
# aber ueber SendGrid (wie Jerome's mail_service.py) statt ueber eigenes SMTP.
# Vorteil: nutzt den bereits funktionierenden SENDGRID_API_KEY aus der .env,
# d.h. kein eigenes SMTP-Passwort noetig.
#
# Die Funktionsnamen sind absichtlich identisch zu mailer.py
# (send_mail, render_confirm_mail, render_match_mail, public_base_url),
# damit routers/mensa_notify.py und services/mensa_scheduler.py NICHT
# geaendert werden muessen.
#
# ── So aktivierst du es spaeter (zwei Wege, einer reicht) ────────────────
#   Weg A (einfach): die bestehende mailer.py umbenennen zu mailer_smtp_backup.py
#                    und DIESE Datei zu  mailer.py  umbenennen.
#   Weg B (Imports): in mensa_notify.py + mensa_scheduler.py die Zeile
#                       from services.mailer import ...
#                    aendern zu
#                       from services.mailer_sendgrid import ...
#
# Benoetigte .env-Werte (sind fuer Jerome's Reset eh schon gesetzt):
#   SENDGRID_API_KEY = SG.xxxxxxxx...
#   MAIL_FROM        = absender@deine-domain.de   (verifizierter SendGrid-Absender)
#   PUBLIC_BASE_URL  = http://localhost:8000      (fuer die Confirm-/Unsub-Links)
#
# Wenn SENDGRID_API_KEY nicht gesetzt ist, laeuft der Mailer im Dry-Run:
# die Mail wird nur ins Log geschrieben, nicht verschickt (gut zum Testen ohne
# echten Versand).
# ──────────────────────────────────────────────────────────────────────────

import os
import ssl
import logging
from typing import Optional

# certifi/ssl wie bei Jerome's mail_service.py – stellt sicher, dass die
# HTTPS-Verbindung zu SendGrid auch unter Windows ein gueltiges Zertifikat hat.
try:
    import certifi
    ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
except Exception:  # certifi nicht installiert -> Standard-Kontext nutzen
    pass

# ── [AKTIV] .env laden – genau wie der Passwort-Reset (mail_service.py) ───
# Stellt sicher, dass SENDGRID_API_KEY + MAIL_FROM gesetzt sind, egal in welcher
# Reihenfolge dieser Mailer importiert wird. Ohne das liefe send_mail im Dry-Run
# (Mail nur ins Log), obwohl die Zugangsdaten längst in der .env stehen.
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


log = logging.getLogger("ari.mailer_sendgrid")


# ── Konfiguration aus Environment ────────────────────────────────────────

def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default) or default


def sendgrid_configured() -> bool:
    """SendGrid scharf? (API-Key + Absender gesetzt)"""
    return bool(_env("SENDGRID_API_KEY")) and bool(_env("MAIL_FROM"))


def _gmail_configured() -> bool:
    """Gmail-SMTP scharf? (Benutzer + App-Passwort aus der .env gesetzt)"""
    return bool(_env("MAIL_USERNAME")) and bool(_env("MAIL_PASSWORD"))


def mail_configured() -> bool:
    """Mindestens ein Versandweg konfiguriert (SendGrid ODER Gmail-SMTP)."""
    return sendgrid_configured() or _gmail_configured()


def public_base_url() -> str:
    """Basis-URL fuer Confirm-/Unsubscribe-Links in Mails."""
    return _env("PUBLIC_BASE_URL", "http://localhost:8000")


# Klartext-Ursache des letzten Fehlversands – für UI-Feedback / Diagnose.
_LAST_SEND_ERROR: Optional[str] = None


def last_send_error() -> Optional[str]:
    """Warum scheiterte der letzte Versand? (oder None, wenn ok/Dry-Run)"""
    return _LAST_SEND_ERROR


# ── Versand: SendGrid zuerst, dann Gmail-SMTP als Fallback ───────────────

def _send_via_sendgrid(to, subject, body_text, body_html) -> bool:
    """Versand über SendGrid. Wirft bei Fehler (damit der Fallback greifen kann)."""
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email

    message = Mail(
        from_email=Email(_env("MAIL_FROM", "noreply@example.local"),
                         _env("MENSA_MAIL_FROM_NAME", "HSMW Mensa")),
        to_emails=to,
        subject=subject,
        plain_text_content=body_text,
    )
    if body_html:
        message.html_content = body_html

    sg = SendGridAPIClient(_env("SENDGRID_API_KEY"))
    response = sg.send(message)
    return 200 <= int(response.status_code) < 300


def _send_via_gmail(to, subject, body_text, body_html) -> None:
    """Versand über Gmail-SMTP mit MAIL_USERNAME/MAIL_PASSWORD aus der .env.
    Wirft bei Fehler (z.B. falsches/kein App-Passwort)."""
    import smtplib
    from email.message import EmailMessage

    sender = _env("MAIL_FROM") or _env("MAIL_USERNAME")
    name = _env("MAIL_FROM_NAME") or _env("MENSA_MAIL_FROM_NAME", "HSMW Mensa")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{name} <{sender}>" if name else sender
    msg["To"] = to
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    ctx = ssl.create_default_context()
    with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as server:
        server.ehlo()
        server.starttls(context=ctx)
        server.ehlo()
        server.login(_env("MAIL_USERNAME"), _env("MAIL_PASSWORD"))
        server.send_message(msg)


def send_mail(
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """
    Schickt eine Mail an `to`. Reihenfolge: SendGrid (falls konfiguriert) →
    bei Fehler Gmail-SMTP (falls konfiguriert). True bei Erfolg ODER im Dry-Run
    (kein Anbieter konfiguriert); False bei echtem Fehlversand.
    Danach steht in `last_send_error()` die Klartext-Ursache.

    Gleiche Signatur wie mailer.send_mail -> Drop-in-Ersatz.
    """
    global _LAST_SEND_ERROR
    _LAST_SEND_ERROR = None

    # ── 1) SendGrid ──────────────────────────────────────────────────────
    if sendgrid_configured():
        try:
            if _send_via_sendgrid(to, subject, body_text, body_html):
                log.info("Mail an %s über SendGrid gesendet.", to)
                return True
            _LAST_SEND_ERROR = "SendGrid: unerwarteter Status (kein 2xx)"
            log.error("SendGrid unerwarteter Status an %s", to)
        except Exception as e:
            s = str(e)
            status = getattr(e, "status_code", None) or getattr(e, "code", None)
            if status == 401 or "401" in s:
                _LAST_SEND_ERROR = "SendGrid 401 – API-Key ungültig/abgelaufen"
            elif status == 403 or "403" in s:
                _LAST_SEND_ERROR = "SendGrid 403 – Absender (MAIL_FROM) nicht verifiziert"
            else:
                _LAST_SEND_ERROR = f"SendGrid-Fehler: {e}"
            log.error("SendGrid send failed an %s: %s", to, e)
        # → weiter zum Gmail-Fallback

    # ── 2) Gmail-SMTP-Fallback ───────────────────────────────────────────
    if _gmail_configured():
        try:
            _send_via_gmail(to, subject, body_text, body_html)
            log.info("Mail an %s über Gmail-SMTP gesendet.", to)
            _LAST_SEND_ERROR = None
            return True
        except Exception as e:
            zusatz = f"Gmail-SMTP-Fehler: {e}"
            _LAST_SEND_ERROR = f"{_LAST_SEND_ERROR} | {zusatz}" if _LAST_SEND_ERROR else zusatz
            log.error("Gmail-SMTP send failed an %s: %s", to, e)

    # ── 3) Nichts konfiguriert → Dry-Run (nur Log) ───────────────────────
    if not mail_configured():
        _LAST_SEND_ERROR = "dry_run"
        log.warning("Kein Mailversand konfiguriert -> Dry-Run-Mail an %s: %s", to, subject)
        return True

    return False


# ── Templates (identisch zu mailer.py, damit Mails gleich aussehen) ──────

def render_confirm_mail(email: str, keyword: str, token: str) -> tuple[str, str, str]:
    """Liefert (subject, body_text, body_html) fuer die Bestaetigungs-Mail."""
    base = public_base_url()
    confirm_url = f"{base}/api/mensa/notify/confirm?token={token}"
    unsub_url   = f"{base}/api/mensa/notify/unsubscribe?token={token}"

    subject = f"Bitte bestätigen: Mensa-Benachrichtigung für „{keyword}\""
    text = (
        f"Hallo,\n\n"
        f"du möchtest eine E-Mail erhalten, sobald „{keyword}\" auf dem "
        f"Speiseplan der HSMW-Mensa steht.\n\n"
        f"Bitte bestätige dein Abo:\n  {confirm_url}\n\n"
        f"Falls das nicht von dir war, kannst du es hier abbestellen:\n  {unsub_url}\n\n"
        f"Grüße,\nbttrhsmw – Campus-Portal\n"
    )
    html = f"""\
<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;">
  <h2 style="color:#2596be;">Mensa-Benachrichtigung bestätigen</h2>
  <p>Hallo,</p>
  <p>du möchtest eine E-Mail erhalten, sobald <strong>{keyword}</strong> auf
     dem Speiseplan der HSMW-Mensa steht.</p>
  <p>
    <a href="{confirm_url}" style="background:#2596be;color:white;padding:10px 16px;
       text-decoration:none;border-radius:6px;">Abo bestätigen</a>
  </p>
  <p style="font-size:12px;color:#64748b;">
     Falls du das nicht warst, einfach ignorieren oder
     <a href="{unsub_url}">hier abbestellen</a>.
  </p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="font-size:12px;color:#94a3b8;">bttrhsmw · Campus-Portal HS Mittweida</p>
</body></html>"""
    return subject, text, html


def render_match_mail(email: str, keyword: str, dishes: list[str], token: str, date_label: str) -> tuple[str, str, str]:
    """Liefert (subject, body_text, body_html) fuer die "Es gibt dein Gericht!"-Mail."""
    base = public_base_url()
    unsub_url = f"{base}/api/mensa/notify/unsubscribe?token={token}"

    subject = f"Heute auf dem Speiseplan: „{keyword}\" – HSMW Mensa"
    bulletlines = "\n".join(f"  • {d}" for d in dishes) or "  • (kein Detail vorhanden)"
    text = (
        f"Hallo,\n\n"
        f"heute ({date_label}) gibt es in der HSMW-Mensa etwas das zu deinem "
        f"Lieblings-Stichwort „{keyword}\" passt:\n\n"
        f"{bulletlines}\n\n"
        f"Guten Hunger!\n\n"
        f"---\nDieses Abo abbestellen: {unsub_url}\n"
    )
    list_html = "".join(f"<li>{d}</li>" for d in dishes) or "<li>(kein Detail vorhanden)</li>"
    html = f"""\
<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;">
  <h2 style="color:#2596be;">Dein Lieblingsgericht ist heute da!</h2>
  <p>Hallo,</p>
  <p>heute ({date_label}) gibt es in der HSMW-Mensa etwas das zu deinem
     Stichwort <strong>{keyword}</strong> passt:</p>
  <ul>{list_html}</ul>
  <p>Guten Hunger!</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
  <p style="font-size:12px;color:#94a3b8;">
     bttrhsmw · <a href="{unsub_url}">Abo abbestellen</a>
  </p>
</body></html>"""
    return subject, text, html
