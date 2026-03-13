"""
Vasati — Tenancy Serializers
Tenant, Lease, OrgMembership serializers.
"""
from rest_framework import serializers
from .models import Tenant, Lease, OrgMembership


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = [
            'id', 'full_name', 'full_name_nepali', 'phone', 'email',
            'citizenship_number', 'citizenship_front', 'citizenship_back',
            'date_of_birth_bs', 'date_of_birth_ad',
            'permanent_address', 'emergency_contact_name', 'emergency_contact_phone',
            'profession', 'user_id', 'portal_activated',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'portal_activated']


class TenantListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views."""
    active_lease = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = [
            'id', 'full_name', 'full_name_nepali', 'phone',
            'citizenship_number', 'profession', 'portal_activated',
            'is_active', 'active_lease',
        ]

    def get_active_lease(self, obj):
        lease = Lease.objects.filter(
            tenant=obj,
            status__in=['active', 'expiring_soon']
        ).select_related('unit', 'unit__property').first()
        if lease:
            return {
                'id': lease.id,
                'unit': f"{lease.unit.property.name} - {lease.unit.unit_number}",
                'rent_npr': str(lease.rent_npr),
                'status': lease.status,
                'end_date_bs': lease.end_date_bs,
            }
        return None


class LeaseSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source='tenant.full_name', read_only=True)
    tenant_phone = serializers.CharField(source='tenant.phone', read_only=True)
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    property_name = serializers.CharField(source='unit.property.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Lease
        fields = [
            'id', 'tenant', 'tenant_name', 'tenant_phone',
            'unit', 'unit_number', 'property_name',
            'start_date_bs', 'end_date_bs', 'start_date_ad', 'end_date_ad',
            'rent_npr', 'deposit_npr', 'rent_due_day',
            'status', 'status_display',
            'lease_document', 'tenant_acknowledged', 'acknowledged_at',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'tenant_acknowledged', 'acknowledged_at',
        ]


class LeaseAcknowledgeSerializer(serializers.Serializer):
    otp_code = serializers.CharField(max_length=6)


class OrgMembershipSerializer(serializers.ModelSerializer):
    user_phone = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = OrgMembership
        fields = [
            'id', 'user_id', 'user_phone', 'user_name',
            'role', 'is_active', 'invited_at', 'accepted_at',
        ]
        read_only_fields = ['id', 'invited_at']

    def get_user_phone(self, obj):
        from apps.accounts.models import User
        try:
            user = User.objects.get(id=obj.user_id)
            return user.phone
        except User.DoesNotExist:
            return None

    def get_user_name(self, obj):
        from apps.accounts.models import User
        try:
            user = User.objects.get(id=obj.user_id)
            return user.full_name
        except User.DoesNotExist:
            return None


class InviteMemberSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    role = serializers.ChoiceField(choices=OrgMembership.ROLES)
    property_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[]
    )
