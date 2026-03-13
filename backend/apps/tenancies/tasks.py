"""
Vasati — Tenancy Celery Tasks
Lease expiry checks.
"""
from celery import shared_task
import datetime
import logging

logger = logging.getLogger(__name__)


@shared_task
def check_lease_expiries():
    """Runs daily. Marks leases as expiring_soon and sends notices."""
    from apps.tenants.models import Organization
    from django_tenants.utils import tenant_context
    from apps.tenancies.models import Lease

    for org in Organization.objects.exclude(schema_name='public'):
        with tenant_context(org):
            today = datetime.date.today()
            for days_ahead in [30, 15, 7]:
                target_date = today + datetime.timedelta(days=days_ahead)
                expiring = Lease.objects.filter(
                    status='active',
                    end_date_ad=target_date
                )
                count = expiring.update(status='expiring_soon')
                if count:
                    logger.info(
                        f"Org {org.schema_name}: {count} leases expiring in {days_ahead} days"
                    )
                    # TODO: Send notices to affected tenants

            # Mark actually expired leases
            expired_count = Lease.objects.filter(
                status__in=['active', 'expiring_soon'],
                end_date_ad__lt=today
            ).update(status='expired')
            if expired_count:
                logger.info(f"Org {org.schema_name}: {expired_count} leases expired")
