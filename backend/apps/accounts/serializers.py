"""
Vasati — Account Serializers
OTP auth flow (phone OR email), user details, org membership.
"""
from rest_framework import serializers
from .models import User, OTPCode


class RequestOTPSerializer(serializers.Serializer):
    """Accept phone OR email — never both."""
    phone = serializers.CharField(max_length=15, required=False, default='')
    email = serializers.EmailField(required=False, default='')
    purpose = serializers.ChoiceField(
        choices=[('login', 'Login'), ('onboard', 'Tenant Onboard'), ('sign', 'Sign Lease')],
        default='login'
    )

    def validate(self, data):
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        if phone and email:
            raise serializers.ValidationError('Provide either phone or email, not both')
        if not phone and not email:
            raise serializers.ValidationError('Phone or email is required')
        return data


class VerifyOTPSerializer(serializers.Serializer):
    """Verify with the same identifier used to request."""
    phone = serializers.CharField(max_length=15, required=False, default='')
    email = serializers.EmailField(required=False, default='')
    code = serializers.CharField(max_length=6)
    purpose = serializers.ChoiceField(
        choices=[('login', 'Login'), ('onboard', 'Tenant Onboard'), ('sign', 'Sign Lease')],
        default='login'
    )

    def validate(self, data):
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip()
        if not phone and not email:
            raise serializers.ValidationError('Phone or email is required')
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'full_name', 'full_name_nepali',
                  'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UserMeSerializer(serializers.ModelSerializer):
    """Extended user serializer with org membership context."""
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'phone', 'email', 'full_name', 'full_name_nepali',
                  'is_active', 'created_at', 'memberships']
        read_only_fields = ['id', 'created_at']

    def get_memberships(self, obj):
        try:
            from apps.tenancies.models import OrgMembership
            memberships = OrgMembership.objects.filter(
                user_id=obj.id, is_active=True
            )
            result = []
            for m in memberships:
                try:
                    result.append({
                        'role': m.role,
                        'invited_at': m.invited_at.isoformat() if m.invited_at else None,
                        'accepted_at': m.accepted_at.isoformat() if m.accepted_at else None,
                    })
                except Exception:
                    continue
            return result
        except Exception:
            # Public schema — tenancies_orgmembership doesn't exist
            return []
