from django.contrib import admin
from .models import PoliceRegistration


@admin.register(PoliceRegistration)
class PoliceRegistrationAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'lease', 'status', 'ward_police_office', 'registration_number')
    list_filter = ('status',)
    search_fields = ('tenant__full_name', 'registration_number')
