import { api } from './api'

// Fetch matching artists for search queries and recommendations
export async function searchArtists(query) {
  if (!query || !query.trim() || query.trim().length < 2) return []
  try {
    const results = await api.get(`/artists/search?q=${encodeURIComponent(query.trim())}`)
    return Array.isArray(results) ? results : []
  } catch (err) {
    console.warn('Failed to search artists via backend, falling back:', err)
    // Fallback: iTunes direct artist search
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query.trim())}&media=music&entity=musicArtist&limit=5`
      )
      if (itunesRes.ok) {
        const data = await itunesRes.json()
        return (data.results || []).map(a => ({
          id: `it_${a.artistId}`,
          name: a.artistName,
          picture: '',
          fanCount: 0,
          genre: a.primaryGenreName || 'Artist',
          albumsCount: 0,
          source: 'itunes'
        }))
      }
    } catch (_) {}
    return []
  }
}

// Fetch comprehensive artist profile (info, top songs, albums, new releases, upcoming, collabs)
export async function getArtistProfile(artistNameOrId) {
  if (!artistNameOrId) return null
  try {
    const data = await api.get(`/artists/${encodeURIComponent(artistNameOrId)}`, { timeout: 15000 })
    return data
  } catch (err) {
    console.error('Failed to get artist profile:', err)
    throw err
  }
}

// ── Followed Artists Persistence ────────────────────────────────
function getStorageKey(userId) {
  return userId ? `sw_followed_artists_${userId}` : 'sw_followed_artists_guest'
}

export function getFollowedArtists(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isArtistFollowed(userId, artistName) {
  if (!artistName) return false
  const list = getFollowedArtists(userId)
  return list.some(a => (typeof a === 'string' ? a : a.name).toLowerCase() === artistName.toLowerCase())
}

export function toggleFollowArtist(userId, artistObj) {
  if (!artistObj || !artistObj.name) return false
  const list = getFollowedArtists(userId)
  const existsIndex = list.findIndex(
    a => (typeof a === 'string' ? a : a.name).toLowerCase() === artistObj.name.toLowerCase()
  )

  let newList
  let isNowFollowing = false

  if (existsIndex >= 0) {
    newList = list.filter((_, idx) => idx !== existsIndex)
    isNowFollowing = false
  } else {
    newList = [
      {
        id: artistObj.id || `art_${Date.now()}`,
        name: artistObj.name,
        picture: artistObj.picture || '',
        genre: artistObj.genre || 'Artist',
        followedAt: new Date().toISOString()
      },
      ...list
    ]
    isNowFollowing = true
  }

  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(newList))
  } catch (_) {}

  return isNowFollowing
}
