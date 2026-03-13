"""
Vasati — Celery Configuration
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vasati.settings.development')

app = Celery('vasati')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Beat schedule — all times are NPT (Asia/Kathmandu)
app.conf.beat_schedule = {
    'send-rent-reminders-daily': {
        'task': 'apps.payments.tasks.send_rent_reminders',
        'schedule': crontab(hour=9, minute=0),  # 9 AM NPT
    },
    'check-lease-expiries-daily': {
        'task': 'apps.tenancies.tasks.check_lease_expiries',
        'schedule': crontab(hour=8, minute=0),
    },
    'check-police-reg-renewals': {
        'task': 'apps.compliance.tasks.check_registration_renewals',
        'schedule': crontab(hour=8, minute=30),
    },
}
