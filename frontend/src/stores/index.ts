/**
 * Vasati — Auth Store (Zustand)
 * Manages JWT tokens, user state, and login/logout.
 * Supports dual-channel OTP: phone (SMS) or email.
 */
import { create } from 'zustand'
import { api } from '../api'

interface User {
    id: number
    phone: string
    email: string | null
    full_name: string
    full_name_nepali: string
    memberships: { role: string; invited_at: string; accepted_at: string | null }[]
}

interface AuthState {
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null

    requestOTP: (identifier: string, purpose?: string, channel?: 'phone' | 'email') => Promise<void>
    verifyOTP: (identifier: string, code: string, purpose?: string, channel?: 'phone' | 'email') => Promise<{ created: boolean }>
    loadUser: () => Promise<void>
    logout: () => void
    setError: (e: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: !!localStorage.getItem('access_token'),
    isLoading: false,
    error: null,

    requestOTP: async (identifier, purpose = 'login', channel = 'phone') => {
        set({ isLoading: true, error: null })
        try {
            const body: Record<string, string> = { purpose }
            if (channel === 'email') {
                body.email = identifier
            } else {
                body.phone = identifier
            }
            await api.post('/auth/request-otp/', body)
            set({ isLoading: false })
        } catch (err: any) {
            set({ isLoading: false, error: 'Failed to send OTP. Try again.' })
            throw err
        }
    },

    verifyOTP: async (identifier, code, purpose = 'login', channel = 'phone') => {
        set({ isLoading: true, error: null })
        try {
            const body: Record<string, string> = { code, purpose }
            if (channel === 'email') {
                body.email = identifier
            } else {
                body.phone = identifier
            }
            const data = await api.post<{
                access: string; refresh: string; user: User; created: boolean
            }>('/auth/verify-otp/', body)

            api.setToken(data.access)
            localStorage.setItem('access_token', data.access)
            localStorage.setItem('refresh_token', data.refresh)
            set({ user: data.user, isAuthenticated: true, isLoading: false })
            return { created: data.created }
        } catch (err: any) {
            set({ isLoading: false, error: 'Invalid or expired OTP' })
            throw err
        }
    },

    loadUser: async () => {
        const token = localStorage.getItem('access_token')
        if (!token) return
        api.setToken(token)
        try {
            const user = await api.get<User>('/auth/me/')
            set({ user, isAuthenticated: true })
        } catch {
            set({ isAuthenticated: false, user: null })
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
        }
    },

    logout: () => {
        api.setToken(null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
    },

    setError: (e) => set({ error: e }),
}))
