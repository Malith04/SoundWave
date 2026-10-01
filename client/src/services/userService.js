import { api } from './api'

export async function getUser(uid) {
  try {
    if (!uid) return null
    return await api.get(`/users/${uid}`)
  } catch (err) {
    console.warn('getUser error:', err.message)
    return null
  }
}

export async function createUser(uid, data) {
  // Account creation is handled via /api/auth/register or /api/auth/google
  return data
}

export async function updateUser(uid, data) {
  try {
    return await api.put('/auth/profile', data)
  } catch (err) {
    console.error('updateUser error:', err)
    throw err
  }
}

export async function addToRecentlyPlayed(uid, songId, songData = {}) {
  try {
    if (!songId) return
    await api.post(`/users/recently-played/${songId}`, songData)
  } catch (err) {
    console.warn('addToRecentlyPlayed error:', err.message)
  }
}

export async function toggleFavorite(uid, songId, songData = {}) {
  try {
    if (!songId) return false
    const res = await api.post(`/users/favorites/${songId}`, songData)
    return !!res.isFavorite
  } catch (err) {
    console.warn('toggleFavorite error:', err.message)
    return false
  }
}

export async function isFavorite(uid, songId) {
  try {
    if (!songId) return false
    const res = await api.get(`/users/favorites/${songId}/check`)
    return !!res.isFavorite
  } catch {
    return false
  }
}

export async function getFavoriteSongs() {
  try {
    return await api.get('/users/favorites')
  } catch (err) {
    console.warn('getFavoriteSongs error:', err.message)
    return []
  }
}

export async function getRecentlyPlayed() {
  try {
    return await api.get('/users/recently-played')
  } catch (err) {
    console.warn('getRecentlyPlayed error:', err.message)
    return []
  }
}

export async function clearRecentlyPlayed() {
  try {
    return await api.delete('/users/recently-played')
  } catch (err) {
    console.error('clearRecentlyPlayed error:', err)
  }
}

export async function getSearchHistory() {
  try {
    return await api.get('/users/search-history')
  } catch {
    return []
  }
}

export async function addToSearchHistory(query) {
  try {
    if (!query) return
    await api.post('/users/search-history', { query })
  } catch (_) {}
}

export async function clearSearchHistory() {
  try {
    return await api.delete('/users/search-history')
  } catch (err) {
    console.error('clearSearchHistory error:', err)
  }
}
