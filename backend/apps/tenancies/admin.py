from django.contrib import admin
from .models import Tenant, Lease


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone', 'citizenship_number', 'portal_activated', 'is_active')
    list_filter = ('is_active', 'portal_activated')
    search_fields = ('full_name', 'phone', 'citizenship_number')


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'unit', 'status', 'start_date_bs', 'end_date_bs', 'rent_npr')
    list_filter = ('status',)
    search_fields = ('tenant__full_name',)
