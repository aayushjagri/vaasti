import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2, DoorOpen, Plus, ArrowLeft,
  Pencil, Trash2, CheckCircle2, Circle, AlertCircle,
  Clock, UserCircle, Loader2, X, Settings
} from 'lucide-react'
import { propertiesApi, unitsApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { UnitCreate, UnitStatus, PropertyCreate } from '../../types'

const STATUS_BADGE: Record<UnitStatus, { label: string; cls: string; Icon: any }> = {
  occupied: { label: 'Occupied', cls: 'badge-occupied', Icon: CheckCircle2 },
  vacant: { label: 'Vacant', cls: 'badge-vacant', Icon: Circle },
  maintenance: { label: 'Maintenance', cls: 'badge-maintenance', Icon: AlertCircle },
  reserved: { label: 'Reserved', cls: 'badge-reserved', Icon: Clock },
}

const UNIT_TYPES = ['1BHK', '2BHK', '3BHK', 'Studio', 'Office', 'Shop', 'Godown', 'Other']

function AddUnitModal({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UnitCreate>({
    property: propertyId, unit_number: '', floor: 'Ground',
    unit_type: '2BHK', base_rent: 0,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { mutate, isPending } = useMutation({
    mutationFn: unitsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property', propertyId] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      toast('Unit added')
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!form.unit_number.trim()) e.unit_number = 'Required'
    if (!form.base_rent || form.base_rent <= 0) e.base_rent = 'Enter valid rent'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (validate()) mutate(form)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Add Unit</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Unit Number <span className="text-status-overdue">*</span></label>
              <input
                value={form.unit_number}
                onChange={e => { setForm(p => ({ ...p, unit_number: e.target.value })); setErrors(p => ({ ...p, unit_number: '' })) }}
                placeholder="e.g. A-101"
                className={`w-full ${errors.unit_number ? 'border-status-overdue' : ''}`}
                autoFocus
              />
              {errors.unit_number && <p className="text-status-overdue text-xs mt-1">{errors.unit_number}</p>}
            </div>
            <div>
              <label>Floor</label>
              <input
                value={form.floor}
                onChange={e => setForm(p => ({ ...p, floor: e.target.value }))}
                placeholder="Ground / 1st / 2nd…"
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Type</label>
              <select value={form.unit_type} onChange={e => setForm(p => ({ ...p, unit_type: e.target.value }))} className="w-full">
                {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Area (sq.ft.)</label>
              <input
                type="number"
                value={form.area_sqft || ''}
                onChange={e => setForm(p => ({ ...p, area_sqft: Number(e.target.value) }))}
                placeholder="Optional"
                className="w-full"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
          </div>

          <div>
            <label>Monthly Rent (NPR) <span className="text-status-overdue">*</span></label>
            <input
              type="number"
              value={form.base_rent || ''}
              onChange={e => { setForm(p => ({ ...p, base_rent: Number(e.target.value) })); setErrors(p => ({ ...p, base_rent: '' })) }}
              placeholder="e.g. 15000"
              className={`w-full ${errors.base_rent ? 'border-status-overdue' : ''}`}
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            />
            {errors.base_rent && <p className="text-status-overdue text-xs mt-1">{errors.base_rent}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Add Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditPropertyModal({ property, onClose }: { property: any; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<PropertyCreate>>({
    name: property.name, address: property.address,
    district: property.district, ward_no: property.ward_no,
    property_type: property.property_type, notes: property.notes || '',
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Partial<PropertyCreate>) => propertiesApi.update(property.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property', property.id] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      toast('Property updated')
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const f = (k: keyof PropertyCreate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Edit Property</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutate(form) }} className="p-6 space-y-4">
          <div>
            <label>Name</label>
            <input value={form.name || ''} onChange={f('name')} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>District</label>
              <input value={form.district || ''} onChange={f('district')} className="w-full" />
            </div>
            <div>
              <label>Ward No.</label>
              <input value={form.ward_no || ''} onChange={f('ward_no')} className="w-full" />
            </div>
          </div>
          <div>
            <label>Address</label>
            <input value={form.address || ''} onChange={f('address')} className="w-full" />
          </div>
          <div>
            <label>Notes</label>
            <textarea value={form.notes || ''} onChange={f('notes')} className="w-full resize-none" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
  })

  const { data: unitsData } = useQuery({
    queryKey: ['property-units', id],
    queryFn: () => propertiesApi.units(id!),
    enabled: !!id,
  })

  const { mutate: deleteProperty, isPending: deleting } = useMutation({
    mutationFn: () => propertiesApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['properties'] })
      toast('Property deleted')
      navigate('/properties')
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  const { mutate: updateUnitStatus } = useMutation({
    mutationFn: ({ unitId, status }: { unitId: string; status: string }) =>
      unitsApi.update(unitId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-units', id] })
      toast('Unit status updated')
    },
  })

  const units = unitsData?.results ?? []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-gold" />
      </div>
    )
  }

  if (!property) return null

  const occupancyPct = property.total_units > 0
    ? Math.round((property.occupied_units / property.total_units) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/properties')} className="btn-ghost text-sm">
          <ArrowLeft size={16} /> Properties
        </button>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm">
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => setDeleteConfirm(true)} className="btn-danger text-sm">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <Building2 size={28} className="text-gold" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h1 className="page-title">{property.name}</h1>
            <p className="text-slate-400 text-sm">{property.address} · {property.district} · Ward {property.ward_no}</p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="text-xs text-slate-500 capitalize">{property.property_type}</span>
              <span className="text-xs text-slate-500">{property.total_units} units total</span>
            </div>
          </div>
        </div>

        {/* Occupancy */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Occupancy</span>
            <span className="text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{occupancyPct}%</span>
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-status-occupied rounded-full" style={{ width: `${occupancyPct}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-status-occupied" />{property.occupied_units} occupied</span>
            <span className="flex items-center gap-1"><Circle size={10} className="text-status-vacant" />{property.vacant_units} vacant</span>
          </div>
        </div>

        {property.notes && (
          <p className="mt-3 pt-3 border-t border-slate-800 text-sm text-slate-400">{property.notes}</p>
        )}
      </div>

      {/* Units grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">Units</h2>
          <button onClick={() => setShowAddUnit(true)} className="btn-primary text-sm">
            <Plus size={15} /> Add Unit
          </button>
        </div>

        {units.length === 0 ? (
          <div className="card text-center py-12">
            <DoorOpen size={40} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
            <p className="text-slate-400">No units yet</p>
            <button onClick={() => setShowAddUnit(true)} className="btn-secondary mx-auto mt-4 text-sm">
              <Plus size={14} /> Add Unit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {units.map(unit => {
              const { label, cls, Icon } = STATUS_BADGE[unit.status]
              return (
                <div key={unit.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-white text-lg" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      {unit.unit_number}
                    </h3>
                    <span className={cls}>
                      <Icon size={10} className="mr-1" />{label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{unit.floor} · {unit.unit_type}</p>
                  <p className="text-sm text-gold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    NPR {unit.base_rent.toLocaleString()}/mo
                  </p>
                  {unit.current_tenant_name && (
                    <p className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <UserCircle size={11} />{unit.current_tenant_name}
                    </p>
                  )}

                  {/* Quick status update */}
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    <div className="flex items-center gap-1">
                      <Settings size={10} className="text-slate-600" />
                      <span className="text-xs text-slate-600">Status</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(['vacant', 'maintenance'] as UnitStatus[]).map(s => (
                        <button
                          key={s}
                          disabled={unit.status === s}
                          onClick={() => updateUnitStatus({ unitId: unit.id, status: s })}
                          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                            unit.status === s
                              ? 'border-gold/50 text-gold bg-gold/10'
                              : 'border-slate-700 text-slate-500 hover:border-slate-500'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAddUnit && <AddUnitModal propertyId={id!} onClose={() => setShowAddUnit(false)} />}
      {showEdit && property && <EditPropertyModal property={property} onClose={() => setShowEdit(false)} />}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Property"
        message={`Delete "${property.name}" and all its data? This cannot be undone.`}
        confirmLabel="Delete Property"
        danger
        loading={deleting}
        onConfirm={() => deleteProperty()}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  )
}
