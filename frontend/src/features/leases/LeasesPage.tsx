import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FileText, Search, Loader2, AlertCircle, Clock, CheckCircle2, X, Circle
} from 'lucide-react'
import { leasesApi } from '../../api'
import { formatBSDate } from '../../utils/bs-date'
import type { LeaseStatus } from '../../types'

const STATUS_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring Soon' },
  { value: 'expired', label: 'Expired' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'draft', label: 'Draft' },
]

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  draft: 'badge-draft',
  expired: 'badge-expired',
  terminated: 'badge bg-slate-700/50 text-slate-400',
  expiring: 'badge-expiring',
}

export default function LeasesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')

  const { data, isLoading } = useQuery({
    queryKey: ['leases', statusFilter],
    queryFn: () => leasesApi.list(statusFilter ? { status: statusFilter } : undefined),
  })

  const leases = data?.results ?? []
  const filtered = leases.filter(l =>
    l.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.unit_number?.includes(search) ||
    l.property_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leases</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.count ?? 0} leases</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tenant, unit…"
            className="w-full pl-11"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === s.value
                  ? 'bg-gold text-bg font-medium'
                  : 'bg-bg-elevated text-slate-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
          <p className="text-slate-400 font-medium">No leases found</p>
          <p className="text-slate-600 text-sm">Leases are created during tenant onboarding</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rent/mo</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ack</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr
                    key={l.id}
                    onClick={() => navigate(`/leases/${l.id}`)}
                    className="table-row cursor-pointer"
                  >
                    <td className="px-5 py-4 font-medium text-white">{l.tenant_name}</td>
                    <td className="px-5 py-4">
                      <div>
                        <span className="text-sm text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{l.unit_number}</span>
                        {l.property_name && <span className="block text-xs text-slate-500">{l.property_name}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatBSDate(l.start_date_bs)}<br />{formatBSDate(l.end_date_bs)}
                    </td>
                    <td className="px-5 py-4 text-right text-gold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {l.rent_amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={STATUS_BADGE[l.status] || 'badge'}>{l.status}</span>
                    </td>
                    <td className="px-5 py-4">
                      {l.is_acknowledged
                        ? <CheckCircle2 size={14} className="text-status-active" />
                        : <Circle size={14} className="text-slate-700" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
