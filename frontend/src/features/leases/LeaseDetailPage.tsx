import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, FileText, Download, CheckCircle2, RefreshCw,
  XCircle, Loader2, AlertCircle, X
} from 'lucide-react'
import { leasesApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { formatBSDate, BSDateInput } from '../../utils/bs-date'

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-active',
  draft: 'badge-draft',
  expired: 'badge-expired',
  terminated: 'badge bg-slate-700/50 text-slate-400',
}

function AcknowledgeModal({ leaseId, onClose }: { leaseId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [otp, setOtp] = useState('')

  const { mutate: request, isPending: requesting } = useMutation({
    mutationFn: () => leasesApi.requestAck(leaseId),
    onSuccess: () => setStep('verify'),
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const { mutate: verify, isPending: verifying } = useMutation({
    mutationFn: () => leasesApi.verifyAck(leaseId, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lease', leaseId] })
      toast('Lease acknowledged by tenant')
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Tenant Acknowledgement
          </h2>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>

        {step === 'request' ? (
          <>
            <p className="text-slate-400 text-sm mb-6">
              An OTP will be sent to the tenant's registered phone/email to acknowledge this lease digitally.
            </p>
            <button
              onClick={() => request()}
              disabled={requesting}
              className="btn-primary w-full"
            >
              {requesting ? <Loader2 size={15} className="animate-spin" /> : null}
              Send OTP to Tenant
            </button>
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-4">Enter the OTP provided by the tenant:</p>
            <input
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] mb-4"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
              autoFocus
            />
            <button
              onClick={() => verify()}
              disabled={verifying || otp.length !== 6}
              className="btn-primary w-full"
            >
              {verifying ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Verify & Acknowledge
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function RenewModal({ lease, onClose }: { lease: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [endDate, setEndDate] = useState('')
  const [rent, setRent] = useState(String(lease.rent_amount))

  const { mutate, isPending } = useMutation({
    mutationFn: () => leasesApi.update(lease.id, {
      end_date_bs: endDate,
      rent_amount: Number(rent),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lease', lease.id] })
      toast('Lease renewed')
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Renew Lease</h2>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="space-y-4">
          <BSDateInput label="New End Date (BS)" value={endDate} onChange={setEndDate} required />
          <div>
            <label>Revised Monthly Rent (NPR)</label>
            <input
              type="number" value={rent}
              onChange={e => setRent(e.target.value)}
              className="w-full"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={() => mutate()} disabled={isPending || !endDate} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
              Renew Lease
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LeaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAck, setShowAck] = useState(false)
  const [showRenew, setShowRenew] = useState(false)
  const [terminateConfirm, setTerminateConfirm] = useState(false)

  const { data: lease, isLoading } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => leasesApi.get(id!),
    enabled: !!id,
  })

  const { mutate: terminate, isPending: terminating } = useMutation({
    mutationFn: () => leasesApi.terminate(id!, 'Terminated by landlord'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lease', id] })
      qc.invalidateQueries({ queryKey: ['leases'] })
      toast('Lease terminated')
      setTerminateConfirm(false)
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  async function downloadPdf() {
    try {
      const res = await leasesApi.downloadPdf(id!)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lease-${id}.pdf`
      a.click()
    } catch {
      toast('Could not download lease PDF', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  if (!lease) return null

  const isActive = lease.status === 'active'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/leases')} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Leases
        </button>
        <div className="flex gap-2">
          <button onClick={downloadPdf} className="btn-secondary text-sm">
            <Download size={14} /> PDF
          </button>
          {isActive && !lease.is_acknowledged && (
            <button onClick={() => setShowAck(true)} className="btn-secondary text-sm">
              <CheckCircle2 size={14} /> Get Acknowledgement
            </button>
          )}
          {isActive && (
            <>
              <button onClick={() => setShowRenew(true)} className="btn-secondary text-sm">
                <RefreshCw size={14} /> Renew
              </button>
              <button onClick={() => setTerminateConfirm(true)} className="btn-danger text-sm">
                <XCircle size={14} /> Terminate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lease card */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <FileText size={22} className="text-gold" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="page-title">{lease.tenant_name}</h1>
              <p className="text-slate-400 text-sm">
                Unit {lease.unit_number} · {lease.property_name}
              </p>
            </div>
          </div>
          <span className={STATUS_BADGE[lease.status] || 'badge'}>{lease.status}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          {[
            ['Start Date', formatBSDate(lease.start_date_bs)],
            ['End Date', formatBSDate(lease.end_date_bs)],
            ['Monthly Rent', `NPR ${lease.rent_amount.toLocaleString()}`],
            ['Deposit', `NPR ${lease.deposit_amount.toLocaleString()}`],
            ['Payment Due Day', `Day ${lease.payment_day}`],
            ['Created', new Date(lease.created_at).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-sm text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Acknowledgement status */}
        <div className={`mt-4 pt-4 border-t border-slate-800 flex items-center gap-2 text-sm ${lease.is_acknowledged ? 'text-status-active' : 'text-slate-500'}`}>
          {lease.is_acknowledged
            ? <><CheckCircle2 size={14} /> Acknowledged by tenant on {new Date(lease.acknowledged_at!).toLocaleDateString()}</>
            : <><AlertCircle size={14} /> Not yet acknowledged by tenant</>
          }
        </div>

        {lease.terms && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 mb-2">Terms & Conditions</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{lease.terms}</p>
          </div>
        )}
      </div>

      {showAck && <AcknowledgeModal leaseId={id!} onClose={() => setShowAck(false)} />}
      {showRenew && lease && <RenewModal lease={lease} onClose={() => setShowRenew(false)} />}
      <ConfirmDialog
        open={terminateConfirm}
        title="Terminate Lease"
        message="This will mark the lease as terminated and may affect the tenant's unit status. This cannot be undone."
        confirmLabel="Terminate Lease"
        danger
        loading={terminating}
        onConfirm={() => terminate()}
        onCancel={() => setTerminateConfirm(false)}
      />
    </div>
  )
}
