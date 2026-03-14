import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  UserCircle, Upload, X, CheckCircle2, Loader2,
  ChevronRight, ChevronLeft, AlertCircle
} from 'lucide-react'
import { tenantsApi, propertiesApi, unitsApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import { BSDateInput, getCurrentBSDateStr } from '../../utils/bs-date'
import type { IDType } from '../../types'

const ID_TYPES: { value: IDType; label: string }[] = [
  { value: 'citizenship', label: 'Citizenship Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
]

const STEPS = ['Basic Info', 'KYC / Documents', 'Emergency Contact', 'Assign Unit', 'Review']

interface FormData {
  full_name: string; phone: string; email: string
  id_type: IDType; id_number: string
  citizenship_front: File | null; citizenship_back: File | null
  emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relation: string
  property_id: string; unit_id: string
  lease_start_bs: string; lease_end_bs: string; rent_amount: string
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < current ? 'bg-gold text-bg' :
            i === current ? 'bg-gold/20 border-2 border-gold text-gold' :
            'bg-bg-elevated text-slate-600'
          }`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`flex-1 h-0.5 w-6 ${i < current ? 'bg-gold' : 'bg-slate-800'}`} />
          )}
        </div>
      ))}
      <div className="ml-3">
        <p className="text-sm font-medium text-white">{STEPS[current]}</p>
        <p className="text-xs text-slate-500">Step {current + 1} of {total}</p>
      </div>
    </div>
  )
}

function FileUpload({ label, file, onChange }: { label: string; file: File | null; onChange: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label>{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          file ? 'border-gold/50 bg-gold/5' : 'border-slate-700 hover:border-slate-500'
        }`}
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-status-paid" />
              <span className="text-sm text-white truncate max-w-[160px]">{file.name}</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onChange(null) }}
              className="text-slate-500 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={20} className="mx-auto text-slate-600 mb-1" />
            <p className="text-sm text-slate-400">Click to upload</p>
            <p className="text-xs text-slate-600">JPG, PNG up to 5MB</p>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => onChange(e.target.files?.[0] ?? null)} />
    </div>
  )
}

export default function TenantOnboardingPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState<FormData>({
    full_name: '', phone: '', email: '',
    id_type: 'citizenship', id_number: '',
    citizenship_front: null, citizenship_back: null,
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    property_id: '', unit_id: '',
    lease_start_bs: getCurrentBSDateStr(),
    lease_end_bs: '', rent_amount: '',
  })

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const { data: unitsData } = useQuery({
    queryKey: ['property-units', form.property_id],
    queryFn: () => propertiesApi.units(form.property_id),
    enabled: !!form.property_id,
  })

  const availableUnits = (unitsData?.results ?? []).filter(u => u.status === 'vacant')

  const { mutate, isPending } = useMutation({
    mutationFn: (fd: FormData) => {
      const data = new globalThis.FormData()
      data.append('full_name', fd.full_name)
      data.append('phone', fd.phone)
      if (fd.email) data.append('email', fd.email)
      data.append('id_type', fd.id_type)
      data.append('id_number', fd.id_number)
      if (fd.citizenship_front) data.append('citizenship_front', fd.citizenship_front)
      if (fd.citizenship_back) data.append('citizenship_back', fd.citizenship_back)
      data.append('emergency_contact_name', fd.emergency_contact_name)
      data.append('emergency_contact_phone', fd.emergency_contact_phone)
      data.append('emergency_contact_relation', fd.emergency_contact_relation)
      data.append('unit_id', fd.unit_id)
      data.append('lease_start_bs', fd.lease_start_bs)
      data.append('lease_end_bs', fd.lease_end_bs)
      data.append('rent_amount', fd.rent_amount)
      return tenantsApi.create(data)
    },
    onSuccess: (tenant) => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast(`Tenant ${tenant.full_name} added`)
      navigate(`/tenants/${tenant.id}`)
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  function setField<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
    setErrors(prev => ({ ...prev, [k]: '' }))
  }

  function validateStep() {
    const e: Record<string, string> = {}
    if (step === 0) {
      if (!form.full_name.trim()) e.full_name = 'Full name required'
      if (!form.phone.trim()) e.phone = 'Phone required'
      if (!form.id_number.trim()) e.id_number = 'ID number required'
    } else if (step === 2) {
      if (!form.emergency_contact_name.trim()) e.emergency_contact_name = 'Required'
      if (!form.emergency_contact_phone.trim()) e.emergency_contact_phone = 'Required'
    } else if (step === 3) {
      if (!form.unit_id) e.unit_id = 'Select a unit'
      if (!form.lease_start_bs) e.lease_start_bs = 'Required'
      if (!form.lease_end_bs) e.lease_end_bs = 'Required'
      if (!form.rent_amount || Number(form.rent_amount) <= 0) e.rent_amount = 'Enter valid rent'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (validateStep()) setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  const selectedUnit = availableUnits.find(u => u.id === form.unit_id)
  const selectedProperty = propertiesData?.results?.find(p => p.id === form.property_id)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Add Tenant</h1>
          <p className="text-slate-400 text-sm mt-0.5">Onboarding wizard</p>
        </div>
        <button onClick={() => navigate('/tenants')} className="btn-ghost text-sm">
          <X size={15} /> Cancel
        </button>
      </div>

      <div className="card">
        <StepIndicator current={step} total={STEPS.length} />

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label>Full Name <span className="text-status-overdue">*</span></label>
              <input value={form.full_name} onChange={e => setField('full_name', e.target.value)}
                className={`w-full ${errors.full_name ? 'border-status-overdue' : ''}`} placeholder="As per ID document" autoFocus />
              {errors.full_name && <p className="text-status-overdue text-xs mt-1">{errors.full_name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Phone <span className="text-status-overdue">*</span></label>
                <input value={form.phone} onChange={e => setField('phone', e.target.value)}
                  className={`w-full ${errors.phone ? 'border-status-overdue' : ''}`}
                  placeholder="98XXXXXXXX" style={{ fontFamily: 'JetBrains Mono, monospace' }} />
                {errors.phone && <p className="text-status-overdue text-xs mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                  className="w-full" placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>ID Type <span className="text-status-overdue">*</span></label>
                <select value={form.id_type} onChange={e => setField('id_type', e.target.value as IDType)} className="w-full">
                  {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label>ID Number <span className="text-status-overdue">*</span></label>
                <input value={form.id_number} onChange={e => setField('id_number', e.target.value)}
                  className={`w-full ${errors.id_number ? 'border-status-overdue' : ''}`}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }} />
                {errors.id_number && <p className="text-status-overdue text-xs mt-1">{errors.id_number}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: KYC Documents */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-status-vacant/10 border border-status-vacant/20 rounded-xl">
              <AlertCircle size={14} className="text-status-vacant" />
              <p className="text-xs text-slate-300">Documents are stored securely. Upload clear photos of citizenship/ID.</p>
            </div>
            <FileUpload
              label="Citizenship Front / ID Front"
              file={form.citizenship_front}
              onChange={f => setField('citizenship_front', f)}
            />
            <FileUpload
              label="Citizenship Back / ID Back"
              file={form.citizenship_back}
              onChange={f => setField('citizenship_back', f)}
            />
            <p className="text-xs text-slate-500">Both uploads optional but recommended for compliance records.</p>
          </div>
        )}

        {/* Step 2: Emergency Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label>Contact Name <span className="text-status-overdue">*</span></label>
              <input value={form.emergency_contact_name}
                onChange={e => setField('emergency_contact_name', e.target.value)}
                className={`w-full ${errors.emergency_contact_name ? 'border-status-overdue' : ''}`}
                placeholder="Full name of emergency contact" autoFocus />
              {errors.emergency_contact_name && <p className="text-status-overdue text-xs mt-1">{errors.emergency_contact_name}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>Phone <span className="text-status-overdue">*</span></label>
                <input value={form.emergency_contact_phone}
                  onChange={e => setField('emergency_contact_phone', e.target.value)}
                  className={`w-full ${errors.emergency_contact_phone ? 'border-status-overdue' : ''}`}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }} placeholder="98XXXXXXXX" />
                {errors.emergency_contact_phone && <p className="text-status-overdue text-xs mt-1">{errors.emergency_contact_phone}</p>}
              </div>
              <div>
                <label>Relation</label>
                <input value={form.emergency_contact_relation}
                  onChange={e => setField('emergency_contact_relation', e.target.value)}
                  className="w-full" placeholder="e.g. Father, Spouse" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Assign Unit & Lease */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label>Property <span className="text-status-overdue">*</span></label>
              <select
                value={form.property_id}
                onChange={e => { setField('property_id', e.target.value); setField('unit_id', '') }}
                className="w-full"
              >
                <option value="">Select property…</option>
                {propertiesData?.results?.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {form.property_id && (
              <div>
                <label>Unit (Vacant Only) <span className="text-status-overdue">*</span></label>
                {availableUnits.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-status-overdue/10 border border-status-overdue/20 rounded-xl">
                    <AlertCircle size={14} className="text-status-overdue" />
                    <p className="text-sm text-slate-300">No vacant units in this property.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableUnits.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setField('unit_id', u.id)
                          setField('rent_amount', String(u.base_rent))
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          form.unit_id === u.id
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="font-bold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{u.unit_number}</div>
                        <div className="text-xs opacity-70">{u.unit_type} · Floor {u.floor}</div>
                        <div className="text-xs mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>NPR {u.base_rent.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.unit_id && <p className="text-status-overdue text-xs mt-1">{errors.unit_id}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <BSDateInput
                label="Lease Start (BS)"
                value={form.lease_start_bs}
                onChange={v => setField('lease_start_bs', v)}
                required
                error={errors.lease_start_bs}
              />
              <BSDateInput
                label="Lease End (BS)"
                value={form.lease_end_bs}
                onChange={v => setField('lease_end_bs', v)}
                required
                error={errors.lease_end_bs}
              />
            </div>

            <div>
              <label>Monthly Rent (NPR) <span className="text-status-overdue">*</span></label>
              <input
                type="number"
                value={form.rent_amount}
                onChange={e => setField('rent_amount', e.target.value)}
                className={`w-full ${errors.rent_amount ? 'border-status-overdue' : ''}`}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                placeholder="e.g. 15000"
              />
              {errors.rent_amount && <p className="text-status-overdue text-xs mt-1">{errors.rent_amount}</p>}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-bg-elevated rounded-xl space-y-2">
              <h3 className="section-title mb-3">Tenant Details</h3>
              {[
                ['Full Name', form.full_name],
                ['Phone', form.phone],
                ['Email', form.email || '—'],
                [`${form.id_type === 'citizenship' ? 'Citizenship' : 'ID'} Number`, form.id_number],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-white" style={v?.includes('-') || /\d{6,}/.test(v || '') ? { fontFamily: 'JetBrains Mono, monospace' } : {}}>{v}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-bg-elevated rounded-xl space-y-2">
              <h3 className="section-title mb-3">Lease Details</h3>
              {[
                ['Property', selectedProperty?.name || '—'],
                ['Unit', selectedUnit?.unit_number || '—'],
                ['Lease Start', form.lease_start_bs],
                ['Lease End', form.lease_end_bs],
                ['Monthly Rent', `NPR ${Number(form.rent_amount).toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-bg-elevated rounded-xl space-y-2">
              <h3 className="section-title mb-3">Emergency Contact</h3>
              {[
                ['Name', form.emergency_contact_name],
                ['Phone', form.emergency_contact_phone],
                ['Relation', form.emergency_contact_relation || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-400">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-slate-800">
          {step > 0 && (
            <button onClick={back} className="btn-ghost flex-1">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="btn-primary flex-1">
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => { if (validateStep()) mutate(form) }}
              disabled={isPending}
              className="btn-primary flex-1"
            >
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Confirm & Add Tenant
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
