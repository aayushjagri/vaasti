/**
 * Vasati — App Layout with sidebar navigation.
 * Mobile-first: sidebar collapses to bottom nav on small screens.
 * Uses Lucide icons throughout — no emojis.
 */
import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, FileText,
  Banknote, ShieldCheck, Bell, Menu, LogOut, X
} from 'lucide-react'
import { useAuthStore } from '../../stores'

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', nepali: 'ड्यासबोर्ड', Icon: LayoutDashboard },
  { path: '/properties', label: 'Properties', nepali: 'सम्पत्ति', Icon: Building2 },
  { path: '/tenants', label: 'Tenants', nepali: 'भाडावाल', Icon: Users },
  { path: '/leases', label: 'Leases', nepali: 'लिज', Icon: FileText },
  { path: '/payments', label: 'Payments', nepali: 'भुक्तानी', Icon: Banknote },
  { path: '/compliance', label: 'Compliance', nepali: 'अनुपालन', Icon: ShieldCheck },
  { path: '/notices', label: 'Notices', nepali: 'सूचना', Icon: Bell },
]

export default function AppLayout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar — Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-bg-card border-r border-slate-800
        transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 lg:static lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gold" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              वासति
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 tracking-widest uppercase" style={{ fontFamily: 'Syne, sans-serif' }}>
              Property Management
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-500 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {NAV_ITEMS.map(({ path, label, nepali, Icon }) => {
            const isActive = location.pathname === path ||
              (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
              >
                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                <div>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-[10px] text-slate-500">{nepali}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-gold text-sm font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>
                {user?.full_name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.phone || user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="text-slate-500 hover:text-status-overdue transition-colors p-1"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay — mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar — mobile */}
        <header className="lg:hidden sticky top-0 z-20 bg-bg-card/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gold"
          >
            <Menu size={22} />
          </button>
          <h1
            className="text-xl font-bold text-gold"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
          >
            वासति
          </h1>
        </header>

        <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Bottom navigation — mobile */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-bg-card/95 backdrop-blur border-t border-slate-800 z-20">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.slice(0, 5).map(({ path, label, Icon }) => {
            const isActive = location.pathname === path ||
              (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-0.5 px-2 py-1
                  ${isActive ? 'text-gold' : 'text-slate-500'}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px]">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
