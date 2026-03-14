import { create } from 'zustand'
import { authApi } from '../api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  requestOTP: (identifier: string, purpose: string, channel: string) => Promise<void>
  verifyOTP: (identifier: string, otp: string, purpose: string, channel: string) => Promise<void>
  loadUser: () => Promise<void>
  logout: () => void
  setError: (error: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('vasati_token'),
  isLoading: false,
  error: null,

  setError: (error) => set({ error }),

  requestOTP: async (identifier, purpose, channel) => {
    set({ isLoading: true, error: null })
    try {
      await authApi.requestOTP(identifier, purpose, channel)
    } catch (e: any) {
      set({ error: e.message || 'Failed to send OTP' })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  verifyOTP: async (identifier, otp, purpose, channel) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.verifyOTP(identifier, otp, purpose, channel)
      localStorage.setItem('vasati_token', data.access)
      set({
        user: { ...data.user, role: data.user.role as User['role'] },
        isAuthenticated: true,
      })
    } catch (e: any) {
      set({ error: e.message || 'Invalid OTP' })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  loadUser: async () => {
    const token = localStorage.getItem('vasati_token')
    if (!token) return
    try {
      const user = await authApi.me()
      set({ user: user as User, isAuthenticated: true })
    } catch {
      localStorage.removeItem('vasati_token')
      set({ user: null, isAuthenticated: false })
    }
  },

  logout: () => {
    localStorage.removeItem('vasati_token')
    set({ user: null, isAuthenticated: false })
    window.location.href = '/login'
  },
}))
