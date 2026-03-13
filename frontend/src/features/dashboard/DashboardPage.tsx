/**
 * Vasati — Dashboard Page
 * Real data from /api/v1/reports/dashboard/
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatNPR, formatBSMonth, getCurrentBSMonth } from '../../utils'

interface DashboardData {
    properties: {
        total: number; units_total: number; units_occupied: number;
        units_vacant: number; units_maintenance: number; occupancy_rate: number;
    }
    tenants: { active: number }
    leases: { active: number; expiring_soon: number; expired: number }
    revenue: {
        expected_this_month: string; collected_this_month: string;
        collection_rate: number; overdue_count: number;
        monthly_trend: { year: number; month: number; total_npr: string }[]
    }
    compliance: { pending_registrations: number; expiring_registrations: number }
    recent_payments: any[]
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get<DashboardData>('/reports/dashboard/')
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    if (!data) return <p className="text-slate-400 text-center py-10">Failed to load dashboard data</p>

    const currentBSMonth = getCurrentBSMonth()

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="text-slate-400 text-sm">{formatBSMonth(currentBSMonth)} — Overview</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="stat-card">
                    <span className="stat-label">Properties</span>
                    <span className="stat-value">{data.properties.total}</span>
                    <span className="text-xs text-slate-500">{data.properties.units_total} units total</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Occupancy</span>
                    <span className="stat-value text-status-occupied">{data.properties.occupancy_rate}%</span>
                    <span className="text-xs text-slate-500">{data.properties.units_occupied} / {data.properties.units_total}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Active Tenants</span>
                    <span className="stat-value">{data.tenants.active}</span>
                    <span className="text-xs text-status-expiring">{data.leases.expiring_soon} expiring</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Collection Rate</span>
                    <span className={`stat-value ${data.revenue.collection_rate >= 80 ? 'text-status-paid' : 'text-status-overdue'}`}>
                        {data.revenue.collection_rate}%
                    </span>
                    <span className="text-xs text-slate-500">{data.revenue.overdue_count} overdue</span>
                </div>
            </div>

            {/* Revenue Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                    <h3 className="section-title">Revenue — {formatBSMonth(currentBSMonth)}</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Expected</span>
                            <span className="text-white font-mono">{formatNPR(data.revenue.expected_this_month)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400">Collected</span>
                            <span className="text-status-paid font-mono">{formatNPR(data.revenue.collected_this_month)}</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-gold to-status-paid rounded-full transition-all"
                                style={{ width: `${Math.min(data.revenue.collection_rate, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title">Monthly Trend</h3>
                    <div className="flex items-end gap-2 h-32">
                        {data.revenue.monthly_trend.map((m, i) => {
                            const max = Math.max(...data.revenue.monthly_trend.map(t => parseFloat(t.total_npr) || 1))
                            const h = ((parseFloat(m.total_npr) || 0) / max) * 100
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className="w-full bg-gold/20 rounded-t-lg hover:bg-gold/30 transition-colors relative group"
                                        style={{ height: `${Math.max(h, 4)}%` }}
                                    >
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-xs text-gold bg-bg-card px-2 py-1 rounded whitespace-nowrap">
                                            {formatNPR(m.total_npr)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500">{m.month}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Unit Status + Compliance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card">
                    <h3 className="section-title">Unit Status</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-status-occupied/5">
                            <div className="w-3 h-3 rounded-full bg-status-occupied"></div>
                            <div>
                                <span className="text-white font-mono">{data.properties.units_occupied}</span>
                                <span className="text-slate-400 text-sm ml-2">Occupied</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-status-vacant/5">
                            <div className="w-3 h-3 rounded-full bg-status-vacant"></div>
                            <div>
                                <span className="text-white font-mono">{data.properties.units_vacant}</span>
                                <span className="text-slate-400 text-sm ml-2">Vacant</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-status-maintenance/5">
                            <div className="w-3 h-3 rounded-full bg-status-maintenance"></div>
                            <div>
                                <span className="text-white font-mono">{data.properties.units_maintenance}</span>
                                <span className="text-slate-400 text-sm ml-2">Maintenance</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-status-overdue/5">
                            <div className="w-3 h-3 rounded-full bg-status-overdue"></div>
                            <div>
                                <span className="text-white font-mono">{data.revenue.overdue_count}</span>
                                <span className="text-slate-400 text-sm ml-2">Overdue</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h3 className="section-title">Compliance</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 rounded-xl bg-status-pending/5">
                            <span className="text-slate-400">Pending Registrations</span>
                            <span className="badge-pending">{data.compliance.pending_registrations}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-xl bg-status-expiring/5">
                            <span className="text-slate-400">Expiring Soon</span>
                            <span className="badge-expiring">{data.compliance.expiring_registrations}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Payments */}
            <div className="card">
                <h3 className="section-title">Recent Payments</h3>
                {data.recent_payments.length === 0 ? (
                    <p className="text-slate-500 text-sm">No payments recorded yet</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 text-left">
                                    <th className="pb-3">Receipt</th>
                                    <th className="pb-3">Tenant</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Method</th>
                                    <th className="pb-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recent_payments.map((p: any) => (
                                    <tr key={p.id} className="table-row">
                                        <td className="py-3 font-mono text-xs text-gold">{p.receipt_number}</td>
                                        <td className="py-3">{p.tenant_name}</td>
                                        <td className="py-3 font-mono">{formatNPR(p.amount_npr)}</td>
                                        <td className="py-3 capitalize">{p.method_display}</td>
                                        <td className="py-3">
                                            <span className={`badge-${p.status}`}>{p.status_display}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
