"""
Vasati — Police Registration (Compliance) Model
Tenant-schema scoped. Tracks Nepal Police tenant registration per lease.
Phase 1: PDF form generation. Phase 2: Direct API submission.
"""
from django.db import models


class PoliceRegistration(models.Model):
    """
    Nepal Police tenant registration. Per tenant per lease.
    Phase 1: PDF form stored locally.
    Phase 2: Direct API submission to Nepal Police system.
    """
    STATUS = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('registered', 'Registered'),
        ('renewal_required', 'Renewal Required'),
        ('expired', 'Expired'),
    ]
    lease = models.OneToOneField('tenancies.Lease', on_delete=models.CASCADE, related_name='police_reg')
    tenant = models.ForeignKey('tenancies.Tenant', on_delete=models.PROTECT)

    status = models.CharField(max_length=30, choices=STATUS, default='not_started')

    # Nepal Police data fields (mirrors the police registration form)
    ward_police_office = models.CharField(max_length=200, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)  # From police
    registered_date_bs = models.CharField(max_length=10, blank=True)
    registered_date_ad = models.DateField(null=True, blank=True)
    expiry_date_ad = models.DateField(null=True, blank=True)  # Usually 1 year

    # Document
    form_document = models.CharField(max_length=500, blank=True)   # MinIO: filled PDF
    confirmation_document = models.CharField(max_length=500, blank=True)  # MinIO: police receipt

    # API submission (Phase 2)
    api_submission_id = models.CharField(max_length=200, blank=True)
    api_response = models.JSONField(default=dict, blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Police Reg: {self.tenant} — {self.status}"
