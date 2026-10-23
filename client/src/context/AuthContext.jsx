import { createContext, useContext, useEffect, useState } from 'react'
import {
  api,
  setAuthToken,
  getAuthToken,
  getCachedUser,
  setCachedUser,
  isSessionExpired14D,
  clearSession,
  touchLastActive
} from '../services/api'
import { requestGoogleProfile } from '../services/googleAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Read cached user immediately so reload/crash/update has ZERO logout flash
  const [user, setUser] = useState(() => getCachedUser())
  const [profile, setProfile] = useState(() => getCachedUser())
  const [loading, setLoading] = useState(() => !getCachedUser() && !!getAuthToken())

  // Validate session on mount
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
        return
      }

      // Check 14-day client inactivity threshold
      if (isSessionExpired14D()) {
        console.warn('[SoundWave Auth] 14 days of inactivity elapsed. Requiring re-login.')
        clearSession()
        if (isMounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
        return
      }

      try {
        const userData = await api.get('/auth/me')
        if (isMounted) {
          setUser(userData)
          setProfile(userData)
          setCachedUser(userData)
          touchLastActive()
          if (userData.refreshedToken) {
            setAuthToken(userData.refreshedToken)
          }
        }
      } catch (err) {
        // ONLY log out if backend returns 401 Unauthorized explicitly rejecting the token/session
        // DO NOT log out on network disconnects, server restarts, or 500/502/503 errors!
        const isAuthError = err.status === 401 ||
          err.code === 'SESSION_INACTIVE_14D' ||
          err.code === 'TOKEN_INVALID' ||
          err.code === 'ACCOUNT_INVALID'

        if (isAuthError) {
          console.warn('[SoundWave Auth] Session expired or invalid on server (401), signing out:', err.message)
          clearSession()
          if (isMounted) {
            setUser(null)
            setProfile(null)
          }
        } else {
          // Server rebooting, update in progress, or temporary network blip: Keep cached user logged in!
          console.warn('[SoundWave Auth] Server temporarily unreachable during session check. Retaining active session:', err.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (email, password, otp = undefined) => {
    const data = await api.post('/auth/login', { email, password, otp })
    // If backend requires 2FA / OTP verification, return challenge info directly
    if (data.requiresOtp) {
      return data
    }
    setAuthToken(data.token)
    setCachedUser(data.user)
    touchLastActive()
    setUser(data.user)
    setProfile(data.user)
    return { ...data.user, restored: data.restored, message: data.message }
  }

  const signup = async (email, password, name, otp) => {
    const data = await api.post('/auth/register', { email, password, name, otp })
    setAuthToken(data.token)
    setCachedUser(data.user)
    touchLastActive()
    setUser(data.user)
    setProfile(data.user)
    return data.user
  }

  const sendOtp = async (email, purpose = 'signup') => {
    return api.post('/auth/send-otp', { email, purpose })
  }

  const verifyOtp = async (email, otp, purpose = 'signup') => {
    return api.post('/auth/verify-otp', { email, otp, purpose })
  }

  const loginWithGoogle = async (otp = undefined, pendingProfile = null) => {
    let googleUser = pendingProfile

    if (!googleUser) {
      // Pure Native Google Identity Services OAuth
      googleUser = await requestGoogleProfile()
    }

    if (googleUser?.email) {
      const data = await api.post('/auth/google', {
        email: googleUser.email,
        name: googleUser.name,
        photoURL: googleUser.photoURL || '',
        otp
      })

      // If backend requires 8-digit OTP verification for this Google sign-in
      if (data.requiresOtp) {
        return {
          requiresOtp: true,
          email: data.email,
          googleProfile: data.googleProfile || googleUser,
          message: data.message
        }
      }

      setAuthToken(data.token)
      setCachedUser(data.user)
      touchLastActive()
      setUser(data.user)
      setProfile(data.user)
      return { user: data.user, isNewUser: data.isNewUser, restored: data.restored, message: data.message }
    }
  }

  const completeOnboarding = async (onboardingData) => {
    const data = await api.post('/auth/onboarding', onboardingData)
    setCachedUser(data.user)
    touchLastActive()
    setUser(data.user)
    setProfile(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(() => {})
    } finally {
      clearSession()
      setUser(null)
      setProfile(null)
    }
  }

  const resetPassword = async (email) => {
    return api.post('/auth/forgot-password', { email })
  }

  const refreshProfile = async () => {
    try {
      const userData = await api.get('/auth/me')
      setUser(userData)
      setProfile(userData)
      setCachedUser(userData)
      touchLastActive()
      if (userData.refreshedToken) {
        setAuthToken(userData.refreshedToken)
      }
      return userData
    } catch {
      return user
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, signup, sendOtp, verifyOtp, loginWithGoogle, completeOnboarding,
      logout, resetPassword, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
