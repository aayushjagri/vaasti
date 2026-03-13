/**
 * Vasati — API Client
 * Wraps fetch() with JWT auth, tenant header, and error handling.
 */

const API_BASE = '/api/v1'

interface ApiOptions extends RequestInit {
    json?: unknown
}

class ApiClient {
    private accessToken: string | null = null

    setToken(token: string | null) {
        this.accessToken = token
    }

    getToken() {
        return this.accessToken
    }

    async request<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(opts.headers as Record<string, string> || {}),
        }

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`
        }

        const config: RequestInit = {
            ...opts,
            headers,
        }

        if (opts.json) {
            config.body = JSON.stringify(opts.json)
        }

        const response = await fetch(`${API_BASE}${path}`, config)

        if (response.status === 401) {
            // Try refresh
            const refreshed = await this.tryRefresh()
            if (refreshed) {
                headers['Authorization'] = `Bearer ${this.accessToken}`
                const retryResponse = await fetch(`${API_BASE}${path}`, { ...config, headers })
                if (!retryResponse.ok) throw new ApiError(retryResponse)
                return retryResponse.json()
            }
            // Refresh failed — clear auth
            this.accessToken = null
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            window.location.href = '/login'
            throw new ApiError(response)
        }

        if (!response.ok) throw new ApiError(response)

        if (response.status === 204) return {} as T

        return response.json()
    }

    private async tryRefresh(): Promise<boolean> {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) return false

        try {
            const res = await fetch(`${API_BASE}/auth/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            })
            if (!res.ok) return false
            const data = await res.json()
            this.accessToken = data.access
            localStorage.setItem('access_token', data.access)
            localStorage.setItem('refresh_token', data.refresh)
            return true
        } catch {
            return false
        }
    }

    // Convenience methods
    get<T = unknown>(path: string) { return this.request<T>(path) }
    post<T = unknown>(path: string, json?: unknown) { return this.request<T>(path, { method: 'POST', json }) }
    patch<T = unknown>(path: string, json?: unknown) { return this.request<T>(path, { method: 'PATCH', json }) }
    delete<T = unknown>(path: string) { return this.request<T>(path, { method: 'DELETE' }) }

    // Upload with FormData (no JSON Content-Type)
    async upload<T = unknown>(path: string, formData: FormData): Promise<T> {
        const headers: Record<string, string> = {}
        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`
        }
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers,
            body: formData,
        })
        if (!res.ok) throw new ApiError(res)
        return res.json()
    }
}

class ApiError extends Error {
    status: number
    constructor(response: Response) {
        super(`API Error: ${response.status} ${response.statusText}`)
        this.status = response.status
    }
}

export const api = new ApiClient()
export { ApiError }
