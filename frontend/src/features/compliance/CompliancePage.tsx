import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldCheck, Search, Download, AlertCircle,
  CheckCircle2, Clock, X, Loader2, FileText
} from 'lucide-react'
import { complianceApi, tenantsApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import type { PoliceRegStatus } from '../../types'

const STATUS_CONFIG: Record<PoliceRegStatus, { label: string; cls: string; Icon: any; color: string }> = {
  not_started: { label: 'Not Started', cls: 'badge bg-slate-700/50 text-slate-400', Icon: AlertCircle, color: 'text-slate-400' },
  submitted: { label: 'Submitted', cls: 'badge-pending', Icon: Clock, color: 'text-status-pending' },
  approved: { label: 'Approved', cls: 'badge-active', Icon: CheckCircle2, color: 'text-status-active' },
  rejected: { label: 'Rejected', cls: 'badge-overdue', Icon: AlertCircle, color: 'text-status-overdue' },
}

const ROW_BORDER: Record<PoliceRegStatus, string> = {
  not_started: '',
  submitted: 'border-l-2 border-l-status-pending',
  approved: 'border-l-2 border-l-status-active',
  rejected: 'border-l-2 border-l-status-overdue',
}

function RegistrationModal({ tenantId, tenantName, onClose }: {
  tenantId: string; tenantName: string; onClose: () => void
}) {
  const qc = useQueryClient()
  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => tenantsApi.get(tenantId),
  })

  const [formData, setFormData] = useState<Record<string, string>>({
    full_name: '', address: '', ward_no: '', district: '', id_number: '',
    id_type: '', occupation: '', nationality: 'Nepali',
  })

  // Pre-fill from tenant KYC when loaded
  useState(() => {
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        full_name: tenant.full_name,
        id_number: tenant.id_number,
        id_type: tenant.id_type,
      }))
    }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: () => complianceApi.submit(tenantId, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance'] })
      qc.invalidateQueries({ queryKey: ['tenant', tenantId] })
      toast(`Police registration submitted for ${tenantName}`)
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(prev => ({ ...prev, [k]: e.target.value }))

  const fields = [
    { key: 'full_name', label: 'Full Name', placeholder: "As per ID" },
    { key: 'address', label: 'Current Address', placeholder: "Street / Tole" },
    { key: 'ward_no', label: 'Ward No.', placeholder: "e.g. 10" },
    { key: 'district', label: 'District', placeholder: "e.g. Kathmandu" },
    { key: 'id_number', label: 'ID Number', placeholder: "Citizenship / Passport no." },
    { key: 'occupation', label: 'Occupation', placeholder: "e.g. Engineer" },
    { key: 'nationality', label: 'Nationality', placeholder: "Nepali" },
  ]

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Police Registration
            </h2>
            <p className="text-sm text-slate-400">{tenantName}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-3">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label>{label}</label>
              <input
                value={formData[key]}
                onChange={f(key)}
                placeholder={placeholder}
                className="w-full"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={() => mutate()} disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              Submit Registration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UpdateStatusModal({ compliance, onClose }: { compliance: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<PoliceRegStatus>(compliance.status)
  const [notes, setNotes] = useState(compliance.notes || '')

  const { mutate, isPending } = useMutation({
    mutationFn: () => complianceApi.updateStatus(compliance.id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance'] })
      toast('Status updated')
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Update Status
          </h2>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label>Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_CONFIG) as PoliceRegStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`p-3 rounded-xl border text-sm text-left transition-all ${
                    status === s ? 'border-gold bg-gold/10 text-gold' : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full resize-none"
              rows={2}
              placeholder="Optional notes…"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={() => mutate()} disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CompliancePage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [registerModal, setRegisterModal] = useState<{ id: string; name: string } | null>(null)
  const [updateModal, setUpdateModal] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['compliance', statusFilter],
    queryFn: () => complianceApi.list(statusFilter ? { status: statusFilter } : undefined),
  })

  const items = data?.results ?? []
  const filtered = items.filter(c =>
    c.tenant_name.toLowerCase().includes(search.toLowerCase()) ||
    c.unit_number?.includes(search) ||
    c.property_name?.toLowerCase().includes(search.toLowerCase())
  )

  // Summary counts
  const counts = items.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  async function downloadForm(id: string, name: string) {
    try {
      const res = await complianceApi.downloadForm(id)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `police-reg-${name.replace(/\s+/g, '-')}.pdf`
      a.click()
    } catch {
      toast('Could not download form', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Compliance</h1>
        <p className="text-slate-400 text-sm mt-0.5">Police registration tracking</p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(STATUS_CONFIG) as PoliceRegStatus[]).map(s => {
          const cfg = STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`stat-card text-left transition-all ${statusFilter === s ? 'border-gold/30' : ''}`}
            >
              <cfg.Icon size={18} className={`${cfg.color} mb-2`} strokeWidth={1.5} />
              <div className={`stat-value ${cfg.color}`}>{counts[s] || 0}</div>
              <div className="stat-label">{cfg.label}</div>
            </button>
          )
        })}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tenant…" className="w-full pl-11" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <ShieldCheck size={48} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
          <p className="text-slate-400 font-medium">No compliance records</p>
          <p className="text-slate-600 text-sm">Records are created when tenants are added</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Submitted</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Notes</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const cfg = STATUS_CONFIG[c.status]
                  return (
                    <tr key={c.id} className={`table-row ${ROW_BORDER[c.status]}`}>
                      <td className="px-5 py-4 font-medium text-white">{c.tenant_name}</td>
                      <td className="px-5 py-4 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {c.unit_number || '—'}
                        {c.property_name && <span className="block text-xs text-slate-500">{c.property_name}</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={cfg.cls}>
                          <cfg.Icon size={10} className="mr-1" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {c.submitted_at ? new Date(c.submitted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 max-w-[150px] truncate">
                        {c.notes || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === 'not_started' && (
                            <button
                              onClick={() => setRegisterModal({ id: c.tenant, name: c.tenant_name })}
                              className="text-xs px-2.5 py-1 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20 transition-colors"
                            >
                              Start
                            </button>
                          )}
                          {c.status === 'submitted' && (
                            <button
                              onClick={() => downloadForm(c.id, c.tenant_name)}
                              className="text-slate-500 hover:text-gold transition-colors"
                              title="Download form"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setUpdateModal(c)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-bg-elevated text-slate-400 hover:text-white border border-slate-700 transition-colors"
                          >
                            Update
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {registerModal && (
        <RegistrationModal
          tenantId={registerModal.id}
          tenantName={registerModal.name}
          onClose={() => setRegisterModal(null)}
        />
      )}
      {updateModal && (
        <UpdateStatusModal compliance={updateModal} onClose={() => setUpdateModal(null)} />
      )}
    </div>
  )
}
