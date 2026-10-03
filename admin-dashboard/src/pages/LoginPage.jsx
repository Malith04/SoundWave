import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SoundWaveLogo from '../components/SoundWaveLogo'
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back, Administrator!')
      navigate('/dashboard')
    } catch (err) {
      toast.error('Invalid credentials or unauthorized admin account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07080b] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Header Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <SoundWaveLogo size={48} animated glow />
          <div className="mt-4 flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white font-display tracking-tight">SoundWave</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand/20 text-brand border border-brand/40 uppercase">
              Admin Portal
            </span>
          </div>
          <p className="text-gray-400 text-xs mt-1.5 font-medium">
            Sign in with authorized administrator credentials
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8 space-y-5 border border-white/10 shadow-2xl">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              Admin Email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                placeholder="admin@soundwave.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-hover hover:to-emerald-300 text-black font-extrabold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-brand/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-xs uppercase tracking-wider mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Access Console</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <ShieldCheck size={14} className="text-brand" />
          <span>Restricted access area. All activities are securely logged.</span>
        </div>
      </div>
    </div>
  )
}
