"""
Vasati — Core View Mixins
Property-scoping queryset filtering for views.
"""
from apps.tenancies.models import OrgMembership


class PropertyScopedMixin:
    """
    Mixin for views that return property-scoped querysets.
    Owners see all, managers see assigned properties only.
    """

    def get_membership(self):
        """Get the current user's active OrgMembership."""
        if not hasattr(self, '_membership'):
            self._membership = OrgMembership.objects.filter(
                user_id=self.request.user.id,
                is_active=True
            ).first()
        return self._membership

    def get_accessible_property_ids(self):
        """Return list of property IDs this user can access."""
        membership = self.get_membership()
        if not membership:
            return []
        if membership.role == 'owner':
            return None  # None means "all" — no filter needed
        return list(
            membership.assigned_properties.values_list('id', flat=True)
        )

    def filter_by_property(self, queryset, property_field='property'):
        """
        Apply property-scoping filter to a queryset.
        property_field: the field path to the Property FK (e.g. 'property', 'unit__property')
        """
        accessible_ids = self.get_accessible_property_ids()
        if accessible_ids is None:
            return queryset  # Owner sees all
        filter_kwarg = {f'{property_field}__id__in': accessible_ids}
        return queryset.filter(**filter_kwarg)
