from django.contrib import admin
from .models import User, OTPCode


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('phone', 'full_name', 'email', 'is_active', 'is_staff', 'created_at')
    list_filter = ('is_active', 'is_staff')
    search_fields = ('phone', 'full_name', 'email')


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ('phone', 'code', 'purpose', 'is_used', 'expires_at')
    list_filter = ('purpose', 'is_used')
