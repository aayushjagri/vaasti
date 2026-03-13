from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RentPaymentViewSet, LogCashPaymentView

router = DefaultRouter()
router.register(r'', RentPaymentViewSet, basename='payment')

urlpatterns = [
    path('cash/', LogCashPaymentView.as_view(), name='log-cash-payment'),
] + router.urls
