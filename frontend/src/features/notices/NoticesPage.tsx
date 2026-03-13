/**
 * Vasati — Notices Page
 * Create + send + log notices.
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function NoticesPage() {
    const [notices, setNotices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState<any>({ channels: ['app'] })
    const [properties, setProperties] = useState<any[]>([])
    const [tenants, setTenants] = useState<any[]>([])

    useEffect(() => { loadNotices() }, [])

    async function loadNotices() {
        setLoading(true)
        try {
            const data = await api.get<{ results: any[] }>('/notices/')
            setNotices(data.results || [])
        } catch { setNotices([]) }
        setLoading(false)
    }

    async function openCreateModal() {
        setShowCreate(true)
        const [p, t] = await Promise.all([
            api.get<{ results: any[] }>('/properties/'),
            api.get<{ results: any[] }>('/tenants/'),
        ])
        setProperties(p.results || [])
        setTenants(t.results || [])
    }

    async function createNotice(e: React.FormEvent) {
        e.preventDefault()
        try {
            await api.post('/notices/', form)
            setShowCreate(false)
            setForm({ channels: ['app'] })
            loadNotices()
        } catch (err) { console.error(err) }
    }

    function toggleChannel(ch: string) {
        const current: string[] = form.channels || []
        if (current.includes(ch)) {
            setForm({ ...form, channels: current.filter((c: string) => c !== ch) })
        } else {
            setForm({ ...form, channels: [...current, ch] })
        }
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="page-title">Notices</h1>
                <button onClick={openCreateModal} className="btn-primary">+ Send Notice</button>
            </div>

            {notices.length === 0 ? (
                <div className="card text-center py-10"><p className="text-slate-400">No notices sent yet</p></div>
            ) : (
                <div className="space-y-3">
                    {notices.map(n => (
                        <div key={n.id} className="card-hover">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="badge bg-gold/10 text-gold text-xs">{n.type_display}</span>
                                        <span className="badge bg-slate-700 text-slate-300 text-xs">{n.audience_display}</span>
                                        {(n.channels || []).map((ch: string) => (
                                            <span key={ch} className="badge bg-status-vacant/10 text-status-vacant text-xs">{ch}</span>
                                        ))}
                                    </div>
                                    <h3 className="font-semibold text-white mt-2">{n.subject}</h3>
                                    <p className="text-sm text-slate-400 mt-1 line-clamp-2">{n.body}</p>
                                    {n.body_nepali && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{n.body_nepali}</p>}
                                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                        {n.property_name && <span>Property: {n.property_name}</span>}
                                        {n.tenant_name && <span>Tenant: {n.tenant_name}</span>}
                                        <span>Sent: {new Date(n.sent_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Notice Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content p-6 max-w-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">Send Notice</h2>
                        <form onSubmit={createNotice} className="space-y-4">
                            <div>
                                <label>Type *</label>
                                <select value={form.notice_type || ''} onChange={e => setForm({ ...form, notice_type: e.target.value })} required className="w-full">
                                    <option value="">Select type...</option>
                                    <option value="rent_reminder">Rent Reminder</option>
                                    <option value="lease_expiry">Lease Expiry Warning</option>
                                    <option value="general">General Notice</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="eviction_warning">Eviction Warning</option>
                                    <option value="welcome">Welcome</option>
                                </select>
                            </div>
                            <div>
                                <label>Audience *</label>
                                <select value={form.audience_type || ''} onChange={e => setForm({ ...form, audience_type: e.target.value })} required className="w-full">
                                    <option value="">Select audience...</option>
                                    <option value="single_tenant">Single Tenant</option>
                                    <option value="property">Entire Property</option>
                                    <option value="all">All Tenants</option>
                                </select>
                            </div>
                            {form.audience_type === 'single_tenant' && (
                                <div>
                                    <label>Tenant</label>
                                    <select value={form.target_tenant_id || ''} onChange={e => setForm({ ...form, target_tenant_id: Number(e.target.value) })} className="w-full">
                                        <option value="">Select tenant...</option>
                                        {tenants.map((t: any) => <option key={t.id} value={t.id}>{t.full_name} ({t.phone})</option>)}
                                    </select>
                                </div>
                            )}
                            {form.audience_type === 'property' && (
                                <div>
                                    <label>Property</label>
                                    <select value={form.target_property_id || ''} onChange={e => setForm({ ...form, target_property_id: Number(e.target.value) })} className="w-full">
                                        <option value="">Select property...</option>
                                        {properties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div><label>Subject *</label><input value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} required className="w-full" /></div>
                            <div><label>Body *</label><textarea value={form.body || ''} onChange={e => setForm({ ...form, body: e.target.value })} required rows={3} className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-4 py-3 text-white" /></div>
                            <div><label>Body (Nepali)</label><textarea value={form.body_nepali || ''} onChange={e => setForm({ ...form, body_nepali: e.target.value })} rows={2} className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-4 py-3 text-white" /></div>
                            <div>
                                <label>Channels</label>
                                <div className="flex gap-3 mt-1">
                                    {['app', 'sms'].map(ch => (
                                        <button
                                            key={ch}
                                            type="button"
                                            onClick={() => toggleChannel(ch)}
                                            className={`px-4 py-2 rounded-xl text-sm border transition-all ${(form.channels || []).includes(ch)
                                                    ? 'border-gold bg-gold/10 text-gold'
                                                    : 'border-slate-700 text-slate-400'
                                                }`}
                                        >
                                            {ch === 'sms' ? '📱 SMS' : '🔔 In-App'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" className="btn-primary">Send Notice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
