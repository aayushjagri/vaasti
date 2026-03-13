"""
Vasati — Property & Unit Models
Tenant-schema scoped. Properties contain units.
"""
from django.db import models


class Property(models.Model):
    PROPERTY_TYPES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
        ('mixed', 'Mixed Use'),
        ('hostel', 'Hostel/PG'),
    ]
    name = models.CharField(max_length=200)
    name_nepali = models.CharField(max_length=200, blank=True)
    property_type = models.CharField(max_length=20, choices=PROPERTY_TYPES)

    # Nepal address structure
    ward_no = models.CharField(max_length=10)
    municipality = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    google_maps_url = models.URLField(blank=True)

    total_units = models.PositiveIntegerField(default=0)  # Derived, updated on unit save
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'properties'

    def __str__(self):
        return self.name


class Unit(models.Model):
    UNIT_TYPES = [
        ('flat', 'Flat/Apartment'),
        ('room_single', 'Single Room'),
        ('room_double', 'Double Room'),
        ('commercial_stall', 'Commercial Stall'),
        ('shop', 'Shop'),
        ('storage', 'Storage Unit'),
        ('hostel_bed', 'Hostel Bed'),
        ('floor', 'Entire Floor'),
    ]
    STATUS = [
        ('occupied', 'Occupied'),
        ('vacant', 'Vacant'),
        ('maintenance', 'Under Maintenance'),
        ('reserved', 'Reserved'),
    ]
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name='units')
    unit_number = models.CharField(max_length=20)   # e.g. "3B", "101", "Ground Floor Left"
    floor = models.IntegerField(default=0)           # 0 = ground
    unit_type = models.CharField(max_length=30, choices=UNIT_TYPES)
    area_sqft = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    base_rent_npr = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_npr = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='vacant')
    amenities = models.JSONField(default=list)       # ['attached_bathroom', 'wifi', 'parking']
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property', 'unit_number')
        ordering = ['floor', 'unit_number']

    def __str__(self):
        return f"{self.property.name} - {self.unit_number}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update property total_units count
        self.property.total_units = self.property.units.count()
        self.property.save(update_fields=['total_units'])
