"""
Vasati — Tenancy Views
Tenant CRUD, Lease management, OrgMembership, Tenant Portal.
All endpoints enforce IsPropertyScoped.
"""
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from .models import Tenant, Lease, OrgMembership
from .serializers import (
    TenantSerializer, TenantListSerializer,
    LeaseSerializer, LeaseAcknowledgeSerializer,
    OrgMembershipSerializer, InviteMemberSerializer,
)
from apps.core.permissions import IsOrgMember, IsPropertyScoped, IsTenantPortalUser
from apps.core.mixins import PropertyScopedMixin
from apps.accounts.models import User, OTPCode

import logging

logger = logging.getLogger(__name__)


class TenantViewSet(PropertyScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/tenants/              — List
    POST   /api/v1/tenants/              — Create + KYC upload to MinIO
    GET    /api/v1/tenants/{id}/         — Detail
    PATCH  /api/v1/tenants/{id}/         — Update
    GET    /api/v1/tenants/{id}/leases/  — All leases for tenant
    GET    /api/v1/tenants/{id}/payments/ — Payment history
    """
    permission_classes = [IsAuthenticated, IsOrgMember]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return TenantListSerializer
        return TenantSerializer

    def get_queryset(self):
        return Tenant.objects.filter(is_active=True).order_by('-created_at')

    def perform_create(self, serializer):
        tenant = serializer.save()
        # Upload KYC files to MinIO if provided
        try:
            from apps.core.storage import upload_file
            front = self.request.FILES.get('citizenship_front')
            back = self.request.FILES.get('citizenship_back')
            if front:
                tenant.citizenship_front = upload_file(front, folder='kyc')
            if back:
                tenant.citizenship_back = upload_file(back, folder='kyc')
            if front or back:
                tenant.save(update_fields=['citizenship_front', 'citizenship_back'])
                logger.info(f"KYC uploaded for tenant {tenant.id}")
        except Exception as e:
            logger.error(f"KYC upload failed for tenant {tenant.id}: {e}")

    @action(detail=True, methods=['get'])
    def leases(self, request, pk=None):
        tenant = self.get_object()
        leases = Lease.objects.filter(tenant=tenant).select_related('unit', 'unit__property')
        return Response(LeaseSerializer(leases, many=True).data)

    @action(detail=True, methods=['get'])
    def payments(self, request, pk=None):
        tenant = self.get_object()
        from apps.payments.models import RentPayment
        from apps.payments.serializers import RentPaymentSerializer
        payments = RentPayment.objects.filter(
            lease__tenant=tenant
        ).order_by('-created_at')
        return Response(RentPaymentSerializer(payments, many=True).data)


class LeaseViewSet(PropertyScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/leases/                  — List
    POST   /api/v1/leases/                  — Create
    GET    /api/v1/leases/{id}/             — Detail
    PATCH  /api/v1/leases/{id}/             — Update
    POST   /api/v1/leases/{id}/acknowledge/ — Tenant OTP acknowledgment
    POST   /api/v1/leases/{id}/renew/       — Renew with new dates/rent
    POST   /api/v1/leases/{id}/terminate/   — Mark as terminated
    """
    serializer_class = LeaseSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        qs = Lease.objects.select_related(
            'tenant', 'unit', 'unit__property'
        ).order_by('-start_date_ad')
        return self.filter_by_property(qs, property_field='unit__property')

    def perform_create(self, serializer):
        lease = serializer.save()
        # Update unit status to occupied
        unit = lease.unit
        unit.status = 'occupied'
        unit.save(update_fields=['status'])

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """POST /api/v1/leases/{id}/acknowledge/ — Tenant OTP acknowledgment"""
        lease = self.get_object()
        ser = LeaseAcknowledgeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        # Verify OTP
        try:
            otp = OTPCode.objects.get(
                phone=lease.tenant.phone,
                code=ser.validated_data['otp_code'],
                purpose='sign',
                is_used=False,
                expires_at__gt=timezone.now(),
            )
        except OTPCode.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        lease.tenant_acknowledged = True
        lease.acknowledged_at = timezone.now()
        lease.status = 'active'
        lease.save(update_fields=['tenant_acknowledged', 'acknowledged_at', 'status'])

        return Response(LeaseSerializer(lease).data)

    @action(detail=True, methods=['post'])
    def renew(self, request, pk=None):
        """POST /api/v1/leases/{id}/renew/ — Renew with new dates/rent"""
        old_lease = self.get_object()

        required = ['start_date_bs', 'start_date_ad', 'end_date_bs', 'end_date_ad']
        for field in required:
            if field not in request.data:
                return Response(
                    {'error': f'{field} is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Mark old lease as expired
        old_lease.status = 'expired'
        old_lease.save(update_fields=['status'])

        # Create new lease
        new_lease = Lease.objects.create(
            tenant=old_lease.tenant,
            unit=old_lease.unit,
            start_date_bs=request.data['start_date_bs'],
            end_date_bs=request.data['end_date_bs'],
            start_date_ad=request.data['start_date_ad'],
            end_date_ad=request.data['end_date_ad'],
            rent_npr=request.data.get('rent_npr', old_lease.rent_npr),
            deposit_npr=request.data.get('deposit_npr', old_lease.deposit_npr),
            rent_due_day=request.data.get('rent_due_day', old_lease.rent_due_day),
            status='active',
        )
        return Response(LeaseSerializer(new_lease).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        """POST /api/v1/leases/{id}/terminate/ — Mark as terminated"""
        lease = self.get_object()
        lease.status = 'terminated'
        lease.save(update_fields=['status'])

        # Update unit status to vacant
        unit = lease.unit
        unit.status = 'vacant'
        unit.save(update_fields=['status'])

        return Response(LeaseSerializer(lease).data)

    @action(detail=True, methods=['get'])
    def document(self, request, pk=None):
        """GET /api/v1/leases/{id}/document/ — Download lease PDF"""
        lease = self.get_object()
        if not lease.lease_document:
            return Response(
                {'error': 'No lease document available'},
                status=status.HTTP_404_NOT_FOUND
            )
        try:
            from apps.core.storage import get_file_url
            url = get_file_url(lease.lease_document, expires_hours=1)
            return Response({'document_url': url})
        except Exception:
            return Response({'document_url': lease.lease_document})


# ──────────────────────────────────────────
# Tenant Portal Views (read-only for tenants)
# ──────────────────────────────────────────

class PortalMeView(APIView):
    """GET /api/v1/portal/me/ — My unit, lease, landlord info"""
    permission_classes = [IsAuthenticated, IsTenantPortalUser]

    def get(self, request):
        membership = OrgMembership.objects.filter(
            user_id=request.user.id, role='tenant', is_active=True
        ).first()
        if not membership:
            return Response({'error': 'Not a tenant'}, status=403)

        # Find tenant record linked to this user
        tenant = Tenant.objects.filter(user_id=request.user.id).first()
        if not tenant:
            return Response({'error': 'Tenant record not found'}, status=404)

        active_lease = Lease.objects.filter(
            tenant=tenant, status__in=['active', 'expiring_soon']
        ).select_related('unit', 'unit__property').first()

        data = {
            'tenant': TenantSerializer(tenant).data,
            'lease': LeaseSerializer(active_lease).data if active_lease else None,
            'unit': None,
            'property': None,
        }
        if active_lease:
            from apps.properties.serializers import UnitSerializer, PropertySerializer
            data['unit'] = UnitSerializer(active_lease.unit).data
            data['property'] = PropertySerializer(active_lease.unit.property).data

        return Response(data)


class PortalPaymentsView(APIView):
    """GET /api/v1/portal/payments/ — My payment history"""
    permission_classes = [IsAuthenticated, IsTenantPortalUser]

    def get(self, request):
        tenant = Tenant.objects.filter(user_id=request.user.id).first()
        if not tenant:
            return Response({'error': 'Tenant record not found'}, status=404)

        from apps.payments.models import RentPayment
        from apps.payments.serializers import RentPaymentSerializer
        payments = RentPayment.objects.filter(
            lease__tenant=tenant
        ).order_by('-created_at')
        return Response(RentPaymentSerializer(payments, many=True).data)


class PortalNoticesView(APIView):
    """GET /api/v1/portal/notices/ — Notices sent to me"""
    permission_classes = [IsAuthenticated, IsTenantPortalUser]

    def get(self, request):
        tenant = Tenant.objects.filter(user_id=request.user.id).first()
        if not tenant:
            return Response({'error': 'Tenant record not found'}, status=404)

        from apps.notices.models import Notice
        from apps.notices.serializers import NoticeSerializer
        notices = Notice.objects.filter(
            target_tenant=tenant
        ).order_by('-sent_at')
        return Response(NoticeSerializer(notices, many=True).data)
