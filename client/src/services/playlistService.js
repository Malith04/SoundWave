import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'playlists'

export async function getUserPlaylists(uid) {
  const q = query(collection(db, COL), where('ownerId', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export async function getPlaylist(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function createPlaylist(uid, name, description = '') {
  const ref = await addDoc(collection(db, COL), {
    name: typeof name === 'object' ? name.name : name,
    description,
    ownerId: uid,
    songIds: [],
    createdAt: Date.now(),
  })
  return ref.id
}

export async function updatePlaylist(id, data) {
  await updateDoc(doc(db, COL, id), data)
}

export async function renamePlaylist(id, name) {
  await updateDoc(doc(db, COL, id), { name })
}

export async function deletePlaylist(id) {
  await deleteDoc(doc(db, COL, id))
}

export async function addSongToPlaylist(playlistId, songId) {
  await updateDoc(doc(db, COL, playlistId), { songIds: arrayUnion(songId) })
}

export async function removeSongFromPlaylist(playlistId, songId) {
  await updateDoc(doc(db, COL, playlistId), { songIds: arrayRemove(songId) })
}
