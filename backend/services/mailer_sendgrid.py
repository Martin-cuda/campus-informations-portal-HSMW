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


log = logging.getLogger("ari.mailer_sendgrid")


# ── Konfiguration aus Environment ────────────────────────────────────────

def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default) or default


def sendgrid_configured() -> bool:
    """Ist genug konfiguriert, um echt zu senden? Sonst Dry-Run."""
    return bool(_env("SENDGRID_API_KEY")) and bool(_env("MAIL_FROM"))


def public_base_url() -> str:
    """Basis-URL fuer Confirm-/Unsubscribe-Links in Mails."""
    return _env("PUBLIC_BASE_URL", "http://localhost:8000")


# ── Versand (SendGrid statt SMTP) ────────────────────────────────────────

def send_mail(
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """
    Schickt eine Mail an `to` ueber SendGrid. Gibt True zurueck bei Erfolg
    (oder Dry-Run), False bei tatsaechlichem Versand-Fehler.

    Gleiche Signatur wie mailer.send_mail -> Drop-in-Ersatz.
    """
    sender_addr = _env("MAIL_FROM", "noreply@example.local")
    sender_name = _env("MENSA_MAIL_FROM_NAME", "HSMW Mensa")

    # ── Dry-Run: nur loggen, nicht senden ────────────────────────────────
    if not sendgrid_configured():
        log.warning(
            "SendGrid nicht konfiguriert -> Dry-Run-Mail an %s: %s",
            to, subject
        )
        # True, damit der Scheduler last_sent_date trotzdem setzt (sonst
        # laeuft im Dev-Modus jeder Tick durch dieselben Abos).
        return True

    # ── Echter Versand ueber SendGrid ────────────────────────────────────
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email

        message = Mail(
            from_email=Email(sender_addr, sender_name),
            to_emails=to,
            subject=subject,
            plain_text_content=body_text,
        )
        # HTML-Variante zusaetzlich anhaengen, falls vorhanden.
        if body_html:
            message.html_content = body_html

        sg = SendGridAPIClient(_env("SENDGRID_API_KEY"))
        response = sg.send(message)

        # SendGrid liefert 2xx bei Erfolg (meist 202 Accepted).
        ok = 200 <= int(response.status_code) < 300
        if ok:
            log.info("Mensa-Mail an %s gesendet (SendGrid %s)", to, response.status_code)
        else:
            log.error("SendGrid unerwarteter Status %s an %s", response.status_code, to)
        return ok
    except Exception as e:
        # Scheduler darf nicht abstuerzen – nur Bescheid sagen.
        log.error("SendGrid send failed an %s: %s", to, e)
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
