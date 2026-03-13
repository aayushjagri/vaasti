"""
Vasati — Tenant, Lease, & OrgMembership Models
Tenant-schema scoped. Tenants have leases on units.
OrgMembership links platform Users to roles within this org's schema.
BS + AD dual date fields — never one without the other.
"""
from django.db import models


class OrgMembership(models.Model):
    """
    Lives in each tenant schema. Links a platform User to a role within this org.
    Property-scoped roles are enforced here.
    """
    ROLES = [
        ('owner', 'Corporate Owner'),        # All properties, all data
        ('manager', 'Property Manager'),     # Assigned properties only
        ('caretaker', 'Caretaker'),          # Assigned units only
        ('tenant', 'Tenant'),                # Own data only
    ]
    user_id = models.IntegerField()          # FK to public.accounts_user
    role = models.CharField(max_length=20, choices=ROLES)
    # NULL = access to all properties (for owner role)
    assigned_properties = models.ManyToManyField(
        'properties.Property',
        blank=True,
        related_name='assigned_managers'
    )
    assigned_units = models.ManyToManyField(
        'properties.Unit',
        blank=True,
        related_name='assigned_caretakers'
    )
    is_active = models.BooleanField(default=True)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user_id', 'role')

    def __str__(self):
        return f"Membership user_id={self.user_id} role={self.role}"


class Tenant(models.Model):
    """
    One Tenant record = one person. Can have multiple Leases over time.
    Linked to a platform User via user_id for portal access.
    """
    # Identity
    full_name = models.CharField(max_length=200)
    full_name_nepali = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True)

    # KYC
    citizenship_number = models.CharField(max_length=50, unique=True)
    citizenship_front = models.CharField(max_length=500, blank=True)  # MinIO key
    citizenship_back = models.CharField(max_length=500, blank=True)
    date_of_birth_bs = models.CharField(max_length=10, blank=True)    # BS date string YYYY-MM-DD
    date_of_birth_ad = models.DateField(null=True, blank=True)

    # Contact
    permanent_address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)
    profession = models.CharField(max_length=100, blank=True)

    # Platform link (nullable — tenant may not have activated portal yet)
    user_id = models.IntegerField(null=True, blank=True)  # FK to public.accounts_user
    portal_activated = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class Lease(models.Model):
    STATUS = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('expiring_soon', 'Expiring Soon'),     # Auto-set by Celery beat
        ('expired', 'Expired'),
        ('terminated', 'Terminated'),
        ('month_to_month', 'Month to Month'),
    ]
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='leases')
    unit = models.ForeignKey('properties.Unit', on_delete=models.PROTECT, related_name='leases')

    # Dates stored in both calendars
    start_date_bs = models.CharField(max_length=10)     # e.g. "2081-04-15"
    end_date_bs = models.CharField(max_length=10)
    start_date_ad = models.DateField()
    end_date_ad = models.DateField()

    # Financial
    rent_npr = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_npr = models.DecimalField(max_digits=10, decimal_places=2)
    rent_due_day = models.PositiveSmallIntegerField(default=1)   # day of month

    # Status
    status = models.CharField(max_length=20, choices=STATUS, default='draft')

    # Document
    lease_document = models.CharField(max_length=500, blank=True)  # MinIO key (PDF)
    tenant_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date_ad']

    def __str__(self):
        return f"Lease: {self.tenant.full_name} → {self.unit} ({self.status})"
