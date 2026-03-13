"""
Vasati — Payment Serializers
"""
from rest_framework import serializers
from .models import RentPayment, PaymentReminder


class RentPaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tenant_name = serializers.SerializerMethodField()
    unit_number = serializers.SerializerMethodField()

    class Meta:
        model = RentPayment
        fields = [
            'id', 'lease', 'amount_npr',
            'period_month_bs', 'period_month_ad',
            'method', 'method_display', 'status', 'status_display',
            'transaction_ref', 'paid_at_bs', 'paid_at_ad',
            'logged_by_user_id', 'receipt_number', 'receipt_document',
            'notes', 'created_at',
            'tenant_name', 'unit_number',
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at']

    def get_tenant_name(self, obj):
        try:
            return obj.lease.tenant.full_name
        except Exception:
            return None

    def get_unit_number(self, obj):
        try:
            return f"{obj.lease.unit.property.name} - {obj.lease.unit.unit_number}"
        except Exception:
            return None


class LogCashPaymentSerializer(serializers.Serializer):
    """For manually logging cash payments."""
    lease_id = serializers.IntegerField()
    amount_npr = serializers.DecimalField(max_digits=10, decimal_places=2)
    period_month_bs = serializers.CharField()
    period_month_ad = serializers.DateField()
    paid_at_bs = serializers.CharField(required=False, default='')
    notes = serializers.CharField(required=False, default='')


class PaymentReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentReminder
        fields = [
            'id', 'lease', 'reminder_type', 'channel',
            'sent_at', 'delivered', 'message_preview',
        ]
