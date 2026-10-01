import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAzOuJAwyV0VpwNWFXePSAcXB0zATmjhOQ",
  authDomain: "soundwave-58f19.firebaseapp.com",
  projectId: "soundwave-58f19",
  storageBucket: "soundwave-58f19.firebasestorage.app",
  messagingSenderId: "571859653920",
  appId: "1:571859653920:web:3d0f55824e1be1e670b345",
  measurementId: "G-5F2PVQ8Q6M"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
