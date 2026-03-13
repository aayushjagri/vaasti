"""
Vasati — Account Views
OTP-based authentication via phone SMS or email.
request-otp → verify-otp → JWT.
"""
import random
import string
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, OTPCode
from .serializers import (
    RequestOTPSerializer, VerifyOTPSerializer, UserMeSerializer
)
from apps.core.sms import send_sms, TEMPLATES
from apps.core.throttles import OTPRateThrottle

import logging

logger = logging.getLogger(__name__)

EMAIL_OTP_TEMPLATE = """Your Vasati one-time login code is:

{otp}

This code expires in 10 minutes.
Do not share this code with anyone.

— Vasati Property Management
noreply@vasati.com"""


class RequestOTPView(APIView):
    """
    POST /api/v1/auth/request-otp/
    Send OTP via SMS or Email. Accepts { phone } OR { email }.
    Rate limited: 3 per identifier per 10 minutes.
    """
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data.get('phone', '').strip()
        email = serializer.validated_data.get('email', '').strip()
        purpose = serializer.validated_data['purpose']

        # Generate 6-digit OTP
        code = ''.join(random.choices(string.digits, k=6))

        if phone:
            # SMS channel
            OTPCode.objects.filter(
                phone=phone, is_used=False
            ).update(is_used=True)

            OTPCode.objects.create(
                phone=phone,
                channel='sms',
                code=code,
                purpose=purpose,
                expires_at=timezone.now() + timedelta(minutes=10),
            )

            message = TEMPLATES['otp'].format(otp=code)
            send_sms(phone, message)
            logger.info(f"OTP sent via SMS to {phone} for {purpose}")

            return Response(
                {'message': 'OTP sent via SMS', 'channel': 'sms', 'identifier': phone},
                status=status.HTTP_200_OK
            )
        else:
            # Email channel
            OTPCode.objects.filter(
                email=email, is_used=False
            ).update(is_used=True)

            OTPCode.objects.create(
                email=email,
                channel='email',
                code=code,
                purpose=purpose,
                expires_at=timezone.now() + timedelta(minutes=10),
            )

            try:
                from_addr = getattr(settings, 'EMAIL_HOST_USER', '') or settings.DEFAULT_FROM_EMAIL
                send_mail(
                    subject='Your Vasati login code',
                    message=EMAIL_OTP_TEMPLATE.format(otp=code),
                    from_email=from_addr,
                    recipient_list=[email],
                    fail_silently=False,
                )
                logger.info(f"OTP sent via email to {email} for {purpose}")
            except Exception as e:
                logger.error(f"Email send failed: {e}")
                return Response(
                    {'error': f'Failed to send email: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response(
                {'message': 'OTP sent via email', 'channel': 'email', 'identifier': email},
                status=status.HTTP_200_OK
            )


class VerifyOTPView(APIView):
    """
    POST /api/v1/auth/verify-otp/
    Verify OTP → return JWT access + refresh tokens.
    Creates user if first login (phone or email).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data.get('phone', '').strip()
        email = serializer.validated_data.get('email', '').strip()
        code = serializer.validated_data['code']
        purpose = serializer.validated_data['purpose']

        # Build OTP lookup
        otp_filter = {
            'code': code,
            'purpose': purpose,
            'is_used': False,
            'expires_at__gt': timezone.now(),
        }
        if phone:
            otp_filter['phone'] = phone
            otp_filter['channel'] = 'sms'
        else:
            otp_filter['email'] = email
            otp_filter['channel'] = 'email'

        try:
            otp = OTPCode.objects.get(**otp_filter)
        except OTPCode.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired OTP'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp.is_used = True
        otp.save(update_fields=['is_used'])

        # Get or create user
        if phone:
            user, created = User.objects.get_or_create(
                phone=phone,
                defaults={
                    'full_name': phone,
                    'is_active': True,
                }
            )
        else:
            # Email login — look up by email first
            try:
                user = User.objects.get(email=email)
                created = False
            except User.DoesNotExist:
                # Create new user with email — generate a placeholder phone
                import uuid
                placeholder_phone = f"E{uuid.uuid4().hex[:12]}"
                user = User.objects.create(
                    phone=placeholder_phone,
                    email=email,
                    full_name=email.split('@')[0],
                    is_active=True,
                )
                user.set_unusable_password()
                user.save()
                created = True

            # If existing user logged in via email, ensure email is set
            if not user.email:
                user.email = email
                user.save(update_fields=['email'])

        if created:
            logger.info(f"New user created via OTP: {phone or email}")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        refresh['phone'] = user.phone
        refresh['full_name'] = user.full_name
        if user.email:
            refresh['email'] = user.email

        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserMeSerializer(user).data,
            'created': created,
        }, status=status.HTTP_200_OK)


class RefreshTokenView(APIView):
    """
    POST /api/v1/auth/refresh/
    Refresh JWT token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {'error': 'Refresh token required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            })
        except Exception:
            return Response(
                {'error': 'Invalid refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class UserMeView(APIView):
    """
    GET /api/v1/auth/me/
    Return current user + org memberships.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserMeSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
