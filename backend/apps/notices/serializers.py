"""
Vasati — Notice Serializers
"""
from rest_framework import serializers
from .models import Notice


class NoticeSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_notice_type_display', read_only=True)
    audience_display = serializers.CharField(source='get_audience_type_display', read_only=True)
    property_name = serializers.SerializerMethodField()
    tenant_name = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = [
            'id', 'notice_type', 'type_display',
            'audience_type', 'audience_display',
            'target_property', 'property_name',
            'target_tenant', 'tenant_name',
            'subject', 'body', 'body_nepali',
            'sent_by_user_id', 'sent_at',
            'channels', 'delivery_status',
        ]
        read_only_fields = ['id', 'sent_at', 'delivery_status']

    def get_property_name(self, obj):
        return obj.target_property.name if obj.target_property else None

    def get_tenant_name(self, obj):
        return obj.target_tenant.full_name if obj.target_tenant else None


class CreateNoticeSerializer(serializers.Serializer):
    notice_type = serializers.ChoiceField(choices=Notice.NOTICE_TYPES)
    audience_type = serializers.ChoiceField(choices=Notice.AUDIENCE)
    target_property_id = serializers.IntegerField(required=False, allow_null=True)
    target_tenant_id = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(max_length=300)
    body = serializers.CharField()
    body_nepali = serializers.CharField(required=False, default='')
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=['sms', 'app']),
        default=['app']
    )
