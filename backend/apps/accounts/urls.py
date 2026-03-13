"""
Vasati — Account URL routes
Auth endpoints: request-otp, verify-otp, refresh, me
Only request-otp and verify-otp are unauthenticated.
"""
from django.urls import path
from .views import RequestOTPView, VerifyOTPView, RefreshTokenView, UserMeView

urlpatterns = [
    path('request-otp/', RequestOTPView.as_view(), name='request-otp'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('refresh/', RefreshTokenView.as_view(), name='token-refresh'),
    path('me/', UserMeView.as_view(), name='user-me'),
]
