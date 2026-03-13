# VASATI — Complete Build Specification
> Tenant & Property Management SaaS · Nepal-first · Django + React + PostgreSQL
> Schema-level multi-tenancy · Police compliance integration · eSewa/Khalti payments

---

## MISSION

Build a formal tenancy operating system for the Nepali rental market. The product formalizes the landlord-tenant relationship end-to-end: verified identities, police-registered tenancies, digital payments, and a permanent legal paper trail. Architected to expand across emerging markets.

**Core insight:** The Nepal Police tenant registration integration is not a feature — it is the competitive moat. Make legal compliance effortless and the product becomes irreplaceable.

---

## TECH STACK — LOCKED

| Layer | Choice | Notes |
|---|---|---|
| Backend | Django 5.x + Django REST Framework | Python 3.12 |
| Multi-tenancy | `django-tenants` | Schema-per-tenant PostgreSQL |
| Database | PostgreSQL 16 | Schema-level isolation |
| Frontend | React 18 + Vite | TypeScript, mobile-first |
| Styling | Tailwind CSS v3 | Custom design tokens |
| State | Zustand | Lightweight, per-store |
| API Client | TanStack Query v5 | Server state management |
| Auth | JWT (SimpleJWT) + OTP (SMS) | No password for tenants |
| Payments | eSewa + Khalti SDKs | + manual cash logging |
| SMS | Sparrow SMS (Nepal) | Reminders + OTP |
| Task Queue | Celery + Redis | Async: reminders, reports |
| Storage | MinIO (self-hosted S3) | Documents, KYC images |
| Containerization | Docker + Docker Compose | Full dev + prod configs |
| Reverse Proxy | Nginx | SSL termination, static files |
| CI | GitHub Actions | Lint, test, build |

---

## REPOSITORY STRUCTURE

```
vasati/
├── CLAUDE.md                        # This file
├── docker-compose.yml               # Full dev stack
├── docker-compose.prod.yml          # Production overrides
├── .env.example                     # All required env vars
├── Makefile                         # Dev shortcuts
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements.dev.txt
│   ├── manage.py
│   ├── vasati/                      # Django project root
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── celery.py
│   │
│   └── apps/
│       ├── tenants/                 # django-tenants: Org/schema management
│       ├── accounts/                # Users, roles, permissions
│       ├── properties/              # Properties + units
│       ├── tenancies/               # Tenants, leases
│       ├── payments/                # Rent, receipts, payment methods
│       ├── compliance/              # Police registration
│       ├── notices/                 # Communications log
│       ├── reports/                 # Dashboard data, exports
│       └── core/                   # Shared utils, base models
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                     # API client, hooks
│       ├── components/              # Shared UI components
│       ├── features/                # Feature-scoped modules
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── properties/
│       │   ├── tenants/
│       │   ├── leases/
│       │   ├── payments/
│       │   ├── compliance/
│       │   ├── notices/
│       │   └── reports/
│       ├── hooks/                   # Shared hooks
│       ├── stores/                  # Zustand stores
│       ├── utils/                   # BS calendar, formatters
│       └── types/                   # TypeScript types
│
├── nginx/
│   ├── nginx.conf
│   └── nginx.prod.conf
│
└── scripts/
    ├── seed.py                      # Dev seed data
    └── create_tenant.py             # CLI: provision new org
```

---

## DOCKER SETUP

### `docker-compose.yml` (Development)

```yaml
version: '3.9'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vasati
      POSTGRES_USER: vasati
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vasati"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: >
      sh -c "python manage.py migrate_schemas --shared &&
             python manage.py runserver 0.0.0.0:8000"
    environment:
      DJANGO_SETTINGS_MODULE: vasati.settings.development
      DATABASE_URL: postgres://vasati:${POSTGRES_PASSWORD}@db:5432/vasati
      REDIS_URL: redis://redis:6379/0
      MINIO_ENDPOINT: minio:9000
      MINIO_ACCESS_KEY: ${MINIO_ROOT_USER}
      MINIO_SECRET_KEY: ${MINIO_ROOT_PASSWORD}
      SECRET_KEY: ${SECRET_KEY}
      DEBUG: "True"
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A vasati worker -l info
    environment:
      DJANGO_SETTINGS_MODULE: vasati.settings.development
      DATABASE_URL: postgres://vasati:${POSTGRES_PASSWORD}@db:5432/vasati
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - backend
      - redis

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A vasati beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    environment:
      DJANGO_SETTINGS_MODULE: vasati.settings.development
      DATABASE_URL: postgres://vasati:${POSTGRES_PASSWORD}@db:5432/vasati
      REDIS_URL: redis://redis:6379/0
    volumes:
      - ./backend:/app
    depends_on:
      - celery

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: development
    command: npm run dev
    environment:
      VITE_API_URL: http://localhost:8000/api
    volumes:
      - ./frontend:/app
      - /app/node_modules
    ports:
      - "5173:5173"

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
  minio_data:
```

### `docker-compose.prod.yml` (Production overrides)

```yaml
version: '3.9'

services:
  backend:
    command: gunicorn vasati.wsgi:application --bind 0.0.0.0:8000 --workers 4 --timeout 120
    environment:
      DJANGO_SETTINGS_MODULE: vasati.settings.production
      DEBUG: "False"
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    restart: unless-stopped

  nginx:
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
```

### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
```

### `frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### `.env.example`

```bash
# Database
POSTGRES_PASSWORD=changeme_strong_password

# Django
SECRET_KEY=changeme_50_random_chars
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# Redis
REDIS_URL=redis://redis:6379/0

# MinIO
MINIO_ROOT_USER=vasati_admin
MINIO_ROOT_PASSWORD=changeme_minio_password
MINIO_BUCKET_NAME=vasati-documents

# SMS (Sparrow SMS Nepal)
SPARROW_SMS_TOKEN=your_sparrow_token
SPARROW_SMS_FROM=Vasati

# Payments
ESEWA_MERCHANT_CODE=your_esewa_merchant_code
ESEWA_SECRET_KEY=your_esewa_secret
KHALTI_SECRET_KEY=your_khalti_secret_key

# Police API (Phase 2)
NEPAL_POLICE_API_URL=https://api.nepalpolice.gov.np
NEPAL_POLICE_API_KEY=your_api_key

# Email (optional - secondary channel)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@vasati.com
EMAIL_HOST_PASSWORD=your_app_password

# Frontend
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Vasati
```

### `Makefile`

```makefile
.PHONY: up down build shell migrate seed logs

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

shell:
	docker compose exec backend python manage.py shell

migrate:
	docker compose exec backend python manage.py migrate_schemas --shared
	docker compose exec backend python manage.py migrate_schemas

seed:
	docker compose exec backend python manage.py shell < scripts/seed.py

logs:
	docker compose logs -f backend celery

test:
	docker compose exec backend python manage.py test --parallel

frontend-shell:
	docker compose exec frontend sh

psql:
	docker compose exec db psql -U vasati vasati
```

---

## BACKEND — DJANGO

### `requirements.txt`

```
django==5.0.6
djangorestframework==3.15.2
django-tenants==3.6.1
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.4.0
psycopg2-binary==2.9.9
redis==5.0.8
celery==5.4.0
django-celery-beat==2.6.0
boto3==1.34.144
django-storages==1.14.4
Pillow==10.4.0
reportlab==4.2.2
python-dotenv==1.0.1
dj-database-url==2.2.0
gunicorn==22.0.0
django-filter==24.2
```

---

### MULTI-TENANCY ARCHITECTURE

**Rule:** Every organization (landlord / property company) lives in its own PostgreSQL schema. `django-tenants` handles schema routing via middleware. All ORM queries inside a request are automatically scoped to the active tenant schema.

#### Tenant Model (`apps/tenants/models.py`)

```python
from django_tenants.models import TenantMixin, DomainMixin
from django.db import models

class Organization(TenantMixin):
    """
    Each row = one PostgreSQL schema.
    The schema_name is auto-used by django-tenants for routing.
    """
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('pro', 'Pro'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # django-tenants required
    auto_create_schema = True

    class Meta:
        app_label = 'tenants'

class Domain(DomainMixin):
    class Meta:
        app_label = 'tenants'
```

#### Settings: Shared vs Tenant Apps (`vasati/settings/base.py`)

```python
SHARED_APPS = [
    'django_tenants',
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'apps.tenants',        # Organization + Domain models live here
    'apps.accounts',       # Platform-level user auth
]

TENANT_APPS = [
    'django.contrib.sessions',
    'apps.properties',
    'apps.tenancies',
    'apps.payments',
    'apps.compliance',
    'apps.notices',
    'apps.reports',
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

TENANT_MODEL = 'tenants.Organization'
TENANT_DOMAIN_MODEL = 'tenants.Domain'

DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)

MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',  # MUST be first
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
]
```

---

### DATA MODELS

#### `apps/accounts/models.py`

```python
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

class UserManager(BaseUserManager):
    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError('Phone number required')
        user = self.model(phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):
    """
    Lives in public schema. One user can belong to multiple orgs via OrgMembership.
    Phone is the primary identifier — email is optional.
    """
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True)
    full_name = models.CharField(max_length=200)
    full_name_nepali = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()

class OTPCode(models.Model):
    """Short-lived OTP for phone verification. No passwords for tenants."""
    phone = models.CharField(max_length=15)
    code = models.CharField(max_length=6)
    purpose = models.CharField(
        max_length=20,
        choices=[('login', 'Login'), ('onboard', 'Tenant Onboard'), ('sign', 'Sign Lease')]
    )
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
```

#### `apps/accounts/models.py` — OrgMembership (Tenant Schema)

```python
class OrgMembership(models.Model):
    """
    Lives in each tenant schema. Links a platform User to a role within this org.
    Property-scoped roles are enforced here.
    """
    ROLES = [
        ('owner', 'Corporate Owner'),        # All properties, all data
        ('manager', 'Property Manager'),     # Assigned properties only
        ('caretaker', 'Caretaker'),          # Assigned units only
        ('tenant', 'Tenant'),                # Own data only
    ]
    user_id = models.IntegerField()          # FK to public.accounts_user
    role = models.CharField(max_length=20, choices=ROLES)
    # NULL = access to all properties (for owner role)
    assigned_properties = models.ManyToManyField(
        'properties.Property',
        blank=True,
        related_name='assigned_managers'
    )
    assigned_units = models.ManyToManyField(
        'properties.Unit',
        blank=True,
        related_name='assigned_caretakers'
    )
    is_active = models.BooleanField(default=True)
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('user_id', 'role')
```

#### `apps/properties/models.py`

```python
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
```

#### `apps/tenancies/models.py`

```python
class Tenant(models.Model):
    """
    One Tenant record = one person. Can have multiple Leases over time.
    Linked to a platform User via user_id for portal access.
    """
    # Identity
    full_name = models.CharField(max_length=200)
    full_name_nepali = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=15, unique=True)
    email = models.EmailField(blank=True, null=True)
    
    # KYC
    citizenship_number = models.CharField(max_length=50, unique=True)
    citizenship_front = models.CharField(max_length=500, blank=True)  # MinIO key
    citizenship_back = models.CharField(max_length=500, blank=True)
    date_of_birth_bs = models.CharField(max_length=10, blank=True)    # BS date string YYYY-MM-DD
    date_of_birth_ad = models.DateField(null=True, blank=True)
    
    # Contact
    permanent_address = models.TextField(blank=True)
    emergency_contact_name = models.CharField(max_length=200, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, blank=True)
    profession = models.CharField(max_length=100, blank=True)
    
    # Platform link (nullable — tenant may not have activated portal yet)
    user_id = models.IntegerField(null=True, blank=True)  # FK to public.accounts_user
    portal_activated = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Lease(models.Model):
    STATUS = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('expiring_soon', 'Expiring Soon'),     # Auto-set by Celery beat
        ('expired', 'Expired'),
        ('terminated', 'Terminated'),
        ('month_to_month', 'Month to Month'),
    ]
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name='leases')
    unit = models.ForeignKey('properties.Unit', on_delete=models.PROTECT, related_name='leases')
    
    # Dates stored in both calendars
    start_date_bs = models.CharField(max_length=10)     # e.g. "2081-04-15"
    end_date_bs = models.CharField(max_length=10)
    start_date_ad = models.DateField()
    end_date_ad = models.DateField()
    
    # Financial
    rent_npr = models.DecimalField(max_digits=10, decimal_places=2)
    deposit_npr = models.DecimalField(max_digits=10, decimal_places=2)
    rent_due_day = models.PositiveSmallIntegerField(default=1)   # day of month
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS, default='draft')
    
    # Document
    lease_document = models.CharField(max_length=500, blank=True)  # MinIO key (PDF)
    tenant_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date_ad']
```

#### `apps/payments/models.py`

```python
class RentPayment(models.Model):
    METHODS = [
        ('esewa', 'eSewa'),
        ('khalti', 'Khalti'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
    ]
    STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    lease = models.ForeignKey('tenancies.Lease', on_delete=models.PROTECT, related_name='payments')
    
    # Amount
    amount_npr = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Period — what month this payment covers (BS)
    period_month_bs = models.CharField(max_length=7)   # "2081-04" (Baisakh 2081)
    period_month_ad = models.DateField()               # First day of the AD month
    
    # Payment info
    method = models.CharField(max_length=20, choices=METHODS)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    transaction_ref = models.CharField(max_length=200, blank=True)  # Gateway ref or manual note
    paid_at_bs = models.CharField(max_length=10, blank=True)
    paid_at_ad = models.DateTimeField(null=True, blank=True)
    
    # Who logged it
    logged_by_user_id = models.IntegerField()
    
    # Receipt
    receipt_number = models.CharField(max_length=50, unique=True)  # Auto-generated: VAS-2081-04-0001
    receipt_document = models.CharField(max_length=500, blank=True)  # MinIO key
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class PaymentReminder(models.Model):
    """Log of all reminders sent."""
    lease = models.ForeignKey('tenancies.Lease', on_delete=models.CASCADE)
    reminder_type = models.CharField(
        max_length=30,
        choices=[
            ('due_7_days', '7 days before due'),
            ('due_today', 'Due today'),
            ('overdue_3', '3 days overdue'),
            ('overdue_7', '7 days overdue'),
            ('manual', 'Manual'),
        ]
    )
    channel = models.CharField(max_length=10, choices=[('sms', 'SMS'), ('app', 'In-app')])
    sent_at = models.DateTimeField(auto_now_add=True)
    delivered = models.BooleanField(default=False)
    message_preview = models.TextField(blank=True)
```

#### `apps/compliance/models.py`

```python
class PoliceRegistration(models.Model):
    """
    Nepal Police tenant registration. Per tenant per lease.
    Phase 1: PDF form stored locally.
    Phase 2: Direct API submission to Nepal Police system.
    """
    STATUS = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('registered', 'Registered'),
        ('renewal_required', 'Renewal Required'),
        ('expired', 'Expired'),
    ]
    lease = models.OneToOneField('tenancies.Lease', on_delete=models.CASCADE, related_name='police_reg')
    tenant = models.ForeignKey('tenancies.Tenant', on_delete=models.PROTECT)
    
    status = models.CharField(max_length=30, choices=STATUS, default='not_started')
    
    # Nepal Police data fields (mirrors the police registration form)
    ward_police_office = models.CharField(max_length=200, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)  # From police
    registered_date_bs = models.CharField(max_length=10, blank=True)
    registered_date_ad = models.DateField(null=True, blank=True)
    expiry_date_ad = models.DateField(null=True, blank=True)  # Usually 1 year
    
    # Document
    form_document = models.CharField(max_length=500, blank=True)   # MinIO: filled PDF
    confirmation_document = models.CharField(max_length=500, blank=True)  # MinIO: police receipt
    
    # API submission (Phase 2)
    api_submission_id = models.CharField(max_length=200, blank=True)
    api_response = models.JSONField(default=dict, blank=True)
    
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### `apps/notices/models.py`

```python
class Notice(models.Model):
    NOTICE_TYPES = [
        ('rent_reminder', 'Rent Reminder'),
        ('lease_expiry', 'Lease Expiry Warning'),
        ('general', 'General Notice'),
        ('maintenance', 'Maintenance Notice'),
        ('eviction_warning', 'Eviction Warning'),
        ('welcome', 'Welcome'),
    ]
    AUDIENCE = [
        ('single_tenant', 'Single Tenant'),
        ('unit', 'Single Unit'),
        ('floor', 'Entire Floor'),
        ('property', 'Entire Property'),
        ('all', 'All Tenants in Org'),
    ]
    notice_type = models.CharField(max_length=30, choices=NOTICE_TYPES)
    audience_type = models.CharField(max_length=20, choices=AUDIENCE)
    
    # Targeting (nullable depending on audience_type)
    target_property = models.ForeignKey(
        'properties.Property', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notices'
    )
    target_tenant = models.ForeignKey(
        'tenancies.Tenant', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='notices'
    )
    
    subject = models.CharField(max_length=300)
    body = models.TextField()
    body_nepali = models.TextField(blank=True)
    
    sent_by_user_id = models.IntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)
    channels = models.JSONField(default=list)  # ['sms', 'app']
    delivery_status = models.JSONField(default=dict)   # {tenant_id: 'delivered'/'failed'}
```

---

### PERMISSION SYSTEM

Every API view must enforce property-scoped access. Use a mixin:

```python
# apps/core/permissions.py
from rest_framework.permissions import BasePermission

class IsOrgMember(BasePermission):
    """User must be an active member of the current tenant org."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return OrgMembership.objects.filter(
            user_id=request.user.id, is_active=True
        ).exists()

class IsPropertyScoped(BasePermission):
    """
    For property-level objects: check that the user's OrgMembership
    grants access to the property this object belongs to.
    Owners bypass this check.
    """
    def has_object_permission(self, request, view, obj):
        membership = OrgMembership.objects.get(user_id=request.user.id, is_active=True)
        if membership.role == 'owner':
            return True  # Owners see everything
        
        # Resolve the property from the object
        property_id = self._get_property_id(obj)
        if not property_id:
            return False
        
        return membership.assigned_properties.filter(id=property_id).exists()
    
    def _get_property_id(self, obj):
        # Handle different object types
        if hasattr(obj, 'property_id'):
            return obj.property_id
        if hasattr(obj, 'unit'):
            return obj.unit.property_id
        if hasattr(obj, 'lease'):
            return obj.lease.unit.property_id
        return None
```

---

### CELERY TASKS

```python
# apps/payments/tasks.py
from celery import shared_task
from django_tenants.utils import tenant_context

@shared_task
def send_rent_reminders():
    """
    Runs daily at 9 AM NPT.
    Iterates all tenant schemas. For each active lease,
    checks if a reminder should be sent today.
    """
    from apps.tenants.models import Organization
    for org in Organization.objects.exclude(schema_name='public'):
        with tenant_context(org):
            _process_reminders_for_tenant()

def _process_reminders_for_tenant():
    from apps.tenancies.models import Lease
    from apps.payments.models import RentPayment
    from .notifications import send_sms_reminder
    import datetime
    
    today = datetime.date.today()
    active_leases = Lease.objects.filter(status='active')
    
    for lease in active_leases:
        due_date = today.replace(day=lease.rent_due_day)
        days_to_due = (due_date - today).days
        
        # Check if paid for this month
        already_paid = RentPayment.objects.filter(
            lease=lease,
            period_month_ad__year=today.year,
            period_month_ad__month=today.month,
            status='completed'
        ).exists()
        
        if not already_paid:
            if days_to_due == 7:
                send_sms_reminder(lease, 'due_7_days')
            elif days_to_due == 0:
                send_sms_reminder(lease, 'due_today')
            elif days_to_due == -3:
                send_sms_reminder(lease, 'overdue_3')
            elif days_to_due == -7:
                send_sms_reminder(lease, 'overdue_7')

# apps/tenancies/tasks.py
@shared_task
def check_lease_expiries():
    """Runs daily. Marks leases as expiring_soon and sends notices."""
    from apps.tenants.models import Organization
    import datetime
    
    for org in Organization.objects.exclude(schema_name='public'):
        with tenant_context(org):
            today = datetime.date.today()
            for days_ahead in [30, 15, 7]:
                target_date = today + datetime.timedelta(days=days_ahead)
                Lease.objects.filter(
                    status='active',
                    end_date_ad=target_date
                ).update(status='expiring_soon')
                # Also send notices here

# vasati/celery.py beat schedule
from celery.schedules import crontab

app.conf.beat_schedule = {
    'send-rent-reminders-daily': {
        'task': 'apps.payments.tasks.send_rent_reminders',
        'schedule': crontab(hour=9, minute=0),  # 9 AM NPT
    },
    'check-lease-expiries-daily': {
        'task': 'apps.tenancies.tasks.check_lease_expiries',
        'schedule': crontab(hour=8, minute=0),
    },
    'check-police-reg-renewals': {
        'task': 'apps.compliance.tasks.check_registration_renewals',
        'schedule': crontab(hour=8, minute=30),
    },
}
```

---

### API ROUTES

All routes are prefixed `/api/v1/`.

```
AUTH (public schema)
POST   /api/v1/auth/request-otp/          # Send OTP to phone
POST   /api/v1/auth/verify-otp/           # Verify OTP → return JWT
POST   /api/v1/auth/refresh/              # Refresh JWT
GET    /api/v1/auth/me/                   # Current user + org memberships

ORGANIZATIONS (public schema)
POST   /api/v1/orgs/                      # Create org (signup flow)
GET    /api/v1/orgs/me/                   # Current org details
PATCH  /api/v1/orgs/me/                   # Update org
GET    /api/v1/orgs/me/members/           # List members
POST   /api/v1/orgs/me/invite/            # Invite member with role

PROPERTIES (tenant schema)
GET    /api/v1/properties/                # List (scoped to user's access)
POST   /api/v1/properties/                # Create
GET    /api/v1/properties/{id}/           # Detail
PATCH  /api/v1/properties/{id}/           # Update
GET    /api/v1/properties/{id}/units/     # Units in property
GET    /api/v1/properties/{id}/summary/   # Stats: occupancy, rent collected

UNITS (tenant schema)
GET    /api/v1/units/                     # List all accessible units
POST   /api/v1/units/                     # Create unit
GET    /api/v1/units/{id}/                # Detail
PATCH  /api/v1/units/{id}/                # Update
GET    /api/v1/units/{id}/lease/          # Active lease for unit

TENANTS (tenant schema)
GET    /api/v1/tenants/                   # List
POST   /api/v1/tenants/                   # Create + trigger portal invite
GET    /api/v1/tenants/{id}/              # Detail
PATCH  /api/v1/tenants/{id}/             # Update
GET    /api/v1/tenants/{id}/leases/       # All leases for tenant
GET    /api/v1/tenants/{id}/payments/     # Payment history

LEASES (tenant schema)
GET    /api/v1/leases/                    # List
POST   /api/v1/leases/                    # Create
GET    /api/v1/leases/{id}/               # Detail
PATCH  /api/v1/leases/{id}/               # Update
POST   /api/v1/leases/{id}/acknowledge/   # Tenant OTP acknowledgment
POST   /api/v1/leases/{id}/renew/         # Renew with new dates/rent
POST   /api/v1/leases/{id}/terminate/     # Mark as terminated
GET    /api/v1/leases/{id}/document/      # Download lease PDF

PAYMENTS (tenant schema)
GET    /api/v1/payments/                  # List
POST   /api/v1/payments/log-cash/         # Log manual cash payment
POST   /api/v1/payments/initiate-esewa/   # Get eSewa payment URL
POST   /api/v1/payments/initiate-khalti/  # Get Khalti payment URL
POST   /api/v1/payments/esewa-callback/   # eSewa webhook
POST   /api/v1/payments/khalti-callback/  # Khalti webhook
GET    /api/v1/payments/{id}/receipt/     # Download receipt PDF

COMPLIANCE (tenant schema)
GET    /api/v1/compliance/                # List all registrations
POST   /api/v1/compliance/               # Create for a lease
GET    /api/v1/compliance/{id}/          # Detail
PATCH  /api/v1/compliance/{id}/          # Update status
POST   /api/v1/compliance/{id}/submit/   # Submit to police API
GET    /api/v1/compliance/{id}/document/ # Download registration PDF

NOTICES (tenant schema)
GET    /api/v1/notices/                   # List
POST   /api/v1/notices/                   # Create + send
GET    /api/v1/notices/{id}/              # Detail

REPORTS (tenant schema)
GET    /api/v1/reports/dashboard/         # Main dashboard data
GET    /api/v1/reports/monthly/           # Monthly summary (param: ?year=2081&month=4)
GET    /api/v1/reports/occupancy/         # Occupancy rates by property
GET    /api/v1/reports/compliance/        # Police registration status summary
POST   /api/v1/reports/export-pdf/        # Generate monthly PDF report

TENANT PORTAL (tenant schema — tenant role only)
GET    /api/v1/portal/me/                 # My unit, lease, landlord info
GET    /api/v1/portal/payments/           # My payment history
GET    /api/v1/portal/notices/            # Notices sent to me
```

---

### RECEIPT PDF GENERATION

```python
# apps/payments/receipts.py
from reportlab.lib.pagesizes import A5
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
import io

def generate_receipt_pdf(payment):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A5, topMargin=20, bottomMargin=20)
    
    styles = getSampleStyleSheet()
    elements = []
    
    # Header
    elements.append(Paragraph("VASATI", styles['Title']))
    elements.append(Paragraph("Rent Payment Receipt", styles['Heading2']))
    elements.append(Spacer(1, 12))
    
    # Receipt details table
    data = [
        ['Receipt No:', payment.receipt_number],
        ['Tenant:', payment.lease.tenant.full_name],
        ['Property:', payment.lease.unit.property.name],
        ['Unit:', payment.lease.unit.unit_number],
        ['Period:', payment.period_month_bs],
        ['Amount:', f'NPR {payment.amount_npr:,.0f}'],
        ['Method:', payment.get_method_display()],
        ['Date (BS):', payment.paid_at_bs],
        ['Reference:', payment.transaction_ref or '-'],
    ]
    
    table = Table(data, colWidths=[120, 200])
    table.setStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f4ec')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 8),
    ])
    elements.append(table)
    elements.append(Spacer(1, 20))
    elements.append(Paragraph("This is a digitally generated receipt. No signature required.", 
                               ParagraphStyle('small', fontSize=8, textColor=colors.grey)))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
```

---

## FRONTEND — REACT

### BS Calendar Utility

Critical: All dates throughout the UI must support Bikram Sambat.

```typescript
// src/utils/bsCalendar.ts
// Use the `bikram-sambat` npm package as the base converter
// npm install bikram-sambat

import { adToBs, bsToAd } from 'bikram-sambat';

export interface BSDate {
  year: number;
  month: number;
  day: number;
  monthName: string;    // "Baisakh", "Jestha", etc.
  monthNameNepali: string;  // "बैशाख", etc.
}

const BS_MONTHS = [
  { en: 'Baisakh', np: 'बैशाख' },
  { en: 'Jestha', np: 'जेठ' },
  { en: 'Ashadh', np: 'असार' },
  { en: 'Shrawan', np: 'साउन' },
  { en: 'Bhadra', np: 'भदौ' },
  { en: 'Ashwin', np: 'असोज' },
  { en: 'Kartik', np: 'कार्तिक' },
  { en: 'Mangsir', np: 'मंसिर' },
  { en: 'Poush', np: 'पौष' },
  { en: 'Magh', np: 'माघ' },
  { en: 'Falgun', np: 'फाल्गुन' },
  { en: 'Chaitra', np: 'चैत' },
];

export function adToBS(adDate: Date): BSDate {
  const bs = adToBs(adDate);
  return {
    year: bs.year,
    month: bs.month,
    day: bs.day,
    monthName: BS_MONTHS[bs.month - 1].en,
    monthNameNepali: BS_MONTHS[bs.month - 1].np,
  };
}

export function formatBSDate(bsDateStr: string, lang: 'en' | 'np' = 'en'): string {
  // Input: "2081-04-15" → "15 Shrawan 2081" or "१५ साउन २०८१"
  const [year, month, day] = bsDateStr.split('-').map(Number);
  const monthData = BS_MONTHS[month - 1];
  if (lang === 'np') {
    return `${toNepaliDigits(day)} ${monthData.monthNameNepali} ${toNepaliDigits(year)}`;
  }
  return `${day} ${monthData.en} ${year}`;
}

export function toNepaliDigits(n: number): string {
  const digits = ['०','१','२','३','४','५','६','७','८','९'];
  return String(n).split('').map(d => digits[parseInt(d)] || d).join('');
}

export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
```

### Design Tokens (`tailwind.config.ts`)

```typescript
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b1220',
        surface: '#141b2b',
        surface2: '#1c2438',
        border: '#252c3a',
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c97d',
          dim: 'rgba(201,168,76,0.15)',
        },
        status: {
          paid: '#4acea0',
          overdue: '#ff6b6b',
          pending: '#f4b942',
          vacant: '#6b7280',
          expiring: '#f4b942',
        },
      },
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
```

### Key Components to Build

```
src/components/
├── ui/
│   ├── Button.tsx          # primary, secondary, ghost, danger variants
│   ├── Input.tsx           # with Nepali label support
│   ├── PhoneInput.tsx      # Nepal format auto-formatter: 98X-XXXXXXX
│   ├── BSDatePicker.tsx    # BS calendar date picker (primary), AD secondary
│   ├── StatusBadge.tsx     # paid/overdue/pending/vacant — color + text always
│   ├── NPRAmount.tsx       # Formatted NPR display, JetBrains Mono font
│   ├── Modal.tsx
│   ├── Toast.tsx
│   └── OfflineBanner.tsx   # Persistent when navigator.onLine = false
│
├── layout/
│   ├── AppShell.tsx        # Sidebar + main area
│   ├── Sidebar.tsx         # Nav, property switcher, user menu
│   └── MobileNav.tsx       # Bottom tab bar for mobile
│
└── shared/
    ├── PropertySelector.tsx  # Dropdown: scoped to user's accessible properties
    ├── TenantAvatar.tsx
    └── EmptyState.tsx        # Always includes next action CTA
```

### Feature: Dashboard (`src/features/dashboard/`)

Dashboard home screen data from `GET /api/v1/reports/dashboard/`.

Display in order:
1. **Rent collection ring** — % collected this month (NPR collected / NPR expected)
2. **Quick stats row** — Vacant units · Expiring leases (30d) · Overdue payments · Pending police reg
3. **Property cards** (if corporate owner: all properties · if manager: assigned only)
4. **Recent activity feed** — payments, new tenants, notices sent

### Feature: Tenant Onboarding Flow

Multi-step form. Steps:
1. Basic info (name in Nepali + English, phone, profession)
2. KYC (citizenship number + photo upload front/back)
3. Emergency contact
4. Assign to unit + set lease dates + rent amount
5. Review → Create → System sends OTP invite to tenant

On creation, trigger:
- `POST /api/v1/tenants/` → creates Tenant + Lease
- Celery task: send SMS invite to tenant phone
- Prompt: "Register with Nepal Police?" → opens compliance form

### Feature: Payment Logging

Two paths:

**Digital payment:** Call `POST /api/v1/payments/initiate-esewa/` → redirect to eSewa → callback confirms → receipt auto-generated.

**Cash logging (most common in v1):**
- Single screen: select lease, enter amount, enter date (BS picker), optional note
- `POST /api/v1/payments/log-cash/`
- Receipt PDF available immediately

### Feature: Tenant Portal (separate route, minimal UI)

Path: `/portal` — only accessible with tenant JWT.

Screens:
1. **Home** — unit info, landlord name/phone, lease expiry countdown in BS
2. **Payments** — chronological list, download receipt per payment
3. **Notices** — notices sent to this tenant

Login: phone number → OTP → JWT (tenant-scoped, read-only).

---

## BS CALENDAR — CRITICAL IMPLEMENTATION RULES

1. **All date fields in the DB store both BS string and AD Date** — never BS only.
2. **All date pickers in the UI default to BS** — AD shown as secondary hint.
3. **All receipts, reminders, and reports display BS dates.**
4. **Lease due dates are set in BS** — backend converts to AD for Celery scheduling.
5. **When displaying a date to a landlord:** BS primary, small AD below.
6. **When displaying a date to a tenant:** same rule.
7. **Never** display only AD dates in the Nepal-market UI.

---

## PAYMENT INTEGRATIONS

### eSewa (Phase 2)

```python
# apps/payments/gateways/esewa.py
import hashlib, hmac, base64
from django.conf import settings

ESEWA_PAYMENT_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"

def generate_esewa_signature(total_amount, transaction_uuid, product_code):
    message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"
    key = settings.ESEWA_SECRET_KEY.encode()
    signature = hmac.new(key, message.encode(), hashlib.sha256).digest()
    return base64.b64encode(signature).decode()

def initiate_esewa_payment(payment):
    return {
        "payment_url": ESEWA_PAYMENT_URL,
        "params": {
            "amount": str(payment.amount_npr),
            "tax_amount": "0",
            "total_amount": str(payment.amount_npr),
            "transaction_uuid": str(payment.id),
            "product_code": settings.ESEWA_MERCHANT_CODE,
            "product_service_charge": "0",
            "product_delivery_charge": "0",
            "success_url": f"{settings.FRONTEND_URL}/payments/esewa/success",
            "failure_url": f"{settings.FRONTEND_URL}/payments/esewa/failure",
            "signed_field_names": "total_amount,transaction_uuid,product_code",
            "signature": generate_esewa_signature(...),
        }
    }
```

### Khalti (Phase 2)

```python
# apps/payments/gateways/khalti.py
import requests
from django.conf import settings

def initiate_khalti_payment(payment):
    headers = {"Authorization": f"Key {settings.KHALTI_SECRET_KEY}"}
    payload = {
        "return_url": f"{settings.FRONTEND_URL}/payments/khalti/success",
        "website_url": settings.FRONTEND_URL,
        "amount": int(payment.amount_npr * 100),  # Khalti uses paisa
        "purchase_order_id": str(payment.id),
        "purchase_order_name": f"Rent - {payment.lease.unit.unit_number}",
    }
    response = requests.post(
        "https://a.khalti.com/api/v2/epayment/initiate/",
        json=payload, headers=headers
    )
    return response.json()  # Contains payment_url
```

---

## NEPAL POLICE INTEGRATION

### Phase 1 (MVP): Structured PDF Form

Generate a filled PDF that mirrors the Nepal Police tenant registration form (ना.प. form). Store in MinIO. Mark status as `submitted`. Landlord prints and submits manually or via ward office.

```python
# apps/compliance/forms.py
def generate_police_registration_form(registration: PoliceRegistration) -> bytes:
    """
    Fill Nepal Police tenant registration form template.
    Store result in MinIO under compliance/{lease_id}/police_reg.pdf
    """
    tenant = registration.tenant
    lease = registration.lease
    # Use reportlab to fill a standardized form
    # Fields: tenant name (Nepali), citizenship no, DOB, 
    # permanent address, phone, landlord info, property address,
    # move-in date (BS), rent amount
    ...
```

### Phase 2: Direct API Integration

When Nepal Police digital API is available:

```python
# apps/compliance/api_client.py
import requests
from django.conf import settings

class NepalPoliceAPIClient:
    BASE_URL = settings.NEPAL_POLICE_API_URL
    
    def register_tenant(self, registration: PoliceRegistration) -> dict:
        """Submit tenant registration to Nepal Police system."""
        payload = {
            "tenant_name": registration.tenant.full_name_nepali,
            "citizenship_number": registration.tenant.citizenship_number,
            "landlord_name": ...,
            "property_address": ...,
            "move_in_date_bs": registration.lease.start_date_bs,
        }
        response = requests.post(
            f"{self.BASE_URL}/tenant/register",
            json=payload,
            headers={"X-API-Key": settings.NEPAL_POLICE_API_KEY},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        # Store registration number + update status
        registration.registration_number = data['registration_number']
        registration.status = 'registered'
        registration.api_submission_id = data['submission_id']
        registration.api_response = data
        registration.save()
        
        return data
```

**Compliance module architecture** is fully pluggable. For future markets:
- Create `apps/compliance/providers/india_rera.py`
- Create `apps/compliance/providers/philippines_dhsud.py`
- Each provider implements the same interface: `register_tenant()`, `check_status()`, `renew_registration()`
- The `PoliceRegistration` model becomes `TenantRegistration` with a `provider` field

---

## SMS — SPARROW SMS (NEPAL)

```python
# apps/core/sms.py
import requests
from django.conf import settings

def send_sms(phone: str, message: str) -> bool:
    """Send SMS via Sparrow SMS Nepal."""
    payload = {
        "token": settings.SPARROW_SMS_TOKEN,
        "from": settings.SPARROW_SMS_FROM,
        "to": phone,
        "text": message,
    }
    try:
        response = requests.post(
            "http://api.sparrowsms.com/v2/sms/",
            data=payload, timeout=10
        )
        return response.status_code == 200
    except Exception:
        return False

# Message templates — always include BS date
TEMPLATES = {
    'rent_due_7_days': "Namaste {name}! Vasati: {month_bs} ko bhada NPR {amount} {due_date_bs} ma tirna paincha. Lease: {unit}.",
    'rent_overdue_3': "Namaste {name}! Vasati: Tapainko {month_bs} ko bhada NPR {amount} {days} din baki cha. Kripaya bhuktan garnuhola.",
    'tenant_welcome': "Vasati ma swagat cha! Tapainko tenant portal: {portal_url}. Login garna: {otp_url}",
    'otp': "Vasati OTP: {otp}. 10 minute samma valid. Kasailai nadiinuhos.",
    'lease_expiring': "Vasati: {name} ko lease {unit} ma {days} din ma samapti hune cha ({expiry_bs}). Nobikaranako laagi sambarka garnuhola.",
}
```

---

## TESTING

```python
# backend/apps/tenants/tests/test_isolation.py
from django_tenants.test.cases import TenantTestCase
from django_tenants.test.client import TenantClient

class SchemaIsolationTest(TenantTestCase):
    """
    CRITICAL: Verify that Org A cannot access Org B's data under any circumstance.
    """
    def test_property_isolation_between_orgs(self):
        # Create property in Org A's schema
        with tenant_context(self.org_a):
            prop_a = Property.objects.create(name="Org A Property", ...)
        
        # Attempt to query it from Org B's schema
        with tenant_context(self.org_b):
            self.assertFalse(Property.objects.filter(id=prop_a.id).exists())
    
    def test_manager_cannot_access_unassigned_property(self):
        # Manager assigned to Property 1 should not see Property 2
        ...
    
    def test_tenant_can_only_see_own_data(self):
        # Tenant in Unit 3B cannot see payments for Unit 4A
        ...
```

---

## SEED DATA

```python
# scripts/seed.py
"""
Creates a sample org with realistic Nepal data for development.
Run: docker compose exec backend python manage.py shell < scripts/seed.py
"""

# Creates:
# Org: "Shrestha Properties"
# 2 Properties: "Sunrise Apartments, Lalitpur" (8 units) + "New Baneshwor Block" (12 units)
# 15 Tenants with realistic Nepali names, citizenship IDs
# Active leases for 14 units (1 vacant per property)
# 3 months of payment history
# 2 police registrations (1 complete, 1 pending)
# 1 corporate owner, 2 property managers, 1 caretaker
```

---

## ENVIRONMENT TIERS

| Setting | Development | Production |
|---|---|---|
| DEBUG | True | False |
| Database | Local PostgreSQL | Managed PostgreSQL (AWS RDS / DigitalOcean) |
| Storage | Local MinIO | AWS S3 or DigitalOcean Spaces |
| SMS | Log to console | Sparrow SMS live |
| Payments | eSewa/Khalti sandbox | eSewa/Khalti production |
| HTTPS | No | Yes (Let's Encrypt via Certbot) |
| CORS | `localhost:5173` | `vasati.com` |

---

## SUBSCRIPTION ENFORCEMENT

```python
# apps/tenants/middleware.py or decorators
TIER_LIMITS = {
    'free':       {'properties': 1, 'units': 3,  'managers': 0},
    'starter':    {'properties': 3, 'units': 15, 'managers': 2},
    'pro':        {'properties': 10,'units': 60, 'managers': 10},
    'enterprise': {'properties': None, 'units': None, 'managers': None},
}

def check_unit_limit(org):
    limit = TIER_LIMITS[org.subscription_tier]['units']
    if limit is None:
        return True
    current = Unit.objects.filter(property__is_active=True).count()
    return current < limit
```

When limit is reached: return HTTP 402 with `{ "error": "unit_limit_reached", "current_tier": "free", "upgrade_url": "/billing/upgrade" }`.

---

## PHASE 2 CHECKLIST (after Nepal MVP is live)

- [ ] Replace `PoliceRegistration` PDF form with live Nepal Police API (when available)
- [ ] eSewa + Khalti live credentials + webhook verification
- [ ] Lease PDF generation with Nepal-compliant template (Nepali legal language)
- [ ] OTP-based digital lease acknowledgment flow
- [ ] Corporate dashboard: cross-property consolidated view
- [ ] Monthly PDF report auto-generation + email to owner
- [ ] Compliance renewal reminder automation (30/15/7 days)

## PHASE 3 CHECKLIST

- [ ] Tenant Passport: portable rental history, score, verification badge
- [ ] Maintenance request module (tenant submits → caretaker assigned → owner notified)
- [ ] React Native mobile app (iOS + Android)
- [ ] India module: RERA compliance provider, INR currency, Indian phone format
- [ ] Webhook API (Enterprise tier)
- [ ] White-label option: custom subdomain + logo per org

---

## NAMING & CONVENTIONS

- **Product name:** Vasati (वासति — Sanskrit for "dwelling/residence")
- **API versioning:** `/api/v1/` — increment to v2 only for breaking changes
- **BS date strings:** Always `YYYY-MM-DD` format (e.g. `"2081-04-15"`)
- **AD date fields:** Django `DateField` / `DateTimeField` — stored as UTC
- **Money:** Always stored as `DecimalField(max_digits=10, decimal_places=2)` in NPR
- **Phone numbers:** Stored as `+977XXXXXXXXXX` in DB, displayed as `98X-XXXXXXX` in UI
- **MinIO keys:** Pattern: `{org_schema}/{doc_type}/{uuid}.{ext}` e.g. `schema_org_001/kyc/abc123.jpg`
- **Receipt numbers:** Pattern: `VAS-{BS_YEAR}-{BS_MONTH_2DIGIT}-{4DIGIT_SEQ}` e.g. `VAS-2081-04-0001`
- **All Django models:** include `created_at` (auto_now_add) and `updated_at` (auto_now)
- **Soft deletes:** Use `is_active = False` — never hard delete tenant, lease, or payment records

---

## SECURITY RULES

1. JWT tokens expire in 60 minutes. Refresh tokens expire in 7 days.
2. Tenant portal JWTs are scoped with claim `role: tenant` — backend validates on every request.
3. KYC images (citizenship photos) are served via signed MinIO URLs that expire in 15 minutes. Never public URLs.
4. All API endpoints require authentication except: `POST /auth/request-otp/` and `POST /auth/verify-otp/`.
5. `django-tenants` middleware enforces schema routing at the database level — application-level permission checks are a second layer, not the only layer.
6. Rate limit OTP requests: max 3 per phone per 10 minutes (use Redis counter).
7. Police registration API keys stored in environment variables only — never in DB or code.

---

*Build this in order: Docker up → Shared schema migrations → Tenant schema migrations → Auth endpoints → Properties → Tenants → Leases → Payments → Compliance → Frontend shell → Feature by feature.*
