import Redis from 'ioredis'
import crypto from 'crypto'

// High-speed In-Memory Cache with TTL fallback for when Redis is offline or not configured
class InMemoryCache {
  constructor() {
    this.store = new Map()
    this.ttls = new Map()
    // Periodic sweep every 60 seconds
    setInterval(() => this.sweep(), 60000).unref()
  }

  sweep() {
    const now = Date.now()
    for (const [key, expireTime] of this.ttls.entries()) {
      if (expireTime <= now) {
        this.store.delete(key)
        this.ttls.delete(key)
      }
    }
  }

  async get(key) {
    const expireTime = this.ttls.get(key)
    if (expireTime && expireTime <= Date.now()) {
      this.store.delete(key)
      this.ttls.delete(key)
      return null
    }
    const val = this.store.get(key)
    return val !== undefined ? val : null
  }

  async set(key, value, ...args) {
    let ttlSeconds = null
    if (args.length >= 2 && String(args[0]).toUpperCase() === 'EX') {
      ttlSeconds = Number(args[1])
    } else if (args.length === 1 && typeof args[0] === 'number') {
      ttlSeconds = args[0]
    }

    this.store.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    if (ttlSeconds && ttlSeconds > 0) {
      this.ttls.set(key, Date.now() + ttlSeconds * 1000)
    } else {
      this.ttls.delete(key)
    }
    return 'OK'
  }

  async del(key) {
    this.store.delete(key)
    this.ttls.delete(key)
    return 1
  }

  async keys(pattern = '*') {
    const now = Date.now()
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    const matches = []
    for (const [key, expireTime] of this.ttls.entries()) {
      if (expireTime <= now) {
        this.store.delete(key)
        this.ttls.delete(key)
      }
    }
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matches.push(key)
      }
    }
    return matches
  }

  async ttl(key) {
    const expireTime = this.ttls.get(key)
    if (!expireTime) return -1
    const remaining = Math.round((expireTime - Date.now()) / 1000)
    return remaining > 0 ? remaining : -2
  }

  async flushall() {
    this.store.clear()
    this.ttls.clear()
    return 'OK'
  }
}

// ── Redis / Memory Engine Initialization ──
const REDIS_URL = process.env.REDIS_URL || null
const memoryFallback = new InMemoryCache()
let redisClient = null
let isRedisConnected = false

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 4000,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('⚠️ [Redis] Max reconnection attempts reached. Continuing with in-memory caching.')
          return null // Stop retrying and rely on memory fallback
        }
        return Math.min(times * 1000, 3000)
      }
    })

    redisClient.on('connect', () => {
      isRedisConnected = true
      console.log('✅ [Redis] Connected successfully to Redis Cache Server.')
    })

    redisClient.on('ready', () => {
      isRedisConnected = true
      console.log('⚡ [Redis] Ready to process session & API caching.')
    })

    redisClient.on('error', (err) => {
      isRedisConnected = false
      // Do not crash server on Redis network glitches
      if (process.env.NODE_ENV === 'development') {
        console.warn(`ℹ️ [Redis Notice] ${err.message}. Seamlessly serving cache via in-memory store.`)
      }
    })

    redisClient.on('close', () => {
      isRedisConnected = false
    })
  } catch (err) {
    console.warn('⚠️ [Redis] Initialization failed, using in-memory store:', err.message)
    isRedisConnected = false
  }
} else {
  console.log('ℹ️ [Cache] No REDIS_URL configured. Running ultra-fast In-Memory Session & Data Cache.')
}

// Unified client interface
export const cacheClient = {
  async get(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.get(key)
      } catch {
        return await memoryFallback.get(key)
      }
    }
    return await memoryFallback.get(key)
  },

  async set(key, value, ...args) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value)
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.set(key, serialized, ...args)
      } catch {
        return await memoryFallback.set(key, serialized, ...args)
      }
    }
    return await memoryFallback.set(key, serialized, ...args)
  },

  async del(key) {
    if (isRedisConnected && redisClient) {
      try {
        await redisClient.del(key)
      } catch {}
    }
    return await memoryFallback.del(key)
  },

  async delPattern(pattern) {
    try {
      if (isRedisConnected && redisClient) {
        const keys = await redisClient.keys(pattern)
        if (keys && keys.length > 0) {
          await redisClient.del(...keys)
        }
      }
    } catch {}
    const memKeys = await memoryFallback.keys(pattern)
    for (const k of memKeys) {
      await memoryFallback.del(k)
    }
  },

  async ttl(key) {
    if (isRedisConnected && redisClient) {
      try {
        return await redisClient.ttl(key)
      } catch {}
    }
    return await memoryFallback.ttl(key)
  },

  getStatus() {
    return {
      connected: isRedisConnected,
      engine: isRedisConnected ? 'Redis Cloud / Remote' : 'High-Performance In-Memory Store (Zero Latency)',
      redisUrlSet: !!REDIS_URL
    }
  }
}

// ── Session Management (7-Day Active / 14-Day Inactivity Window) ──
const FOURTEEN_DAYS_SECONDS = 14 * 24 * 60 * 60 // 1,209,600s
const INACTIVITY_LIMIT_MS = 14 * 24 * 60 * 60 * 1000 // 14 days in ms

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Stores active session data in Redis / Memory store
 */
export async function saveSession(token, user, ttlSeconds = FOURTEEN_DAYS_SECONDS) {
  const tokenHash = hashToken(token)
  const sessionKey = `sw_sess:${tokenHash}`
  const userSessionKey = `sw_user_active:${user.id}`

  const now = Date.now()
  const sessionData = {
    userId: user.id,
    email: user.email,
    isAdmin: !!user.is_admin,
    createdAt: now,
    lastActive: now,
    expiresAt: now + (7 * 24 * 60 * 60 * 1000) // 7-day token expiration
  }

  await cacheClient.set(sessionKey, sessionData, 'EX', ttlSeconds)
  await cacheClient.set(userSessionKey, { lastActive: now, email: user.email }, 'EX', ttlSeconds)
  return sessionData
}

/**
 * Retrieves and validates an active session
 * Enforces 14-day inactivity auto-signout
 */
export async function getSession(token) {
  const tokenHash = hashToken(token)
  const sessionKey = `sw_sess:${tokenHash}`

  const raw = await cacheClient.get(sessionKey)
  if (!raw) return null

  try {
    const session = typeof raw === 'string' ? JSON.parse(raw) : raw
    const now = Date.now()

    // 14-day inactivity check
    if (session.lastActive && (now - session.lastActive > INACTIVITY_LIMIT_MS)) {
      console.log(`[Session] User ${session.email} inactive for > 14 days. Terminating session.`)
      await destroySession(token)
      return null
    }

    return session
  } catch (err) {
    return null
  }
}

// Throttle activity updates so we don't bombard Redis/DB on every burst of requests
const lastTouchedMap = new Map()

/**
 * Updates session activity timestamp and slides the 14-day window
 */
export async function touchSession(token, userId) {
  const now = Date.now()
  const lastTouch = lastTouchedMap.get(userId) || 0

  // Update at most once every 60 seconds
  if (now - lastTouch < 60 * 1000) {
    return
  }
  lastTouchedMap.set(userId, now)

  const tokenHash = hashToken(token)
  const sessionKey = `sw_sess:${tokenHash}`
  const userSessionKey = `sw_user_active:${userId}`

  const raw = await cacheClient.get(sessionKey)
  if (raw) {
    try {
      const session = typeof raw === 'string' ? JSON.parse(raw) : raw
      session.lastActive = now
      await cacheClient.set(sessionKey, session, 'EX', FOURTEEN_DAYS_SECONDS)
    } catch {}
  }

  await cacheClient.set(userSessionKey, { lastActive: now }, 'EX', FOURTEEN_DAYS_SECONDS)
}

/**
 * Destroys session from cache
 */
export async function destroySession(token) {
  const tokenHash = hashToken(token)
  const sessionKey = `sw_sess:${tokenHash}`
  await cacheClient.del(sessionKey)
}

export default cacheClient
