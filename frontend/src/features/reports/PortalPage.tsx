/**
 * Vasati — Tenant Portal
 * Separate route /portal. Read-only: unit info, payments, notices.
 * Phone OTP login (shared auth, but IsTenantPortalUser enforced on API).
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatNPR, formatBSDate, formatBSMonth } from '../../utils'
import { useAuthStore } from '../../stores'

export default function PortalPage() {
    const { user, isAuthenticated, logout } = useAuthStore()
    const [data, setData] = useState<any>(null)
    const [payments, setPayments] = useState<any[]>([])
    const [notices, setNotices] = useState<any[]>([])
    const [tab, setTab] = useState<'home' | 'payments' | 'notices'>('home')
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadPortalData() }, [])

    async function loadPortalData() {
        try {
            const [me, pay, noticeData] = await Promise.all([
                api.get('/portal/me/'),
                api.get<any[]>('/portal/payments/'),
                api.get<any[]>('/portal/notices/'),
            ])
            setData(me)
            setPayments(pay || [])
            setNotices(noticeData || [])
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    if (loading) return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-bg">
            {/* Portal Header */}
            <header className="bg-bg-card border-b border-slate-800 px-4 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold font-serif text-gold">वासति Portal</h1>
                    <p className="text-xs text-slate-500">{user?.full_name}</p>
                </div>
                <button onClick={logout} className="btn-ghost text-xs">Logout</button>
            </header>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800">
                {[
                    { id: 'home' as const, label: 'My Unit', icon: '🏠' },
                    { id: 'payments' as const, label: 'Payments', icon: '💰' },
                    { id: 'notices' as const, label: 'Notices', icon: '📢' },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-3 text-sm text-center transition-all ${tab === t.id ? 'text-gold border-b-2 border-gold' : 'text-slate-500'
                            }`}
                    >
                        <span className="text-lg block">{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="p-4 max-w-lg mx-auto">
                {tab === 'home' && data && (
                    <div className="space-y-4 animate-fade-in">
                        {data.property && (
                            <div className="card">
                                <h3 className="section-title">Property</h3>
                                <p className="text-white font-semibold">{data.property.name}</p>
                                <p className="text-sm text-slate-400">{data.property.municipality}, Ward {data.property.ward_no}</p>
                            </div>
                        )}
                        {data.unit && (
                            <div className="card">
                                <h3 className="section-title">My Unit</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">Unit</span><span className="text-white font-mono">{data.unit.unit_number}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Floor</span><span className="text-white">F{data.unit.floor}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="text-white">{data.unit.type_display}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Rent</span><span className="text-gold font-mono">{formatNPR(data.unit.base_rent_npr)}</span></div>
                                </div>
                            </div>
                        )}
                        {data.lease && (
                            <div className="card">
                                <h3 className="section-title">Lease</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`badge-${data.lease.status}`}>{data.lease.status_display}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Period</span><span className="text-white">{formatBSDate(data.lease.start_date_bs)} → {formatBSDate(data.lease.end_date_bs)}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Rent Due</span><span className="text-white">Day {data.lease.rent_due_day}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {tab === 'payments' && (
                    <div className="space-y-3 animate-fade-in">
                        <h3 className="section-title">Payment History</h3>
                        {payments.length === 0 ? (
                            <p className="text-slate-500 text-sm">No payments yet</p>
                        ) : payments.map((p: any) => (
                            <div key={p.id} className="card">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-mono text-xs text-gold">{p.receipt_number}</p>
                                        <p className="text-white font-mono mt-1">{formatNPR(p.amount_npr)}</p>
                                        <p className="text-xs text-slate-500 mt-1">{p.period_month_bs} • {p.method_display}</p>
                                    </div>
                                    <span className={`badge-${p.status}`}>{p.status_display}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'notices' && (
                    <div className="space-y-3 animate-fade-in">
                        <h3 className="section-title">Notices</h3>
                        {notices.length === 0 ? (
                            <p className="text-slate-500 text-sm">No notices yet</p>
                        ) : notices.map((n: any) => (
                            <div key={n.id} className="card">
                                <span className="badge bg-gold/10 text-gold text-xs mb-2">{n.type_display}</span>
                                <h4 className="font-semibold text-white">{n.subject}</h4>
                                <p className="text-sm text-slate-400 mt-1">{n.body}</p>
                                {n.body_nepali && <p className="text-sm text-slate-500 mt-1">{n.body_nepali}</p>}
                                <p className="text-xs text-slate-600 mt-2">{new Date(n.sent_at).toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
