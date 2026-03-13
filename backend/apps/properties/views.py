"""
Vasati — Property & Unit Views
All endpoints enforce IsPropertyScoped permission.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from decimal import Decimal

from .models import Property, Unit
from .serializers import (
    PropertySerializer, PropertyDetailSerializer,
    PropertySummarySerializer, UnitSerializer
)
from apps.core.permissions import IsOrgMember, IsPropertyScoped
from apps.core.mixins import PropertyScopedMixin


class PropertyViewSet(PropertyScopedMixin, viewsets.ModelViewSet):
    """
    CRUD for Properties. Scoped to user's accessible properties.
    GET    /api/v1/properties/           — List (scoped)
    POST   /api/v1/properties/           — Create
    GET    /api/v1/properties/{id}/      — Detail
    PATCH  /api/v1/properties/{id}/      — Update
    GET    /api/v1/properties/{id}/units/    — Units in property
    GET    /api/v1/properties/{id}/summary/  — Stats
    """
    permission_classes = [IsAuthenticated, IsOrgMember, IsPropertyScoped]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PropertyDetailSerializer
        return PropertySerializer

    def get_queryset(self):
        qs = Property.objects.filter(is_active=True)
        return self.filter_by_property(qs, property_field='id')

    @action(detail=True, methods=['get'])
    def units(self, request, pk=None):
        """GET /api/v1/properties/{id}/units/"""
        prop = self.get_object()
        units = Unit.objects.filter(property=prop).order_by('floor', 'unit_number')
        serializer = UnitSerializer(units, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """GET /api/v1/properties/{id}/summary/"""
        prop = self.get_object()
        units = Unit.objects.filter(property=prop)

        total = units.count()
        occupied = units.filter(status='occupied').count()
        vacant = units.filter(status='vacant').count()

        # Calculate rent totals from active leases
        from apps.tenancies.models import Lease
        from apps.payments.models import RentPayment
        import datetime

        today = datetime.date.today()
        active_leases = Lease.objects.filter(
            unit__property=prop,
            status__in=['active', 'expiring_soon']
        )
        expected = active_leases.aggregate(
            total=Sum('rent_npr')
        )['total'] or Decimal('0')

        # Collected this month
        collected = RentPayment.objects.filter(
            lease__unit__property=prop,
            status='completed',
            period_month_ad__year=today.year,
            period_month_ad__month=today.month,
        ).aggregate(total=Sum('amount_npr'))['total'] or Decimal('0')

        data = {
            'total_units': total,
            'occupied_units': occupied,
            'vacant_units': vacant,
            'occupancy_rate': (occupied / total * 100) if total > 0 else 0,
            'total_expected_rent': expected,
            'total_collected_rent': collected,
            'collection_rate': float(collected / expected * 100) if expected > 0 else 0,
        }
        return Response(PropertySummarySerializer(data).data)


class UnitViewSet(PropertyScopedMixin, viewsets.ModelViewSet):
    """
    CRUD for Units.
    GET    /api/v1/units/           — List all accessible units
    POST   /api/v1/units/           — Create unit
    GET    /api/v1/units/{id}/      — Detail
    PATCH  /api/v1/units/{id}/      — Update
    GET    /api/v1/units/{id}/lease/ — Active lease for unit
    """
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated, IsOrgMember, IsPropertyScoped]

    def get_queryset(self):
        qs = Unit.objects.select_related('property').all()
        return self.filter_by_property(qs, property_field='property')

    @action(detail=True, methods=['get'])
    def lease(self, request, pk=None):
        """GET /api/v1/units/{id}/lease/ — Active lease for unit"""
        unit = self.get_object()
        from apps.tenancies.models import Lease
        from apps.tenancies.serializers import LeaseSerializer
        active_lease = Lease.objects.filter(
            unit=unit, status__in=['active', 'expiring_soon']
        ).first()
        if not active_lease:
            return Response(
                {'detail': 'No active lease for this unit'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(LeaseSerializer(active_lease).data)
