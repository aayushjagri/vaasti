"""
Vasati — Payment Views
CRUD, cash logging, receipt PDF generation.
"""
import io
import datetime
from decimal import Decimal

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from .models import RentPayment, PaymentReminder
from .serializers import (
    RentPaymentSerializer, LogCashPaymentSerializer,
    PaymentReminderSerializer,
)
from apps.core.permissions import IsOrgMember
from apps.core.mixins import PropertyScopedMixin
from apps.tenancies.models import Lease

import logging

logger = logging.getLogger(__name__)


def _generate_receipt_number():
    """Generate receipt number: VAS-YYYY-MM-NNNN"""
    now = datetime.date.today()
    # Count existing receipts this month
    month_count = RentPayment.objects.filter(
        created_at__year=now.year,
        created_at__month=now.month,
    ).count() + 1
    return f"VAS-{now.year}-{now.month:02d}-{month_count:04d}"


class RentPaymentViewSet(PropertyScopedMixin, viewsets.ModelViewSet):
    """
    GET    /api/v1/payments/           — List all payments
    POST   /api/v1/payments/           — Record payment
    GET    /api/v1/payments/{id}/      — Detail
    GET    /api/v1/payments/{id}/receipt/ — Download receipt PDF
    """
    serializer_class = RentPaymentSerializer
    permission_classes = [IsAuthenticated, IsOrgMember]

    def get_queryset(self):
        qs = RentPayment.objects.select_related(
            'lease', 'lease__tenant', 'lease__unit', 'lease__unit__property'
        ).order_by('-created_at')
        return self.filter_by_property(qs, property_field='lease__unit__property')

    def perform_create(self, serializer):
        serializer.save(
            receipt_number=_generate_receipt_number(),
            logged_by_user_id=self.request.user.id,
        )

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        """GET /api/v1/payments/{id}/receipt/ — Download receipt PDF"""
        payment = self.get_object()
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A5
            from reportlab.lib.units import mm

            buffer = io.BytesIO()
            c = canvas.Canvas(buffer, pagesize=A5)
            width, height = A5

            # Header
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(width / 2, height - 30 * mm, "VASATI - RENT RECEIPT")

            c.setFont("Helvetica", 10)
            y = height - 45 * mm

            details = [
                ("Receipt No:", payment.receipt_number),
                ("Date:", payment.paid_at_ad.strftime('%Y-%m-%d') if payment.paid_at_ad else 'N/A'),
                ("Date (BS):", payment.paid_at_bs or 'N/A'),
                ("", ""),
                ("Tenant:", payment.lease.tenant.full_name),
                ("Phone:", payment.lease.tenant.phone),
                ("Property:", payment.lease.unit.property.name),
                ("Unit:", payment.lease.unit.unit_number),
                ("", ""),
                ("Period (BS):", payment.period_month_bs),
                ("Amount:", f"NPR {payment.amount_npr:,.2f}"),
                ("Method:", payment.get_method_display()),
                ("Status:", payment.get_status_display()),
                ("Transaction Ref:", payment.transaction_ref or '-'),
            ]

            for label, value in details:
                if label:
                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(20 * mm, y, label)
                    c.setFont("Helvetica", 10)
                    c.drawString(60 * mm, y, str(value))
                y -= 6 * mm

            # Footer
            c.setFont("Helvetica-Oblique", 8)
            c.drawCentredString(
                width / 2, 15 * mm,
                "This is a computer-generated receipt. No signature required."
            )

            c.showPage()
            c.save()

            buffer.seek(0)
            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = (
                f'attachment; filename="receipt_{payment.receipt_number}.pdf"'
            )
            return response
        except ImportError:
            return Response(
                {'error': 'PDF generation not available'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogCashPaymentView(APIView):
    """
    POST /api/v1/payments/cash/
    Log a cash payment manually.
    """
    permission_classes = [IsAuthenticated, IsOrgMember]

    def post(self, request):
        serializer = LogCashPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            lease = Lease.objects.get(id=serializer.validated_data['lease_id'])
        except Lease.DoesNotExist:
            return Response(
                {'error': 'Lease not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        payment = RentPayment.objects.create(
            lease=lease,
            amount_npr=serializer.validated_data['amount_npr'],
            period_month_bs=serializer.validated_data['period_month_bs'],
            period_month_ad=serializer.validated_data['period_month_ad'],
            method='cash',
            status='completed',
            paid_at_bs=serializer.validated_data.get('paid_at_bs', ''),
            paid_at_ad=timezone.now(),
            logged_by_user_id=request.user.id,
            receipt_number=_generate_receipt_number(),
            notes=serializer.validated_data.get('notes', ''),
        )

        return Response(
            RentPaymentSerializer(payment).data,
            status=status.HTTP_201_CREATED,
        )
