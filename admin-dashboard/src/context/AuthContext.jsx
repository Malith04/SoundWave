import { createContext, useContext, useEffect, useState } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'

const AuthContext = createContext(null)

// Admin emails whitelist — add your admin email(s) here
// Add the email you created in Firebase Auth console here
const ADMIN_EMAILS = ['thegr8malith@gmail.com'] // ← change this to your email

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      // Only allow whitelisted admin emails
      setUser(u && ADMIN_EMAILS.includes(u.email) ? u : null)
      setLoading(false)
    })
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
