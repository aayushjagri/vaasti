/**
 * Vasati — App Layout with sidebar navigation.
 * Mobile-first: sidebar collapses to bottom nav on small screens.
 */
import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores'

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: '📊', nepali: 'ड्यासबोर्ड' },
    { path: '/properties', label: 'Properties', icon: '🏠', nepali: 'सम्पत्ति' },
    { path: '/tenants', label: 'Tenants', icon: '👥', nepali: 'भाडावाल' },
    { path: '/leases', label: 'Leases', icon: '📄', nepali: 'लिज' },
    { path: '/payments', label: 'Payments', icon: '💰', nepali: 'भुक्तानी' },
    { path: '/compliance', label: 'Compliance', icon: '🛡️', nepali: 'अनुपालन' },
    { path: '/notices', label: 'Notices', icon: '📢', nepali: 'सूचना' },
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
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                {/* Logo */}
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-2xl font-bold font-serif text-gold">वासति</h1>
                    <p className="text-xs text-slate-500 mt-1">Property Management</p>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => {
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path))
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <div>
                                    <span className="block text-sm">{item.label}</span>
                                    <span className="block text-[10px] text-slate-500">{item.nepali}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center">
                            <span className="text-gold text-sm font-bold">
                                {user?.full_name?.charAt(0) || '?'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                            <p className="text-xs text-slate-500">{user?.phone}</p>
                        </div>
                        <button onClick={logout} className="text-slate-500 hover:text-status-overdue text-xs">
                            ⏻
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
            <main className="flex-1 min-w-0 lg:ml-0">
                {/* Top bar — mobile */}
                <header className="lg:hidden sticky top-0 z-20 bg-bg-card/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="text-gold text-xl">☰</button>
                    <h1 className="text-lg font-bold font-serif text-gold">वासति</h1>
                </header>

                <div className="p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
                    <Outlet />
                </div>
            </main>

            {/* Bottom navigation — mobile */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-bg-card/95 backdrop-blur border-t border-slate-800 z-20">
                <div className="flex justify-around py-2">
                    {NAV_ITEMS.slice(0, 5).map(item => {
                        const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path))
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs
                  ${isActive ? 'text-gold' : 'text-slate-500'}`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
