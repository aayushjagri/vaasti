import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Plus, Search, DoorOpen,
  CheckCircle2, Circle, Loader2, X
} from 'lucide-react'
import { propertiesApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import type { PropertyCreate, PropertyType } from '../../types'

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'mixed', label: 'Mixed Use' },
]

const NEPAL_DISTRICTS = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavre', 'Sindhupalchok',
  'Nuwakot', 'Makwanpur', 'Chitwan', 'Pokhara', 'Kaski',
  'Butwal', 'Rupandehi', 'Palpa', 'Biratnagar', 'Morang',
  'Sunsari', 'Jhapa', 'Dharan', 'Birgunj', 'Parsa',
  'Hetauda', 'Nawalpur', 'Other',
]

function CreatePropertyModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState<PropertyCreate>({
    name: '', address: '', district: 'Kathmandu', ward_no: '',
    property_type: 'residential', notes: '',
  })
  const [errors, setErrors] = useState<Partial<PropertyCreate>>({})

  const { mutate, isPending } = useMutation({
    mutationFn: propertiesApi.create,
    onSuccess: (prop) => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      toast(`Property "${prop.name}" created`)
      navigate(`/properties/${prop.id}`)
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  function validate() {
    const e: Partial<PropertyCreate> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.address.trim()) e.address = 'Address is required'
    if (!form.ward_no.trim()) e.ward_no = 'Ward no. is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) mutate(form)
  }

  const f = (k: keyof PropertyCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [k]: e.target.value }))
    setErrors(prev => ({ ...prev, [k]: undefined }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Add Property
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label>Property Name <span className="text-status-overdue">*</span></label>
            <input value={form.name} onChange={f('name')} placeholder="e.g. Thapathali Apartment" className={`w-full ${errors.name ? 'border-status-overdue' : ''}`} autoFocus />
            {errors.name && <p className="text-status-overdue text-xs mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Type <span className="text-status-overdue">*</span></label>
              <select value={form.property_type} onChange={f('property_type')} className="w-full">
                {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label>District <span className="text-status-overdue">*</span></label>
              <select value={form.district} onChange={f('district')} className="w-full">
                {NEPAL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label>Address <span className="text-status-overdue">*</span></label>
              <input value={form.address} onChange={f('address')} placeholder="Street / Tole" className={`w-full ${errors.address ? 'border-status-overdue' : ''}`} />
              {errors.address && <p className="text-status-overdue text-xs mt-1">{errors.address}</p>}
            </div>
            <div>
              <label>Ward No. <span className="text-status-overdue">*</span></label>
              <input value={form.ward_no} onChange={f('ward_no')} placeholder="e.g. 10" className={`w-full ${errors.ward_no ? 'border-status-overdue' : ''}`} />
              {errors.ward_no && <p className="text-status-overdue text-xs mt-1">{errors.ward_no}</p>}
            </div>
          </div>

          <div>
            <label>Notes</label>
            <textarea
              value={form.notes}
              onChange={f('notes')}
              placeholder="Optional notes about this property…"
              className="w-full resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Create Property
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PropertiesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const properties = data?.results ?? []
  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.district.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.count ?? 0} properties</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> Add Property
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search properties…"
          className="w-full pl-11"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Building2 size={48} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
          <p className="text-slate-400 font-medium">No properties yet</p>
          <p className="text-slate-600 text-sm mb-5">Add your first property to get started</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            <Plus size={15} /> Add Property
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const occupancyPct = p.total_units > 0
              ? Math.round((p.occupied_units / p.total_units) * 100)
              : 0
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/properties/${p.id}`)}
                className="card-hover text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={20} className="text-gold" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-slate-500 capitalize">{p.property_type}</span>
                </div>

                <h3 className="font-semibold text-white mb-0.5" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}>
                  {p.name}
                </h3>
                <p className="text-slate-400 text-sm mb-4">{p.district} · Ward {p.ward_no}</p>

                {/* Occupancy bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{p.occupied_units} occupied</span>
                    <span>{occupancyPct}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-occupied rounded-full"
                      style={{ width: `${occupancyPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <DoorOpen size={14} />
                    {p.total_units} units
                  </span>
                  <span className="flex items-center gap-1.5 text-status-occupied">
                    <CheckCircle2 size={12} />
                    {p.occupied_units} occupied
                  </span>
                  {p.vacant_units > 0 && (
                    <span className="flex items-center gap-1.5 text-status-vacant">
                      <Circle size={12} />
                      {p.vacant_units} vacant
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && <CreatePropertyModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
