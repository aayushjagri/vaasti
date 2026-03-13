/**
 * Vasati — Compliance Page
 * Police registration status per tenant.
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatBSDate } from '../../utils'

export default function CompliancePage() {
    const [regs, setRegs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get<{ results: any[] }>('/compliance/')
            .then(d => setRegs(d.results || []))
            .catch(() => setRegs([]))
            .finally(() => setLoading(false))
    }, [])

    async function submitReg(id: number) {
        await api.post(`/compliance/${id}/submit/`)
        const data = await api.get<{ results: any[] }>('/compliance/')
        setRegs(data.results || [])
    }

    const statusColors: Record<string, string> = {
        not_started: 'badge-draft', in_progress: 'badge-pending',
        submitted: 'badge-expiring', registered: 'badge-active',
        renewal_required: 'badge-overdue', expired: 'badge-expired',
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="page-title">Police Registration</h1>
            <p className="text-slate-400 text-sm">Nepal Police tenant registration status per active lease.</p>

            {regs.length === 0 ? (
                <div className="card text-center py-10"><p className="text-slate-400">No registrations yet. They are auto-created with new leases.</p></div>
            ) : (
                <div className="space-y-3">
                    {regs.map(r => (
                        <div key={r.id} className="card-hover">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-white">{r.tenant_name}</h3>
                                        <span className={statusColors[r.status] || 'badge-draft'}>{r.status_display}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 mt-1">{r.unit_info}</p>
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                        {r.ward_police_office && <span>Office: {r.ward_police_office}</span>}
                                        {r.registration_number && <span>Reg #: {r.registration_number}</span>}
                                        {r.registered_date_bs && <span>Registered: {formatBSDate(r.registered_date_bs)}</span>}
                                        {r.expiry_date_ad && <span>Expires: {r.expiry_date_ad}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {(r.status === 'not_started' || r.status === 'in_progress') && (
                                        <button onClick={() => submitReg(r.id)} className="btn-secondary text-xs">Mark Submitted</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
