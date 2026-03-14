/**
 * Vasati — App Router
 * Protected routes + Portal route + detail pages.
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores'
import { ToastContainer } from './components/ui/Toast'

import AppLayout from './components/layout/AppLayout'
import LoginPage from './features/auth/LoginPage'
import DashboardPage from './features/dashboard/DashboardPage'
import PropertiesPage from './features/properties/PropertiesPage'
import PropertyDetailPage from './features/properties/PropertyDetailPage'
import TenantsPage from './features/tenants/TenantsPage'
import TenantDetailPage from './features/tenants/TenantDetailPage'
import TenantOnboardingPage from './features/tenants/TenantOnboardingPage'
import LeasesPage from './features/leases/LeasesPage'
import LeaseDetailPage from './features/leases/LeaseDetailPage'
import PaymentsPage from './features/payments/PaymentsPage'
import CompliancePage from './features/compliance/CompliancePage'
import NoticesPage from './features/notices/NoticesPage'
import PortalPage from './features/reports/PortalPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore()
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}

export default function App() {
    const { loadUser, isAuthenticated } = useAuthStore()

    useEffect(() => { loadUser() }, [])

    return (
        <BrowserRouter>
            <ToastContainer />
            <Routes>
                {/* Public */}
                <Route path="/login" element={
                    isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
                } />

                {/* Tenant Portal (separate layout) */}
                <Route path="/portal/*" element={
                    <ProtectedRoute><PortalPage /></ProtectedRoute>
                } />

                {/* Main App (sidebar layout) */}
                <Route element={
                    <ProtectedRoute><AppLayout /></ProtectedRoute>
                }>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/properties" element={<PropertiesPage />} />
                    <Route path="/properties/:id" element={<PropertyDetailPage />} />
                    <Route path="/tenants" element={<TenantsPage />} />
                    <Route path="/tenants/new" element={<TenantOnboardingPage />} />
                    <Route path="/tenants/:id" element={<TenantDetailPage />} />
                    <Route path="/leases" element={<LeasesPage />} />
                    <Route path="/leases/:id" element={<LeaseDetailPage />} />
                    <Route path="/payments" element={<PaymentsPage />} />
                    <Route path="/compliance" element={<CompliancePage />} />
                    <Route path="/notices" element={<NoticesPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
