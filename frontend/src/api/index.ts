/**
 * Vasati API Client
 * All calls to /api/v1/* with JWT Bearer auth.
 */
import type {
  Property, PropertyCreate, Unit, UnitCreate,
  Tenant, TenantCreate, Lease, LeaseCreate,
  Payment, LogCashPayment, Compliance, Notice, NoticeCreate,
  DashboardStats, PaginatedResponse
} from '../types'

const BASE = '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('vasati_token')
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('vasati_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      msg = body.detail || body.message || JSON.stringify(body)
    } catch { }
    throw new Error(msg)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  requestOTP: (identifier: string, purpose: string, channel: string) =>
    request<{ message: string }>('/auth/otp/request/', {
      method: 'POST',
      body: JSON.stringify({ identifier, purpose, channel }),
    }),
  verifyOTP: (identifier: string, otp: string, purpose: string, channel: string) =>
    request<{ access: string; refresh: string; user: { id: string; full_name: string; phone?: string; email?: string; role: string } }>(
      '/auth/otp/verify/', {
        method: 'POST',
        body: JSON.stringify({ identifier, otp, purpose, channel }),
      }
    ),
  me: () => request<{ id: string; full_name: string; phone?: string; email?: string; role: string }>('/auth/me/'),
}

// ── Properties ────────────────────────────────────────────────────────────────
export const propertiesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Property>>(`/properties/${qs}`)
  },
  get: (id: string) => request<Property>(`/properties/${id}/`),
  create: (data: PropertyCreate) =>
    request<Property>('/properties/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PropertyCreate>) =>
    request<Property>(`/properties/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/properties/${id}/`, { method: 'DELETE' }),
  units: (id: string) => request<PaginatedResponse<Unit>>(`/properties/${id}/units/`),
}

// ── Units ─────────────────────────────────────────────────────────────────────
export const unitsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Unit>>(`/units/${qs}`)
  },
  get: (id: string) => request<Unit>(`/units/${id}/`),
  create: (data: UnitCreate) =>
    request<Unit>('/units/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<UnitCreate & { status: string }>) =>
    request<Unit>(`/units/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/units/${id}/`, { method: 'DELETE' }),
}

// ── Tenants ───────────────────────────────────────────────────────────────────
export const tenantsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Tenant>>(`/tenants/${qs}`)
  },
  get: (id: string) => request<Tenant>(`/tenants/${id}/`),
  create: (formData: FormData) =>
    request<Tenant>('/tenants/', { method: 'POST', body: formData }),
  update: (id: string, data: Partial<Tenant>) =>
    request<Tenant>(`/tenants/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/tenants/${id}/`, { method: 'DELETE' }),
  payments: (id: string) => request<PaginatedResponse<Payment>>(`/tenants/${id}/payments/`),
  leases: (id: string) => request<PaginatedResponse<Lease>>(`/tenants/${id}/leases/`),
}

// ── Leases ────────────────────────────────────────────────────────────────────
export const leasesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Lease>>(`/leases/${qs}`)
  },
  get: (id: string) => request<Lease>(`/leases/${id}/`),
  create: (data: LeaseCreate) =>
    request<Lease>('/leases/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<LeaseCreate>) =>
    request<Lease>(`/leases/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  terminate: (id: string, reason: string) =>
    request<Lease>(`/leases/${id}/terminate/`, { method: 'POST', body: JSON.stringify({ reason }) }),
  requestAck: (id: string) =>
    request<{ message: string }>(`/leases/${id}/request-acknowledgement/`, { method: 'POST' }),
  verifyAck: (id: string, otp: string) =>
    request<Lease>(`/leases/${id}/verify-acknowledgement/`, { method: 'POST', body: JSON.stringify({ otp }) }),
  downloadPdf: (id: string) =>
    fetch(`${BASE}/leases/${id}/pdf/`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Payment>>(`/payments/${qs}`)
  },
  get: (id: string) => request<Payment>(`/payments/${id}/`),
  logCash: (data: LogCashPayment) =>
    request<Payment>('/payments/log-cash/', { method: 'POST', body: JSON.stringify(data) }),
  downloadReceipt: (id: string) =>
    fetch(`${BASE}/payments/${id}/receipt/`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }),
  summary: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ total_collected: number; total_expected: number; overdue_count: number }>(`/payments/summary/${qs}`)
  },
}

// ── Compliance ────────────────────────────────────────────────────────────────
export const complianceApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Compliance>>(`/compliance/${qs}`)
  },
  get: (id: string) => request<Compliance>(`/compliance/${id}/`),
  submit: (tenantId: string, formData: Record<string, string>) =>
    request<Compliance>(`/compliance/`, {
      method: 'POST',
      body: JSON.stringify({ tenant: tenantId, form_data: formData }),
    }),
  updateStatus: (id: string, status: string, notes?: string) =>
    request<Compliance>(`/compliance/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),
  downloadForm: (id: string) =>
    fetch(`${BASE}/compliance/${id}/pdf/`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    }),
}

// ── Notices ───────────────────────────────────────────────────────────────────
export const noticesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PaginatedResponse<Notice>>(`/notices/${qs}`)
  },
  get: (id: string) => request<Notice>(`/notices/${id}/`),
  create: (data: NoticeCreate) =>
    request<Notice>('/notices/', { method: 'POST', body: JSON.stringify(data) }),
  recipients: (id: string) => request<{ name: string; phone?: string; email?: string; delivered: boolean }[]>(`/notices/${id}/recipients/`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => request<DashboardStats>('/reports/dashboard/'),
}
