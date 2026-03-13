"""
Vasati — Reports / Dashboard Views
Aggregated data endpoint for the dashboard.
"""
import datetime
from decimal import Decimal

from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsOrgMember
from apps.core.mixins import PropertyScopedMixin
from apps.properties.models import Property, Unit
from apps.tenancies.models import Tenant, Lease
from apps.payments.models import RentPayment
from apps.compliance.models import PoliceRegistration


class DashboardView(PropertyScopedMixin, APIView):
    """
    GET /api/v1/reports/dashboard/
    Returns aggregated dashboard stats for the org.
    """
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get(self, request):
        today = datetime.date.today()

        # Property & Unit stats
        properties = Property.objects.filter(is_active=True)
        accessible_ids = self.get_accessible_property_ids()
        if accessible_ids is not None:
            properties = properties.filter(id__in=accessible_ids)

        total_properties = properties.count()
        units = Unit.objects.filter(property__in=properties)
        total_units = units.count()
        occupied = units.filter(status='occupied').count()
        vacant = units.filter(status='vacant').count()
        maintenance = units.filter(status='maintenance').count()

        # Lease stats
        active_leases = Lease.objects.filter(
            unit__property__in=properties,
            status__in=['active', 'expiring_soon']
        )
        expiring_soon = active_leases.filter(status='expiring_soon').count()
        expired_leases = Lease.objects.filter(
            unit__property__in=properties,
            status='expired'
        ).count()

        # Tenant stats
        active_tenant_ids = active_leases.values_list('tenant_id', flat=True).distinct()
        total_active_tenants = active_tenant_ids.count()

        # Revenue stats — this month
        expected_rent = active_leases.aggregate(
            total=Sum('rent_npr')
        )['total'] or Decimal('0')

        collected_this_month = RentPayment.objects.filter(
            lease__unit__property__in=properties,
            status='completed',
            period_month_ad__year=today.year,
            period_month_ad__month=today.month,
        ).aggregate(total=Sum('amount_npr'))['total'] or Decimal('0')

        collection_rate = (
            float(collected_this_month / expected_rent * 100)
            if expected_rent > 0 else 0
        )

        # Revenue last 6 months
        monthly_revenue = []
        for i in range(5, -1, -1):
            dt = today.replace(day=1)
            for _ in range(i):
                dt = (dt - datetime.timedelta(days=1)).replace(day=1)
            month_total = RentPayment.objects.filter(
                lease__unit__property__in=properties,
                status='completed',
                period_month_ad__year=dt.year,
                period_month_ad__month=dt.month,
            ).aggregate(total=Sum('amount_npr'))['total'] or Decimal('0')
            monthly_revenue.append({
                'year': dt.year,
                'month': dt.month,
                'total_npr': str(month_total),
            })

        # Compliance stats
        compliance_pending = PoliceRegistration.objects.filter(
            lease__unit__property__in=properties,
            status__in=['not_started', 'in_progress']
        ).count()
        compliance_expiring = PoliceRegistration.objects.filter(
            lease__unit__property__in=properties,
            status='renewal_required'
        ).count()

        # Overdue payments (leases with no completed payment for current month)
        leases_missing_payment = active_leases.exclude(
            id__in=RentPayment.objects.filter(
                status='completed',
                period_month_ad__year=today.year,
                period_month_ad__month=today.month,
            ).values_list('lease_id', flat=True)
        )
        overdue_count = leases_missing_payment.filter(
            rent_due_day__lt=today.day
        ).count()

        # Recent payments
        from apps.payments.serializers import RentPaymentSerializer
        recent_payments = RentPayment.objects.filter(
            lease__unit__property__in=properties
        ).select_related(
            'lease', 'lease__tenant', 'lease__unit', 'lease__unit__property'
        ).order_by('-created_at')[:5]

        data = {
            'properties': {
                'total': total_properties,
                'units_total': total_units,
                'units_occupied': occupied,
                'units_vacant': vacant,
                'units_maintenance': maintenance,
                'occupancy_rate': round(occupied / total_units * 100, 1) if total_units > 0 else 0,
            },
            'tenants': {
                'active': total_active_tenants,
            },
            'leases': {
                'active': active_leases.count(),
                'expiring_soon': expiring_soon,
                'expired': expired_leases,
            },
            'revenue': {
                'expected_this_month': str(expected_rent),
                'collected_this_month': str(collected_this_month),
                'collection_rate': round(collection_rate, 1),
                'overdue_count': overdue_count,
                'monthly_trend': monthly_revenue,
            },
            'compliance': {
                'pending_registrations': compliance_pending,
                'expiring_registrations': compliance_expiring,
            },
            'recent_payments': RentPaymentSerializer(recent_payments, many=True).data,
        }

        return Response(data)
