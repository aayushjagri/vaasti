"""
Vasati — Compliance Views
Police registration CRUD + status tracking.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import PoliceRegistration
from .serializers import PoliceRegistrationSerializer
from apps.core.permissions import IsOrgMember
from apps.core.mixins import PropertyScopedMixin

import logging
logger = logging.getLogger(__name__)


class PoliceRegistrationViewSet(PropertyScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/compliance/           — List all registrations
    POST   /api/v1/compliance/           — Create registration
    GET    /api/v1/compliance/{id}/      — Detail
    PATCH  /api/v1/compliance/{id}/      — Update (e.g. set registration number)
    POST   /api/v1/compliance/{id}/submit/ — Mark as submitted
    """
    serializer_class = PoliceRegistrationSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        qs = PoliceRegistration.objects.select_related(
            'lease', 'tenant', 'lease__unit', 'lease__unit__property'
        ).order_by('-created_at')
        return self.filter_by_property(qs, property_field='lease__unit__property')

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Mark registration as submitted to police."""
        reg = self.get_object()
        reg.status = 'submitted'
        from django.utils import timezone
        reg.submitted_at = timezone.now()
        reg.save(update_fields=['status', 'submitted_at'])
        return Response(PoliceRegistrationSerializer(reg).data)

    @action(detail=True, methods=['post'])
    def mark_registered(self, request, pk=None):
        """Mark registration as completed by police."""
        reg = self.get_object()
        reg.status = 'registered'
        reg.registration_number = request.data.get('registration_number', '')
        reg.registered_date_bs = request.data.get('registered_date_bs', '')
        if request.data.get('registered_date_ad'):
            reg.registered_date_ad = request.data['registered_date_ad']
        if request.data.get('expiry_date_ad'):
            reg.expiry_date_ad = request.data['expiry_date_ad']
        reg.save()
        return Response(PoliceRegistrationSerializer(reg).data)
