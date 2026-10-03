import { Router } from 'express'

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
    })
  }

  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' audio')}`
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    let videoId = null
    if (response.ok) {
      const html = await response.text()
      const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/) || html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (match && match[1]) {
        videoId = match[1]
      }
    }

    if (videoId) {
      const result = {
        videoId,
        title: query,
      }
      searchCache.set(cacheKey, { ...result, timestamp: Date.now() })
      if (searchCache.size > 2000) {
        searchCache.delete(searchCache.keys().next().value)
      }
      return res.json({
        success: true,
        source: 'youtube-web',
        ...result
      })
    }

    return res.json({ success: false, videoId: null, message: 'No video found' })
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
