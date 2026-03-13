"""
Vasati — Development Settings
"""
from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ['*']

# Log SMS to console in development
SMS_BACKEND = 'console'

# CORS — allow all in dev
CORS_ALLOW_ALL_ORIGINS = True

# Email — uses EMAIL_BACKEND from env/base.py
# Set EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend in .env for console output
# Set EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend in .env for real SMTP
