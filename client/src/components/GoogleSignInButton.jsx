import React, { useState } from 'react'
import { isGISConfigured, requestGoogleProfile } from '../services/googleAuth'

/**
 * GoogleSignInButton
 * 
 * Renders SoundWave's branded Google Sign-In Button.
 * When clicked, triggers Google's native Account Chooser dialog with prompt: 'select_account'
 * allowing users to choose between ALL Google accounts or 'Use another account'.
 * 
 * Works seamlessly across Mobile & Desktop directly within the same page session.
 * Never redirects the entire window or triggers redirect_uri_mismatch.
 */
export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'Continue with Google',
  disabled = false,
  className = '',
}) {
  const [loading, setLoading] = useState(false)

  if (!isGISConfigured()) {
    return null
  }

  const handleClick = async () => {
    if (disabled || loading) return
    setLoading(true)
    try {
      const profile = await requestGoogleProfile()
      if (profile && profile.email) {
        onSuccess?.(profile)
      }
    } catch (err) {
      const isCancelled = [
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/popup-blocked',
        'auth/user-cancelled'
      ].includes(err.code) || err.message?.includes('Sign-in cancelled')

      if (!isCancelled) {
        console.error('[GoogleSignInButton Error]', err)
        onError?.(err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`relative w-full flex items-center justify-center ${className}`}>
      <button
        type="button"
        id="continue-with-google-btn"
        onClick={handleClick}
        disabled={disabled || loading}
        className="w-full h-11 sm:h-12 flex items-center justify-center gap-3 bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.99] border border-white/10 hover:border-white/25 rounded-full text-sm font-semibold text-white transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0 transition-transform duration-200 group-hover:scale-105">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        <span>{loading ? 'Connecting to Google...' : text}</span>
      </button>
    </div>
  )
}
