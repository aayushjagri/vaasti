import type { Config } from 'tailwindcss'

export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                bg: '#0b1220',
                'bg-card': '#111827',
                'bg-elevated': '#1a2332',
                'bg-hover': '#1f2937',
                gold: {
                    DEFAULT: '#c9a84c',
                    light: '#e8d48b',
                    dark: '#9a7b2c',
                    muted: 'rgba(201, 168, 76, 0.15)',
                },
                status: {
                    occupied: '#22c55e',
                    vacant: '#3b82f6',
                    maintenance: '#f59e0b',
                    reserved: '#8b5cf6',
                    overdue: '#ef4444',
                    paid: '#22c55e',
                    pending: '#f59e0b',
                    expired: '#ef4444',
                    active: '#22c55e',
                    draft: '#6b7280',
                    expiring: '#f97316',
                },
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                },
            },
            fontFamily: {
                serif: ['Cormorant Garamond', 'Georgia', 'serif'],
                sans: ['Syne', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                'gold': '0 0 20px rgba(201, 168, 76, 0.1)',
                'gold-lg': '0 0 40px rgba(201, 168, 76, 0.15)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.2s ease-out',
                'pulse-gold': 'pulseGold 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                pulseGold: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 168, 76, 0.4)' },
                    '50%': { boxShadow: '0 0 0 8px rgba(201, 168, 76, 0)' },
                },
            },
        },
    },
    plugins: [],
} satisfies Config
