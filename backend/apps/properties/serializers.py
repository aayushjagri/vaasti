"""
Vasati — Property & Unit Serializers
"""
from rest_framework import serializers
from .models import Property, Unit


class UnitSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_unit_type_display', read_only=True)

    class Meta:
        model = Unit
        fields = [
            'id', 'property', 'unit_number', 'floor', 'unit_type', 'type_display',
            'area_sqft', 'base_rent_npr', 'deposit_npr', 'status', 'status_display',
            'amenities', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertySerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_property_type_display', read_only=True)
    units_count = serializers.IntegerField(source='total_units', read_only=True)

    class Meta:
        model = Property
        fields = [
            'id', 'name', 'name_nepali', 'property_type', 'type_display',
            'ward_no', 'municipality', 'district', 'province',
            'google_maps_url', 'total_units', 'units_count', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_units', 'created_at', 'updated_at']


class PropertyDetailSerializer(PropertySerializer):
    units = UnitSerializer(many=True, read_only=True)

    class Meta(PropertySerializer.Meta):
        fields = PropertySerializer.Meta.fields + ['units']


class PropertySummarySerializer(serializers.Serializer):
    """Stats: occupancy, rent collected for a property."""
    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    vacant_units = serializers.IntegerField()
    occupancy_rate = serializers.FloatField()
    total_expected_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_collected_rent = serializers.DecimalField(max_digits=12, decimal_places=2)
    collection_rate = serializers.FloatField()
