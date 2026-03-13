/**
 * Vasati — Leases Page
 * Lease creation with BS date picker, list, renew, terminate.
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatBSDate, formatNPR, bsToAd, formatADDate, getTodayBS } from '../../utils'
import BSDatePicker from '../../components/ui/BSDatePicker'

interface Lease {
    id: number; tenant: number; tenant_name: string; tenant_phone: string;
    unit: number; unit_number: string; property_name: string;
    start_date_bs: string; end_date_bs: string; start_date_ad: string; end_date_ad: string;
    rent_npr: string; deposit_npr: string; rent_due_day: number;
    status: string; status_display: string;
}

export default function LeasesPage() {
    const [leases, setLeases] = useState<Lease[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState<any>({})
    const [tenants, setTenants] = useState<any[]>([])
    const [units, setUnits] = useState<any[]>([])

    useEffect(() => { loadLeases() }, [])

    async function loadLeases() {
        setLoading(true)
        try {
            const data = await api.get<{ results: Lease[] }>('/leases/')
            setLeases(data.results || [])
        } catch { setLeases([]) }
        setLoading(false)
    }

    async function openCreateModal() {
        setShowCreate(true)
        const [t, u] = await Promise.all([
            api.get<{ results: any[] }>('/tenants/'),
            api.get<{ results: any[] }>('/units/'),
        ])
        setTenants(t.results || [])
        setUnits(u.results?.filter((u: any) => u.status === 'vacant') || [])
    }

    function updateForm(field: string, value: any) {
        setForm({ ...form, [field]: value })
    }

    async function createLease(e: React.FormEvent) {
        e.preventDefault()
        try {
            await api.post('/leases/', form)
            setShowCreate(false)
            setForm({})
            loadLeases()
        } catch (err) { console.error(err) }
    }

    async function terminateLease(id: number) {
        if (!confirm('Terminate this lease?')) return
        await api.post(`/leases/${id}/terminate/`)
        loadLeases()
    }

    const statusBadge: Record<string, string> = {
        draft: 'badge-draft', active: 'badge-active', expiring_soon: 'badge-expiring',
        expired: 'badge-expired', terminated: 'badge-overdue', month_to_month: 'badge-pending',
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="page-title">Leases</h1>
                <button onClick={openCreateModal} className="btn-primary">+ New Lease</button>
            </div>

            {leases.length === 0 ? (
                <div className="card text-center py-10"><p className="text-slate-400">No leases yet</p></div>
            ) : (
                <div className="space-y-3">
                    {leases.map(l => (
                        <div key={l.id} className="card-hover">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-white">{l.tenant_name}</h3>
                                        <span className={statusBadge[l.status] || 'badge-draft'}>{l.status_display}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-1">{l.property_name} — {l.unit_number}</p>
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                        <span>📅 {formatBSDate(l.start_date_bs)} → {formatBSDate(l.end_date_bs)}</span>
                                        <span>💰 {formatNPR(l.rent_npr)}/mo</span>
                                        <span>Due: Day {l.rent_due_day}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {l.status === 'active' && (
                                        <button onClick={() => terminateLease(l.id)} className="btn-danger text-xs">Terminate</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Lease Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content p-6 max-w-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">New Lease</h2>
                        <form onSubmit={createLease} className="space-y-4">
                            <div>
                                <label>Tenant *</label>
                                <select value={form.tenant || ''} onChange={e => updateForm('tenant', Number(e.target.value))} required className="w-full">
                                    <option value="">Select tenant...</option>
                                    {tenants.map(t => <option key={t.id} value={t.id}>{t.full_name} ({t.phone})</option>)}
                                </select>
                            </div>
                            <div>
                                <label>Unit *</label>
                                <select value={form.unit || ''} onChange={e => updateForm('unit', Number(e.target.value))} required className="w-full">
                                    <option value="">Select vacant unit...</option>
                                    {units.map((u: any) => <option key={u.id} value={u.id}>{u.unit_number} (F{u.floor}) — {formatNPR(u.base_rent_npr)}</option>)}
                                </select>
                            </div>

                            {/* BS Date Pickers — primary */}
                            <BSDatePicker
                                label="Start Date (BS)"
                                value={form.start_date_bs || ''}
                                onChange={(bs, ad) => { updateForm('start_date_bs', bs); updateForm('start_date_ad', ad) }}
                                required
                            />
                            <BSDatePicker
                                label="End Date (BS)"
                                value={form.end_date_bs || ''}
                                onChange={(bs, ad) => { updateForm('end_date_bs', bs); updateForm('end_date_ad', ad) }}
                                required
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <div><label>Rent (NPR) *</label><input type="number" step="0.01" value={form.rent_npr || ''} onChange={e => updateForm('rent_npr', e.target.value)} required className="w-full" /></div>
                                <div><label>Deposit (NPR) *</label><input type="number" step="0.01" value={form.deposit_npr || ''} onChange={e => updateForm('deposit_npr', e.target.value)} required className="w-full" /></div>
                            </div>
                            <div><label>Rent Due Day</label><input type="number" min="1" max="28" value={form.rent_due_day || 1} onChange={e => updateForm('rent_due_day', Number(e.target.value))} className="w-full" /></div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" className="btn-primary">Create Lease</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
