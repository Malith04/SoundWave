// SoundWave Browser Client-Side Cache Helper (with TTL & Stale-While-Revalidate)

const PREFIX = 'sw_cache_'

export const browserCache = {
  /**
   * Get cached data by key
   * @param {string} key 
   * @param {boolean} allowStale - return stale data while revalidating in background
   */
  get(key, allowStale = false) {
    try {
      const raw = localStorage.getItem(`${PREFIX}${key}`)
      if (!raw) return null
      const item = JSON.parse(raw)
      const now = Date.now()

      if (now <= item.expiresAt) {
        return item.data
      }

      if (allowStale && item.staleUntil && now <= item.staleUntil) {
        return item.data
      }

      // Expired
      localStorage.removeItem(`${PREFIX}${key}`)
      return null
    } catch {
      return null
    }
  },

  /**
   * Set cached data with TTL in minutes
   * @param {string} key 
   * @param {any} data 
   * @param {number} ttlMinutes (default: 15 minutes)
   */
  set(key, data, ttlMinutes = 15) {
    try {
      const now = Date.now()
      const expiresAt = now + ttlMinutes * 60 * 1000
      const staleUntil = expiresAt + ttlMinutes * 60 * 1000 // 1x extra duration as stale window

      const item = {
        data,
        cachedAt: now,
        expiresAt,
        staleUntil
      }
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(item))
    } catch (e) {
      // If localStorage is full, purge old cache keys
      this.purgeExpired()
    }
  },

  /**
   * Delete specific key from cache
   */
  del(key) {
    try {
      localStorage.removeItem(`${PREFIX}${key}`)
    } catch (_) {}
  },

  /**
   * Clear all cache keys prefixed with sw_cache_
   */
  clear() {
    try {
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        if (k.startsWith(PREFIX)) {
          localStorage.removeItem(k)
        }
      }
    } catch (_) {}
  },

  /**
   * Purge expired items to free up browser storage
   */
  purgeExpired() {
    try {
      const now = Date.now()
      const keys = Object.keys(localStorage)
      for (const k of keys) {
        if (k.startsWith(PREFIX)) {
          try {
            const item = JSON.parse(localStorage.getItem(k))
            if (item.staleUntil && now > item.staleUntil) {
              localStorage.removeItem(k)
            }
          } catch {
            localStorage.removeItem(k)
          }
        }
      }
    } catch (_) {}
  }
}

export default browserCache
