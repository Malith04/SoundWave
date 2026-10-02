import { createContext, useContext, useEffect, useState } from 'react'
import { api, setAuthToken, getAuthToken } from '../services/api'
import {
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { isGISConfigured, requestGoogleProfile } from '../services/googleAuth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const userData = await api.get('/auth/me')
        setUser(userData)
        setProfile(userData)
      } catch (err) {
        console.warn('Session expired or invalid, logging out:', err.message)
        setAuthToken(null)
        setUser(null)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (email, password, otp = undefined) => {
    const data = await api.post('/auth/login', { email, password, otp })
    // If backend requires 2FA / OTP verification, return challenge info directly
    if (data.requiresOtp) {
      return data
    }
    setAuthToken(data.token)
    setUser(data.user)
    setProfile(data.user)
    return { ...data.user, restored: data.restored, message: data.message }
  }

  const signup = async (email, password, name, otp) => {
    const data = await api.post('/auth/register', { email, password, name, otp })
    setAuthToken(data.token)
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
      if (isGISConfigured()) {
        // 1. Pure Native Google Identity Services
        googleUser = await requestGoogleProfile()
      } else {
        // 2. Fallback to Firebase popup if VITE_GOOGLE_CLIENT_ID is not configured
        const provider = new GoogleAuthProvider()
        provider.setCustomParameters({
          prompt: 'select_account'
        })
        const result = await signInWithPopup(auth, provider)
        if (result?.user) {
          googleUser = {
            email: result.user.email,
            name: result.user.displayName,
            photoURL: result.user.photoURL || ''
          }
        }
      }
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
      setUser(data.user)
      setProfile(data.user)
      return { user: data.user, isNewUser: data.isNewUser, restored: data.restored, message: data.message }
    }
  }

  const completeOnboarding = async (onboardingData) => {
    const data = await api.post('/auth/onboarding', onboardingData)
    setUser(data.user)
    setProfile(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await auth.signOut()
    } catch (_) {}
    setAuthToken(null)
    setUser(null)
    setProfile(null)
  }

  const resetPassword = async (email) => {
    return api.post('/auth/forgot-password', { email })
  }

  const refreshProfile = async () => {
    try {
      const userData = await api.get('/auth/me')
      setUser(userData)
      setProfile(userData)
      return userData
    } catch {
      return null
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
