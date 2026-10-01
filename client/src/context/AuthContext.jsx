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

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    setAuthToken(data.token)
    setUser(data.user)
    setProfile(data.user)
    return { ...data.user, restored: data.restored, message: data.message }
  }

  const signup = async (email, password, name) => {
    const data = await api.post('/auth/register', { email, password, name })
    setAuthToken(data.token)
    setUser(data.user)
    setProfile(data.user)
    return data.user
  }

  const loginWithGoogle = async () => {
    let googleUser

    if (isGISConfigured()) {
      // 1. Pure Native Google Identity Services (Direct accounts.google.com, zero Firebase)
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

    if (googleUser?.email) {
      const data = await api.post('/auth/google', {
        email: googleUser.email,
        name: googleUser.name,
        photoURL: googleUser.photoURL || ''
      })
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
      login, signup, loginWithGoogle, completeOnboarding,
      logout, resetPassword, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
