import { Router } from 'express'
import ytSearch from 'yt-search'

const router = Router()

// In-memory cache for search results (24h TTL)
const searchCache = new Map()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

router.get('/search', async (req, res) => {
  const query = (req.query.q || '').trim()
  if (!query) {
    return res.status(400).json({ error: 'Search query parameter "q" is required' })
  }

  const cacheKey = query.toLowerCase()
  const cached = searchCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return res.json({
      success: true,
      source: 'cache',
      videoId: cached.videoId,
      title: cached.title,
      duration: cached.duration,
      thumbnail: cached.thumbnail,
    })
  }

  try {
    const searchFn = typeof ytSearch === 'function' ? ytSearch : (ytSearch.search || ytSearch.default)
    const r = await searchFn(query)
    const videos = r?.videos || []

    if (!videos.length) {
      return res.json({ success: false, videoId: null, message: 'No video found' })
    }

    // Pick best match: prefer videos under 10 minutes (music tracks, not 1-hour loops or full albums)
    const best = videos.find(v => v.seconds > 30 && v.seconds < 600) || videos[0]

    const result = {
      videoId: best.videoId,
      title: best.title,
      duration: best.seconds,
      thumbnail: best.thumbnail,
    }

    // Cache the result
    searchCache.set(cacheKey, {
      ...result,
      timestamp: Date.now()
    })

    // Limit cache size to prevent memory bloat
    if (searchCache.size > 2000) {
      const oldestKey = searchCache.keys().next().value
      searchCache.delete(oldestKey)
    }

    return res.json({
      success: true,
      source: 'youtube',
      ...result
    })
  } catch (err) {
    console.error('Backend YouTube search error:', err.message)
    return res.status(500).json({
      success: false,
      videoId: null,
      error: err.message
    })
  }
})

export default router
