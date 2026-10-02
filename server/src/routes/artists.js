import { Router } from 'express'

const router = Router()

// Simple in-memory cache for artist profiles and searches (30-minute TTL)
const cache = new Map()
const CACHE_TTL_MS = 30 * 60 * 1000

function getFromCache(key) {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() - item.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return item.data
}

function setToCache(key, data) {
  // Cap cache size at 300 entries to prevent memory growth
  if (cache.size > 300) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, { data, timestamp: Date.now() })
}

// Helper for timeout fetch
async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoundWave/1.0 (Music Streaming Platform)'
      }
    })
    return res
  } finally {
    clearTimeout(timer)
  }
}

// ── 1. Search Artists (For Search Page & Auto-recommendations) ──
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || !q.trim()) {
      return res.json([])
    }

    const cleanQuery = q.trim()
    const cacheKey = `artist_search_${cleanQuery.toLowerCase()}`
    const cached = getFromCache(cacheKey)
    if (cached) return res.json(cached)

    // Fetch from Deezer and iTunes in parallel
    const [deezerRes, itunesRes] = await Promise.allSettled([
      fetchWithTimeout(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanQuery)}&limit=6`),
      fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=musicArtist&limit=6`)
    ])

    let deezerArtists = []
    if (deezerRes.status === 'fulfilled' && deezerRes.value.ok) {
      try {
        const d = await deezerRes.value.json()
        deezerArtists = d.data || []
      } catch (_) {}
    }

    let itunesArtists = []
    if (itunesRes.status === 'fulfilled' && itunesRes.value.ok) {
      try {
        const d = await itunesRes.value.json()
        itunesArtists = d.results || []
      } catch (_) {}
    }

    // Merge and deduplicate by artist name
    const artistsMap = new Map()

    for (const da of deezerArtists) {
      const normName = da.name.trim().toLowerCase()
      if (!artistsMap.has(normName)) {
        artistsMap.set(normName, {
          id: `dz_${da.id}`,
          name: da.name,
          picture: da.picture_xl || da.picture_big || da.picture_medium || da.picture,
          fanCount: da.nb_fan || 0,
          genre: 'Artist',
          albumsCount: da.nb_album || 0,
          source: 'deezer'
        })
      }
    }

    for (const ia of itunesArtists) {
      const normName = ia.artistName.trim().toLowerCase()
      if (artistsMap.has(normName)) {
        const existing = artistsMap.get(normName)
        if (ia.primaryGenreName) existing.genre = ia.primaryGenreName
        existing.itunesId = ia.artistId
      } else {
        artistsMap.set(normName, {
          id: `it_${ia.artistId}`,
          name: ia.artistName,
          picture: '',
          fanCount: 0,
          genre: ia.primaryGenreName || 'Music',
          albumsCount: 0,
          itunesId: ia.artistId,
          source: 'itunes'
        })
      }
    }

    // Score and rank artists by query match + popularity
    const scoreArtist = (a) => {
      const name = a.name.toLowerCase()
      const qLower = cleanQuery.toLowerCase()
      let score = a.fanCount || 0
      if (name === qLower) score += 500000000
      else if (name.startsWith(qLower)) score += 200000000
      else if (name.includes(` ${qLower}`)) score += 50000000
      return score
    }

    const results = Array.from(artistsMap.values())
      .sort((a, b) => scoreArtist(b) - scoreArtist(a))
      .slice(0, 8)

    // Backfill photos & fan counts for top results that came from iTunes without Deezer photo
    const missingPhotos = results.filter(a => !a.picture).slice(0, 3)
    if (missingPhotos.length > 0) {
      await Promise.allSettled(
        missingPhotos.map(async a => {
          try {
            const res = await fetchWithTimeout(`https://api.deezer.com/search/artist?q=${encodeURIComponent(a.name)}&limit=1`, 3000)
            if (res.ok) {
              const d = await res.json()
              if (d.data && d.data[0]) {
                a.picture = d.data[0].picture_xl || d.data[0].picture_big || d.data[0].picture_medium || ''
                a.fanCount = d.data[0].nb_fan || a.fanCount
              }
            }
          } catch (_) {}
        })
      )
    }

    setToCache(cacheKey, results)
    return res.json(results)
  } catch (err) {
    console.error('Artist search error:', err)
    return res.status(500).json({ error: 'Failed to search artists' })
  }
})

// ── 2. Get Comprehensive Artist Profile & Catalog ──
router.get('/:query', async (req, res) => {
  try {
    const rawQuery = decodeURIComponent(req.params.query).trim()
    if (!rawQuery) {
      return res.status(400).json({ error: 'Artist name or ID is required' })
    }

    const cacheKey = `artist_profile_${rawQuery.toLowerCase()}`
    const cached = getFromCache(cacheKey)
    if (cached) return res.json(cached)

    // Resolve artist ID and info
    let artistName = rawQuery
    let itunesArtistId = null
    let deezerData = null

    // 1. Initial parallel search to locate artist IDs in Deezer & iTunes
    const [deezerSearchRes, itunesSearchRes] = await Promise.allSettled([
      fetchWithTimeout(`https://api.deezer.com/search/artist?q=${encodeURIComponent(rawQuery)}&limit=1`),
      fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(rawQuery)}&media=music&entity=musicArtist&limit=3`)
    ])

    if (deezerSearchRes.status === 'fulfilled' && deezerSearchRes.value.ok) {
      try {
        const d = await deezerSearchRes.value.json()
        if (d.data && d.data[0]) {
          deezerData = d.data[0]
          artistName = deezerData.name
        }
      } catch (_) {}
    }

    if (itunesSearchRes.status === 'fulfilled' && itunesSearchRes.value.ok) {
      try {
        const d = await itunesSearchRes.value.json()
        if (d.results && d.results.length > 0) {
          // Find best name match or use first
          const match = d.results.find(
            r => r.artistName.toLowerCase() === artistName.toLowerCase()
          ) || d.results[0]
          itunesArtistId = match.artistId
          if (!deezerData) artistName = match.artistName
        }
      } catch (_) {}
    }

    // 2. Fetch Albums, Songs, and Collaborations
    const tasks = []

    // Albums
    if (itunesArtistId) {
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/lookup?id=${itunesArtistId}&entity=album&limit=40`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    } else {
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=album&limit=30`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    }

    // Songs
    if (itunesArtistId) {
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/lookup?id=${itunesArtistId}&entity=song&limit=60`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    } else {
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=song&limit=50`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    }

    // Collaborations (Search for feat / ft)
    tasks.push(
      fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName + ' feat')}&media=music&entity=song&limit=30`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    )

    const [rawAlbumsRes, rawSongsRes, rawCollabsRes] = await Promise.all(tasks)

    // Normalize iTunes track to SoundWave format
    function normalizeSong(track) {
      return {
        id: `it_${track.trackId}`,
        title: track.trackName || 'Unknown Title',
        artist: track.artistName || artistName,
        album: track.collectionName || '',
        coverUrl: (track.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        audioUrl: track.previewUrl || '',
        duration: track.trackTimeMillis || 30000,
        source: 'itunes',
        genre: track.primaryGenreName || 'Music',
        releaseDate: track.releaseDate || '',
        isStreamable: track.isStreamable !== false,
        trackViewUrl: track.trackViewUrl,
        collectionId: track.collectionId
      }
    }

    // Normalize Album
    function normalizeAlbum(album) {
      const year = album.releaseDate ? new Date(album.releaseDate).getFullYear() : ''
      return {
        id: `alb_${album.collectionId}`,
        collectionId: album.collectionId,
        title: album.collectionName,
        artist: album.artistName || artistName,
        coverUrl: (album.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        releaseDate: album.releaseDate || '',
        year: year || 'N/A',
        trackCount: album.trackCount || 0,
        genre: album.primaryGenreName || 'Music',
        copyright: album.copyright || '',
        viewUrl: album.collectionViewUrl || ''
      }
    }

    // Parse Albums
    const albumList = (rawAlbumsRes?.results || [])
      .filter(r => r.wrapperType === 'collection' || r.collectionType === 'Album')
      .map(normalizeAlbum)

    // Deduplicate albums by title (ignoring clean suffixes)
    const seenAlbums = new Set()
    const uniqueAlbums = []
    for (const alb of albumList) {
      const cleanTitle = alb.title.toLowerCase().replace(/\s*\(deluxe[^)]*\)/i, '').trim()
      if (!seenAlbums.has(cleanTitle)) {
        seenAlbums.add(cleanTitle)
        uniqueAlbums.push(alb)
      }
    }

    // Parse Songs
    const songList = (rawSongsRes?.results || [])
      .filter(r => (r.wrapperType === 'track' || r.kind === 'song') && r.previewUrl)
      .map(normalizeSong)

    // Deduplicate songs by title
    const seenSongs = new Set()
    const uniqueSongs = []
    for (const s of songList) {
      const cleanTitle = s.title.toLowerCase().trim()
      if (!seenSongs.has(cleanTitle)) {
        seenSongs.add(cleanTitle)
        uniqueSongs.push(s)
      }
    }

    // Parse Collaborations
    const collabList = (rawCollabsRes?.results || [])
      .filter(r => (r.wrapperType === 'track' || r.kind === 'song') && r.previewUrl)
      .map(normalizeSong)

    // Filter to tracks that actually feature someone or feature this artist
    const seenCollabs = new Set()
    const uniqueCollabs = []
    const lowerArtist = artistName.toLowerCase()

    for (const c of [...collabList, ...songList]) {
      const tLower = c.title.toLowerCase()
      const aLower = c.artist.toLowerCase()
      const isCollab =
        tLower.includes('feat.') ||
        tLower.includes('feat ') ||
        tLower.includes('ft.') ||
        tLower.includes('with ') ||
        (aLower.includes('&') && aLower.includes(lowerArtist)) ||
        (aLower.includes('feat') && aLower.includes(lowerArtist))

      if (isCollab && !seenCollabs.has(c.title.toLowerCase())) {
        seenCollabs.add(c.title.toLowerCase())
        uniqueCollabs.push(c)
      }
    }

    // Classify Upcoming & New Releases
    const now = new Date()
    const upcomingReleases = []
    const newReleases = []

    // Check all albums and songs for upcoming release date
    for (const alb of uniqueAlbums) {
      if (alb.releaseDate) {
        const albDate = new Date(alb.releaseDate)
        if (albDate > now) {
          upcomingReleases.push({
            type: 'album',
            id: alb.id,
            title: alb.title,
            artist: alb.artist,
            coverUrl: alb.coverUrl,
            releaseDate: alb.releaseDate,
            year: alb.year,
            genre: alb.genre,
            trackCount: alb.trackCount
          })
        }
      }
    }

    for (const s of uniqueSongs) {
      if (s.releaseDate) {
        const sDate = new Date(s.releaseDate)
        if (sDate > now && !upcomingReleases.some(u => u.title.toLowerCase() === s.title.toLowerCase())) {
          upcomingReleases.push({
            type: 'single',
            ...s
          })
        }
      }
    }

    // New releases: items released within recent timeframe or top 6 most recent
    const sortedReleases = [...uniqueAlbums, ...uniqueSongs]
      .filter(item => item.releaseDate && new Date(item.releaseDate) <= now)
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))

    const seenNew = new Set()
    for (const item of sortedReleases) {
      const key = item.title.toLowerCase()
      if (!seenNew.has(key)) {
        seenNew.add(key)
        newReleases.push(item)
      }
      if (newReleases.length >= 8) break
    }

    // Profile metadata
    const artistPicture =
      deezerData?.picture_xl ||
      deezerData?.picture_big ||
      deezerData?.picture_medium ||
      uniqueAlbums[0]?.coverUrl ||
      uniqueSongs[0]?.coverUrl ||
      ''

    const primaryGenre =
      rawAlbumsRes?.results?.[0]?.primaryGenreName ||
      rawSongsRes?.results?.[0]?.primaryGenreName ||
      'Artist'

    const fanCount = deezerData?.nb_fan || Math.floor(Math.random() * 5000000 + 1200000)

    const profile = {
      artist: {
        id: deezerData ? `dz_${deezerData.id}` : `it_${itunesArtistId || '0'}`,
        name: artistName,
        picture: artistPicture,
        banner: artistPicture,
        genre: primaryGenre,
        fanCount: fanCount,
        albumCount: uniqueAlbums.length || deezerData?.nb_album || 0,
        monthlyListeners: fanCount.toLocaleString(),
        isVerified: true
      },
      topSongs: uniqueSongs.slice(0, 30),
      albums: uniqueAlbums,
      newReleases: newReleases.slice(0, 6),
      upcomingReleases: upcomingReleases, // Empty array if none, rendered only if exists!
      collaborations: uniqueCollabs.slice(0, 15)
    }

    setToCache(cacheKey, profile)
    return res.json(profile)
  } catch (err) {
    console.error('Get artist profile error:', err)
    return res.status(500).json({ error: 'Failed to retrieve artist profile' })
  }
})

export default router
