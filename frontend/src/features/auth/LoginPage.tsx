/**
 * Vasati — OTP Login Page
 * Phone OR Email → OTP → JWT. Mobile-first design.
 * Two tabs: Phone / Email.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores'

type LoginChannel = 'phone' | 'email'

export default function LoginPage() {
    const [step, setStep] = useState<'identifier' | 'otp'>('identifier')
    const [channel, setChannel] = useState<LoginChannel>('phone')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const { requestOTP, verifyOTP, isLoading, error, setError } = useAuthStore()
    const navigate = useNavigate()

    const identifier = channel === 'phone' ? phone : email

    async function handleRequestOTP(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            await requestOTP(identifier, 'login', channel)
            setStep('otp')
        } catch { }
    }

    async function handleVerifyOTP(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            await verifyOTP(identifier, otp, 'login', channel)
            navigate('/')
        } catch { }
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-bold font-serif text-gold mb-2">वासति</h1>
                    <p className="text-gold-light text-sm tracking-widest uppercase">Property Management</p>
                    <div className="w-16 h-0.5 bg-gold/30 mx-auto mt-4"></div>
                </div>

                <div className="card">
                    {step === 'identifier' ? (
                        <form onSubmit={handleRequestOTP}>
                            <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
                            <p className="text-slate-400 text-sm mb-5">Choose your login method</p>

                            {/* Channel Toggle */}
                            <div className="flex rounded-xl bg-bg-elevated p-1 mb-5">
                                <button
                                    type="button"
                                    onClick={() => { setChannel('phone'); setError(null) }}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${channel === 'phone'
                                            ? 'bg-gold text-bg shadow-gold'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    📱 Phone
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setChannel('email'); setError(null) }}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${channel === 'email'
                                            ? 'bg-gold text-bg shadow-gold'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    ✉️ Email
                                </button>
                            </div>

                            {channel === 'phone' ? (
                                <>
                                    <label>Phone Number</label>
                                    <div className="relative mb-4">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">+977</span>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            placeholder="98XXXXXXXX"
                                            className="w-full pl-14"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label>Email Address</label>
                                    <div className="relative mb-4">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full pl-12"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </>
                            )}

                            {error && <p className="text-status-overdue text-sm mb-4">{error}</p>}

                            <button type="submit" disabled={isLoading || !identifier} className="btn-primary w-full">
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin"></span>
                                        Sending...
                                    </span>
                                ) : `Send OTP via ${channel === 'phone' ? 'SMS' : 'Email'}`}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP}>
                            <h2 className="text-xl font-bold text-white mb-1">Verify OTP</h2>
                            <p className="text-slate-400 text-sm mb-6">
                                Enter the 6-digit code sent to{' '}
                                <span className="text-gold">
                                    {channel === 'phone' ? phone : email}
                                </span>
                                {' '}via {channel === 'phone' ? 'SMS' : 'email'}
                            </p>

                            <label>OTP Code</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="w-full text-center text-2xl tracking-[0.5em] font-mono mb-4"
                                maxLength={6}
                                required
                                autoFocus
                            />

                            {error && <p className="text-status-overdue text-sm mb-4">{error}</p>}

                            <button type="submit" disabled={isLoading || otp.length !== 6} className="btn-primary w-full mb-3">
                                {isLoading ? 'Verifying...' : 'Verify & Sign In'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep('identifier'); setOtp(''); setError(null) }}
                                className="btn-ghost w-full text-sm"
                            >
                                ← Change {channel === 'phone' ? 'phone' : 'email'}
                            </button>
                        </form>
                    )}
                </div>

                <p className="text-center text-slate-600 text-xs mt-8">
                    © 2081 Vasati. Nepal rental management.
                </p>
            </div>
        </div>
    )
}
