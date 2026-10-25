import React, { useEffect, useRef, useState } from 'react'
import {
  initInPageGoogleAuth,
  renderInPageGoogleButton,
  isGISConfigured
} from '../services/googleAuth'

/**
 * GoogleSignInButton
 * 
 * Renders Google's official In-Page Sign-In Button with full in-tab redirect.
 * All account selection happens directly within the current browser tab (no popups, no new tabs, no One Tap).
 */
export default function GoogleSignInButton({
  context = 'signin',
  text = 'continue_with',
  shape = 'pill',
  disabled = false,
  className = '',
}) {
  const containerRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let isCancelled = false

    const setupAuth = async () => {
      try {
        await initInPageGoogleAuth({ context })

        if (isCancelled) return

        if (containerRef.current) {
          renderInPageGoogleButton(containerRef.current, {
            theme: 'filled_black',
            size: 'large',
            text,
            shape,
            width: containerRef.current.offsetWidth || 340,
          })
          setMounted(true)
        }
      } catch (err) {
        console.warn('[GoogleSignInButton] Setup error:', err)
      } finally {
        if (!isCancelled) setInitializing(false)
      }
    }

    setupAuth()

    // Handle responsive container resize
    const handleResize = () => {
      if (containerRef.current && window.google?.accounts?.id) {
        renderInPageGoogleButton(containerRef.current, {
          theme: 'filled_black',
          size: 'large',
          text,
          shape,
          width: containerRef.current.offsetWidth || 340,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      isCancelled = true
      window.removeEventListener('resize', handleResize)
    }
  }, [context, text, shape])

  if (!isGISConfigured()) {
    return null
  }

  return (
    <div className={`relative w-full flex items-center justify-center ${className}`}>
      {/* Official Google In-Page Rendered Button (Redirects in current tab, no popups) */}
      <div
        ref={containerRef}
        className={`w-full flex items-center justify-center min-h-[44px] transition-opacity duration-200 ${
          mounted ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
      />

      {/* Placeholder / Skeleton while Google GIS initializes */}
      {!mounted && (
        <div className="w-full h-11 sm:h-12 flex items-center justify-center gap-3 bg-white/[0.05] border border-white/10 rounded-full text-sm font-semibold text-white/80 select-none">
          <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          <span>Continue with Google</span>
        </div>
      )}
    </div>
  )
}
