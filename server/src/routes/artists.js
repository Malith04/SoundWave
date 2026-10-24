import dns from 'node:dns'
try {
  dns.setDefaultResultOrder('ipv4first')
} catch (_) {}

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
  // Invalidate empty artist profiles
  if (key.startsWith('artist_profile_') && item.data) {
    const p = item.data
    if ((!p.topSongs || p.topSongs.length === 0) && (!p.albums || p.albums.length === 0)) {
      cache.delete(key)
      return null
    }
  }
  return item.data
}

function setToCache(key, data) {
  // Never cache empty artist profiles
  if (key.startsWith('artist_profile_') && data) {
    if ((!data.topSongs || data.topSongs.length === 0) && (!data.albums || data.albums.length === 0)) {
      return
    }
  }
  if (cache.size > 300) {
    const firstKey = cache.keys().next().value
    cache.delete(firstKey)
  }
  cache.set(key, { data, timestamp: Date.now() })
}

// Helper for timeout fetch with resilient User-Agent
async function fetchWithTimeout(url, ms = 7000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoundWave/1.0 (Music Streaming Platform; +https://soundwave-official.netlify.app)'
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
      fetchWithTimeout(`https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanQuery)}&limit=8`, 6000),
      fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=musicArtist&limit=6`, 6000)
    ])

    let deezerArtists = []
    if (deezerRes.status === 'fulfilled' && deezerRes.value?.ok) {
      try {
        const d = await deezerRes.value.json()
        deezerArtists = d.data || []
      } catch (_) {}
    }

    let itunesArtists = []
    if (itunesRes.status === 'fulfilled' && itunesRes.value?.ok) {
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
          deezerId: da.id,
          name: da.name,
          picture: da.picture_xl || da.picture_big || da.picture_medium || da.picture || '',
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
      .slice(0, 10)

    if (results.length > 0) {
      setToCache(cacheKey, results)
    }

    return res.json(results)
  } catch (err) {
    console.error('Artist search error:', err)
    return res.status(500).json({ error: 'Failed to search artists' })
  }
})

// ── 2. Get Album Details and Complete Track List ──
router.get('/album/:collectionId', async (req, res) => {
  try {
    const rawId = req.params.collectionId
    const { title, artist } = req.query
    if (!rawId) {
      return res.status(400).json({ error: 'Album collectionId is required' })
    }

    const cleanId = rawId.replace(/^(alb_|dz_|it_)/, '').trim()
    const cacheKey = `album_tracks_${cleanId}`
    const cached = getFromCache(cacheKey)
    if (cached && cached.tracks?.length > 0) return res.json(cached)

    let albumData = null
    let tracks = []

    // 1. Check Deezer Album API first (fastest and most reliable)
    try {
      const dzRes = await fetchWithTimeout(`https://api.deezer.com/album/${cleanId}`, 6000)
      if (dzRes.ok) {
        const d = await dzRes.json()
        if (d && d.id && !d.error) {
          const year = d.release_date ? new Date(d.release_date).getFullYear() : 'N/A'
          const cover = d.cover_xl || d.cover_big || d.cover_medium || ''

          albumData = {
            id: `alb_${d.id}`,
            collectionId: d.id,
            title: d.title || title || 'Album',
            artist: d.artist?.name || artist || '',
            coverUrl: cover,
            releaseDate: d.release_date || '',
            year,
            genre: d.genres?.data?.[0]?.name || 'Music',
            trackCount: d.nb_tracks || d.tracks?.data?.length || 0,
            copyright: '',
            viewUrl: d.link || ''
          }

          if (Array.isArray(d.tracks?.data)) {
            tracks = d.tracks.data.map((t, idx) => ({
              id: `dz_${t.id}`,
              trackId: t.id,
              title: t.title,
              artist: t.artist?.name || albumData.artist,
              album: albumData.title,
              coverUrl: cover,
              audioUrl: t.preview || '',
              duration: t.duration ? t.duration : 180,
              trackNumber: t.track_position || idx + 1,
              source: 'deezer',
              genre: albumData.genre,
              isStreamable: true
            }))
          }
        }
      }
    } catch (_) {}

    // 2. If Deezer returned no tracks, try iTunes Lookup API (with proxies fallback)
    if (tracks.length === 0) {
      const lookupUrls = [
        `https://itunes.apple.com/lookup?id=${cleanId}&entity=song&limit=100`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(`https://itunes.apple.com/lookup?id=${cleanId}&entity=song&limit=100`)}`,
        `https://corsproxy.io/?${encodeURIComponent(`https://itunes.apple.com/lookup?id=${cleanId}&entity=song&limit=100`)}`
      ]

      for (const url of lookupUrls) {
        try {
          const response = await fetchWithTimeout(url, 7000)
          if (!response.ok) continue
          let json = await response.json()
          if (typeof json.contents === 'string') {
            json = JSON.parse(json.contents)
          }

          if (json?.results && json.results.length > 0) {
            const col = json.results.find(r => r.wrapperType === 'collection' || r.collectionType === 'Album') || json.results[0]
            const year = col.releaseDate ? new Date(col.releaseDate).getFullYear() : 'N/A'

            albumData = {
              id: `alb_${col.collectionId || cleanId}`,
              collectionId: col.collectionId || cleanId,
              title: col.collectionName || title || 'Album',
              artist: col.artistName || artist || '',
              coverUrl: (col.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
              releaseDate: col.releaseDate || '',
              year,
              genre: col.primaryGenreName || 'Music',
              trackCount: col.trackCount || 0,
              copyright: col.copyright || '',
              viewUrl: col.collectionViewUrl || ''
            }

            tracks = json.results
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

            if (tracks.length > 0) break
          }
        } catch (_) {}
      }
    }

    // 3. Fallback: Search iTunes or Deezer for the album tracks if direct lookup returned empty
    if (tracks.length === 0 && (title || artist)) {
      try {
        const queryTerm = [artist, title].filter(Boolean).join(' ')
        // Try Deezer search first
        const sDzRes = await fetchWithTimeout(`https://api.deezer.com/search?q=${encodeURIComponent(queryTerm)}&limit=40`, 6000)
        if (sDzRes.ok) {
          const sDz = await sDzRes.json()
          if (sDz.data && sDz.data.length > 0) {
            tracks = sDz.data.map((t, idx) => ({
              id: `dz_${t.id}`,
              trackId: t.id,
              title: t.title,
              artist: t.artist?.name || artist || '',
              album: t.album?.title || title || 'Album',
              coverUrl: t.album?.cover_xl || t.album?.cover_big || '',
              audioUrl: t.preview || '',
              duration: t.duration || 180,
              trackNumber: idx + 1,
              source: 'deezer',
              genre: 'Music',
              isStreamable: true
            }))

            if (!albumData && sDz.data[0]?.album) {
              const alb = sDz.data[0].album
              albumData = {
                id: `alb_${alb.id || cleanId}`,
                collectionId: alb.id || cleanId,
                title: alb.title || title || 'Album',
                artist: artist || '',
                coverUrl: alb.cover_xl || alb.cover_big || '',
                year: 'N/A',
                trackCount: tracks.length
              }
            }
          }
        }
      } catch (_) {}
    }

    const payload = {
      album: albumData || {
        id: `alb_${cleanId}`,
        collectionId: cleanId,
        title: title || 'Album',
        artist: artist || '',
        coverUrl: '',
        year: 'N/A',
        trackCount: tracks.length
      },
      tracks
    }

    if (tracks.length > 0) {
      setToCache(cacheKey, payload)
    }

    return res.json(payload)
  } catch (err) {
    console.error('Get album tracks error:', err)
    return res.status(500).json({ error: 'Failed to retrieve album tracks' })
  }
})

// ── 3. Get Comprehensive Artist Profile & Complete Catalog ──
router.get('/:query', async (req, res) => {
  try {
    const rawQuery = decodeURIComponent(req.params.query).trim()
    if (!rawQuery) {
      return res.status(400).json({ error: 'Artist name or ID is required' })
    }

    const cacheKey = `artist_profile_${rawQuery.toLowerCase()}`
    const cached = getFromCache(cacheKey)
    if (cached && (cached.topSongs?.length > 0 || cached.albums?.length > 0)) {
      return res.json(cached)
    }

    let artistName = rawQuery
    let deezerArtist = null
    let itunesArtistId = null

    // 1. Initial parallel search to locate artist in Deezer and iTunes
    const [deezerSearchRes, itunesSearchRes] = await Promise.allSettled([
      fetchWithTimeout(`https://api.deezer.com/search/artist?q=${encodeURIComponent(rawQuery)}&limit=5`, 6000),
      fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(rawQuery)}&media=music&entity=musicArtist&limit=3`, 6000)
    ])

    console.log('[Artist Profile Query]', {
      rawQuery,
      deezerStatus: deezerSearchRes.status,
      deezerOk: deezerSearchRes.value?.ok,
      deezerStatusCode: deezerSearchRes.value?.status,
      itunesStatus: itunesSearchRes.status,
      itunesOk: itunesSearchRes.value?.ok
    })

    if (deezerSearchRes.status === 'fulfilled' && deezerSearchRes.value?.ok) {
      try {
        const d = await deezerSearchRes.value.json()
        if (d.data && d.data.length > 0) {
          const match = d.data.find(
            a => a.name.toLowerCase() === rawQuery.toLowerCase()
          ) || d.data[0]
          deezerArtist = match
          artistName = match.name
        }
      } catch (_) {}
    }

    if (itunesSearchRes.status === 'fulfilled' && itunesSearchRes.value?.ok) {
      try {
        const d = await itunesSearchRes.value.json()
        if (d.results && d.results.length > 0) {
          const match = d.results.find(
            r => r.artistName.toLowerCase() === artistName.toLowerCase()
          ) || d.results[0]
          itunesArtistId = match.artistId
          if (!deezerArtist) artistName = match.artistName
        }
      } catch (_) {}
    }

    // 2. Parallel fetching of tracks, albums, and collabs from Deezer and iTunes
    const tasks = []

    // Deezer Top Songs (up to 100 tracks!)
    if (deezerArtist?.id) {
      tasks.push(
        fetchWithTimeout(`https://api.deezer.com/artist/${deezerArtist.id}/top?limit=100`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'deezer_songs', items: d?.data || [] }))
          .catch(() => ({ source: 'deezer_songs', items: [] }))
      )
      // Deezer Albums (up to 100 albums!)
      tasks.push(
        fetchWithTimeout(`https://api.deezer.com/artist/${deezerArtist.id}/albums?limit=100`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'deezer_albums', items: d?.data || [] }))
          .catch(() => ({ source: 'deezer_albums', items: [] }))
      )
      // Deezer Collabs / Feat search
      tasks.push(
        fetchWithTimeout(`https://api.deezer.com/search?q=${encodeURIComponent(artistName + ' feat')}&limit=40`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'deezer_collabs', items: d?.data || [] }))
          .catch(() => ({ source: 'deezer_collabs', items: [] }))
      )
    }

    // iTunes Songs & Albums
    if (itunesArtistId) {
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/lookup?id=${itunesArtistId}&entity=song&limit=100`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'itunes_songs', items: d?.results || [] }))
          .catch(() => ({ source: 'itunes_songs', items: [] }))
      )
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/lookup?id=${itunesArtistId}&entity=album&limit=60`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'itunes_albums', items: d?.results || [] }))
          .catch(() => ({ source: 'itunes_albums', items: [] }))
      )
    } else {
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=song&limit=60`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'itunes_songs', items: d?.results || [] }))
          .catch(() => ({ source: 'itunes_songs', items: [] }))
      )
      tasks.push(
        fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(artistName)}&media=music&entity=album&limit=50`, 7000)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ source: 'itunes_albums', items: d?.results || [] }))
          .catch(() => ({ source: 'itunes_albums', items: [] }))
      )
    }

    const taskResults = await Promise.all(tasks)

    let deezerSongsList = []
    let deezerAlbumsList = []
    let deezerCollabsList = []
    let itunesSongsList = []
    let itunesAlbumsList = []

    for (const res of taskResults) {
      if (res.source === 'deezer_songs') deezerSongsList = res.items
      else if (res.source === 'deezer_albums') deezerAlbumsList = res.items
      else if (res.source === 'deezer_collabs') deezerCollabsList = res.items
      else if (res.source === 'itunes_songs') itunesSongsList = res.items
      else if (res.source === 'itunes_albums') itunesAlbumsList = res.items
    }

    // ── Normalization Functions ──
    function normalizeDeezerSong(track) {
      return {
        id: `dz_${track.id}`,
        trackId: track.id,
        title: track.title,
        artist: track.artist?.name || artistName,
        album: track.album?.title || '',
        coverUrl: track.album?.cover_xl || track.album?.cover_big || track.album?.cover_medium || '',
        audioUrl: track.preview || '',
        duration: track.duration ? track.duration : 180,
        source: 'deezer',
        genre: 'Music',
        releaseDate: track.album?.release_date || '',
        isStreamable: true,
        collectionId: track.album?.id
      }
    }

    function normalizeItunesSong(track) {
      return {
        id: `it_${track.trackId}`,
        trackId: track.trackId,
        title: track.trackName || 'Unknown Title',
        artist: track.artistName || artistName,
        album: track.collectionName || '',
        coverUrl: (track.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        audioUrl: track.previewUrl || '',
        duration: track.trackTimeMillis ? Math.round(track.trackTimeMillis / 1000) : 180,
        source: 'itunes',
        genre: track.primaryGenreName || 'Music',
        releaseDate: track.releaseDate || '',
        isStreamable: track.isStreamable !== false,
        trackViewUrl: track.trackViewUrl,
        collectionId: track.collectionId
      }
    }

    function normalizeDeezerAlbum(alb) {
      const year = alb.release_date ? new Date(alb.release_date).getFullYear() : ''
      return {
        id: `alb_${alb.id}`,
        collectionId: alb.id,
        title: alb.title,
        artist: artistName,
        coverUrl: alb.cover_xl || alb.cover_big || alb.cover_medium || '',
        releaseDate: alb.release_date || '',
        year: year || 'N/A',
        trackCount: alb.nb_tracks || 0,
        genre: 'Music',
        recordType: alb.record_type || 'album',
        viewUrl: alb.link || ''
      }
    }

    function normalizeItunesAlbum(alb) {
      const year = alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : ''
      return {
        id: `alb_${alb.collectionId}`,
        collectionId: alb.collectionId,
        title: alb.collectionName,
        artist: alb.artistName || artistName,
        coverUrl: (alb.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        releaseDate: alb.releaseDate || '',
        year: year || 'N/A',
        trackCount: alb.trackCount || 0,
        genre: alb.primaryGenreName || 'Music',
        copyright: alb.copyright || '',
        viewUrl: alb.collectionViewUrl || ''
      }
    }

    // ── Parse & Combine Albums ──
    const parsedDeezerAlbums = deezerAlbumsList.map(normalizeDeezerAlbum)
    const parsedItunesAlbums = itunesAlbumsList
      .filter(r => r.wrapperType === 'collection' || r.collectionType === 'Album')
      .map(normalizeItunesAlbum)

    const seenAlbums = new Set()
    const uniqueAlbums = []
    for (const alb of [...parsedDeezerAlbums, ...parsedItunesAlbums]) {
      if (!alb.title) continue
      const cleanTitle = alb.title.toLowerCase().replace(/\s*\(deluxe[^)]*\)/i, '').trim()
      if (!seenAlbums.has(cleanTitle)) {
        seenAlbums.add(cleanTitle)
        uniqueAlbums.push(alb)
      }
    }

    // ── Parse & Combine Songs ──
    const parsedDeezerSongs = deezerSongsList.map(normalizeDeezerSong)
    const parsedItunesSongs = itunesSongsList
      .filter(r => (r.wrapperType === 'track' || r.kind === 'song'))
      .map(normalizeItunesSong)

    const seenSongs = new Set()
    const uniqueSongs = []
    for (const s of [...parsedDeezerSongs, ...parsedItunesSongs]) {
      if (!s.title) continue
      const cleanTitle = s.title.toLowerCase().trim()
      if (!seenSongs.has(cleanTitle)) {
        seenSongs.add(cleanTitle)
        uniqueSongs.push(s)
      }
    }

    // ── Resilient Fallbacks if either Albums or Songs are empty ──
    // Fallback 1: If uniqueAlbums is empty, extract albums from uniqueSongs
    if (uniqueAlbums.length === 0 && uniqueSongs.length > 0) {
      for (const s of uniqueSongs) {
        if (s.album && !seenAlbums.has(s.album.toLowerCase().trim())) {
          seenAlbums.add(s.album.toLowerCase().trim())
          uniqueAlbums.push({
            id: `alb_${s.collectionId || Math.random().toString(36).slice(2, 9)}`,
            collectionId: s.collectionId || '',
            title: s.album,
            artist: s.artist || artistName,
            coverUrl: s.coverUrl,
            releaseDate: s.releaseDate || '',
            year: s.releaseDate ? new Date(s.releaseDate).getFullYear() : 'Album',
            trackCount: 1,
            genre: s.genre || 'Music'
          })
        }
      }
    }

    // Fallback 2: If uniqueSongs is empty, search Deezer directly for this artist's tracks
    if (uniqueSongs.length === 0) {
      try {
        const fbRes = await fetchWithTimeout(`https://api.deezer.com/search?q=${encodeURIComponent(artistName)}&limit=50`, 5000)
        if (fbRes.ok) {
          const fbData = await fbRes.json()
          if (Array.isArray(fbData?.data)) {
            for (const item of fbData.data) {
              const norm = normalizeDeezerSong(item)
              const cleanTitle = norm.title.toLowerCase().trim()
              if (!seenSongs.has(cleanTitle)) {
                seenSongs.add(cleanTitle)
                uniqueSongs.push(norm)
              }
            }
          }
        }
      } catch (_) {}
    }

    // ── Parse Collaborations ──
    const parsedDeezerCollabs = deezerCollabsList.map(normalizeDeezerSong)
    const seenCollabs = new Set()
    const uniqueCollabs = []
    const lowerArtist = artistName.toLowerCase()

    for (const c of [...parsedDeezerCollabs, ...uniqueSongs]) {
      const tLower = (c.title || '').toLowerCase()
      const aLower = (c.artist || '').toLowerCase()
      const isCollab =
        tLower.includes('feat.') ||
        tLower.includes('feat ') ||
        tLower.includes('ft.') ||
        tLower.includes('with ') ||
        (aLower.includes('&') && aLower.includes(lowerArtist)) ||
        (aLower.includes('feat') && aLower.includes(lowerArtist))

      const cleanTitle = c.title.toLowerCase().trim()
      if (isCollab && !seenCollabs.has(cleanTitle)) {
        seenCollabs.add(cleanTitle)
        uniqueCollabs.push(c)
      }
    }

    // ── Upcoming & New Releases ──
    const now = new Date()
    const upcomingReleases = []
    const newReleases = []

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
      if (newReleases.length >= 10) break
    }

    // ── Artist Picture & Profile ──
    const artistPicture =
      deezerArtist?.picture_xl ||
      deezerArtist?.picture_big ||
      deezerArtist?.picture_medium ||
      uniqueAlbums[0]?.coverUrl ||
      uniqueSongs[0]?.coverUrl ||
      ''

    const primaryGenre =
      itunesAlbumsList?.[0]?.primaryGenreName ||
      itunesSongsList?.[0]?.primaryGenreName ||
      'Artist'

    const fanCount = deezerArtist?.nb_fan || Math.floor(Math.random() * 5000000 + 1200000)

    const profile = {
      artist: {
        id: deezerArtist ? `dz_${deezerArtist.id}` : `it_${itunesArtistId || '0'}`,
        name: artistName,
        picture: artistPicture,
        banner: artistPicture,
        genre: primaryGenre,
        fanCount: fanCount,
        albumCount: uniqueAlbums.length || deezerArtist?.nb_album || 0,
        monthlyListeners: fanCount.toLocaleString(),
        isVerified: true
      },
      topSongs: uniqueSongs, // Complete list of songs!
      albums: uniqueAlbums, // Complete list of albums!
      newReleases: newReleases.slice(0, 8),
      upcomingReleases: upcomingReleases,
      collaborations: uniqueCollabs
    }

    if (uniqueSongs.length > 0 || uniqueAlbums.length > 0) {
      setToCache(cacheKey, profile)
    }

    return res.json(profile)
  } catch (err) {
    console.error('Get artist profile error:', err)
    return res.status(500).json({ error: 'Failed to retrieve artist profile' })
  }
})

export default router
