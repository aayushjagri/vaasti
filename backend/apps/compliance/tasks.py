"""
Vasati — Compliance Celery Tasks
Police registration renewal alerts.
"""
from celery import shared_task
import datetime
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_registration_renewals():
    """Runs daily. Checks for police registrations expiring soon."""
    from apps.tenants.models import Organization
    from django_tenants.utils import tenant_context
    from apps.compliance.models import PoliceRegistration

    for org in Organization.objects.exclude(schema_name='public'):
        with tenant_context(org):
            today = datetime.date.today()
            for days_ahead in [30, 15, 7]:
                target_date = today + datetime.timedelta(days=days_ahead)
                expiring = PoliceRegistration.objects.filter(
                    status='registered',
                    expiry_date_ad=target_date
                )
                count = expiring.update(status='renewal_required')
                if count:
                    logger.info(
                        f"Org {org.schema_name}: {count} police registrations need renewal in {days_ahead} days"
                    )

            # Mark expired registrations
            expired_count = PoliceRegistration.objects.filter(
                status__in=['registered', 'renewal_required'],
                expiry_date_ad__lt=today
            ).update(status='expired')
            if expired_count:
                logger.info(f"Org {org.schema_name}: {expired_count} police registrations expired")
