"""
Vasati — User & Auth Models
Phone is the primary identifier — email is optional alternative login.
Users and OTPCode live in public schema (SHARED_APPS).
OrgMembership lives in tenant schema — see tenancies/models.py.
"""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError('Phone number required')
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('full_name', 'Admin')
        return self.create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Lives in public schema. One user can belong to multiple orgs via OrgMembership.
    Phone is the primary identifier — email is optional alternative login.
    """
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True, unique=True)
    full_name = models.CharField(max_length=200)
    full_name_nepali = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()

    class Meta:
        app_label = 'accounts'

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class OTPCode(models.Model):
    """
    Short-lived OTP for phone or email verification.
    Supports dual-channel: SMS or Email.
    """
    CHANNEL_CHOICES = [
        ('sms', 'SMS'),
        ('email', 'Email'),
    ]
    phone = models.CharField(max_length=15, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    channel = models.CharField(max_length=5, choices=CHANNEL_CHOICES, default='sms')
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=20,
        choices=[('login', 'Login'), ('onboard', 'Tenant Onboard'), ('sign', 'Sign Lease')]
    )
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = 'accounts'

    def __str__(self):
        identifier = self.phone or self.email
        return f"OTP for {identifier} via {self.channel} ({self.purpose})"
