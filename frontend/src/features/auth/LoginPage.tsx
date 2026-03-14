/**
 * Vasati — OTP Login Page
 * Phone OR Email → OTP → JWT. Mobile-first design.
 * Two tabs: Phone / Email. Lucide icons, Cormorant Garamond headings.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Smartphone, Mail, Loader2, AlertCircle } from 'lucide-react'
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
          <h1
            className="text-6xl font-bold text-gold mb-3"
            style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700 }}
          >
            वासति
          </h1>
          <p className="text-gold/60 text-xs tracking-[0.25em] uppercase" style={{ fontFamily: 'Syne, sans-serif' }}>
            Property Management
          </p>
          <div className="w-16 h-px bg-gold/20 mx-auto mt-5" />
        </div>

        <div className="card">
          {step === 'identifier' ? (
            <form onSubmit={handleRequestOTP}>
              <h2
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                Sign In
              </h2>
              <p className="text-slate-400 text-sm mb-6">Choose your login method</p>

              {/* Channel Toggle */}
              <div className="flex rounded-xl bg-bg-elevated p-1 mb-6">
                <button
                  type="button"
                  onClick={() => { setChannel('phone'); setError(null) }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    channel === 'phone'
                      ? 'bg-gold text-bg shadow-gold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone size={15} />
                  Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setChannel('email'); setError(null) }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    channel === 'email'
                      ? 'bg-gold text-bg shadow-gold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail size={15} />
                  Email
                </button>
              </div>

              {channel === 'phone' ? (
                <>
                  <label>Phone Number</label>
                  <div className="relative mb-4">
                    <span
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      +977
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full pl-16"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      required
                      autoFocus
                    />
                  </div>
                </>
              ) : (
                <>
                  <label>Email Address</label>
                  <div className="relative mb-4">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                      <Mail size={15} />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-11"
                      required
                      autoFocus
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 text-status-overdue text-sm mb-4">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading || !identifier} className="btn-primary w-full">
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Sending OTP…
                  </>
                ) : (
                  <>
                    {channel === 'phone' ? <Smartphone size={15} /> : <Mail size={15} />}
                    Send OTP via {channel === 'phone' ? 'SMS' : 'Email'}
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <h2
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}
              >
                Verify OTP
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter the 6-digit code sent to{' '}
                <span className="text-gold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {identifier}
                </span>
                {' '}via {channel === 'phone' ? 'SMS' : 'email'}
              </p>

              <label>OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.6em] mb-4"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                maxLength={6}
                required
                autoFocus
              />

              {error && (
                <div className="flex items-center gap-2 text-status-overdue text-sm mb-4">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button type="submit" disabled={isLoading || otp.length !== 6} className="btn-primary w-full mb-3">
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Verifying…
                  </>
                ) : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('identifier'); setOtp(''); setError(null) }}
                className="btn-ghost w-full text-sm"
              >
                ← Change {channel === 'phone' ? 'phone number' : 'email address'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-700 text-xs mt-8" style={{ fontFamily: 'Syne, sans-serif' }}>
          © 2081 Vasati · Nepal rental management
        </p>
      </div>
    </div>
  )
}
