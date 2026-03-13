from django.urls import path
from .views import PortalMeView, PortalPaymentsView, PortalNoticesView

urlpatterns = [
    path('me/', PortalMeView.as_view(), name='portal-me'),
    path('payments/', PortalPaymentsView.as_view(), name='portal-payments'),
    path('notices/', PortalNoticesView.as_view(), name='portal-notices'),
]
