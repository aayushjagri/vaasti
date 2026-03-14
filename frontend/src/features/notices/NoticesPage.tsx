import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, Plus, Search, MessageSquare, Users, Building2,
  CheckCircle2, AlertCircle, Clock, X, Loader2, Send, ChevronDown
} from 'lucide-react'
import { noticesApi, tenantsApi, propertiesApi } from '../../api'
import { toast } from '../../components/ui/Toast'
import type { NoticeCreate, NoticeType, NoticeAudience, NoticeChannel } from '../../types'

const NOTICE_TYPES: { value: NoticeType; label: string }[] = [
  { value: 'rent_reminder', label: 'Rent Reminder' },
  { value: 'maintenance', label: 'Maintenance Notice' },
  { value: 'general', label: 'General Announcement' },
  { value: 'eviction', label: 'Eviction Notice' },
  { value: 'inspection', label: 'Inspection Notice' },
  { value: 'policy_update', label: 'Policy Update' },
]

const AUDIENCE_OPTS: { value: NoticeAudience; label: string; Icon: any }[] = [
  { value: 'single', label: 'Single Tenant', Icon: Users },
  { value: 'floor', label: 'Entire Floor', Icon: Building2 },
  { value: 'property', label: 'Property', Icon: Building2 },
  { value: 'all', label: 'All Tenants', Icon: Users },
]

const CHANNELS: { value: NoticeChannel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'in_app', label: 'In-App' },
  { value: 'email', label: 'Email' },
]

const STATUS_CONFIG: Record<string, { cls: string; Icon: any }> = {
  draft: { cls: 'badge-draft', Icon: Clock },
  sent: { cls: 'badge-active', Icon: CheckCircle2 },
  failed: { cls: 'badge-overdue', Icon: AlertCircle },
}

function CreateNoticeModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<NoticeCreate>({
    notice_type: 'general', audience: 'all',
    subject: '', body: '', channels: ['in_app'],
    target_tenant: undefined, target_floor: undefined, target_property: undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: tenantsData } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantsApi.list(),
  })

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: noticesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] })
      toast('Notice sent')
      onClose()
    },
    onError: (e: Error) => toast(e.message, 'error'),
  })

  function toggleChannel(ch: NoticeChannel) {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch],
    }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.subject.trim()) e.subject = 'Subject required'
    if (!form.body.trim()) e.body = 'Message body required'
    if (form.channels.length === 0) e.channels = 'Select at least one channel'
    if (form.audience === 'single' && !form.target_tenant) e.target_tenant = 'Select a tenant'
    if (form.audience === 'property' && !form.target_property) e.target_property = 'Select a property'
    if (form.audience === 'floor' && !form.target_floor) e.target_floor = 'Enter a floor'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) mutate(form)
  }

  const charCount = form.body.length
  const smsWarning = form.channels.includes('sms') && charCount > 160

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Cormorant Garamond, serif' }}>Create Notice</h2>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>Notice Type</label>
              <select value={form.notice_type} onChange={e => setForm(p => ({ ...p, notice_type: e.target.value as NoticeType }))} className="w-full">
                {NOTICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label>Audience</label>
              <select
                value={form.audience}
                onChange={e => setForm(p => ({
                  ...p,
                  audience: e.target.value as NoticeAudience,
                  target_tenant: undefined, target_floor: undefined, target_property: undefined,
                }))}
                className="w-full"
              >
                {AUDIENCE_OPTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic target based on audience */}
          {form.audience === 'single' && (
            <div>
              <label>Tenant <span className="text-status-overdue">*</span></label>
              <select
                value={form.target_tenant || ''}
                onChange={e => { setForm(p => ({ ...p, target_tenant: e.target.value })); setErrors(p => ({ ...p, target_tenant: '' })) }}
                className={`w-full ${errors.target_tenant ? 'border-status-overdue' : ''}`}
              >
                <option value="">Select tenant…</option>
                {tenantsData?.results?.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name} — Unit {t.current_unit_number || '?'}</option>
                ))}
              </select>
              {errors.target_tenant && <p className="text-status-overdue text-xs mt-1">{errors.target_tenant}</p>}
            </div>
          )}

          {form.audience === 'property' && (
            <div>
              <label>Property <span className="text-status-overdue">*</span></label>
              <select
                value={form.target_property || ''}
                onChange={e => { setForm(p => ({ ...p, target_property: e.target.value })); setErrors(p => ({ ...p, target_property: '' })) }}
                className={`w-full ${errors.target_property ? 'border-status-overdue' : ''}`}
              >
                <option value="">Select property…</option>
                {propertiesData?.results?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {errors.target_property && <p className="text-status-overdue text-xs mt-1">{errors.target_property}</p>}
            </div>
          )}

          {form.audience === 'floor' && (
            <div>
              <label>Floor <span className="text-status-overdue">*</span></label>
              <input
                value={form.target_floor || ''}
                onChange={e => { setForm(p => ({ ...p, target_floor: e.target.value })); setErrors(p => ({ ...p, target_floor: '' })) }}
                placeholder="e.g. Ground, 1st, 2nd"
                className={`w-full ${errors.target_floor ? 'border-status-overdue' : ''}`}
              />
              {errors.target_floor && <p className="text-status-overdue text-xs mt-1">{errors.target_floor}</p>}
            </div>
          )}

          <div>
            <label>Subject <span className="text-status-overdue">*</span></label>
            <input
              value={form.subject}
              onChange={e => { setForm(p => ({ ...p, subject: e.target.value })); setErrors(p => ({ ...p, subject: '' })) }}
              placeholder="Brief subject line…"
              className={`w-full ${errors.subject ? 'border-status-overdue' : ''}`}
            />
            {errors.subject && <p className="text-status-overdue text-xs mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label>
              Message Body <span className="text-status-overdue">*</span>
              <span className="ml-2 text-xs text-slate-500 font-normal">{charCount} chars</span>
            </label>
            <textarea
              value={form.body}
              onChange={e => { setForm(p => ({ ...p, body: e.target.value })); setErrors(p => ({ ...p, body: '' })) }}
              placeholder="Type your message here…"
              className={`w-full resize-none ${errors.body ? 'border-status-overdue' : ''}`}
              rows={4}
            />
            {smsWarning && (
              <p className="text-status-pending text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> SMS messages over 160 chars may be split into multiple parts
              </p>
            )}
            {errors.body && <p className="text-status-overdue text-xs mt-1">{errors.body}</p>}
          </div>

          {/* Channels */}
          <div>
            <label>Delivery Channels <span className="text-status-overdue">*</span></label>
            <div className="flex gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch.value}
                  type="button"
                  onClick={() => toggleChannel(ch.value)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.channels.includes(ch.value)
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            {errors.channels && <p className="text-status-overdue text-xs mt-1">{errors.channels}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Send Notice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NoticesPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: () => noticesApi.list(),
  })

  const notices = data?.results ?? []
  const filtered = notices.filter(n =>
    n.subject.toLowerCase().includes(search.toLowerCase()) ||
    n.notice_type.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notices</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.count ?? 0} notices sent</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} /> New Notice
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notices…" className="w-full pl-11" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Bell size={48} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
          <p className="text-slate-400 font-medium">No notices yet</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto mt-4">
            <Plus size={15} /> Create Notice
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const sc = STATUS_CONFIG[n.status] || STATUS_CONFIG.draft
            const isExpanded = expandedId === n.id
            const noticeTypeLbl = NOTICE_TYPES.find(t => t.value === n.notice_type)?.label || n.notice_type
            return (
              <div key={n.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : n.id)}
                  className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare size={16} className="text-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-white truncate">{n.subject}</h3>
                        <span className="text-xs text-slate-500 bg-bg-elevated px-2 py-0.5 rounded-full">{noticeTypeLbl}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={sc.cls}>
                          <sc.Icon size={9} className="mr-1" />{n.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {n.audience === 'all' ? 'All tenants' :
                           n.audience === 'property' ? 'Property' :
                           n.audience === 'floor' ? `Floor` : 'Single tenant'}
                        </span>
                        <span className="text-xs text-slate-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {n.delivered_count}/{n.recipient_count} delivered
                        </span>
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          {n.channels.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {n.sent_at && (
                      <span className="text-xs text-slate-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(n.sent_at).toLocaleDateString()}
                      </span>
                    )}
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-800 pt-4">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{n.body}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                      <CheckCircle2 size={11} className="text-status-active" />
                      <span>{n.delivered_count} delivered of {n.recipient_count} recipients</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateNoticeModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
