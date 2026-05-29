import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from dotenv import load_dotenv
import ssl
import certifi

ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())

load_dotenv()


def send_reset_email(email: str, token: str):
    reset_link = f"http://localhost:5173/reset-password?token={token}"

    message = Mail(
        from_email=os.getenv("MAIL_FROM"),
        to_emails=email,
        subject="Passwort zurücksetzen",
        plain_text_content=f"""
Hallo,

du hast eine Passwort-Zurücksetzung angefordert.

Reset-Link:
{reset_link}

Der Link ist 15 Minuten gültig.

Wenn das nicht du warst, ignoriere diese E-Mail.
"""
    )

    try:
        sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
        response = sg.send(message)

        print("✅ SendGrid Status:", response.status_code)

    except Exception as e:
        print("SendGrid Fehler:", e)
