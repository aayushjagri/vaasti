"""
Vasati — Root URL Configuration
All API routes under /api/v1/
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/v1/auth/', include('apps.accounts.urls')),

    # Properties & Units
    path('api/v1/properties/', include('apps.properties.urls')),
    path('api/v1/units/', include('apps.properties.unit_urls')),

    # Tenants & Leases
    path('api/v1/tenants/', include('apps.tenancies.tenant_urls')),
    path('api/v1/leases/', include('apps.tenancies.lease_urls')),

    # Tenant Portal
    path('api/v1/portal/', include('apps.tenancies.portal_urls')),

    # Payments
    path('api/v1/payments/', include('apps.payments.urls')),

    # Compliance
    path('api/v1/compliance/', include('apps.compliance.urls')),

    # Notices
    path('api/v1/notices/', include('apps.notices.urls')),

    # Reports / Dashboard
    path('api/v1/reports/', include('apps.reports.urls')),
]
