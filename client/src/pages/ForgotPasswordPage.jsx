import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, KeyRound, ArrowLeft, CheckCircle2, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
      toast.success('Reset link dispatched to your inbox!')
    } catch {
      toast.error('Could not send reset email. Verify your address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center p-3.5 sm:p-8 overflow-hidden">
      {/* ── Ambient Aurora Background ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand/15 rounded-full blur-[130px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[520px] h-[520px] bg-teal-600/15 rounded-full blur-[140px] pointer-events-none animate-aurora" style={{ animationDelay: '-4s' }} />

      {/* Decorative floating sound wave dots */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Center backlight glow behind the card */}
      <div className="absolute w-[520px] h-[520px] bg-brand/[0.08] rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[495px] bg-[#121216]/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-10 md:p-11 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(29,185,84,0.08)] border border-white/[0.12] animate-pop-in overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        
        {/* Soft top inner glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-brand/10 blur-2xl pointer-events-none rounded-full" />

        {/* Animated Key Icon */}
        <div className="text-center mb-6 sm:mb-8 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-brand to-teal-400 p-0.5 shadow-xl shadow-brand/25 mb-3 sm:mb-4 hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#121216] rounded-[14px] flex items-center justify-center">
              <KeyRound className="text-brand w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1.5">
            Enter your email and we'll send you instructions to recover your account
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-brand/10 border border-brand/30 text-center animate-fade-in">
              <CheckCircle2 size={36} className="text-brand mx-auto mb-2 animate-bounce" />
              <h2 className="text-base font-bold text-white mb-1">Check your inbox</h2>
              <p className="text-xs text-gray-300">
                We've sent a password reset link to <strong className="text-brand">{email}</strong>.
              </p>
            </div>

            <Link
              to="/login"
              className="w-full h-12 bg-white/[0.05] hover:bg-white/[0.1] text-white font-semibold px-4 rounded-full transition-all flex items-center justify-center gap-2 text-sm border border-white/10"
            >
              <ArrowLeft size={16} />
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Account Email
              </label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-12 bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/40 rounded-xl pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
                  placeholder="you@domain.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-dark hover:to-emerald-500 text-black font-extrabold px-6 rounded-full shadow-[0_10px_25px_-5px_rgba(29,185,84,0.35)] hover:shadow-[0_12px_30px_-5px_rgba(29,185,84,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center pt-3 border-t border-white/[0.07]">
              <Link to="/login" className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={15} />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
