import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, UserCircle, DoorOpen, FileText, Banknote,
  ShieldCheck, Bell, AlertCircle, CheckCircle2, Clock,
  Loader2, Trash2, Receipt, Download
} from 'lucide-react'
import { tenantsApi, paymentsApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { formatBSDate } from '../../utils/bs-date'
import { useState } from 'react'
import type { PoliceRegStatus } from '../../types'

const POLICE_REG_COLORS: Record<PoliceRegStatus, string> = {
  not_started: 'text-slate-400',
  submitted: 'text-status-pending',
  approved: 'text-status-active',
  rejected: 'text-status-overdue',
}

const PAYMENT_STATUS_CLS: Record<string, string> = {
  paid: 'badge-paid',
  pending: 'badge-pending',
  overdue: 'badge-overdue',
  partial: 'badge-maintenance',
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => tenantsApi.get(id!),
    enabled: !!id,
  })

  const { data: paymentsData } = useQuery({
    queryKey: ['tenant-payments', id],
    queryFn: () => tenantsApi.payments(id!),
    enabled: !!id,
  })

  const { data: leasesData } = useQuery({
    queryKey: ['tenant-leases', id],
    queryFn: () => tenantsApi.leases(id!),
    enabled: !!id,
  })

  const { mutate: deleteTenant, isPending: deleting } = useMutation({
    mutationFn: () => tenantsApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      toast('Tenant removed')
      navigate('/tenants')
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  async function downloadReceipt(paymentId: string, receiptNo: string) {
    try {
      const res = await paymentsApi.downloadReceipt(paymentId)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${receiptNo}.pdf`
      a.click()
    } catch {
      toast('Could not download receipt', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  if (!tenant) return null

  const payments = paymentsData?.results ?? []
  const leases = leasesData?.results ?? []
  const activeLeases = leases.filter(l => l.status === 'active')
  const regColor = POLICE_REG_COLORS[tenant.police_reg_status]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tenants')} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Tenants
        </button>
        <button onClick={() => setDeleteConfirm(true)} className="btn-danger text-sm">
          <Trash2 size={14} /> Remove Tenant
        </button>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <UserCircle size={32} className="text-gold" strokeWidth={1} />
          </div>
          <div className="flex-1">
            <h1 className="page-title">{tenant.full_name}</h1>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className="text-slate-300 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tenant.phone}</span>
              {tenant.email && <span className="text-slate-400 text-sm">{tenant.email}</span>}
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
              {tenant.current_unit_number && (
                <span className="flex items-center gap-1.5 text-sm text-slate-300">
                  <DoorOpen size={14} className="text-gold" />
                  Unit {tenant.current_unit_number}
                  {tenant.property_name && <span className="text-slate-500">· {tenant.property_name}</span>}
                </span>
              )}
              <span className={`flex items-center gap-1.5 text-sm ${regColor}`}>
                <ShieldCheck size={14} />
                Police reg: {tenant.police_reg_status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* ID info */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">ID Type</p>
            <p className="text-sm text-white capitalize">{tenant.id_type.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">ID Number</p>
            <p className="text-sm text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tenant.id_number}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Emergency Contact</p>
            <p className="text-sm text-white">{tenant.emergency_contact_name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Emergency Phone</p>
            <p className="text-sm text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tenant.emergency_contact_phone}</p>
          </div>
        </div>

        {/* KYC docs */}
        {(tenant.citizenship_front_url || tenant.citizenship_back_url) && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2">KYC Documents</p>
            <div className="flex gap-3">
              {tenant.citizenship_front_url && (
                <a href={tenant.citizenship_front_url} target="_blank" rel="noopener"
                  className="px-3 py-1.5 bg-bg-elevated rounded-lg text-xs text-gold hover:bg-bg-hover flex items-center gap-1.5">
                  <Download size={12} /> Front
                </a>
              )}
              {tenant.citizenship_back_url && (
                <a href={tenant.citizenship_back_url} target="_blank" rel="noopener"
                  className="px-3 py-1.5 bg-bg-elevated rounded-lg text-xs text-gold hover:bg-bg-hover flex items-center gap-1.5">
                  <Download size={12} /> Back
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active leases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title mb-0">Leases</h2>
          <button onClick={() => navigate('/leases')} className="text-gold text-sm hover:underline">
            View all →
          </button>
        </div>
        {leases.length === 0 ? (
          <div className="card text-center py-8">
            <FileText size={32} className="mx-auto text-slate-700 mb-2" strokeWidth={1} />
            <p className="text-slate-500 text-sm">No leases</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leases.slice(0, 3).map(l => (
              <button
                key={l.id}
                onClick={() => navigate(`/leases/${l.id}`)}
                className="w-full card p-4 text-left hover:border-gold/20 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`badge-${l.status}`}>{l.status}</span>
                    <span className="text-sm text-white">Unit {l.unit_number}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {formatBSDate(l.start_date_bs)} → {formatBSDate(l.end_date_bs)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    NPR {l.rent_amount.toLocaleString()}/mo
                  </div>
                  {l.is_acknowledged && (
                    <div className="flex items-center gap-1 justify-end mt-0.5 text-xs text-status-active">
                      <CheckCircle2 size={10} /> Acknowledged
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Payment history */}
      <div>
        <h2 className="section-title">Payment History</h2>
        {payments.length === 0 ? (
          <div className="card text-center py-8">
            <Banknote size={32} className="mx-auto text-slate-700 mb-2" strokeWidth={1} />
            <p className="text-slate-500 text-sm">No payments recorded</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Month</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="px-5 py-3 text-sm text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {formatBSDate(p.payment_date_bs)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.month_bs}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gold font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      NPR {p.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={PAYMENT_STATUS_CLS[p.status] || 'badge'}>{p.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => downloadReceipt(p.id, p.receipt_number)}
                        className="text-slate-500 hover:text-gold transition-colors"
                        title="Download receipt"
                      >
                        <Receipt size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirm}
        title="Remove Tenant"
        message={`Remove ${tenant.full_name} from the system? This will also terminate their active leases.`}
        confirmLabel="Remove Tenant"
        danger
        loading={deleting}
        onConfirm={() => deleteTenant()}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  )
}
