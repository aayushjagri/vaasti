import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2, DoorOpen, Users, FileText,
  Banknote, ShieldCheck, Bell, TrendingUp,
  AlertCircle, Clock, CheckCircle2, ArrowRight, Loader2
} from 'lucide-react'
import { reportsApi } from '../../api'
import { formatBSMonth, getCurrentBSMonthStr } from '../../utils/bs-date'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 60_000,
  })

  const collectionPct = stats
    ? Math.round((stats.rent_collected_this_month / (stats.rent_expected_this_month || 1)) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">{formatBSMonth(getCurrentBSMonthStr())} — Overview</p>
      </div>

      {/* Primary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate('/properties')} className="stat-card text-left hover:border-gold/20 cursor-pointer">
          <Building2 size={20} className="text-gold mb-2" strokeWidth={1.5} />
          <div className="stat-value">{stats?.total_properties ?? '—'}</div>
          <div className="stat-label">Properties</div>
        </button>

        <button onClick={() => navigate('/properties')} className="stat-card text-left hover:border-gold/20 cursor-pointer">
          <DoorOpen size={20} className="text-status-occupied mb-2" strokeWidth={1.5} />
          <div className="stat-value">
            <span>{stats?.occupied_units ?? '—'}</span>
            <span className="text-slate-600 text-base font-normal"> / {stats?.total_units ?? '—'}</span>
          </div>
          <div className="stat-label">Units Occupied</div>
        </button>

        <button onClick={() => navigate('/tenants')} className="stat-card text-left hover:border-gold/20 cursor-pointer">
          <Users size={20} className="text-status-reserved mb-2" strokeWidth={1.5} />
          <div className="stat-value">{stats?.total_tenants ?? '—'}</div>
          <div className="stat-label">Active Tenants</div>
        </button>

        <button
          onClick={() => navigate('/leases?status=expiring')}
          className={`stat-card text-left cursor-pointer ${stats?.expiring_leases ? 'border-status-expiring/30 hover:border-status-expiring/60' : 'hover:border-gold/20'}`}
        >
          <FileText size={20} className={stats?.expiring_leases ? 'text-status-expiring mb-2' : 'text-slate-500 mb-2'} strokeWidth={1.5} />
          <div className={`stat-value ${stats?.expiring_leases ? 'text-status-expiring' : ''}`}>{stats?.expiring_leases ?? '—'}</div>
          <div className="stat-label">Leases Expiring</div>
        </button>
      </div>

      {/* Rent collection + overdue row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rent collection card */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title mb-0">Rent Collection</h2>
            <span className="text-xs text-slate-500">{formatBSMonth(getCurrentBSMonthStr())}</span>
          </div>

          <div className="flex items-end gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-gold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                NPR {(stats?.rent_collected_this_month ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-slate-400 mt-0.5">
                of NPR {(stats?.rent_expected_this_month ?? 0).toLocaleString()} expected
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-2xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: collectionPct >= 80 ? '#22c55e' : collectionPct >= 50 ? '#f59e0b' : '#ef4444' }}>
                {collectionPct}%
              </div>
              <div className="text-xs text-slate-500">collected</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(collectionPct, 100)}%`,
                background: collectionPct >= 80 ? '#22c55e' : collectionPct >= 50 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>

          <button
            onClick={() => navigate('/payments')}
            className="flex items-center gap-1 text-gold text-sm mt-4 hover:underline"
          >
            View all payments <ArrowRight size={14} />
          </button>
        </div>

        {/* Quick alerts */}
        <div className="card space-y-3">
          <h2 className="section-title mb-2">Alerts</h2>

          <button
            onClick={() => navigate('/payments?status=overdue')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
              stats?.overdue_payments
                ? 'bg-status-overdue/10 border border-status-overdue/20 hover:bg-status-overdue/15'
                : 'bg-bg-elevated'
            }`}
          >
            <AlertCircle size={18} className={stats?.overdue_payments ? 'text-status-overdue' : 'text-slate-600'} />
            <div className="text-left">
              <div className="text-sm font-medium text-white">{stats?.overdue_payments ?? 0} Overdue</div>
              <div className="text-xs text-slate-500">Rent payments</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/compliance?status=not_started')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
              stats?.pending_police_reg
                ? 'bg-status-pending/10 border border-status-pending/20 hover:bg-status-pending/15'
                : 'bg-bg-elevated'
            }`}
          >
            <ShieldCheck size={18} className={stats?.pending_police_reg ? 'text-status-pending' : 'text-slate-600'} />
            <div className="text-left">
              <div className="text-sm font-medium text-white">{stats?.pending_police_reg ?? 0} Pending</div>
              <div className="text-xs text-slate-500">Police registration</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/leases?status=expiring')}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-elevated hover:bg-bg-hover transition-colors"
          >
            <Clock size={18} className="text-status-expiring" />
            <div className="text-left">
              <div className="text-sm font-medium text-white">{stats?.expiring_leases ?? 0} Expiring</div>
              <div className="text-xs text-slate-500">Leases soon</div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Recent Activity</h2>
          <TrendingUp size={16} className="text-slate-600" />
        </div>

        {!stats?.recent_activities?.length ? (
          <div className="text-center py-8 text-slate-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" strokeWidth={1} />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recent_activities.slice(0, 8).map(item => {
              const Icon = item.type === 'payment'
                ? CheckCircle2
                : item.type === 'tenant'
                ? Users
                : item.type === 'lease'
                ? FileText
                : item.type === 'compliance'
                ? ShieldCheck
                : Bell
              const color = item.type === 'payment' ? 'text-status-paid' :
                item.type === 'tenant' ? 'text-status-reserved' :
                item.type === 'lease' ? 'text-gold' :
                item.type === 'compliance' ? 'text-status-active' : 'text-status-pending'

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0 cursor-pointer hover:bg-bg-hover rounded-lg px-2 -mx-2 transition-colors"
                  onClick={() => item.link && navigate(item.link)}
                >
                  <Icon size={16} className={`${color} mt-0.5 flex-shrink-0`} />
                  <p className="text-sm text-slate-300 flex-1">{item.description}</p>
                  <span className="text-xs text-slate-600 flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
