# ── ARI: Mailer (Ticket 3 – SMTP-Versand) ────────────────────────────────
#
# Dünner Wrapper um smtplib. Keine externe Lib nötig – stdlib reicht für
# unseren Use-Case (Plain-Text + einfaches HTML, max ~50 Empfänger pro Tag).
#
# Konfiguration über .env:
#   SMTP_HOST       = smtp.web.de         (oder smtp.gmail.com etc.)
#   SMTP_PORT       = 587
#   SMTP_USER       = your.alias@web.de
#   SMTP_PASS       = app-password
#   SMTP_FROM       = "HSMW Mensa Bot <your.alias@web.de>"
#   SMTP_USE_TLS    = 1                   (1 = STARTTLS, 0 = unverschlüsselt)
#   SMTP_DEBUG      = 0                   (1 = Server-Dialog ins Log schreiben)
#   PUBLIC_BASE_URL = http://localhost:5173   (für Confirm/Unsub-Links)
#
# Wenn SMTP_HOST nicht gesetzt ist, läuft der Mailer im **Dry-Run-Modus**:
# die Mail wird ins Log geschrieben statt verschickt. Damit kann das System
# in Entwicklung ohne SMTP-Account getestet werden.
# ──────────────────────────────────────────────────────────────────────────

import os
import ssl
import smtplib
import logging
from email.message import EmailMessage
from email.utils import make_msgid, formatdate
from typing import Optional


log = logging.getLogger("ari.mailer")


# ── Konfiguration aus Environment ────────────────────────────────────────

def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default) or default


def smtp_configured() -> bool:
    """Ist genug konfiguriert, um echt zu senden? Sonst Dry-Run."""
    return bool(_env("SMTP_HOST")) and bool(_env("SMTP_FROM"))


def public_base_url() -> str:
    """Basis-URL für Confirm-/Unsubscribe-Links in Mails."""
    return _env("PUBLIC_BASE_URL", "http://localhost:5173")


# ── Versand ───────────────────────────────────────────────────────────────

def send_mail(
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
) -> bool:
    """
    Schickt eine Mail an `to`. Gibt True zurück bei Erfolg (oder Dry-Run-Print),
    False bei tatsächlichem SMTP-Fehler.

    body_text wird IMMER gesetzt (Plain-Text-Fallback). body_html optional.
    """
    sender   = _env("SMTP_FROM", "noreply@example.local")
    host     = _env("SMTP_HOST")
    port_str = _env("SMTP_PORT", "587")
    user     = _env("SMTP_USER")
    password = _env("SMTP_PASS")
    use_tls  = _env("SMTP_USE_TLS", "1") not in ("0", "false", "False", "")
    debug    = _env("SMTP_DEBUG", "0") not in ("0", "false", "False", "")

    try:
        port = int(port_str)
    except ValueError:
        port = 587

    # ── ARI: Message bauen (multipart wenn HTML mit dabei) ────────────────
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"]    = sender
    msg["To"]      = to
    msg["Date"]    = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain="hsmw-portal.local")
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    # ── ARI: Dry-Run: nur loggen, nicht senden ───────────────────────────
    if not smtp_configured():
        log.warning(
            "SMTP nicht konfiguriert → Dry-Run-Mail an %s: %s",
            to, subject
        )
        # Wir geben True zurück, weil der Aufrufer (Scheduler) den
        # last_sent_date trotzdem setzen darf – sonst läuft im Dev-Modus
        # jeder Tick wieder durch dieselben Abos.
        return True

    # ── ARI: Echter Versand ──────────────────────────────────────────────
    try:
        if use_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(host, port, timeout=15) as server:
                if debug:
                    server.set_debuglevel(1)
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if user:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                if debug:
                    server.set_debuglevel(1)
                if user:
                    server.login(user, password)
                server.send_message(msg)
        log.info("Mensa-Mail an %s gesendet (%s)", to, subject)
        return True
    except Exception as e:
        # Wir wollen den Scheduler nicht abstürzen – nur Bescheid sagen.
        log.error("SMTP send failed an %s: %s", to, e)
        return False


# ── Templates (kleine HTML-Helfer) ───────────────────────────────────────

def render_confirm_mail(email: str, keyword: str, token: str) -> tuple[str, str, str]:
    """Liefert (subject, body_text, body_html) für die Bestätigungs-Mail."""
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
    """Liefert (subject, body_text, body_html) für die "Es gibt dein Gericht!"-Mail."""
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
