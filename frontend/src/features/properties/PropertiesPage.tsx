/**
 * Vasati — Properties Page
 * List + create properties. Unit grid with color-coded status.
 */
import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatNPR } from '../../utils'

interface Property {
    id: number; name: string; name_nepali: string; property_type: string;
    type_display: string; ward_no: string; municipality: string; district: string;
    province: string; total_units: number; is_active: boolean; units?: Unit[]
}

interface Unit {
    id: number; unit_number: string; floor: number; unit_type: string;
    type_display: string; base_rent_npr: string; status: string;
    status_display: string; amenities: string[]
}

export default function PropertiesPage() {
    const [properties, setProperties] = useState<Property[]>([])
    const [selected, setSelected] = useState<Property | null>(null)
    const [units, setUnits] = useState<Unit[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [showUnitForm, setShowUnitForm] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadProperties() }, [])

    async function loadProperties() {
        setLoading(true)
        try {
            const data = await api.get<{ results: Property[] }>('/properties/')
            setProperties(data.results || [])
        } catch { setProperties([]) }
        setLoading(false)
    }

    async function selectProperty(p: Property) {
        setSelected(p)
        try {
            const unitData = await api.get<Unit[]>(`/properties/${p.id}/units/`)
            setUnits(unitData)
        } catch { setUnits([]) }
    }

    async function createProperty(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const body = Object.fromEntries(fd)
        await api.post('/properties/', body)
        setShowCreate(false)
        loadProperties()
    }

    async function createUnit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const body: any = Object.fromEntries(fd)
        body.property = selected!.id
        body.amenities = body.amenities ? body.amenities.split(',').map((s: string) => s.trim()) : []
        await api.post('/units/', body)
        setShowUnitForm(false)
        selectProperty(selected!)
    }

    const statusColor: Record<string, string> = {
        occupied: 'bg-status-occupied',
        vacant: 'bg-status-vacant',
        maintenance: 'bg-status-maintenance',
        reserved: 'bg-status-reserved',
    }

    if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div></div>

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="page-title">Properties</h1>
                <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Property</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Property List */}
                <div className="space-y-3 lg:col-span-1">
                    {properties.length === 0 ? (
                        <div className="card text-center py-10">
                            <p className="text-slate-400">No properties yet.</p>
                            <button onClick={() => setShowCreate(true)} className="btn-secondary mt-3 text-sm">Create your first property</button>
                        </div>
                    ) : properties.map(p => (
                        <div
                            key={p.id}
                            onClick={() => selectProperty(p)}
                            className={`card-hover cursor-pointer ${selected?.id === p.id ? 'border-gold/40 shadow-gold' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-white">{p.name}</h3>
                                    {p.name_nepali && <p className="text-xs text-slate-500">{p.name_nepali}</p>}
                                    <p className="text-sm text-slate-400 mt-1">{p.municipality}, {p.district}</p>
                                </div>
                                <span className="badge bg-gold/10 text-gold">{p.type_display}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                                <span>Ward {p.ward_no}</span>
                                <span>•</span>
                                <span>{p.total_units} units</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Unit Grid */}
                <div className="lg:col-span-2">
                    {selected ? (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selected.name}</h2>
                                    <p className="text-sm text-slate-400">{selected.municipality}, Ward {selected.ward_no}</p>
                                </div>
                                <button onClick={() => setShowUnitForm(true)} className="btn-secondary text-sm">+ Add Unit</button>
                            </div>

                            {/* Status legend */}
                            <div className="flex flex-wrap gap-4 mb-4 text-xs">
                                {Object.entries(statusColor).map(([s, c]) => (
                                    <div key={s} className="flex items-center gap-1.5">
                                        <div className={`w-3 h-3 rounded ${c}`}></div>
                                        <span className="text-slate-400 capitalize">{s}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Grid */}
                            {units.length === 0 ? (
                                <p className="text-slate-500 text-sm py-6 text-center">No units added yet</p>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                    {units.map(u => (
                                        <div
                                            key={u.id}
                                            className={`relative rounded-xl p-3 text-center cursor-pointer
                        border border-slate-800 hover:border-gold/30 transition-all
                        ${statusColor[u.status]}/10`}
                                        >
                                            <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${statusColor[u.status]}`}></div>
                                            <p className="font-mono text-sm font-bold text-white">{u.unit_number}</p>
                                            <p className="text-[10px] text-slate-500 mt-0.5">F{u.floor}</p>
                                            <p className="text-xs text-gold mt-1">{formatNPR(u.base_rent_npr)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card flex items-center justify-center py-20 text-slate-500">
                            ← Select a property to view units
                        </div>
                    )}
                </div>
            </div>

            {/* Create Property Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">New Property</h2>
                        <form onSubmit={createProperty} className="space-y-3">
                            <div><label>Name *</label><input name="name" required className="w-full" /></div>
                            <div><label>Name (Nepali)</label><input name="name_nepali" className="w-full" /></div>
                            <div>
                                <label>Type *</label>
                                <select name="property_type" required className="w-full">
                                    <option value="residential">Residential</option>
                                    <option value="commercial">Commercial</option>
                                    <option value="mixed">Mixed Use</option>
                                    <option value="hostel">Hostel/PG</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label>Ward No *</label><input name="ward_no" required className="w-full" /></div>
                                <div><label>Municipality *</label><input name="municipality" required className="w-full" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label>District *</label><input name="district" required className="w-full" /></div>
                                <div><label>Province *</label><input name="province" required className="w-full" /></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" className="btn-primary">Create Property</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Unit Modal */}
            {showUnitForm && selected && (
                <div className="modal-overlay" onClick={() => setShowUnitForm(false)}>
                    <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-white mb-4">Add Unit — {selected.name}</h2>
                        <form onSubmit={createUnit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label>Unit Number *</label><input name="unit_number" required placeholder="e.g. 3B, 101" className="w-full" /></div>
                                <div><label>Floor *</label><input name="floor" type="number" defaultValue="0" required className="w-full" /></div>
                            </div>
                            <div>
                                <label>Type *</label>
                                <select name="unit_type" required className="w-full">
                                    <option value="flat">Flat/Apartment</option>
                                    <option value="room_single">Single Room</option>
                                    <option value="room_double">Double Room</option>
                                    <option value="commercial_stall">Commercial Stall</option>
                                    <option value="shop">Shop</option>
                                    <option value="hostel_bed">Hostel Bed</option>
                                    <option value="floor">Entire Floor</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label>Base Rent (NPR) *</label><input name="base_rent_npr" type="number" step="0.01" required className="w-full" /></div>
                                <div><label>Deposit (NPR)</label><input name="deposit_npr" type="number" step="0.01" defaultValue="0" className="w-full" /></div>
                            </div>
                            <div><label>Area (sq.ft)</label><input name="area_sqft" type="number" step="0.01" className="w-full" /></div>
                            <div><label>Amenities (comma separated)</label><input name="amenities" placeholder="wifi, parking, attached_bathroom" className="w-full" /></div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowUnitForm(false)} className="btn-ghost">Cancel</button>
                                <button type="submit" className="btn-primary">Add Unit</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
