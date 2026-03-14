/**
 * Vasati Tenant Portal
 * Tenants view their own unit, lease, payments, and notices.
 * OTP login via phone/email. No landlord screens accessible.
 */
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Smartphone, Mail, Loader2, AlertCircle, DoorOpen,
  FileText, Banknote, Bell, Receipt, Download, LogOut, CheckCircle2
} from 'lucide-react'
import { authApi, tenantsApi, paymentsApi, noticesApi } from '../../api'
import { formatBSDate, formatBSMonth } from '../../utils/bs-date'
import { toast } from '../../components/ui/Toast'

type Tab = 'unit' | 'payments' | 'notices'

function PortalLogin({ onLogin }: { onLogin: () => void }) {
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier')
  const [channel, setChannel] = useState<'phone' | 'email'>('phone')
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRequestOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authApi.requestOTP(identifier, 'portal_login', channel)
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const data = await authApi.verifyOTP(identifier, otp, 'portal_login', channel)
      localStorage.setItem('vasati_portal_token', data.access)
      onLogin()
    } catch (err: any) {
      setError(err.message || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>वासति</h1>
          <p className="text-gold/50 text-xs tracking-widest uppercase mt-1">Tenant Portal</p>
          <div className="w-12 h-px bg-gold/20 mx-auto mt-4" />
        </div>

        <div className="card">
          {step === 'identifier' ? (
            <form onSubmit={handleRequestOTP}>
              <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Sign In
              </h2>

              <div className="flex rounded-xl bg-bg-elevated p-1 mb-5">
                {[['phone', 'Phone', Smartphone], ['email', 'Email', Mail]].map(([ch, label, Icon]: any) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => { setChannel(ch); setError('') }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      channel === ch ? 'bg-gold text-bg' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label>{channel === 'phone' ? 'Phone Number' : 'Email Address'}</label>
                {channel === 'phone' ? (
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>+977</span>
                    <input
                      type="tel" value={identifier} onChange={e => setIdentifier(e.target.value)}
                      placeholder="98XXXXXXXX" className="w-full pl-16" required autoFocus
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    />
                  </div>
                ) : (
                  <input
                    type="email" value={identifier} onChange={e => setIdentifier(e.target.value)}
                    placeholder="you@example.com" className="w-full" required autoFocus
                  />
                )}
              </div>

              {error && <div className="flex items-center gap-2 text-status-overdue text-sm mb-3"><AlertCircle size={13} />{error}</div>}

              <button type="submit" disabled={loading || !identifier} className="btn-primary w-full">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Send OTP
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Enter OTP</h2>
              <p className="text-slate-400 text-sm mb-5">
                Code sent to <span className="text-gold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{identifier}</span>
              </p>
              <input
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-[0.5em] mb-4"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                autoFocus
              />
              {error && <div className="flex items-center gap-2 text-status-overdue text-sm mb-3"><AlertCircle size={13} />{error}</div>}
              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full mb-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Verify & Sign In
              </button>
              <button type="button" onClick={() => { setStep('identifier'); setOtp(''); setError('') }} className="btn-ghost w-full text-sm">
                ← Change {channel === 'phone' ? 'number' : 'email'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function PortalDashboard() {
  const [tab, setTab] = useState<Tab>('unit')
  const [tenantId, setTenantId] = useState<string | null>(null)

  useEffect(() => {
    // Load current tenant's ID via /auth/me
    authApi.me().then(u => setTenantId(u.id)).catch(() => {})
  }, [])

  const { data: tenant } = useQuery({
    queryKey: ['portal-tenant', tenantId],
    queryFn: () => tenantsApi.get(tenantId!),
    enabled: !!tenantId,
  })

  const { data: paymentsData } = useQuery({
    queryKey: ['portal-payments', tenantId],
    queryFn: () => tenantsApi.payments(tenantId!),
    enabled: !!tenantId,
  })

  const { data: leasesData } = useQuery({
    queryKey: ['portal-leases', tenantId],
    queryFn: () => tenantsApi.leases(tenantId!),
    enabled: !!tenantId,
  })

  const { data: noticesData } = useQuery({
    queryKey: ['portal-notices'],
    queryFn: () => noticesApi.list({ audience_includes_me: '1' }),
  })

  function handleLogout() {
    localStorage.removeItem('vasati_portal_token')
    window.location.reload()
  }

  async function downloadReceipt(id: string, receiptNo: string) {
    try {
      const res = await paymentsApi.downloadReceipt(id)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `receipt-${receiptNo}.pdf`; a.click()
    } catch { toast('Could not download receipt', 'error') }
  }

  const activeLeases = leasesData?.results?.filter(l => l.status === 'active') ?? []
  const payments = paymentsData?.results ?? []
  const notices = noticesData?.results ?? []

  const TABS = [
    { id: 'unit', label: 'Unit & Lease', Icon: DoorOpen },
    { id: 'payments', label: 'Payments', Icon: Banknote },
    { id: 'notices', label: 'Notices', Icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg-card border-b border-slate-800 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gold" style={{ fontFamily: 'Cormorant Garamond, serif' }}>वासति Portal</h1>
            {tenant && <p className="text-xs text-slate-500">{tenant.full_name}</p>}
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex bg-bg-elevated rounded-xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-gold text-bg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <t.Icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Unit & Lease tab */}
        {tab === 'unit' && (
          <div className="space-y-4">
            {tenant?.current_unit_number && (
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                    <DoorOpen size={20} className="text-gold" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Your Unit</p>
                    <p className="text-xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {tenant.current_unit_number}
                    </p>
                  </div>
                </div>
                {tenant.property_name && (
                  <p className="text-sm text-slate-400">{tenant.property_name}</p>
                )}
              </div>
            )}

            {activeLeases.map(lease => {
              // Countdown: calculate days remaining
              const endParts = lease.end_date_bs.split('-').map(Number)
              const today = new Date()
              // Rough: assume 1 BS month ≈ 30.4 days
              const endApprox = new Date(endParts[0] - 56, endParts[1] - 1, endParts[2])
              const daysLeft = Math.max(0, Math.floor((endApprox.getTime() - today.getTime()) / 86400000))

              return (
                <div key={lease.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-gold" />
                      <h3 className="font-medium text-white">Active Lease</h3>
                    </div>
                    <span className="badge-active">Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Start</p>
                      <p className="text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatBSDate(lease.start_date_bs)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">End</p>
                      <p className="text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{formatBSDate(lease.end_date_bs)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Monthly Rent</p>
                      <p className="text-gold font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        NPR {lease.rent_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Days Remaining</p>
                      <p className={`font-medium ${daysLeft < 30 ? 'text-status-expiring' : 'text-white'}`}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {daysLeft}d
                      </p>
                    </div>
                  </div>
                  {lease.is_acknowledged && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-status-active">
                      <CheckCircle2 size={11} /> Acknowledged
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Payments tab */}
        {tab === 'payments' && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <div className="card text-center py-10">
                <Banknote size={32} className="mx-auto text-slate-700 mb-2" strokeWidth={1} />
                <p className="text-slate-500 text-sm">No payment records</p>
              </div>
            ) : payments.map(p => (
              <div key={p.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    NPR {p.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatBSMonth(p.month_bs)} · {formatBSDate(p.payment_date_bs)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={p.status === 'paid' ? 'badge-paid' : p.status === 'overdue' ? 'badge-overdue' : 'badge-pending'}>
                    {p.status}
                  </span>
                  <button
                    onClick={() => downloadReceipt(p.id, p.receipt_number)}
                    className="text-slate-500 hover:text-gold"
                    title="Download receipt"
                  >
                    <Receipt size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notices tab */}
        {tab === 'notices' && (
          <div className="space-y-2">
            {notices.length === 0 ? (
              <div className="card text-center py-10">
                <Bell size={32} className="mx-auto text-slate-700 mb-2" strokeWidth={1} />
                <p className="text-slate-500 text-sm">No notices</p>
              </div>
            ) : notices.map(n => (
              <div key={n.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-white text-sm">{n.subject}</h3>
                  {n.sent_at && (
                    <span className="text-xs text-slate-600 flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {new Date(n.sent_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mt-2">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PortalPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('vasati_portal_token'))

  if (!isLoggedIn) {
    return <PortalLogin onLogin={() => setIsLoggedIn(true)} />
  }

  return <PortalDashboard />
}
