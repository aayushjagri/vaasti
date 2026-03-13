"""
Vasati — Notice Views
Create, send (SMS + in-app), and log notices.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notice
from .serializers import NoticeSerializer, CreateNoticeSerializer
from apps.core.permissions import IsOrgMember, IsOwnerOrManager
from apps.core.sms import send_sms

import logging
logger = logging.getLogger(__name__)


class NoticeViewSet(viewsets.ModelViewSet):
    """
    GET    /api/v1/notices/           — List notices
    POST   /api/v1/notices/           — Create + send notice
    GET    /api/v1/notices/{id}/      — Detail
    """
    serializer_class = NoticeSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        return Notice.objects.all().order_by('-sent_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateNoticeSerializer
        return NoticeSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateNoticeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Build notice
        notice = Notice.objects.create(
            notice_type=data['notice_type'],
            audience_type=data['audience_type'],
            target_property_id=data.get('target_property_id'),
            target_tenant_id=data.get('target_tenant_id'),
            subject=data['subject'],
            body=data['body'],
            body_nepali=data.get('body_nepali', ''),
            sent_by_user_id=request.user.id,
            channels=data.get('channels', ['app']),
        )

        # Send SMS if channel includes 'sms'
        delivery = {}
        if 'sms' in data.get('channels', []):
            recipients = self._get_recipients(data)
            for tenant in recipients:
                try:
                    send_sms(tenant.phone, f"{data['subject']}: {data['body'][:100]}")
                    delivery[str(tenant.id)] = 'delivered'
                except Exception as e:
                    delivery[str(tenant.id)] = f'failed: {str(e)}'
                    logger.error(f"SMS to {tenant.phone} failed: {e}")

            notice.delivery_status = delivery
            notice.save(update_fields=['delivery_status'])

        return Response(
            NoticeSerializer(notice).data,
            status=status.HTTP_201_CREATED
        )

    def _get_recipients(self, data):
        """Resolve recipients based on audience type."""
        from apps.tenancies.models import Tenant, Lease

        audience = data['audience_type']

        if audience == 'single_tenant' and data.get('target_tenant_id'):
            return Tenant.objects.filter(id=data['target_tenant_id'], is_active=True)

        if audience == 'property' and data.get('target_property_id'):
            # All tenants with active leases in this property
            lease_tenant_ids = Lease.objects.filter(
                unit__property_id=data['target_property_id'],
                status__in=['active', 'expiring_soon'],
            ).values_list('tenant_id', flat=True)
            return Tenant.objects.filter(id__in=lease_tenant_ids, is_active=True)

        if audience == 'all':
            lease_tenant_ids = Lease.objects.filter(
                status__in=['active', 'expiring_soon'],
            ).values_list('tenant_id', flat=True)
            return Tenant.objects.filter(id__in=lease_tenant_ids, is_active=True)

        return Tenant.objects.none()
