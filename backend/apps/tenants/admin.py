from django.contrib import admin
from .models import Organization, Domain


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'subscription_tier', 'is_active', 'created_at')
    list_filter = ('subscription_tier', 'is_active')
    search_fields = ('name', 'slug')


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary')
