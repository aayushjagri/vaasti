"""
Vasati — Production Settings
"""
from .base import *  # noqa: F401, F403

DEBUG = False

# Security
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# SMS — live Sparrow SMS
SMS_BACKEND = 'sparrow'

# Email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')  # noqa: F405
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))  # noqa: F405
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')  # noqa: F405
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')  # noqa: F405
EMAIL_USE_TLS = True
