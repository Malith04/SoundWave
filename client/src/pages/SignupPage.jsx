import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      await signup(email, password, name)
      navigate('/')
    } catch (err) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Email already in use' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">🎵</span>
          <h1 className="text-3xl font-bold mt-3">Create account</h1>
          <p className="text-gray-400 mt-1">Join SoundWave for free</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full name', value: name, set: setName, type: 'text', placeholder: 'Your name' },
            { label: 'Email address', value: email, set: setEmail, type: 'email', placeholder: 'you@example.com' },
            { label: 'Password', value: password, set: setPassword, type: 'password', placeholder: '6+ characters' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label}>
              <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
              <input
                type={type} value={value} onChange={e => set(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
                placeholder={placeholder} required
              />
            </div>
          ))}
          <button
            type="submit" disabled={loading}
            className="w-full bg-brand hover:bg-brand-dark text-black font-bold py-3 rounded-full transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-white font-semibold hover:text-brand transition-colors">Log in</Link>
        </p>
      </div>
    </div>
  )
}
