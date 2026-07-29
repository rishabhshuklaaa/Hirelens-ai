import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Sends an email using configured SMTP settings."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.error("SMTP credentials not configured in .env")
        raise Exception("Email server not configured. Cannot send email.")
        
    try:
        msg = MIMEMultipart()
        msg['From'] = f"HireLens HR <{settings.SMTP_USERNAME}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # FIX: Added timeout=15 and using context manager 'with' to prevent connection leaks/hangs
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as server:
            server.starttls() # Secure the connection
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            
        logger.info(f"Email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")