# Mailer (Ticket 3): Mensa-Mails ueber Gmail-SMTP.
# Aktiv genutzt von routers/mensa_notify.py + services/mensa_scheduler.py.
# Der SendGrid-Mailer (mailer_sendgrid.py) wurde entfernt; der Passwort-Reset
# (mail_service.py) nutzt weiterhin SendGrid (eigener, unabhaengiger Weg).
# .env-Werte: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM,
# SMTP_USE_TLS, PUBLIC_BASE_URL. Ohne SMTP_USER/SMTP_PASS -> Dry-Run (nur Log).
import os
import ssl
import smtplib
import logging
from email.message import EmailMessage
from email.utils import make_msgid, formatdate
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

log = logging.getLogger("ari.mailer")
_LAST_SEND_ERROR = None


def _env(key, default=""):
    return os.getenv(key, default) or default


def mail_configured():
    return bool(_env("SMTP_HOST", "smtp.gmail.com")) and bool(_env("SMTP_USER")) and bool(_env("SMTP_PASS"))


def smtp_configured():
    return mail_configured()


def public_base_url():
    return _env("PUBLIC_BASE_URL", "http://localhost:8000")


def last_send_error():
    return _LAST_SEND_ERROR


def send_mail(to, subject, body_text, body_html=None):
    global _LAST_SEND_ERROR
    _LAST_SEND_ERROR = None
    sender = _env("SMTP_FROM") or _env("SMTP_USER", "noreply@example.local")
    host = _env("SMTP_HOST", "smtp.gmail.com")
    try:
        port = int(_env("SMTP_PORT", "587"))
    except ValueError:
        port = 587
    user = _env("SMTP_USER")
    password = _env("SMTP_PASS")
    use_tls = _env("SMTP_USE_TLS", "1") not in ("0", "false", "False", "")
    debug = _env("SMTP_DEBUG", "0") not in ("0", "false", "False", "")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="hsmw-portal.local")
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    if not mail_configured():
        _LAST_SEND_ERROR = "dry_run"
        log.warning("SMTP nicht konfiguriert -> Dry-Run-Mail an %s: %s", to, subject)
        return True
    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP(host, port, timeout=20) as server:
            if debug:
                server.set_debuglevel(1)
            server.ehlo()
            if use_tls:
                server.starttls(context=ctx)
                server.ehlo()
            if user:
                server.login(user, password)
            server.send_message(msg)
        log.info("Mensa-Mail an %s gesendet (%s)", to, subject)
        return True
    except smtplib.SMTPAuthenticationError as e:
        _LAST_SEND_ERROR = "Gmail-Login fehlgeschlagen - App-Passwort/Benutzer pruefen. Code " + str(getattr(e, "smtp_code", "?"))
        log.error("SMTP-Auth fehlgeschlagen an %s: %s", to, e)
        return False
    except Exception as e:
        _LAST_SEND_ERROR = "SMTP-Fehler: " + str(e)
        log.error("SMTP send failed an %s: %s", to, e)
        return False


def render_confirm_mail(email, keyword, token):
    base = public_base_url()
    confirm_url = base + "/api/mensa/notify/confirm?token=" + token
    unsub_url = base + "/api/mensa/notify/unsubscribe?token=" + token
    subject = 'Bitte bestaetigen: Mensa-Benachrichtigung fuer "' + keyword + '"'
    text = ("Hallo,\n\ndu moechtest eine E-Mail, sobald \"" + keyword +
            "\" auf dem Speiseplan der HSMW-Mensa steht.\n\n"
            "Bitte bestaetige dein Abo:\n  " + confirm_url +
            "\n\nFalls das nicht von dir war, hier abbestellen:\n  " + unsub_url +
            "\n\nGruesse,\nbttrhsmw - Campus-Portal\n")
    html = ('<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;">'
            '<h2 style="color:#2596be;">Mensa-Benachrichtigung bestaetigen</h2><p>Hallo,</p>'
            '<p>du moechtest eine E-Mail, sobald <strong>' + keyword + '</strong> auf dem Speiseplan steht.</p>'
            '<p><a href="' + confirm_url + '" style="background:#2596be;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px;">Abo bestaetigen</a></p>'
            '<p style="font-size:12px;color:#64748b;">Falls du das nicht warst, ignorieren oder <a href="' + unsub_url + '">hier abbestellen</a>.</p>'
            '<p style="font-size:12px;color:#94a3b8;">bttrhsmw - Campus-Portal HS Mittweida</p></body></html>')
    return subject, text, html


def render_match_mail(email, keyword, dishes, token, date_label):
    base = public_base_url()
    unsub_url = base + "/api/mensa/notify/unsubscribe?token=" + token
    subject = 'Heute auf dem Speiseplan: "' + keyword + '" - HSMW Mensa'
    bullets = "\n".join("  - " + d for d in dishes) or "  - (kein Detail)"
    text = ("Hallo,\n\nheute (" + date_label + ") gibt es in der HSMW-Mensa etwas zu deinem Stichwort \"" +
            keyword + "\":\n\n" + bullets + "\n\nGuten Hunger!\n\n---\nAbbestellen: " + unsub_url + "\n")
    items = "".join("<li>" + d + "</li>" for d in dishes) or "<li>(kein Detail)</li>"
    html = ('<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;">'
            '<h2 style="color:#2596be;">Dein Lieblingsgericht ist heute da!</h2><p>Hallo,</p>'
            '<p>heute (' + date_label + ') passt etwas zu deinem Stichwort <strong>' + keyword + '</strong>:</p>'
            '<ul>' + items + '</ul><p>Guten Hunger!</p>'
            '<p style="font-size:12px;color:#94a3b8;">bttrhsmw - <a href="' + unsub_url + '">Abo abbestellen</a></p></body></html>')
    return subject, text, html


def frontend_base_url():
    return _env("FRONTEND_BASE_URL", "http://localhost:5173")
