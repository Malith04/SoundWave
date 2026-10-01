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
    <div className="relative min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ── Ambient Aurora Background ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-brand/15 rounded-full blur-[120px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[480px] h-[480px] bg-teal-600/15 rounded-full blur-[130px] pointer-events-none animate-aurora" style={{ animationDelay: '-4s' }} />

      <div className="relative z-10 w-full max-w-md glass-modal rounded-3xl p-6 sm:p-10 shadow-2xl border border-white/10 animate-pop-in">
        
        {/* Animated Key Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand to-teal-400 p-0.5 shadow-lg shadow-brand/30 mb-4 hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#121212] rounded-[14px] flex items-center justify-center">
              <KeyRound className="text-brand w-7 h-7" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="text-gray-400 text-sm mt-1.5">
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
              className="w-full bg-surface-3 hover:bg-surface-4 text-white font-semibold py-3 px-4 rounded-full transition-all flex items-center justify-center gap-2 text-sm border border-white/10"
            >
              <ArrowLeft size={16} />
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                Account Email
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-dark hover:to-emerald-500 text-black font-extrabold py-3.5 px-6 rounded-full shadow-lg shadow-brand/25 transition-all duration-300 hover:shadow-brand/40 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group text-sm"
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

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
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
