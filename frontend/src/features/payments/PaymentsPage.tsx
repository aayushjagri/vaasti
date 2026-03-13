/**
 * Vasati — Payments Page
 * List, log cash payment, download receipt PDF.
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatNPR, formatBSDate, getCurrentBSMonth } from '../../utils'
import BSDatePicker from '../../components/ui/BSDatePicker'

export default function PaymentsPage() {
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCash, setShowCash] = useState(false)
    const [form, setForm] = useState<any>({ period_month_bs: getCurrentBSMonth() })
    const [leases, setLeases] = useState<any[]>([])

    useEffect(() => { loadPayments() }, [])

    async function loadPayments() {
        setLoading(true)
        try {
            const data = await api.get<{ results: any[] }>('/payments/')
            setPayments(data.results || [])
        } catch { setPayments([]) }
        setLoading(false)
    }

    async function openCashModal() {
        setShowCash(true)
        try {
            const data = await api.get<{ results: any[] }>('/leases/')
            setLeases((data.results || []).filter((l: any) => l.status === 'active'))
        } catch { }
    }

    async function logCash(e: React.FormEvent) {
        e.preventDefault()
        try {
            await api.post('/payments/cash/', form)
            setShowCash(false)
            setForm({ period_month_bs: getCurrentBSMonth() })
            loadPayments()
        } catch (err) { console.error(err) }
    }

    function downloadReceipt(id: number) {
        const token = localStorage.getItem('access_token')
        window.open(`/api/v1/payments/${id}/receipt/?token=${token}`, '_blank')
    }

    const statusBadge: Record<string, string> = {
        pending: 'badge-pending', completed: 'badge-paid', failed: 'badge-overdue', refunded: 'badge-draft',
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="page-title">Payments</h1>
                <button onClick={openCashModal} className="btn-primary">+ Log Cash Payment</button>
            </div>

            {payments.length === 0 ? (
                <div className="card text-center py-10"><p className="text-slate-400">No payments recorded yet</p></div>
            ) : (
                <div className="card overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-slate-400 text-left border-b border-slate-800">
                                <th className="pb-3">Receipt</th>
                                <th className="pb-3">Tenant</th>
                                <th className="pb-3">Unit</th>
                                <th className="pb-3">Period</th>
                                <th className="pb-3">Amount</th>
                                <th className="pb-3">Method</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(p => (
                                <tr key={p.id} className="table-row">
                                    <td className="py-3 font-mono text-xs text-gold">{p.receipt_number}</td>
                                    <td className="py-3">{p.tenant_name}</td>
                                    <td className="py-3 text-xs text-slate-400">{p.unit_number}</td>
                                    <td className="py-3 text-xs">{p.period_month_bs}</td>
                                    <td className="py-3 font-mono">{formatNPR(p.amount_npr)}</td>
                                    <td className="py-3 capitalize text-xs">{p.method_display}</td>
                                    <td className="py-3">
                                        <span className={statusBadge[p.status] || 'badge-draft'}>{p.status_display}</span>
                                    </td>
                                    <td className="py-3">
                                        {p.status === 'completed' && (
                                            <button onClick={() => downloadReceipt(p.id)} className="btn-ghost text-xs">📄 Receipt</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Log Cash Payment Modal */}
            {showCash && (
                <div className="modal-overlay" onClick={() => setShowCash(false)}>
                    <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">Log Cash Payment</h2>
                        <form onSubmit={logCash} className="space-y-4">
                            <div>
                                <label>Lease *</label>
                                <select value={form.lease_id || ''} onChange={e => setForm({ ...form, lease_id: Number(e.target.value) })} required className="w-full">
                                    <option value="">Select active lease...</option>
                                    {leases.map((l: any) => <option key={l.id} value={l.id}>{l.tenant_name} — {l.unit_number} ({formatNPR(l.rent_npr)})</option>)}
                                </select>
                            </div>
                            <div><label>Amount (NPR) *</label><input type="number" step="0.01" value={form.amount_npr || ''} onChange={e => setForm({ ...form, amount_npr: e.target.value })} required className="w-full" /></div>
                            <div><label>Period Month (BS) *</label><input value={form.period_month_bs || ''} onChange={e => setForm({ ...form, period_month_bs: e.target.value })} placeholder="2081-04" required className="w-full" /></div>
                            <BSDatePicker
                                label="Paid Date (BS)"
                                value={form.paid_at_bs || ''}
                                onChange={(bs, ad) => setForm({ ...form, paid_at_bs: bs, period_month_ad: ad })}
                            />
                            <div><label>Notes</label><input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full" /></div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCash(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" className="btn-primary">Log Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
