"""
Vasati — Tenant (Organization) Models
Each row = one PostgreSQL schema. django-tenants handles schema routing.
"""
from django_tenants.models import TenantMixin, DomainMixin
from django.db import models


class Organization(TenantMixin):
    """
    Each row = one PostgreSQL schema.
    The schema_name is auto-used by django-tenants for routing.
    """
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('pro', 'Pro'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # django-tenants required
    auto_create_schema = True

    class Meta:
        app_label = 'tenants'

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    class Meta:
        app_label = 'tenants'

    def __str__(self):
        return self.domain
