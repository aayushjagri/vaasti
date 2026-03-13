"""
Vasati — Notice Model
Tenant-schema scoped. Communications log for SMS + in-app notices.
"""
from django.db import models


class Notice(models.Model):
    NOTICE_TYPES = [
        ('rent_reminder', 'Rent Reminder'),
        ('lease_expiry', 'Lease Expiry Warning'),
        ('general', 'General Notice'),
        ('maintenance', 'Maintenance Notice'),
        ('eviction_warning', 'Eviction Warning'),
        ('welcome', 'Welcome'),
    ]
    AUDIENCE = [
        ('single_tenant', 'Single Tenant'),
        ('unit', 'Single Unit'),
        ('floor', 'Entire Floor'),
        ('property', 'Entire Property'),
        ('all', 'All Tenants in Org'),
    ]
    notice_type = models.CharField(max_length=30, choices=NOTICE_TYPES)
    audience_type = models.CharField(max_length=20, choices=AUDIENCE)

    # Targeting (nullable depending on audience_type)
    target_property = models.ForeignKey(
        'properties.Property', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notices'
    )
    target_tenant = models.ForeignKey(
        'tenancies.Tenant', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notices'
    )

    subject = models.CharField(max_length=300)
    body = models.TextField()
    body_nepali = models.TextField(blank=True)

    sent_by_user_id = models.IntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)
    channels = models.JSONField(default=list)  # ['sms', 'app']
    delivery_status = models.JSONField(default=dict)   # {tenant_id: 'delivered'/'failed'}

    def __str__(self):
        return f"Notice: {self.subject} ({self.notice_type})"
