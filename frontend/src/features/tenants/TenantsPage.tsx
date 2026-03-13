/**
 * Vasati — Tenants Page
 * List, search, and full 5-step onboarding with KYC file upload.
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'

interface TenantRow {
    id: number; full_name: string; full_name_nepali: string; phone: string;
    citizenship_number: string; profession: string; portal_activated: boolean;
    is_active: boolean; active_lease: any
}

export default function TenantsPage() {
    const [tenants, setTenants] = useState<TenantRow[]>([])
    const [loading, setLoading] = useState(true)
    const [showOnboard, setShowOnboard] = useState(false)
    const [step, setStep] = useState(1)
    const [form, setForm] = useState<any>({})
    const [files, setFiles] = useState<{ front?: File; back?: File }>({})
    const [search, setSearch] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => { loadTenants() }, [])

    async function loadTenants() {
        setLoading(true)
        try {
            const data = await api.get<{ results: TenantRow[] }>('/tenants/')
            setTenants(data.results || [])
        } catch { setTenants([]) }
        setLoading(false)
    }

    function updateForm(field: string, value: any) {
        setForm({ ...form, [field]: value })
    }

    async function submitTenant() {
        setSubmitting(true)
        setError(null)
        try {
            // Build FormData for file uploads
            const fd = new FormData()
            const textFields = [
                'full_name', 'full_name_nepali', 'phone', 'email',
                'citizenship_number', 'date_of_birth_bs',
                'permanent_address', 'emergency_contact_name',
                'emergency_contact_phone', 'profession'
            ]
            for (const key of textFields) {
                if (form[key]) fd.append(key, form[key])
            }
            if (files.front) fd.append('citizenship_front', files.front)
            if (files.back) fd.append('citizenship_back', files.back)

            await api.upload('/tenants/', fd)
            setShowOnboard(false)
            setStep(1)
            setForm({})
            setFiles({})
            loadTenants()
        } catch (err: any) {
            setError('Failed to create tenant. Please check required fields.')
        }
        setSubmitting(false)
    }

    const filtered = tenants.filter(t =>
        t.full_name.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.includes(search)
    )

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="page-title">Tenants</h1>
                <button onClick={() => setShowOnboard(true)} className="btn-primary">+ Onboard Tenant</button>
            </div>

            {/* Search */}
            <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="w-full max-w-md"
            />

            {/* Tenant List */}
            {filtered.length === 0 ? (
                <div className="card text-center py-10">
                    <p className="text-slate-400">No tenants found. Click "+ Onboard Tenant" to add one.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(t => (
                        <div key={t.id} className="card-hover">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-white">{t.full_name}</h3>
                                    {t.full_name_nepali && <p className="text-xs text-slate-500">{t.full_name_nepali}</p>}
                                    <p className="text-sm text-gold mt-1">{t.phone}</p>
                                </div>
                                <span className={t.portal_activated ? 'badge-active' : 'badge-draft'}>
                                    {t.portal_activated ? 'Portal Active' : 'No Portal'}
                                </span>
                            </div>
                            <div className="mt-3 text-sm text-slate-400 space-y-1">
                                <p>ID: {t.citizenship_number}</p>
                                {t.profession && <p>Profession: {t.profession}</p>}
                                {t.active_lease && (
                                    <div className="mt-2 p-2 rounded-lg bg-bg-elevated text-xs">
                                        <span className="text-gold">{t.active_lease.unit}</span>
                                        <span className="mx-2">•</span>
                                        <span className="font-mono">NPR {t.active_lease.rent_npr}</span>
                                        <span className="mx-2">•</span>
                                        <span className={`badge-${t.active_lease.status}`}>{t.active_lease.status}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 5-Step Onboarding Modal */}
            {showOnboard && (
                <div className="modal-overlay" onClick={() => setShowOnboard(false)}>
                    <div className="modal-content p-6 max-w-xl" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-2">Tenant Onboarding</h2>

                        {/* Step indicator */}
                        <div className="flex gap-1 mb-6">
                            {[1, 2, 3, 4, 5].map(s => (
                                <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${s <= step ? 'bg-gold' : 'bg-slate-700'}`}></div>
                            ))}
                        </div>

                        {step === 1 && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 mb-3">Step 1: Basic Information</p>
                                <div><label>Full Name *</label><input value={form.full_name || ''} onChange={e => updateForm('full_name', e.target.value)} className="w-full" required /></div>
                                <div><label>Full Name (Nepali)</label><input value={form.full_name_nepali || ''} onChange={e => updateForm('full_name_nepali', e.target.value)} className="w-full" /></div>
                                <div><label>Phone *</label><input value={form.phone || ''} onChange={e => updateForm('phone', e.target.value)} className="w-full" required /></div>
                                <div><label>Email</label><input type="email" value={form.email || ''} onChange={e => updateForm('email', e.target.value)} className="w-full" /></div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 mb-3">Step 2: KYC Documents</p>
                                <div><label>Citizenship Number *</label><input value={form.citizenship_number || ''} onChange={e => updateForm('citizenship_number', e.target.value)} className="w-full" required /></div>
                                <div><label>Date of Birth (BS)</label><input value={form.date_of_birth_bs || ''} onChange={e => updateForm('date_of_birth_bs', e.target.value)} placeholder="YYYY-MM-DD" className="w-full" /></div>
                                <div>
                                    <label>Citizenship Front Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setFiles(prev => ({ ...prev, front: e.target.files?.[0] }))}
                                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold/10 file:text-gold file:font-medium hover:file:bg-gold/20"
                                    />
                                    {files.front && <p className="text-xs text-green-400 mt-1">✓ {files.front.name}</p>}
                                </div>
                                <div>
                                    <label>Citizenship Back Photo</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setFiles(prev => ({ ...prev, back: e.target.files?.[0] }))}
                                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold/10 file:text-gold file:font-medium hover:file:bg-gold/20"
                                    />
                                    {files.back && <p className="text-xs text-green-400 mt-1">✓ {files.back.name}</p>}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 mb-3">Step 3: Contact Details</p>
                                <div><label>Permanent Address</label><textarea value={form.permanent_address || ''} onChange={e => updateForm('permanent_address', e.target.value)} rows={3} className="w-full bg-bg-elevated border border-slate-700 rounded-xl px-4 py-3 text-white" /></div>
                                <div><label>Emergency Contact Name</label><input value={form.emergency_contact_name || ''} onChange={e => updateForm('emergency_contact_name', e.target.value)} className="w-full" /></div>
                                <div><label>Emergency Contact Phone</label><input value={form.emergency_contact_phone || ''} onChange={e => updateForm('emergency_contact_phone', e.target.value)} className="w-full" /></div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 mb-3">Step 4: Profession & Details</p>
                                <div><label>Profession</label><input value={form.profession || ''} onChange={e => updateForm('profession', e.target.value)} className="w-full" /></div>
                            </div>
                        )}

                        {step === 5 && (
                            <div className="space-y-3">
                                <p className="text-sm text-slate-400 mb-3">Step 5: Review & Submit</p>
                                <div className="bg-bg-elevated rounded-xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="text-white">{form.full_name}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="text-gold">{form.phone}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Citizenship</span><span className="text-white">{form.citizenship_number}</span></div>
                                    {form.email && <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="text-white">{form.email}</span></div>}
                                    {form.profession && <div className="flex justify-between"><span className="text-slate-400">Profession</span><span className="text-white">{form.profession}</span></div>}
                                    {form.permanent_address && <div className="flex justify-between"><span className="text-slate-400">Address</span><span className="text-white text-right max-w-[60%]">{form.permanent_address}</span></div>}
                                    {files.front && <div className="flex justify-between"><span className="text-slate-400">KYC Front</span><span className="text-green-400">✓ {files.front.name}</span></div>}
                                    {files.back && <div className="flex justify-between"><span className="text-slate-400">KYC Back</span><span className="text-green-400">✓ {files.back.name}</span></div>}
                                </div>
                            </div>
                        )}

                        {error && <p className="text-status-overdue text-sm mt-3">{error}</p>}

                        <div className="flex justify-between mt-6">
                            <button
                                type="button"
                                onClick={() => step > 1 ? setStep(step - 1) : setShowOnboard(false)}
                                className="btn-ghost"
                            >
                                {step === 1 ? 'Cancel' : '← Back'}
                            </button>
                            {step < 5 ? (
                                <button onClick={() => setStep(step + 1)} className="btn-primary">Next →</button>
                            ) : (
                                <button onClick={submitTenant} disabled={submitting} className="btn-primary">
                                    {submitting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin"></span>
                                            Creating...
                                        </span>
                                    ) : 'Create Tenant'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
