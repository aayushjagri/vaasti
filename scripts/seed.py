"""
Vasati — Seed Data Script
Creates a sample org with realistic Nepal data for development.
Run: docker compose exec backend python manage.py shell < scripts/seed.py
"""

# TODO: Build in Step 5+ once models are ready
# Creates:
# Org: "Shrestha Properties"
# 2 Properties: "Sunrise Apartments, Lalitpur" (8 units) + "New Baneshwor Block" (12 units)
# 15 Tenants with realistic Nepali names, citizenship IDs
# Active leases for 14 units (1 vacant per property)
# 3 months of payment history
# 2 police registrations (1 complete, 1 pending)
# 1 corporate owner, 2 property managers, 1 caretaker
print("Seed script not yet implemented — models still being built.")
