// SoundWave Service Worker - Enhanced for Offline Music
const CACHE_NAME = 'soundwave-v2'
const STATIC_CACHE = 'soundwave-static-v2'
const DYNAMIC_CACHE = 'soundwave-dynamic-v2'
const MUSIC_CACHE = 'soundwave-music-v2'
const API_CACHE = 'soundwave-api-v2'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
]

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...')
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('📦 Caching static files')
        return cache.addAll(STATIC_FILES).catch(err => {
          console.warn('⚠️ Some static files failed to cache:', err)
        })
      }),
      // Pre-cache some sample music for offline demo
      caches.open(MUSIC_CACHE).then(cache => {
        console.log('🎵 Pre-caching sample music')
        const sampleMusic = [
          'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
        ]
        return Promise.allSettled(
          sampleMusic.map(url => 
            fetch(url).then(response => {
              if (response.ok) return cache.put(url, response)
            }).catch(() => {})
          )
        )
      })
    ]).then(() => {
      console.log('✅ Service Worker installation complete')
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker activating...')
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!cacheName.includes('soundwave-') || 
                !cacheName.includes('-v2')) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activation complete')
        return self.clients.claim()
      })
  )
})

// Fetch event - enhanced offline strategy
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Handle different types of requests
  if (isMusicFile(url)) {
    event.respondWith(handleMusicRequest(request))
  } else if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request))
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(request))
  } else {
    event.respondWith(handleNavigationRequest(request))
  }
})

// Handle music file requests with aggressive caching
async function handleMusicRequest(request) {
  const cache = await caches.open(MUSIC_CACHE)
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log('🎵 Serving music from cache:', request.url)
      return cachedResponse
    }

    // Fetch and cache
    console.log('🌐 Fetching music from network:', request.url)
    const response = await fetch(request)
    
    if (response.ok) {
      // Cache successful responses
      cache.put(request, response.clone())
      console.log('💾 Cached music file:', request.url)
    }
    
    return response
  } catch (error) {
    console.warn('❌ Music request failed:', error)
    
    // Return cached version if available
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline audio placeholder
    return new Response('', { 
      status: 404, 
      statusText: 'Music not available offline' 
    })
  }
}

// Handle API requests with cache-first strategy for music data
async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE)
  const url = new URL(request.url)
  
  try {
    // For music APIs, try cache first for offline support
    if (isMusicAPI(url)) {
      const cachedResponse = await cache.match(request)
      if (cachedResponse) {
        console.log('📡 Serving API data from cache:', request.url)
        
        // Try to update cache in background
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone())
          }
        }).catch(() => {})
        
        return cachedResponse
      }
    }

    // Fetch from network
    const response = await fetch(request)
    
    if (response.ok && isMusicAPI(url)) {
      // Cache successful music API responses
      cache.put(request, response.clone())
      console.log('💾 Cached API response:', request.url)
    }
    
    return response
  } catch (error) {
    console.warn('❌ API request failed:', error)
    
    // Try to serve from cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log('📡 Serving stale API data from cache:', request.url)
      return cachedResponse
    }
    
    // Return offline data for music APIs
    if (isMusicAPI(url)) {
      return new Response(JSON.stringify({
        results: getOfflineMusicData(),
        offline: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Handle static assets
async function handleStaticRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE)
  
  try {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  
  try {
    const response = await fetch(request)
    return response
  } catch (error) {
    // Return cached index.html for SPA routing
    const cachedResponse = await cache.match('/index.html')
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page
    return cache.match('/offline.html') || new Response('Offline', { status: 503 })
  }
}

// Helper functions
function isMusicFile(url) {
  const musicExtensions = ['.mp3', '.ogg', '.wav', '.m4a', '.aac', '.flac']
  return musicExtensions.some(ext => url.pathname.toLowerCase().includes(ext))
}

function isAPIRequest(url) {
  return url.hostname.includes('api.') || 
         url.hostname.includes('itunes.apple.com') ||
         url.hostname.includes('jamendo.com') ||
         url.pathname.includes('/api/')
}

function isMusicAPI(url) {
  return url.hostname.includes('itunes.apple.com') ||
         url.hostname.includes('jamendo.com') ||
         url.hostname.includes('allorigins.win') ||
         url.hostname.includes('corsproxy.io')
}

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)
}

// Offline music data for when APIs are unavailable
function getOfflineMusicData() {
  return [
    {
      id: 'offline_1',
      title: 'Offline Demo Track 1',
      artist: 'SoundWave',
      album: 'Offline Collection',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23333"/><text x="150" y="150" text-anchor="middle" fill="white" font-size="40">🎵</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 30000,
      source: 'offline',
      genre: 'Demo'
    },
    {
      id: 'offline_2',
      title: 'Offline Demo Track 2',
      artist: 'SoundWave',
      album: 'Offline Collection',
      coverUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23666"/><text x="150" y="150" text-anchor="middle" fill="white" font-size="40">🎶</text></svg>',
      audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
      duration: 30000,
      source: 'offline',
      genre: 'Demo'
    }
  ]
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag)
  
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites())
  }
  
  if (event.tag === 'sync-playback') {
    event.waitUntil(syncPlaybackHistory())
  }
})

// Enhanced media session support
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CACHE_MUSIC') {
    const { url, metadata } = event.data
    cacheMusic(url, metadata)
  }
  
  if (event.data && event.data.type === 'MEDIA_SESSION_UPDATE') {
    const { title, artist, artwork } = event.data
    
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        artwork: [
          { src: artwork, sizes: '96x96', type: 'image/png' },
          { src: artwork, sizes: '128x128', type: 'image/png' },
          { src: artwork, sizes: '192x192', type: 'image/png' },
          { src: artwork, sizes: '256x256', type: 'image/png' },
          { src: artwork, sizes: '384x384', type: 'image/png' },
          { src: artwork, sizes: '512x512', type: 'image/png' }
        ]
      })
    }
  }
})

// Cache music files proactively
async function cacheMusic(url, metadata) {
  try {
    const cache = await caches.open(MUSIC_CACHE)
    const response = await fetch(url)
    
    if (response.ok) {
      await cache.put(url, response)
      console.log('🎵 Cached music:', metadata?.title || url)
    }
  } catch (error) {
    console.warn('❌ Failed to cache music:', error)
  }
}

// Sync functions
async function syncFavorites() {
  try {
    const pendingFavorites = await getStoredData('pendingFavorites')
    if (pendingFavorites && pendingFavorites.length > 0) {
      console.log('🔄 Syncing favorites:', pendingFavorites)
      // Implementation would sync with Firebase when online
      await clearStoredData('pendingFavorites')
    }
  } catch (error) {
    console.error('❌ Error syncing favorites:', error)
  }
}

async function syncPlaybackHistory() {
  try {
    const pendingHistory = await getStoredData('pendingPlaybackHistory')
    if (pendingHistory && pendingHistory.length > 0) {
      console.log('🔄 Syncing playback history:', pendingHistory)
      // Implementation would sync with Firebase when online
      await clearStoredData('pendingPlaybackHistory')
    }
  } catch (error) {
    console.error('❌ Error syncing playback history:', error)
  }
}

async function getStoredData(key) {
  return new Promise((resolve) => {
    resolve(JSON.parse(localStorage.getItem(key) || '[]'))
  })
}

async function clearStoredData(key) {
  localStorage.removeItem(key)
}