"""
Vasati — Compliance Serializers
"""
from rest_framework import serializers
from .models import PoliceRegistration


class PoliceRegistrationSerializer(serializers.ModelSerializer):
    tenant_name = serializers.SerializerMethodField()
    tenant_phone = serializers.SerializerMethodField()
    unit_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PoliceRegistration
        fields = [
            'id', 'lease', 'tenant', 'tenant_name', 'tenant_phone', 'unit_info',
            'status', 'status_display',
            'ward_police_office', 'registration_number',
            'registered_date_bs', 'registered_date_ad', 'expiry_date_ad',
            'form_document', 'confirmation_document',
            'api_submission_id', 'api_response',
            'submitted_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_tenant_name(self, obj):
        return obj.tenant.full_name if obj.tenant else None

    def get_tenant_phone(self, obj):
        return obj.tenant.phone if obj.tenant else None

    def get_unit_info(self, obj):
        try:
            unit = obj.lease.unit
            return f"{unit.property.name} - {unit.unit_number}"
        except Exception:
            return None
