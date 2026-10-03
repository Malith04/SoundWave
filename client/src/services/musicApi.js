import { BASE_URL } from './api'

// Test API connectivity - call from browser console: window.testAPIConnectivity()
window.testAPIConnectivity = async function() {
  console.log('🌐 Testing API connectivity...')
  
  // Test iTunes API
  try {
    console.log('🍎 Testing iTunes API...')
    const itunesResponse = await fetch('https://itunes.apple.com/search?term=test&media=music&entity=song&limit=1')
    console.log('🍎 iTunes API status:', itunesResponse.status, itunesResponse.ok ? '✅' : '❌')
    if (itunesResponse.ok) {
      const data = await itunesResponse.json()
      console.log('🍎 iTunes API response:', data.results?.length || 0, 'results')
    }
  } catch (error) {
    console.error('🍎 iTunes API failed:', error)
  }
  
  // Test Jamendo API
  try {
    console.log('🎵 Testing Jamendo API...')
    const jamendoResponse = await fetch(`https://api.jamendo.com/v3.0/tracks?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=1`)
    console.log('🎵 Jamendo API status:', jamendoResponse.status, jamendoResponse.ok ? '✅' : '❌')
    if (jamendoResponse.ok) {
      const data = await jamendoResponse.json()
      console.log('🎵 Jamendo API response:', data.results?.length || 0, 'results')
    }
  } catch (error) {
    console.error('🎵 Jamendo API failed:', error)
  }
  
  // Test basic network connectivity
  try {
    console.log('🌐 Testing basic network connectivity...')
    const response = await fetch('https://httpbin.org/get', { method: 'GET' })
    console.log('🌐 Network test:', response.ok ? '✅ Connected' : '❌ Failed')
  } catch (error) {
    console.error('🌐 Network test failed:', error)
  }
}

// Test function - call from browser console: window.testMusicAPI('rock')
window.testMusicAPI = async function(query = 'rock') {
  console.log('🧪 Testing Music API with query:', query)
  try {
    const result = await searchAll(query)
    console.log('🧪 Test result:', result)
    return result
  } catch (error) {
    console.error('🧪 Test failed:', error)
    return null
  }
}

// Test mood recommendations - call from browser console: window.testMoodRecommendations('happy')
window.testMoodRecommendations = async function(mood = 'happy') {
  console.log('🧪 Testing Mood Recommendations for:', mood)
  try {
    const { recommendationEngine } = await import('./recommendationService')
    const result = await recommendationEngine.getMoodRecommendations(mood, 10)
    console.log('🧪 Mood test result:', result)
    return result
  } catch (error) {
    console.error('🧪 Mood test failed:', error)
    return null
  }
}

// ─────────────────────────────────────────────────────────────
//  Music API — iTunes + Jamendo + YouTube
// ─────────────────────────────────────────────────────────────

const JAMENDO_CLIENT_ID = '2a9b4f1e'
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0'

// ── YouTube Caching & Hybrid Unlimited Search ──────────────────
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY || ''
const ytMemoryCache = new Map()

/**
 * Check if a YouTube videoId is already cached in memory or localStorage.
 * Returns videoId or null immediately (0ms).
 */
export function getCachedYouTubeId(songId, query) {
  if (songId) {
    const mem = ytMemoryCache.get(`id_${songId}`)
    if (mem) return mem
    try {
      const local = localStorage.getItem(`sw_yt_id_${songId}`)
      if (local) {
        ytMemoryCache.set(`id_${songId}`, local)
        return local
      }
    } catch (_) {}
  }
  if (query) {
    const key = query.toLowerCase().trim()
    const mem = ytMemoryCache.get(`q_${key}`)
    if (mem) return mem
    try {
      const local = localStorage.getItem(`sw_yt_q_${key}`)
      if (local) {
        ytMemoryCache.set(`q_${key}`, local)
        return local
      }
    } catch (_) {}
  }
  return null
}

/**
 * Persist a discovered YouTube videoId to memory and localStorage.
 */
export function setCachedYouTubeId(songId, query, videoId) {
  if (!videoId) return
  if (songId) {
    ytMemoryCache.set(`id_${songId}`, videoId)
    try { localStorage.setItem(`sw_yt_id_${songId}`, videoId) } catch (_) {}
  }
  if (query) {
    const key = query.toLowerCase().trim()
    ytMemoryCache.set(`q_${key}`, videoId)
    try { localStorage.setItem(`sw_yt_q_${key}`, videoId) } catch (_) {}
  }
}

// Test function - call from browser console: window.testYouTubeAPI('Blinding Lights The Weeknd')
window.testYouTubeAPI = async function(query) {
  console.log('Testing YouTube API with query:', query)
  const result = await searchYouTube(query)
  console.log('Result:', result)
  return result
}

/**
 * Multi-layer hybrid search:
 * 1. Instant Cache (0ms)
 * 2. Unlimited Node.js Backend Search (No daily quota limit)
 * 3. Fallback to Google YouTube Data API v3 (if key present)
 */
export async function searchYouTube(query, songId = null) {
  if (!query?.trim()) return null

  // Layer 1: Instant cache (0ms)
  const cached = getCachedYouTubeId(songId, query)
  if (cached) {
    console.log('⚡ YouTube Cache HIT (0ms):', cached)
    return cached
  }

  // Layer 2: Unlimited Backend Search (No quota limits)
  try {
    const res = await fetch(`${BASE_URL}/youtube/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Accept': 'application/json' }
    })
    if (res.ok) {
      const data = await res.json()
      if (data.success && data.videoId) {
        console.log(`🎬 YouTube Backend Search [${data.source}]:`, data.videoId, data.title)
        setCachedYouTubeId(songId, query, data.videoId)
        return data.videoId
      }
    }
  } catch (backendErr) {
    console.warn('Backend YouTube search endpoint unreachable, falling back:', backendErr.message)
  }

  // Layer 3: Fallback to Google YouTube Data API v3
  if (YT_API_KEY) {
    try {
      console.log('YouTube Google API fallback search:', query)
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(query + ' official audio')}&key=${YT_API_KEY}`
      const res = await fetchWithTimeout(searchUrl, 6000, { 'Referer': window.location.origin }, 1)
      if (res.ok) {
        const data = await res.json()
        const videoId = data.items?.[0]?.id?.videoId
        if (videoId) {
          console.log('YouTube Google API found video:', videoId)
          setCachedYouTubeId(songId, query, videoId)
          return videoId
        }
      }
    } catch (e) {
      console.warn('Google YouTube API fallback failed:', e.message)
    }
  }

  return null
}

// Fetch with timeout and retry
async function fetchWithTimeout(url, ms = 10000, extraHeaders = {}, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    
    try {
      console.log(`🌐 Fetch attempt ${attempt + 1}/${retries + 1}: ${url}`)
      const res = await fetch(url, { 
        signal: controller.signal, 
        headers: {
          'User-Agent': 'SoundWave/1.0',
          ...extraHeaders
        }
      })
      clearTimeout(timer)
      
      if (res.ok) {
        console.log(`✅ Fetch successful on attempt ${attempt + 1}`)
        return res
      } else {
        console.warn(`⚠️ HTTP ${res.status} on attempt ${attempt + 1}`)
        if (attempt === retries) return res // Return last response even if not ok
      }
    } catch (e) {
      clearTimeout(timer)
      console.warn(`❌ Fetch failed on attempt ${attempt + 1}:`, e.message)
      if (attempt === retries) throw e // Throw on final attempt
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
}

// ── iTunes with CORS proxy fallback ──────────────────────────

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
  const urls = [
    // Direct API (works on desktop)
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=US`,
    // CORS proxy fallbacks
    `https://api.allorigins.win/get?url=${encodeURIComponent(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=US`)}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=US`)}`
  ]

  for (let i = 0; i < urls.length; i++) {
    try {
      console.log(`🍎 iTunes search attempt ${i + 1}: "${query}" (limit: ${limit})`)
      const res = await fetchWithTimeout(urls[i], 8000)
      
      if (!res.ok) {
        console.warn(`🍎 iTunes API attempt ${i + 1} failed: ${res.status}`)
        continue
      }
      
      let data = await res.json()
      
      // Handle CORS proxy response format
      if (data.contents) {
        data = JSON.parse(data.contents)
      }
      
      const results = (data.results || []).filter(t => t.previewUrl).map(normalizeiTunes)
      console.log(`🍎 iTunes found ${results.length} songs for "${query}" on attempt ${i + 1}`)
      return results
    } catch (e) {
      console.warn(`🍎 iTunes search attempt ${i + 1} failed:`, e.message)
      if (i === urls.length - 1) {
        console.error('🍎 All iTunes search attempts failed')
        return []
      }
    }
  }
  
  return []
}

export async function getTopChart(limit = 20) {
  const urls = [
    // Direct API
    `https://itunes.apple.com/us/rss/topsongs/limit=${limit}/json`,
    // CORS proxy fallbacks
    `https://api.allorigins.win/get?url=${encodeURIComponent(`https://itunes.apple.com/us/rss/topsongs/limit=${limit}/json`)}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://itunes.apple.com/us/rss/topsongs/limit=${limit}/json`)}`
  ]

  for (let i = 0; i < urls.length; i++) {
    try {
      console.log(`🔥 Top chart attempt ${i + 1}`)
      const res = await fetchWithTimeout(urls[i], 8000)
      let data = await res.json()
      
      // Handle CORS proxy response format
      if (data.contents) {
        data = JSON.parse(data.contents)
      }
      
      const ids = (data?.feed?.entry || [])
        .map(e => e.id?.attributes?.['im:id'])
        .filter(Boolean).join(',')
      
      if (!ids) continue
      
      const lookupUrl = `https://itunes.apple.com/lookup?id=${ids}`
      const lookupUrls = [
        lookupUrl,
        `https://api.allorigins.win/get?url=${encodeURIComponent(lookupUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(lookupUrl)}`
      ]
      
      for (let j = 0; j < lookupUrls.length; j++) {
        try {
          const lookup = await fetchWithTimeout(lookupUrls[j], 8000)
          let ld = await lookup.json()
          
          if (ld.contents) {
            ld = JSON.parse(ld.contents)
          }
          
          const results = (ld.results || [])
            .filter(t => t.wrapperType === 'track' && t.previewUrl)
            .map(normalizeiTunes)
          
          if (results.length > 0) {
            console.log(`🔥 Top chart success on attempt ${i + 1}, lookup ${j + 1}`)
            return results
          }
        } catch (e) {
          console.warn(`🔥 Lookup attempt ${j + 1} failed:`, e.message)
        }
      }
    } catch (e) {
      console.warn(`🔥 Top chart attempt ${i + 1} failed:`, e.message)
    }
  }
  
  console.warn('🔥 All top chart attempts failed')
  return []
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
  
  const baseUrl = `${JAMENDO_BASE}/tracks?${q}`
  const urls = [
    // Direct API
    baseUrl,
    // CORS proxy fallbacks
    `https://api.allorigins.win/get?url=${encodeURIComponent(baseUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(baseUrl)}`
  ]
  
  for (let i = 0; i < urls.length; i++) {
    try {
      console.log(`🌐 Jamendo API attempt ${i + 1}: ${urls[i]}`)
      const res = await fetchWithTimeout(urls[i], 8000)
      
      if (!res.ok) {
        console.warn(`🌐 Jamendo attempt ${i + 1} failed: ${res.status}`)
        continue
      }
      
      let data = await res.json()
      
      // Handle CORS proxy response format
      if (data.contents) {
        data = JSON.parse(data.contents)
      }
      
      console.log(`🌐 Jamendo API attempt ${i + 1} response:`, {
        resultsCount: data.results?.length || 0,
        headers: data.headers || {}
      })
      
      return data
    } catch (e) {
      console.warn(`🌐 Jamendo attempt ${i + 1} failed:`, e.message)
      if (i === urls.length - 1) {
        throw e
      }
    }
  }
}

export async function searchJamendo(query, limit = 20) {
  try {
    console.log(`🎵 Jamendo search: "${query}" (limit: ${limit})`)
    const data = await jamendoFetch({ search: query, limit })
    const results = (data.results || []).map(normalizeJamendo)
    console.log(`🎵 Jamendo found ${results.length} songs for "${query}"`)
    return results
  } catch (e) {
    console.warn('❌ Jamendo search failed:', e.message)
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

// ── Combined search with better error handling ─────────────────

export async function searchAll(query) {
  console.log(`🔍 searchAll called with query: "${query}"`)
  
  // Check if we're in a network-restricted environment
  const isLocalNetwork = window.location.hostname.includes('192.168') || 
                         window.location.hostname.includes('10.') ||
                         window.location.hostname.includes('localhost')
  
  if (isLocalNetwork) {
    console.log('🏠 Detected local network access - APIs may be blocked by CORS')
  }
  
  const [itunesResult, jamendoResult] = await Promise.allSettled([
    searchiTunes(query, 20),
    searchJamendo(query, 15),
  ])
  
  const itunes  = itunesResult.status  === 'fulfilled' ? itunesResult.value  : []
  const jamendo = jamendoResult.status === 'fulfilled' ? jamendoResult.value : []
  
  console.log(`📊 searchAll results for "${query}":`, {
    itunes: itunes.length,
    jamendo: jamendo.length,
    itunesStatus: itunesResult.status,
    jamendoStatus: jamendoResult.status
  })
  
  if (itunesResult.status === 'rejected') {
    console.warn('❌ iTunes search failed:', itunesResult.reason)
  }
  
  if (jamendoResult.status === 'rejected') {
    console.warn('❌ Jamendo search failed:', jamendoResult.reason)
  }
  
  // If both APIs failed, provide offline music library
  if (itunes.length === 0 && jamendo.length === 0) {
    console.warn('🚨 All APIs failed - providing offline music library')
    const offlineMusic = getOfflineMusicLibrary()
    const filteredOffline = offlineMusic.filter(song => 
      song.title.toLowerCase().includes(query.toLowerCase()) ||
      song.artist.toLowerCase().includes(query.toLowerCase()) ||
      song.genre.toLowerCase().includes(query.toLowerCase())
    )
    
    if (filteredOffline.length > 0) {
      return { itunes: [], jamendo: filteredOffline, all: filteredOffline }
    }
    
    // If no matches in offline library, generate sample songs
    const sampleSongs = generateSampleSongs(query)
    return { itunes: [], jamendo: sampleSongs, all: sampleSongs }
  }
  
  const result = { itunes, jamendo, all: [...itunes, ...jamendo] }
  console.log(`✅ searchAll final result: ${result.all.length} total songs`)
  
  return result
}

// Generate sample songs for testing when APIs are unreachable
function generateSampleSongs(query) {
  const sampleTracks = [
    { title: 'Chill Vibes', artist: 'Lofi Artist', genre: 'Chill', cover: '🌊' },
    { title: 'Upbeat Energy', artist: 'Electronic Producer', genre: 'Electronic', cover: '⚡' },
    { title: 'Acoustic Dreams', artist: 'Indie Folk', genre: 'Folk', cover: '🎸' },
    { title: 'Jazz Nights', artist: 'Jazz Ensemble', genre: 'Jazz', cover: '🎷' },
    { title: 'Rock Anthem', artist: 'Rock Band', genre: 'Rock', cover: '🤘' },
    { title: 'Pop Sensation', artist: 'Pop Star', genre: 'Pop', cover: '🎤' },
    { title: 'Classical Beauty', artist: 'Orchestra', genre: 'Classical', cover: '🎻' },
    { title: 'Hip Hop Beats', artist: 'Rapper', genre: 'Hip-Hop', cover: '🎧' }
  ]
  
  return sampleTracks.map((track, index) => ({
    id: `offline_${index}_${Date.now()}`,
    title: `${track.title} (${query})`,
    artist: track.artist,
    album: 'Offline Demo Collection',
    coverUrl: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><rect width='300' height='300' fill='%23${Math.floor(Math.random()*16777215).toString(16)}'/><text x='150' y='150' text-anchor='middle' font-size='60' fill='white'>${track.cover}</text></svg>`,
    audioUrl: `https://www.soundjay.com/misc/sounds/bell-ringing-05.wav?track=${index}`, // Demo audio
    duration: 180000 + (index * 15000), // Varying durations
    source: 'offline',
    genre: track.genre,
    searchQuery: `${track.title} ${track.artist}`,
  }))
}

// Enhanced offline music library
function getOfflineMusicLibrary() {
  return [
    {
      id: 'offline_demo_1',
      title: 'Morning Coffee',
      artist: 'Chill Beats',
      album: 'Offline Vibes',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff6b6b"/><stop offset="100%" style="stop-color:%234ecdc4"/></linearGradient></defs><rect width="300" height="300" fill="url(%23g1)"/><text x="150" y="150" text-anchor="middle" font-size="40" fill="white">☕</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 210000,
      source: 'offline',
      genre: 'Chill'
    },
    {
      id: 'offline_demo_2',
      title: 'Sunset Drive',
      artist: 'Synthwave Collective',
      album: 'Offline Vibes',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff9a9e"/><stop offset="100%" style="stop-color:%23fecfef"/></linearGradient></defs><rect width="300" height="300" fill="url(%23g2)"/><text x="150" y="150" text-anchor="middle" font-size="40" fill="white">🌅</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 195000,
      source: 'offline',
      genre: 'Electronic'
    },
    {
      id: 'offline_demo_3',
      title: 'Acoustic Memories',
      artist: 'Folk Stories',
      album: 'Offline Vibes',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23a8edea"/><stop offset="100%" style="stop-color:%23fed6e3"/></linearGradient></defs><rect width="300" height="300" fill="url(%23g3)"/><text x="150" y="150" text-anchor="middle" font-size="40" fill="white">🎸</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 225000,
      source: 'offline',
      genre: 'Folk'
    },
    {
      id: 'offline_demo_4',
      title: 'Jazz in the Rain',
      artist: 'Smooth Jazz Trio',
      album: 'Offline Vibes',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea"/><stop offset="100%" style="stop-color:%23764ba2"/></linearGradient></defs><rect width="300" height="300" fill="url(%23g4)"/><text x="150" y="150" text-anchor="middle" font-size="40" fill="white">🎷</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 240000,
      source: 'offline',
      genre: 'Jazz'
    },
    {
      id: 'offline_demo_5',
      title: 'Digital Dreams',
      artist: 'Cyber Sounds',
      album: 'Offline Vibes',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23f093fb"/><stop offset="100%" style="stop-color:%23f5576c"/></linearGradient></defs><rect width="300" height="300" fill="url(%23g5)"/><text x="150" y="150" text-anchor="middle" font-size="40" fill="white">🤖</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 180000,
      source: 'offline',
      genre: 'Electronic'
    }
  ]
}
