import {
  collection, getDocs, doc, getDoc, query, setDoc,
  orderBy, limit, where, updateDoc, increment
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'songs'

// Upsert a song from external API into Firestore so admin can see it
export async function upsertSong(song) {
  const ref = doc(db, COL, song.id)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      title: song.title || '',
      artist: song.artist || '',
      album: song.album || '',
      genre: song.genre || 'Unknown',
      coverUrl: song.coverUrl || '',
      audioUrl: song.audioUrl || '',
      source: song.source || 'itunes',
      duration: song.duration || 0,
      playCount: 0,
      createdAt: Date.now(),
    })
  }
}

export async function getTrendingSongs(count = 20) {
  const q = query(collection(db, COL), orderBy('playCount', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getSongsByGenre(genre, count = 20) {
  const q = query(collection(db, COL), where('genre', '==', genre), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getRecentSongs(count = 20) {
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function searchSongs(queryText) {
  // Firestore doesn't support full-text search natively
  // This does a prefix match on title — for production use Algolia/Typesense
  const q = query(collection(db, COL), orderBy('title'), limit(50))
  const snap = await getDocs(q)
  const lower = queryText.toLowerCase()
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s =>
      s.title?.toLowerCase().includes(lower) ||
      s.artist?.toLowerCase().includes(lower) ||
      s.album?.toLowerCase().includes(lower)
    )
}

export async function getSongById(id) {
  const snap = await getDoc(doc(db, COL, id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function incrementPlayCount(id) {
  await updateDoc(doc(db, COL, id), { playCount: increment(1) })
}
