import { collection, getDocs, deleteDoc, doc, getCountFromServer, query, orderBy } from 'firebase/firestore'
import { db } from './firebase'

const USERS_COL = 'users'

export async function getUsers() {
  try {
    const q = query(collection(db, USERS_COL), orderBy('email'))
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('getUsers failed:', err.code, err.message)
    throw err
  }
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, USERS_COL, uid))
  // Note: deleting from Firebase Auth requires Admin SDK (server-side)
}

export async function getUserCount() {
  const snap = await getCountFromServer(collection(db, USERS_COL))
  return snap.data().count
}
