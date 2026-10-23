import crypto from 'crypto'
import { cacheClient } from '../services/redis.js'

/**
 * Cache middleware for public GET endpoints (songs, playlists, artists)
 * Enables Redis server-side caching and browser HTTP caching (ETag / Cache-Control)
 * @param {number} ttlSeconds - Duration in seconds to cache the response (default: 300)
 */
export function cacheMiddleware(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next()
    }

    // Bypass cache if explicitly requested
    if (req.query._refresh === 'true' || req.query._nocache === 'true') {
      return next()
    }

    const cacheKey = `cache:http:${req.originalUrl || req.url}`

    try {
      const cached = await cacheClient.get(cacheKey)
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached
        const { etag, data, contentType } = parsed

        // Client cache validation (304 Not Modified)
        const clientEtag = req.headers['if-none-match']
        if (clientEtag && clientEtag === etag) {
          res.setHeader('ETag', etag)
          res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=600`)
          res.setHeader('X-Cache', 'HIT')
          return res.status(304).end()
        }

        res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8')
        res.setHeader('ETag', etag)
        res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=600`)
        res.setHeader('X-Cache', 'HIT')
        return res.status(200).send(typeof data === 'string' ? data : JSON.stringify(data))
      }
    } catch (err) {
      // Proceed without cache if read fails
    }

    // Wrap res.json to capture and cache response
    const originalJson = res.json.bind(res)
    res.json = (body) => {
      // Restore original for subsequent calls
      res.json = originalJson

      // Only cache successful 200 responses
      if (res.statusCode === 200 && body !== null && body !== undefined) {
        try {
          const stringified = JSON.stringify(body)
          const etag = `"${crypto.createHash('md5').update(stringified).digest('hex')}"`

          res.setHeader('ETag', etag)
          res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}, stale-while-revalidate=600`)
          res.setHeader('X-Cache', 'MISS')

          cacheClient.set(cacheKey, {
            etag,
            data: body,
            contentType: 'application/json; charset=utf-8'
          }, 'EX', ttlSeconds).catch(() => {})
        } catch {}
      }

      return originalJson(body)
    }

    next()
  }
}

/**
 * Invalidate cached routes matching a pattern
 */
export async function invalidateCache(pattern) {
  try {
    await cacheClient.delPattern(`cache:http:${pattern}*`)
  } catch {}
}
