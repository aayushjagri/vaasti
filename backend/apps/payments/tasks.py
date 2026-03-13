"""
Vasati — Payment Celery Tasks
Daily rent reminders at 9 AM NPT.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_rent_reminders():
    """
    Runs daily at 9 AM NPT.
    Iterates all tenant schemas. For each active lease,
    checks if a reminder should be sent today.
    """
    from apps.tenants.models import Organization
    from django_tenants.utils import tenant_context

    for org in Organization.objects.exclude(schema_name='public'):
        with tenant_context(org):
            _process_reminders_for_tenant()


def _process_reminders_for_tenant():
    from apps.tenancies.models import Lease
    from apps.payments.models import RentPayment, PaymentReminder
    from apps.core.sms import send_sms, TEMPLATES
    import datetime

    today = datetime.date.today()
    active_leases = Lease.objects.filter(status='active')

    for lease in active_leases:
        try:
            due_date = today.replace(day=lease.rent_due_day)
        except ValueError:
            # Handle months with fewer days than rent_due_day
            import calendar
            last_day = calendar.monthrange(today.year, today.month)[1]
            due_date = today.replace(day=min(lease.rent_due_day, last_day))

        days_to_due = (due_date - today).days

        # Check if paid for this month
        already_paid = RentPayment.objects.filter(
            lease=lease,
            period_month_ad__year=today.year,
            period_month_ad__month=today.month,
            status='completed'
        ).exists()

        if not already_paid:
            reminder_type = None
            if days_to_due == 7:
                reminder_type = 'due_7_days'
            elif days_to_due == 0:
                reminder_type = 'due_today'
            elif days_to_due == -3:
                reminder_type = 'overdue_3'
            elif days_to_due == -7:
                reminder_type = 'overdue_7'

            if reminder_type:
                message = TEMPLATES.get(f'rent_{reminder_type}', '').format(
                    name=lease.tenant.full_name,
                    month_bs=lease.start_date_bs[:7],
                    amount=lease.rent_npr,
                    due_date_bs=f"{lease.start_date_bs[:8]}{lease.rent_due_day:02d}",
                    unit=lease.unit.unit_number,
                    days=abs(days_to_due),
                )
                send_sms(lease.tenant.phone, message)
                PaymentReminder.objects.create(
                    lease=lease,
                    reminder_type=reminder_type,
                    channel='sms',
                    delivered=True,
                    message_preview=message[:200],
                )
                logger.info(f"Sent {reminder_type} reminder for lease {lease.id}")
