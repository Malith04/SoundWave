import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, orderBy, limit, where, getCountFromServer
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'

const SONGS_COL = 'songs'

// Upload a file to Firebase Storage and return download URL
export async function uploadFile(file, path, onProgress) {
  const storageRef = ref(storage, path)
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file)
    task.on('state_changed',
      snap => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    )
  })
}

// Add a new song (with file uploads)
export async function addSong(songData, audioFile, coverFile, onProgress) {
  const id = Date.now().toString()
  const audioUrl = await uploadFile(audioFile, `songs/${id}_${audioFile.name}`, p => onProgress?.('audio', p))
  const coverUrl = await uploadFile(coverFile, `covers/${id}_${coverFile.name}`, p => onProgress?.('cover', p))
  const docRef = await addDoc(collection(db, SONGS_COL), {
    ...songData,
    audioUrl,
    coverUrl,
    playCount: 0,
    createdAt: Date.now()
  })
  return docRef.id
}

// Update song metadata
export async function updateSong(id, data) {
  await updateDoc(doc(db, SONGS_COL, id), data)
}

// Delete song and its storage files
export async function deleteSong(song) {
  await deleteDoc(doc(db, SONGS_COL, song.id))
  // Best-effort delete from storage
  try {
    if (song.audioUrl) await deleteObject(ref(storage, song.audioUrl))
    if (song.coverUrl) await deleteObject(ref(storage, song.coverUrl))
  } catch (_) {}
}

// Fetch all songs
export async function getSongs(sortBy = 'createdAt', dir = 'desc') {
  try {
    const q = query(collection(db, SONGS_COL), orderBy(sortBy, dir))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('getSongs failed:', err.code, err.message)
    throw err
  }
}

// Fetch trending songs
export async function getTrendingSongs(count = 10) {
  const q = query(collection(db, SONGS_COL), orderBy('playCount', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// Get total song count
export async function getSongCount() {
  const snap = await getCountFromServer(collection(db, SONGS_COL))
  return snap.data().count
}
