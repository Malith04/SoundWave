import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup
} from 'firebase/auth'
import { auth } from '../services/firebase'
import { createUser, getUser } from '../services/userService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const p = await getUser(firebaseUser.uid)
          setProfile(p)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const signup = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await createUser(cred.user.uid, { name, email })
    return cred
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const existing = await getUser(cred.user.uid)
    if (!existing) {
      await createUser(cred.user.uid, {
        name: cred.user.displayName,
        email: cred.user.email,
        profilePicUrl: cred.user.photoURL || ''
      })
    }
    return cred
  }

  const logout = () => signOut(auth)
  const resetPassword = email => sendPasswordResetEmail(auth, email)
  const refreshProfile = async () => {
    if (user) setProfile(await getUser(user.uid))
  }

  // Always render the provider — routes check `loading` themselves
  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, signup, loginWithGoogle,
      logout, resetPassword, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
