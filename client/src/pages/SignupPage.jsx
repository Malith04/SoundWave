import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Lock, Eye, EyeOff, Sparkles, Music2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signup, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await signup(email, password, name)
      toast.success('Account created! Let us set up your profile.')
      navigate('/onboarding')
    } catch (err) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Email already in use' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const res = await loginWithGoogle()
      if (res?.isNewUser || !res?.user?.onboardingCompleted) {
        navigate('/onboarding')
      } else if (res?.user) {
        navigate('/')
      }
    } catch (err) {
      const isCancelled = [
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/popup-blocked',
        'auth/user-cancelled'
      ].includes(err.code)
      if (!isCancelled) {
        const cleanMsg = err.message?.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?/i, '')
        toast.error(cleanMsg || 'Google sign-in could not be completed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ── Ambient Aurora Background ── */}
      <div className="absolute top-[-10%] right-[-10%] w-[480px] h-[480px] bg-brand/15 rounded-full blur-[120px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-aurora" style={{ animationDelay: '-5s' }} />
      <div className="absolute top-[30%] left-[20%] w-[350px] h-[350px] bg-emerald-600/10 rounded-full blur-[100px] pointer-events-none animate-aurora" style={{ animationDelay: '-2s' }} />

      {/* Decorative floating sound wave dots */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* ── Main Glass Card ── */}
      <div className="relative z-10 w-full max-w-md glass-modal rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10 animate-pop-in">
        
        {/* Header with animated logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand to-emerald-400 p-0.5 shadow-lg shadow-brand/30 mb-4 hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#121212] rounded-[14px] flex items-center justify-center">
              <Music2 className="text-brand w-8 h-8 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Create Account
          </h1>
          <p className="text-gray-400 text-sm mt-1.5 flex items-center justify-center gap-1.5">
            <Sparkles size={14} className="text-brand" />
            Join SoundWave and unlock limitless music
          </p>
        </div>

        {/* Google Quick Sign-up */}
        <button
          onClick={handleGoogle}
          type="button"
          className="w-full flex items-center justify-center gap-3 glass-input rounded-2xl py-3 px-4 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign up with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">or email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
              Your Name
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                placeholder="Malith Raja"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                placeholder="you@domain.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
                placeholder="At least 6 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-1">Must be at least 6 characters</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-dark hover:to-emerald-500 text-black font-extrabold py-3.5 px-6 rounded-full shadow-lg shadow-brand/25 transition-all duration-300 hover:shadow-brand/40 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Create SoundWave Account</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-7">
          Already have an account?{' '}
          <Link to="/login" className="text-brand font-semibold hover:underline transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
