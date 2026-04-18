// SoundWave Service Worker
const CACHE_NAME = 'soundwave-v1'
const STATIC_CACHE = 'soundwave-static-v1'
const DYNAMIC_CACHE = 'soundwave-dynamic-v1'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html'
]

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...')
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip external APIs (but cache music files)
  if (url.origin !== location.origin && !isMusicFile(url)) {
    return
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request)
          .then(response => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response
            const responseToCache = response.clone()

            // Cache dynamic content
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache)
              })

            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/offline.html')
            }
          })
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync:', event.tag)
  
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites())
  }
  
  if (event.tag === 'sync-playback') {
    event.waitUntil(syncPlaybackHistory())
  }
})

// Push notifications
self.addEventListener('push', event => {
  console.log('Push received:', event)
  
  const options = {
    body: event.data ? event.data.text() : 'New music recommendations available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/icons/explore-action.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close-action.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification('SoundWave', options)
  )
})

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('Notification click:', event)
  
  event.notification.close()
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Media session (for media controls in notification/lock screen)
self.addEventListener('message', event => {
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

// Helper functions
function isMusicFile(url) {
  const musicExtensions = ['.mp3', '.ogg', '.wav', '.m4a', '.aac']
  return musicExtensions.some(ext => url.pathname.includes(ext))
}

async function syncFavorites() {
  try {
    const pendingFavorites = await getStoredData('pendingFavorites')
    if (pendingFavorites && pendingFavorites.length > 0) {
      // Sync with server
      console.log('Syncing favorites:', pendingFavorites)
      // Implementation would go here
      await clearStoredData('pendingFavorites')
    }
  } catch (error) {
    console.error('Error syncing favorites:', error)
  }
}

async function syncPlaybackHistory() {
  try {
    const pendingHistory = await getStoredData('pendingPlaybackHistory')
    if (pendingHistory && pendingHistory.length > 0) {
      // Sync with server
      console.log('Syncing playback history:', pendingHistory)
      // Implementation would go here
      await clearStoredData('pendingPlaybackHistory')
    }
  } catch (error) {
    console.error('Error syncing playback history:', error)
  }
}

async function getStoredData(key) {
  return new Promise((resolve) => {
    // Simple implementation - in real app would use IndexedDB
    resolve(JSON.parse(localStorage.getItem(key) || '[]'))
  })
}

async function clearStoredData(key) {
  localStorage.removeItem(key)
}