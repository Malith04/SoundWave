import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
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
      toast.success('Reset email sent!')
    } catch {
      toast.error('Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <span className="text-5xl">🔑</span>
        <h1 className="text-2xl font-bold mt-4 mb-2">Reset password</h1>
        <p className="text-gray-400 text-sm mb-8">Enter your email and we'll send you a reset link</p>

        {sent ? (
          <div className="bg-brand/10 border border-brand/30 rounded-xl p-4 text-brand text-sm">
            Check your inbox for a reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
              placeholder="you@example.com" required
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-full transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <Link to="/login" className="block mt-6 text-sm text-gray-400 hover:text-white transition-colors">
          ← Back to login
        </Link>
      </div>
    </div>
  )
}
