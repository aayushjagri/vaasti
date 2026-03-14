// ── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  full_name: string
  phone?: string
  email?: string
  role: 'landlord' | 'tenant' | 'staff'
}

// ── Property ────────────────────────────────────────────────────────────────
export type PropertyType = 'residential' | 'commercial' | 'mixed'

export interface Property {
  id: string
  name: string
  address: string
  district: string
  ward_no: string
  property_type: PropertyType
  total_units: number
  occupied_units: number
  vacant_units: number
  owner_name?: string
  notes?: string
  created_at: string
}

export interface PropertyCreate {
  name: string
  address: string
  district: string
  ward_no: string
  property_type: PropertyType
  notes?: string
}

// ── Unit ────────────────────────────────────────────────────────────────────
export type UnitStatus = 'occupied' | 'vacant' | 'maintenance' | 'reserved'

export interface Unit {
  id: string
  property: string
  property_name?: string
  unit_number: string
  floor: string
  unit_type: string
  area_sqft?: number
  status: UnitStatus
  base_rent: number
  current_tenant_name?: string
  current_lease_id?: string
}

export interface UnitCreate {
  property: string
  unit_number: string
  floor: string
  unit_type: string
  area_sqft?: number
  base_rent: number
}

// ── Tenant ───────────────────────────────────────────────────────────────────
export type IDType = 'citizenship' | 'passport' | 'license' | 'national_id'

export interface Tenant {
  id: string
  full_name: string
  phone: string
  email?: string
  id_type: IDType
  id_number: string
  citizenship_front_url?: string
  citizenship_back_url?: string
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  current_unit_id?: string
  current_unit_number?: string
  property_name?: string
  police_reg_status: 'not_started' | 'submitted' | 'approved' | 'rejected'
  created_at: string
}

export interface TenantCreate {
  full_name: string
  phone: string
  email?: string
  id_type: IDType
  id_number: string
  citizenship_front?: File
  citizenship_back?: File
  emergency_contact_name: string
  emergency_contact_phone: string
  emergency_contact_relation: string
  unit_id: string
  lease_start_bs: string
  lease_end_bs: string
  rent_amount: number
}

// ── Lease ───────────────────────────────────────────────────────────────────
export type LeaseStatus = 'active' | 'draft' | 'expired' | 'terminated'

export interface Lease {
  id: string
  tenant: string
  tenant_name?: string
  unit: string
  unit_number?: string
  property_name?: string
  status: LeaseStatus
  start_date_bs: string
  end_date_bs: string
  start_date_ad?: string
  end_date_ad?: string
  rent_amount: number
  deposit_amount: number
  payment_day: number
  terms?: string
  is_acknowledged: boolean
  acknowledged_at?: string
  created_at: string
}

export interface LeaseCreate {
  tenant: string
  unit: string
  start_date_bs: string
  end_date_bs: string
  rent_amount: number
  deposit_amount: number
  payment_day: number
  terms?: string
}

// ── Payment ──────────────────────────────────────────────────────────────────
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'partial'
export type PaymentMethod = 'cash' | 'bank_transfer' | 'esewa' | 'khalti' | 'cheque'

export interface Payment {
  id: string
  lease: string
  lease_display?: string
  tenant_name?: string
  unit_number?: string
  property_name?: string
  amount: number
  payment_date_bs: string
  payment_date_ad?: string
  method: PaymentMethod
  reference_note?: string
  status: PaymentStatus
  receipt_number: string
  month_bs: string
  recorded_by?: string
  created_at: string
}

export interface LogCashPayment {
  lease: string
  amount: number
  payment_date_bs: string
  reference_note?: string
  month_bs: string
}

// ── Compliance ───────────────────────────────────────────────────────────────
export type PoliceRegStatus = 'not_started' | 'submitted' | 'approved' | 'rejected'

export interface Compliance {
  id: string
  tenant: string
  tenant_name: string
  unit_number?: string
  property_name?: string
  status: PoliceRegStatus
  submitted_at?: string
  approved_at?: string
  notes?: string
  form_data?: Record<string, string>
}

// ── Notice ───────────────────────────────────────────────────────────────────
export type NoticeType = 'rent_reminder' | 'maintenance' | 'general' | 'eviction' | 'inspection' | 'policy_update'
export type NoticeAudience = 'single' | 'floor' | 'property' | 'all'
export type NoticeChannel = 'sms' | 'in_app' | 'email'
export type NoticeStatus = 'draft' | 'sent' | 'failed'

export interface Notice {
  id: string
  notice_type: NoticeType
  audience: NoticeAudience
  target_tenant?: string
  target_floor?: string
  target_property?: string
  subject: string
  body: string
  channels: NoticeChannel[]
  status: NoticeStatus
  sent_at?: string
  recipient_count: number
  delivered_count: number
  created_at: string
}

export interface NoticeCreate {
  notice_type: NoticeType
  audience: NoticeAudience
  target_tenant?: string
  target_floor?: string
  target_property?: string
  subject: string
  body: string
  channels: NoticeChannel[]
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  total_properties: number
  total_units: number
  occupied_units: number
  vacant_units: number
  total_tenants: number
  active_leases: number
  expiring_leases: number
  rent_collected_this_month: number
  rent_expected_this_month: number
  overdue_payments: number
  pending_police_reg: number
  recent_activities: ActivityItem[]
}

export interface ActivityItem {
  id: string
  type: 'payment' | 'lease' | 'tenant' | 'notice' | 'compliance'
  description: string
  timestamp: string
  link?: string
}

// ── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ── BS Date utils ─────────────────────────────────────────────────────────────
export interface BSDate {
  year: number
  month: number
  day: number
}
