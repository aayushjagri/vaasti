from django.contrib import admin
from .models import Property, Unit


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('name', 'property_type', 'municipality', 'district', 'total_units', 'is_active')
    list_filter = ('property_type', 'is_active', 'district')
    search_fields = ('name', 'municipality')


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'property', 'unit_type', 'floor', 'base_rent_npr', 'status')
    list_filter = ('status', 'unit_type')
    search_fields = ('unit_number',)
