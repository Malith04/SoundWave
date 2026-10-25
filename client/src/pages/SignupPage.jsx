import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { User, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, ArrowLeft, RefreshCw, Edit3 } from 'lucide-react'
import OtpInput from '../components/OtpInput'
import SoundWaveLogo from '../components/SoundWaveLogo'
import GoogleSignInButton from '../components/GoogleSignInButton'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [step, setStep] = useState('details') // 'details' | 'otp'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [pendingGoogleProfile, setPendingGoogleProfile] = useState(null)

  const { signup, sendOtp, loginWithGoogle, loginWithToken } = useAuth()
  const navigate = useNavigate()

  // Handle in-tab redirect callback return from Google
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const googleSuccess = params.get('google_success')
    const token = params.get('token')
    const googleError = params.get('google_error')
    const restored = params.get('restored')
    const target = params.get('target') || '/onboarding'

    if (googleError) {
      toast.error(decodeURIComponent(googleError))
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (googleSuccess && token) {
      setLoading(true)
      loginWithToken(token)
        .then((userData) => {
          if (restored) {
            toast.success('🎉 Welcome back! Your account has been restored.', { duration: 6000 })
          } else {
            toast.success('🎉 Welcome to SoundWave! Account connected with Google.')
          }
          window.history.replaceState({}, document.title, window.location.pathname)
          if (!userData?.onboardingCompleted) {
            navigate('/onboarding', { replace: true })
          } else {
            navigate(target, { replace: true })
          }
        })
        .catch((err) => {
          console.error('[Google In-Tab Signup Error]', err)
          toast.error('Failed to complete Google sign-up. Please try again.')
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [loginWithToken, navigate])

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Step 1: Request 8-Digit OTP code
  const handleInitiateSignup = async e => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Please enter your name.')
    if (!email.trim() || !email.includes('@')) return toast.error('Please enter a valid email address.')
    if (password.length < 6) return toast.error('Password must be at least 6 characters.')

    setLoading(true)
    try {
      await sendOtp(email.trim().toLowerCase(), 'signup')
      toast.success('✉️ An 8-digit verification code has been sent to your email!')
      setStep('otp')
      setResendCooldown(60)
    } catch (err) {
      toast.error(err.message || 'Failed to send verification code. Please check your email.')
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    try {
      const purpose = pendingGoogleProfile ? 'google' : 'signup'
      await sendOtp(email.trim().toLowerCase(), purpose)
      toast.success('🔄 A fresh 8-digit verification code was sent to your email!')
      setResendCooldown(60)
      setOtp('')
      setOtpError(false)
    } catch (err) {
      toast.error(err.message || 'Failed to resend code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Submit OTP and Complete Registration
  const handleCompleteRegistration = async (passcodeToVerify = otp) => {
    const code = (passcodeToVerify || '').trim()
    if (code.length !== 8) {
      setOtpError(true)
      return toast.error('Please enter the complete 8-digit verification code.')
    }

    setLoading(true)
    setOtpError(false)
    try {
      let res
      if (pendingGoogleProfile) {
        res = await loginWithGoogle(code, pendingGoogleProfile)
      } else {
        res = await signup(email.trim().toLowerCase(), password, name.trim(), code)
      }
      toast.success('🎉 Account verified and created successfully!')
      if (res?.isNewUser || !res?.onboardingCompleted) {
        navigate('/onboarding')
      } else {
        navigate('/')
      }
    } catch (err) {
      setOtpError(true)
      toast.error(err.message || 'Invalid or expired verification code.')
    } finally {
      setLoading(false)
    }
  }

  // Quick Google Sign-up (In-Page, No extra tabs)
  const handleGoogleSuccess = async (googleProfile) => {
    setLoading(true)
    try {
      const res = await loginWithGoogle(undefined, googleProfile)

      // If 8-digit OTP is required for Google Sign-Up
      if (res?.requiresOtp) {
        setPendingGoogleProfile(res.googleProfile)
        setEmail(res.email)
        setStep('otp')
        setResendCooldown(60)
        toast.success('🔐 8-digit verification code sent to your Google email!')
        return
      }

      if (res?.isNewUser || !res?.user?.onboardingCompleted) {
        navigate('/onboarding')
      } else if (res?.user) {
        navigate('/')
      }
    } catch (err) {
      console.error('[Google Sign-Up Error]', err)
      const isCancelled = [
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/popup-blocked',
        'auth/user-cancelled'
      ].includes(err.code)
      if (!isCancelled) {
        const currentOrigin = window.location.origin
        if (err.code === 'auth/unauthorized-domain' || err.message?.includes('origin_mismatch') || err.message?.includes('idpiframe_initialization_failed')) {
          toast.error(`Domain not authorized. Please add "${currentOrigin}" to Authorized JavaScript Origins in Google Cloud Console.`, { duration: 6000 })
        } else if (err.message?.includes('Failed to fetch') || err.status >= 500 || err.message?.includes('NetworkError') || err.message?.includes('ECONNREFUSED')) {
          toast.error('Cannot reach backend server. Please verify your backend server and database are running.', { duration: 6000 })
        } else {
          const cleanMsg = err.message?.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?/i, '').trim()
          toast.error(cleanMsg && cleanMsg !== 'Error' ? cleanMsg : `Google sign-in error: Please check Authorized Origins in Google Cloud Console for ${currentOrigin}`)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center p-3.5 sm:p-8 overflow-hidden">
      {/* ── Ambient Aurora Background ── */}
      <div className="absolute top-[-10%] right-[-10%] w-[520px] h-[520px] bg-brand/15 rounded-full blur-[130px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-aurora" style={{ animationDelay: '-5s' }} />
      <div className="absolute top-[30%] left-[20%] w-[380px] h-[380px] bg-emerald-600/10 rounded-full blur-[110px] pointer-events-none animate-aurora" style={{ animationDelay: '-2s' }} />

      {/* Decorative floating sound wave dots */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Center backlight glow behind the card */}
      <div className="absolute w-[520px] h-[520px] bg-brand/[0.08] rounded-full blur-[140px] pointer-events-none" />

      {/* ── Main Professional Container ── */}
      <div className="relative z-10 w-full max-w-[495px] bg-[#121216]/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-10 md:p-11 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_50px_rgba(29,185,84,0.08)] border border-white/[0.12] animate-pop-in overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        
        {/* Soft top inner glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-brand/10 blur-2xl pointer-events-none rounded-full" />

        {step === 'details' ? (
          <>
            {/* Header with animated SoundWave logo */}
            <div className="text-center mb-6 sm:mb-8 relative flex flex-col items-center">
              <SoundWaveLogo size={52} animated glow className="mb-3 sm:mb-4" />
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Create Account
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-1.5 flex items-center justify-center gap-1.5">
                <Sparkles size={14} className="text-brand shrink-0" />
                Join SoundWave and unlock limitless music
              </p>
            </div>

            {/* Google Quick Sign-up (Redirects in current tab, no popups) */}
            <GoogleSignInButton
              context="signup"
              text="signup_with"
              disabled={loading}
            />

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-white/10" />
              <span className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold px-2">or email</span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 via-white/10 to-transparent" />
            </div>

            {/* Form Fields */}
            <form onSubmit={handleInitiateSignup} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                  Your Name
                </label>
                <div className="relative">
                  <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-12 bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/40 rounded-xl pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
                    placeholder="Malith Raja"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                  Email Address
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

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 focus:border-brand focus:ring-1 focus:ring-brand/40 rounded-xl pl-10 pr-11 text-sm text-white placeholder-gray-500 focus:outline-none transition-all duration-200"
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 ml-1">Must be at least 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-2 bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-dark hover:to-emerald-500 text-black font-extrabold px-6 rounded-full shadow-[0_10px_25px_-5px_rgba(29,185,84,0.35)] hover:shadow-[0_12px_30px_-5px_rgba(29,185,84,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue & Send Verification Code</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Link */}
            <div className="mt-8 text-center pt-5 border-t border-white/[0.07]">
              <p className="text-xs sm:text-sm text-gray-400">
                Already have an account?{' '}
                <Link to="/login" className="text-brand hover:text-emerald-400 font-bold hover:underline ml-1 transition-colors">
                  Log in
                </Link>
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                Protected by SoundWave 8-Digit Email Passcode Security
              </p>
            </div>
          </>
        ) : (
          /* ── Step 2: 8-Digit OTP Verification Screen ── */
          <div className="animate-fade-in">
            {/* Back button */}
            <button
              type="button"
              onClick={() => {
                setStep('details')
                setPendingGoogleProfile(null)
                setOtp('')
                setOtpError(false)
              }}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>{pendingGoogleProfile ? 'Back to sign-up' : 'Back to details'}</span>
            </button>

            {/* Security Badge Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand to-emerald-400 p-0.5 shadow-xl shadow-brand/25 mb-4">
                <div className="w-full h-full bg-[#121216] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="text-brand w-8 h-8" />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-white">
                {pendingGoogleProfile ? 'Google Verification' : 'Verify Your Email'}
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                {pendingGoogleProfile
                  ? 'To verify and secure your Google account, enter the 8-digit code sent to'
                  : 'We sent an 8-digit verification code to'}
              </p>
              <div className="inline-flex items-center gap-2 mt-1.5 px-3 py-1 bg-white/[0.05] border border-white/10 rounded-full">
                <span className="text-xs font-semibold text-white tracking-wide">{email}</span>
                {!pendingGoogleProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('details')
                      setPendingGoogleProfile(null)
                      setOtp('')
                      setOtpError(false)
                    }}
                    className="text-brand hover:text-emerald-400 text-[11px] font-bold flex items-center gap-0.5 hover:underline"
                    title="Change email"
                  >
                    <Edit3 size={11} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* 8-Digit OTP Input Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 text-center mb-3">
                  Enter 8-Digit One-Time Passcode
                </label>
                <OtpInput
                  length={8}
                  value={otp}
                  onChange={val => {
                    setOtp(val)
                    if (otpError) setOtpError(false)
                  }}
                  onComplete={handleCompleteRegistration}
                  disabled={loading}
                  error={otpError}
                />
              </div>

              {/* Resend Timer & Action */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-gray-400">Didn't receive the email?</span>
                {resendCooldown > 0 ? (
                  <span className="text-gray-500 font-mono">
                    Resend code in {resendCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-brand hover:text-emerald-400 font-bold inline-flex items-center gap-1 hover:underline transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleCompleteRegistration(otp)}
                disabled={loading || otp.length !== 8}
                className="w-full h-12 bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-dark hover:to-emerald-500 text-black font-extrabold px-6 rounded-full shadow-[0_10px_25px_-5px_rgba(29,185,84,0.35)] hover:shadow-[0_12px_30px_-5px_rgba(29,185,84,0.5)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2 group text-sm"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{pendingGoogleProfile ? 'Verify & Continue' : 'Verify & Create Account'}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Security Note */}
            <div className="mt-8 text-center pt-5 border-t border-white/[0.07]">
              <p className="text-[11px] text-gray-500">
                Code expires in 10 minutes · Check your spam folder if not found in inbox
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
