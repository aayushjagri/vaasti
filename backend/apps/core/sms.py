"""
Vasati Core — SMS utility (Sparrow SMS Nepal).
"""
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_sms(phone: str, message: str) -> bool:
    """Send SMS via Sparrow SMS Nepal."""
    if getattr(settings, 'SMS_BACKEND', 'console') == 'console':
        logger.info(f"[SMS CONSOLE] To: {phone} | Message: {message}")
        return True

    payload = {
        "token": settings.SPARROW_SMS_TOKEN,
        "from": settings.SPARROW_SMS_FROM,
        "to": phone,
        "text": message,
    }
    try:
        response = requests.post(
            "http://api.sparrowsms.com/v2/sms/",
            data=payload, timeout=10
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"SMS send failed: {e}")
        return False


# Message templates — always include BS date
TEMPLATES = {
    'rent_due_7_days': "Namaste {name}! Vasati: {month_bs} ko bhada NPR {amount} {due_date_bs} ma tirna paincha. Lease: {unit}.",
    'rent_overdue_3': "Namaste {name}! Vasati: Tapainko {month_bs} ko bhada NPR {amount} {days} din baki cha. Kripaya bhuktan garnuhola.",
    'tenant_welcome': "Vasati ma swagat cha! Tapainko tenant portal: {portal_url}. Login garna: {otp_url}",
    'otp': "Vasati OTP: {otp}. 10 minute samma valid. Kasailai nadiinuhos.",
    'lease_expiring': "Vasati: {name} ko lease {unit} ma {days} din ma samapti hune cha ({expiry_bs}). Nobikaranako laagi sambarka garnuhola.",
}
