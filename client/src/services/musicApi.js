// ─────────────────────────────────────────────────────────────
//  Music API — iTunes + Jamendo + YouTube
// ─────────────────────────────────────────────────────────────

const JAMENDO_CLIENT_ID = '2a9b4f1e'
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0'

// ── YouTube ───────────────────────────────────────────────────
// Get a free key at: https://console.cloud.google.com → YouTube Data API v3
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY || ''

export async function searchYouTube(query) {
  if (!YT_API_KEY) return null
  try {
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(query + ' official audio')}&key=${YT_API_KEY}`,
      10000,
      { 'Referer': window.location.origin }
    )
    const data = await res.json()
    if (data.error) { console.warn('YouTube API error:', data.error.message); return null }
    const item = data.items?.[0]
    return item?.id?.videoId || null
  } catch (e) {
    console.warn('YouTube search failed:', e.message)
    return null
  }
}

// Fetch with timeout
async function fetchWithTimeout(url, ms = 10000, extraHeaders = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal, headers: extraHeaders })
    clearTimeout(timer)
    return res
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

// ── iTunes ────────────────────────────────────────────────────

function normalizeiTunes(track) {
  return {
    id: `it_${track.trackId}`,
    title: track.trackName || 'Unknown',
    artist: track.artistName || 'Unknown Artist',
    album: track.collectionName || '',
    coverUrl: (track.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
    audioUrl: track.previewUrl || '',
    duration: track.trackTimeMillis || 30000,
    source: 'itunes',
    genre: track.primaryGenreName || '',
    searchQuery: `${track.trackName} ${track.artistName}`,
  }
}

export async function searchiTunes(query, limit = 25) {
  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=US`
    )
    const data = await res.json()
    return (data.results || []).filter(t => t.previewUrl).map(normalizeiTunes)
  } catch (e) {
    console.warn('iTunes search failed:', e.message)
    return []
  }
}

export async function getTopChart(limit = 20) {
  try {
    const res = await fetchWithTimeout(
      `https://itunes.apple.com/us/rss/topsongs/limit=${limit}/json`
    )
    const data = await res.json()
    const ids = (data?.feed?.entry || [])
      .map(e => e.id?.attributes?.['im:id'])
      .filter(Boolean).join(',')
    if (!ids) return []
    const lookup = await fetchWithTimeout(`https://itunes.apple.com/lookup?id=${ids}`)
    const ld = await lookup.json()
    return (ld.results || [])
      .filter(t => t.wrapperType === 'track' && t.previewUrl)
      .map(normalizeiTunes)
  } catch (e) {
    console.warn('iTunes chart failed:', e.message)
    return []
  }
}

export async function searchiTunesByGenre(genre, limit = 25) {
  return searchiTunes(genre, limit)
}

// ── Jamendo ───────────────────────────────────────────────────

function normalizeJamendo(track) {
  return {
    id: `jm_${track.id}`,
    title: track.name || 'Unknown',
    artist: track.artist_name || 'Unknown Artist',
    album: track.album_name || '',
    coverUrl: track.album_image || track.image || '',
    audioUrl: track.audio || '',
    duration: (track.duration || 0) * 1000,
    source: 'jamendo',
    genre: track.musicinfo?.tags?.genres?.[0] || '',
    searchQuery: `${track.name} ${track.artist_name}`,
  }
}

async function jamendoFetch(params = {}) {
  const q = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: 'json',
    audioformat: 'mp32',
    include: 'musicinfo',
    ...params,
  })
  const res = await fetchWithTimeout(`${JAMENDO_BASE}/tracks?${q}`)
  if (!res.ok) throw new Error(`Jamendo ${res.status}`)
  return res.json()
}

export async function searchJamendo(query, limit = 20) {
  try {
    const data = await jamendoFetch({ search: query, limit })
    return (data.results || []).map(normalizeJamendo)
  } catch (e) {
    console.warn('Jamendo search failed:', e.message)
    return []
  }
}

export async function getJamendoTrending(limit = 20) {
  try {
    const data = await jamendoFetch({ order: 'popularity_total', limit })
    return (data.results || []).map(normalizeJamendo)
  } catch (e) {
    console.warn('Jamendo trending failed:', e.message)
    return []
  }
}

export async function getJamendoByGenre(genre, limit = 20) {
  try {
    const data = await jamendoFetch({ tags: genre.toLowerCase(), order: 'popularity_total', limit })
    return (data.results || []).map(normalizeJamendo)
  } catch (e) {
    console.warn('Jamendo genre failed:', e.message)
    return []
  }
}

export async function getJamendoNew(limit = 20) {
  try {
    const data = await jamendoFetch({ order: 'releasedate_desc', limit })
    return (data.results || []).map(normalizeJamendo)
  } catch (e) {
    console.warn('Jamendo new failed:', e.message)
    return []
  }
}

// ── Combined search ───────────────────────────────────────────

export async function searchAll(query) {
  const [itunesResult, jamendoResult] = await Promise.allSettled([
    searchiTunes(query, 20),
    searchJamendo(query, 15),
  ])
  const itunes  = itunesResult.status  === 'fulfilled' ? itunesResult.value  : []
  const jamendo = jamendoResult.status === 'fulfilled' ? jamendoResult.value : []
  return { itunes, jamendo, all: [...itunes, ...jamendo] }
}
