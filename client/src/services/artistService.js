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

// ── Fetch Album Details and Full Track List ─────────────────────
export async function getAlbumTracks(collectionId, albumTitle = '', artistName = '') {
  if (!collectionId) return { album: null, tracks: [] }
  const cleanId = String(collectionId).replace(/^alb_/, '').trim()

  // 1. Backend API query (with Redis / in-memory cache)
  try {
    const query = new URLSearchParams()
    if (albumTitle) query.set('title', albumTitle)
    if (artistName) query.set('artist', artistName)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    const data = await api.get(`/artists/album/${cleanId}${queryString}`, { timeout: 12000 })
    if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
      return data
    }
  } catch (err) {
    console.warn('Backend album tracks lookup notice, falling back:', err?.message || err)
  }

  // 2. Direct client-side iTunes lookup fallback
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${cleanId}&entity=song&limit=100`)
    if (res.ok) {
      const json = await res.json()
      if (json?.results && json.results.length > 0) {
        const col = json.results.find(r => r.wrapperType === 'collection' || r.collectionType === 'Album') || json.results[0]
        const albumData = {
          id: `alb_${col.collectionId || cleanId}`,
          collectionId: col.collectionId || cleanId,
          title: col.collectionName || albumTitle || 'Album',
          artist: col.artistName || artistName || '',
          coverUrl: (col.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
          releaseDate: col.releaseDate || '',
          year: col.releaseDate ? new Date(col.releaseDate).getFullYear() : 'N/A',
          genre: col.primaryGenreName || 'Music',
          trackCount: col.trackCount || 0,
          viewUrl: col.collectionViewUrl || ''
        }

        const tracks = json.results
          .filter(r => r.wrapperType === 'track' || r.kind === 'song')
          .map((t, idx) => ({
            id: `it_${t.trackId}`,
            trackId: t.trackId,
            title: t.trackName || `Track ${idx + 1}`,
            artist: t.artistName || albumData.artist,
            album: t.collectionName || albumData.title,
            coverUrl: (t.artworkUrl100 || albumData.coverUrl || '').replace('100x100bb', '600x600bb'),
            audioUrl: t.previewUrl || '',
            duration: t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : 180,
            trackNumber: t.trackNumber || idx + 1,
            source: 'itunes',
            genre: t.primaryGenreName || albumData.genre,
            isStreamable: true
          }))
          .sort((a, b) => a.trackNumber - b.trackNumber)

        return { album: albumData, tracks }
      }
    }
  } catch (_) {}

  return {
    album: {
      id: `alb_${cleanId}`,
      collectionId: cleanId,
      title: albumTitle || 'Album',
      artist: artistName || '',
      coverUrl: '',
      year: 'N/A',
      trackCount: 0
    },
    tracks: []
  }
}
