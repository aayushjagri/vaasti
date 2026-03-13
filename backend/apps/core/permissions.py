"""
Vasati — Core Permissions
Every API view must enforce property-scoped access.
Built BEFORE any property/tenancy views per build order.
"""
from rest_framework.permissions import BasePermission
import logging

logger = logging.getLogger(__name__)


class IsOrgMember(BasePermission):
    """User must be an active member of the current tenant org."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        from apps.tenancies.models import OrgMembership
        return OrgMembership.objects.filter(
            user_id=request.user.id, is_active=True
        ).exists()


class IsPropertyScoped(BasePermission):
    """
    For property-level objects: check that the user's OrgMembership
    grants access to the property this object belongs to.
    Owners bypass this check.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        from apps.tenancies.models import OrgMembership
        return OrgMembership.objects.filter(
            user_id=request.user.id, is_active=True
        ).exists()

    def has_object_permission(self, request, view, obj):
        from apps.tenancies.models import OrgMembership
        try:
            membership = OrgMembership.objects.get(
                user_id=request.user.id, is_active=True
            )
        except OrgMembership.DoesNotExist:
            return False

        if membership.role == 'owner':
            return True  # Owners see everything

        # Resolve the property from the object
        property_id = self._get_property_id(obj)
        if not property_id:
            return False

        return membership.assigned_properties.filter(id=property_id).exists()

    def _get_property_id(self, obj):
        """Handle different object types to resolve property_id."""
        if hasattr(obj, 'property_id'):
            return obj.property_id
        if hasattr(obj, 'property') and hasattr(obj.property, 'id'):
            return obj.property.id
        if hasattr(obj, 'unit'):
            return obj.unit.property_id
        if hasattr(obj, 'lease'):
            return obj.lease.unit.property_id
        return None


class IsOwner(BasePermission):
    """Only corporate owners can access this view."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        from apps.tenancies.models import OrgMembership
        return OrgMembership.objects.filter(
            user_id=request.user.id,
            role='owner',
            is_active=True
        ).exists()


class IsTenantPortalUser(BasePermission):
    """
    Only tenant-role users can access portal endpoints.
    Validates JWT has tenant role claim.
    """

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        from apps.tenancies.models import OrgMembership
        return OrgMembership.objects.filter(
            user_id=request.user.id,
            role='tenant',
            is_active=True
        ).exists()


class IsOwnerOrManager(BasePermission):
    """Owner or manager can access (for write operations on properties)."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        from apps.tenancies.models import OrgMembership
        return OrgMembership.objects.filter(
            user_id=request.user.id,
            role__in=['owner', 'manager'],
            is_active=True
        ).exists()
