"""
Vasati — Base Settings
Common settings shared between development and production.
"""
import os
from pathlib import Path
from datetime import timedelta

import dj_database_url
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'insecure-dev-key-change-me')

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# ---------------------------------------------------------------------------
# Multi-tenancy — django-tenants
# ---------------------------------------------------------------------------
SHARED_APPS = [
    'django_tenants',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.admin',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'apps.tenants',        # Organization + Domain models live here
    'apps.accounts',       # Platform-level user auth
]

TENANT_APPS = [
    'django.contrib.sessions',
    'apps.properties',
    'apps.tenancies',
    'apps.payments',
    'apps.compliance',
    'apps.notices',
    'apps.reports',
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

# Add third-party apps (not tenant-specific)
INSTALLED_APPS += [
    'rest_framework',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    'apps.core',
]

TENANT_MODEL = 'tenants.Organization'
TENANT_DOMAIN_MODEL = 'tenants.Domain'

DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',  # MUST be first
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'vasati.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'vasati.wsgi.application'

# ---------------------------------------------------------------------------
# Database — django-tenants requires the ENGINE override
# ---------------------------------------------------------------------------
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get(
            'DATABASE_URL',
            'postgres://vasati:changeme@localhost:5432/vasati'
        )
    )
}
DATABASES['default']['ENGINE'] = 'django_tenants.postgresql_backend'

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = 'accounts.User'

# ---------------------------------------------------------------------------
# REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 25,
}

# ---------------------------------------------------------------------------
# SimpleJWT
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:5173,http://localhost:3000'
).split(',')

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Kathmandu'

# ---------------------------------------------------------------------------
# MinIO / S3
# ---------------------------------------------------------------------------
MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT', 'localhost:9000')
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY', 'vasati_admin')
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY', 'changeme_minio_password')
MINIO_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'vasati-documents')
MINIO_USE_SSL = os.environ.get('MINIO_USE_SSL', 'False').lower() in ('true', '1')

# ---------------------------------------------------------------------------
# SMS (Sparrow SMS Nepal)
# ---------------------------------------------------------------------------
SPARROW_SMS_TOKEN = os.environ.get('SPARROW_SMS_TOKEN', '')
SPARROW_SMS_FROM = os.environ.get('SPARROW_SMS_FROM', 'Vasati')

# ---------------------------------------------------------------------------
# Payment Gateways
# ---------------------------------------------------------------------------
ESEWA_MERCHANT_CODE = os.environ.get('ESEWA_MERCHANT_CODE', '')
ESEWA_SECRET_KEY = os.environ.get('ESEWA_SECRET_KEY', '')
KHALTI_SECRET_KEY = os.environ.get('KHALTI_SECRET_KEY', '')

# ---------------------------------------------------------------------------
# Police API (Phase 2)
# ---------------------------------------------------------------------------
NEPAL_POLICE_API_URL = os.environ.get('NEPAL_POLICE_API_URL', '')
NEPAL_POLICE_API_KEY = os.environ.get('NEPAL_POLICE_API_KEY', '')

# ---------------------------------------------------------------------------
# Frontend URL (for callbacks, links in SMS etc.)
# ---------------------------------------------------------------------------
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# ---------------------------------------------------------------------------
# Email (for OTP via email channel)
# ---------------------------------------------------------------------------
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'info@depthnepal.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Vasati <noreply@vasati.com>')

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
