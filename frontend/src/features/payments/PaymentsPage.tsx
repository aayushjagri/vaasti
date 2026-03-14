import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Banknote, Plus, Search, Receipt, Download,
  AlertCircle, CheckCircle2, Clock, Loader2, X, Filter
} from 'lucide-react'
import { paymentsApi, leasesApi, propertiesApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import { BSDateInput, formatBSDate, formatBSMonth, getCurrentBSMonthStr } from '../../utils/bs-date'
import type { LogCashPayment } from '../../types'

const STATUS_BADGE: Record<string, { cls: string; Icon: any }> = {
  paid: { cls: 'badge-paid', Icon: CheckCircle2 },
  pending: { cls: 'badge-pending', Icon: Clock },
  overdue: { cls: 'badge-overdue', Icon: AlertCircle },
  partial: { cls: 'badge-maintenance', Icon: Clock },
}

function LogPaymentModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<LogCashPayment>({
    lease: '', amount: 0, payment_date_bs: getCurrentBSMonthStr().replace('-', '-') + '-01',
    reference_note: '', month_bs: getCurrentBSMonthStr(),
  })
  const [leaseSearch, setLeaseSearch] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: leasesData } = useQuery({
    queryKey: ['leases-active'],
    queryFn: () => leasesApi.list({ status: 'active' }),
  })

  const filteredLeases = (leasesData?.results ?? []).filter(l =>
    l.tenant_name?.toLowerCase().includes(leaseSearch.toLowerCase()) ||
    l.unit_number?.includes(leaseSearch)
  )

  const selectedLease = leasesData?.results?.find(l => l.id === form.lease)

  const { mutate, isPending } = useMutation({
    mutationFn: paymentsApi.logCash,
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast(`Payment of NPR ${payment.amount.toLocaleString()} recorded`)
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.lease) e.lease = 'Select a lease'
    if (!form.amount || form.amount <= 0) e.amount = 'Enter valid amount'
    if (!form.payment_date_bs) e.payment_date_bs = 'Required'
    if (!form.month_bs) e.month_bs = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutate(form)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Log Cash Payment
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Lease search */}
          <div>
            <label>Tenant / Lease <span className="text-status-overdue">*</span></label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={leaseSearch}
                onChange={e => setLeaseSearch(e.target.value)}
                placeholder="Search tenant or unit…"
                className="w-full pl-9 text-sm"
                autoFocus
              />
            </div>
            {!form.lease ? (
              <div className="max-h-40 overflow-y-auto bg-bg-elevated rounded-xl border border-slate-700 divide-y divide-slate-800">
                {filteredLeases.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No active leases found</p>
                ) : filteredLeases.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, lease: l.id, amount: l.rent_amount }))
                      setErrors(p => ({ ...p, lease: '' }))
                    }}
                    className="w-full p-3 text-left hover:bg-bg-hover transition-colors flex justify-between"
                  >
                    <div>
                      <p className="text-sm text-white">{l.tenant_name}</p>
                      <p className="text-xs text-slate-500">Unit {l.unit_number} · {l.property_name}</p>
                    </div>
                    <span className="text-xs text-gold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      NPR {l.rent_amount.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gold/10 border border-gold/30 rounded-xl">
                <div>
                  <p className="text-sm text-white">{selectedLease?.tenant_name}</p>
                  <p className="text-xs text-slate-400">Unit {selectedLease?.unit_number} · {selectedLease?.property_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, lease: '' }))}
                  className="text-slate-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {errors.lease && <p className="text-status-overdue text-xs mt-1">{errors.lease}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Amount (NPR) <span className="text-status-overdue">*</span></label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={e => { setForm(p => ({ ...p, amount: Number(e.target.value) })); setErrors(p => ({ ...p, amount: '' })) }}
                className={`w-full ${errors.amount ? 'border-status-overdue' : ''}`}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                placeholder="e.g. 15000"
              />
              {errors.amount && <p className="text-status-overdue text-xs mt-1">{errors.amount}</p>}
            </div>
            <BSDateInput
              label="Payment Date (BS)"
              value={form.payment_date_bs}
              onChange={v => setForm(p => ({ ...p, payment_date_bs: v }))}
              required
              error={errors.payment_date_bs}
            />
          </div>

          <div>
            <label>For Month (BS) <span className="text-status-overdue">*</span></label>
            <input
              value={form.month_bs}
              onChange={e => setForm(p => ({ ...p, month_bs: e.target.value }))}
              placeholder="YYYY-MM e.g. 2081-04"
              className={`w-full ${errors.month_bs ? 'border-status-overdue' : ''}`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
            {errors.month_bs && <p className="text-status-overdue text-xs mt-1">{errors.month_bs}</p>}
          </div>

          <div>
            <label>Reference Note</label>
            <input
              value={form.reference_note || ''}
              onChange={e => setForm(p => ({ ...p, reference_note: e.target.value }))}
              placeholder="Optional — e.g. cash handed to Ramesh"
              className="w-full"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [monthFilter, setMonthFilter] = useState(getCurrentBSMonthStr())
  const [propertyFilter, setPropertyFilter] = useState('')
  const [showLog, setShowLog] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['payments', statusFilter, monthFilter, propertyFilter],
    queryFn: () => paymentsApi.list({
      ...(statusFilter && { status: statusFilter }),
      ...(monthFilter && { month_bs: monthFilter }),
      ...(propertyFilter && { property: propertyFilter }),
    }),
  })

  const { data: summary } = useQuery({
    queryKey: ['payments-summary', monthFilter],
    queryFn: () => paymentsApi.summary(monthFilter ? { month_bs: monthFilter } : undefined),
  })

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const payments = data?.results ?? []
  const filtered = payments.filter(p =>
    p.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.unit_number?.includes(search) ||
    p.receipt_number?.includes(search)
  )

  async function downloadReceipt(id: string, receiptNo: string) {
    try {
      const res = await paymentsApi.downloadReceipt(id)
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

  const collectionPct = summary
    ? Math.round((summary.total_collected / (summary.total_expected || 1)) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-slate-400 text-sm mt-0.5">{formatBSMonth(monthFilter)}</p>
        </div>
        <button onClick={() => setShowLog(true)} className="btn-primary">
          <Plus size={16} /> Log Payment
        </button>
      </div>

      {/* Monthly summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="stat-card">
            <CheckCircle2 size={18} className="text-status-paid mb-2" strokeWidth={1.5} />
            <div className="stat-value text-status-paid">NPR {summary.total_collected.toLocaleString()}</div>
            <div className="stat-label">Collected ({collectionPct}%)</div>
          </div>
          <div className="stat-card">
            <Banknote size={18} className="text-slate-500 mb-2" strokeWidth={1.5} />
            <div className="stat-value">NPR {summary.total_expected.toLocaleString()}</div>
            <div className="stat-label">Expected</div>
          </div>
          <div className="stat-card">
            <AlertCircle size={18} className="text-status-overdue mb-2" strokeWidth={1.5} />
            <div className={`stat-value ${summary.overdue_count > 0 ? 'text-status-overdue' : ''}`}>{summary.overdue_count}</div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-full pl-11" />
        </div>

        <input
          type="text"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          placeholder="YYYY-MM"
          className="w-32"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
          title="Filter by BS month"
        />

        <select value={propertyFilter} onChange={e => setPropertyFilter(e.target.value)} className="min-w-[140px]">
          <option value="">All Properties</option>
          {propertiesData?.results?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <div className="flex gap-1">
          {['', 'paid', 'pending', 'overdue'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === s ? 'bg-gold text-bg font-medium' : 'bg-bg-elevated text-slate-400 hover:text-white'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Payments table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Banknote size={48} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
          <p className="text-slate-400 font-medium">No payments found</p>
          <button onClick={() => setShowLog(true)} className="btn-primary mx-auto mt-4">
            <Plus size={15} /> Log Payment
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Month</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Receipt</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const sb = STATUS_BADGE[p.status] || { cls: 'badge', Icon: Clock }
                  return (
                    <tr key={p.id} className="table-row">
                      <td className="px-5 py-3 font-medium text-white">{p.tenant_name}</td>
                      <td className="px-5 py-3 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.unit_number}
                        {p.property_name && <span className="block text-xs text-slate-500">{p.property_name}</span>}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.month_bs}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatBSDate(p.payment_date_bs)}
                      </td>
                      <td className="px-5 py-3 text-right text-gold font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className={sb.cls}>
                          <sb.Icon size={10} className="mr-1" />{p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {p.receipt_number}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => downloadReceipt(p.id, p.receipt_number)}
                          className="text-slate-500 hover:text-gold transition-colors p-1"
                          title="Download receipt"
                        >
                          <Receipt size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showLog && <LogPaymentModal onClose={() => setShowLog(false)} />}
    </div>
  )
}
