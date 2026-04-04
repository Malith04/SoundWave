import {
  doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'users'

export async function getUser(uid) {
  const snap = await getDoc(doc(db, COL, uid))
  return snap.exists() ? snap.data() : null
}

export async function createUser(uid, data) {
  await setDoc(doc(db, COL, uid), {
    uid,
    name: data.name || '',
    email: data.email || '',
    profilePicUrl: '',
    favoriteSongs: [],
    recentlyPlayed: [],
    createdAt: Date.now(),
    ...data
  })
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, COL, uid), data)
}

export async function addToRecentlyPlayed(uid, songId) {
  const user = await getUser(uid)
  if (!user) return
  const updated = [songId, ...(user.recentlyPlayed || []).filter(id => id !== songId)].slice(0, 30)
  await updateDoc(doc(db, COL, uid), { recentlyPlayed: updated })
}

export async function toggleFavorite(uid, songId) {
  const user = await getUser(uid)
  if (!user) return false
  const isFav = (user.favoriteSongs || []).includes(songId)
  await updateDoc(doc(db, COL, uid), {
    favoriteSongs: isFav ? arrayRemove(songId) : arrayUnion(songId)
  })
  return !isFav
}

export async function isFavorite(uid, songId) {
  const user = await getUser(uid)
  return (user?.favoriteSongs || []).includes(songId)
}
