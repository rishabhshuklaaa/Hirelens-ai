import json
import smtplib
import logging
import urllib.request
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email_via_brevo(to_email: str, subject: str, body: str) -> bool:
    """Sends email via Brevo HTTP REST API (Works over Port 443 - Render & Local friendly)."""
    url = "https://api.brevo.com/v3/smtp/email"
    sender_email = settings.SENDER_EMAIL or settings.SMTP_USERNAME or "rishabhshuklaitm786@gmail.com"
    
    payload = {
        "sender": {
            "name": "HireLens HR",
            "email": sender_email
        },
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body
    }

    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    with urllib.request.urlopen(req, timeout=15) as response:
        if response.status in (200, 201, 202):
            logger.info(f"Email sent successfully to {to_email} via Brevo API")
            return True
        else:
            raise Exception(f"Brevo API status code: {response.status}")


def send_email_via_smtp(to_email: str, subject: str, body: str) -> bool:
    """Sends email using traditional SMTP SSL (Preserved original logic)."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.error("SMTP credentials not configured in .env")
        raise Exception("Email server not configured. Cannot send email.")

    msg = MIMEMultipart()
    msg['From'] = f"HireLens HR <{settings.SMTP_USERNAME}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    with smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as server:
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        
    logger.info(f"Email sent successfully to {to_email} via SMTP")
    return True


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Master send_email function:
    1. Uses Brevo HTTP API if BREVO_API_KEY is available (Bypasses Render outbound port blocks).
    2. Falls back to original SMTP SSL logic if BREVO_API_KEY is not present.
    """
    try:
        if settings.BREVO_API_KEY:
            return send_email_via_brevo(to_email, subject, body)
        else:
            return send_email_via_smtp(to_email, subject, body)
            
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")