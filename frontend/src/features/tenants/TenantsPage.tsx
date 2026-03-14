import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Users, Plus, Search, UserCircle,
  ShieldCheck, AlertCircle, Clock, CheckCircle2, Loader2
} from 'lucide-react'
import { tenantsApi, propertiesApi } from '../../api'
import type { PoliceRegStatus } from '../../types'

const POLICE_REG: Record<PoliceRegStatus, { label: string; cls: string; Icon: any }> = {
  not_started: { label: 'Not Started', cls: 'badge bg-slate-700/50 text-slate-400', Icon: AlertCircle },
  submitted: { label: 'Submitted', cls: 'badge-pending', Icon: Clock },
  approved: { label: 'Approved', cls: 'badge-active', Icon: CheckCircle2 },
  rejected: { label: 'Rejected', cls: 'badge-overdue', Icon: AlertCircle },
}

export default function TenantsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', propertyFilter],
    queryFn: () => tenantsApi.list(propertyFilter ? { property: propertyFilter } : undefined),
  })

  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list(),
  })

  const tenants = data?.results ?? []
  const filtered = tenants.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.phone.includes(search) ||
    t.current_unit_number?.includes(search)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="text-slate-400 text-sm mt-0.5">{data?.count ?? 0} tenants</p>
        </div>
        <button onClick={() => navigate('/tenants/new')} className="btn-primary">
          <Plus size={16} /> Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone…"
            className="w-full pl-11"
          />
        </div>
        <select
          value={propertyFilter}
          onChange={e => setPropertyFilter(e.target.value)}
          className="min-w-[160px]"
        >
          <option value="">All Properties</option>
          {propertiesData?.results?.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Users size={48} className="mx-auto text-slate-700 mb-3" strokeWidth={1} />
          <p className="text-slate-400 font-medium">No tenants found</p>
          <p className="text-slate-600 text-sm mb-5">Add your first tenant to get started</p>
          <button onClick={() => navigate('/tenants/new')} className="btn-primary mx-auto">
            <Plus size={15} /> Add Tenant
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Police Reg</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const reg = POLICE_REG[t.police_reg_status]
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/tenants/${t.id}`)}
                      className="table-row cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <UserCircle size={16} className="text-gold" />
                          </div>
                          <span className="font-medium text-white">{t.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-300" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {t.phone}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {t.current_unit_number ? (
                          <div>
                            <span className="text-sm font-medium text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {t.current_unit_number}
                            </span>
                            {t.property_name && (
                              <span className="block text-xs text-slate-500">{t.property_name}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={reg.cls}>
                          <reg.Icon size={10} className="mr-1" />{reg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
