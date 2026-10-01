import { api } from './api'

export async function upsertSong(song) {
  try {
    if (!song || !song.id) return null
    return await api.post('/songs', {
      id: String(song.id),
      title: song.title || '',
      artist: song.artist || '',
      album: song.album || '',
      genre: song.genre || 'General',
      coverUrl: song.coverUrl || '',
      audioUrl: song.audioUrl || '',
      source: song.source || 'itunes',
      duration: song.duration || 0
    })
  } catch (err) {
    console.warn('upsertSong error:', err.message)
    return null
  }
}

export async function getTrendingSongs(count = 20) {
  try {
    return await api.get(`/songs?sort=trending&limit=${count}`)
  } catch {
    return []
  }
}

export async function getSongsByGenre(genre, count = 20) {
  try {
    return await api.get(`/songs?genre=${encodeURIComponent(genre)}&limit=${count}`)
  } catch {
    return []
  }
}

export async function getRecentSongs(count = 20) {
  try {
    return await api.get(`/songs?sort=recent&limit=${count}`)
  } catch {
    return []
  }
}

export async function searchSongs(queryText) {
  try {
    if (!queryText) return []
    return await api.get(`/songs?search=${encodeURIComponent(queryText)}`)
  } catch {
    return []
  }
}

export async function getSongById(id) {
  try {
    if (!id) return null
    return await api.get(`/songs/${id}`)
  } catch {
    return null
  }
}

export async function incrementPlayCount(id) {
  try {
    if (!id) return
    await api.post(`/songs/${id}/play`)
  } catch (_) {}
}
