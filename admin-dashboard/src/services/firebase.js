import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyDRrei4hQ0jslfqXS_h4xkRGLI0gs2KUjg",
  authDomain: "spotify-music-app-b8966.firebaseapp.com",
  projectId: "spotify-music-app-b8966",
  storageBucket: "spotify-music-app-b8966.firebasestorage.app",
  messagingSenderId: "1014247265933",
  appId: "1:1014247265933:web:2a5368e8765f044e6ab4c4",
  measurementId: "G-FF5D1KH3PV"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
