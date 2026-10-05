import { Router } from 'express'
import { Innertube, ClientType } from 'youtubei.js'
import { Readable } from 'stream'

const router = Router()

// In-memory cache for search results (24h TTL)
const searchCache = new Map()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

// In-memory cache for streaming audio URLs (2h TTL)
const streamCache = new Map()

let innertubeInstance = null
let innertubePromise = null

async function getInnertube() {
  if (innertubeInstance) return innertubeInstance
  if (!innertubePromise) {
    innertubePromise = Innertube.create({
      client_type: ClientType.IOS
    }).then(instance => {
      innertubeInstance = instance
      return instance
    }).catch(err => {
      innertubePromise = null
      throw err
    })
  }
  return innertubePromise
}

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

// Stream info endpoint: returns streamable status and audio metadata
router.get('/info/:videoId', async (req, res) => {
  const { videoId } = req.params
  const quality = (req.query.quality || 'auto').toLowerCase()
  if (!videoId || videoId.length < 5) {
    return res.status(400).json({ success: false, error: 'Invalid videoId' })
  }

  const cacheKey = `${videoId}_${quality}`
  try {
    const cached = streamCache.get(cacheKey) || streamCache.get(videoId)
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({
        success: true,
        streamUrl: `/api/youtube/stream/${videoId}?quality=${quality}`,
        mimeType: cached.mimeType,
        contentLength: cached.contentLength,
        duration: cached.duration
      })
    }

    const yt = await getInnertube()
    const info = await yt.getBasicInfo(videoId)
    const adaptive = info.streaming_data?.adaptive_formats || []
    
    // Choose format matching quality preference
    let format = null
    if (quality === 'low') {
      format = adaptive.find(f => f.itag === 139 && f.url) ||
               adaptive.find(f => f.mime_type?.startsWith('audio/') && f.url)
    } else {
      format = adaptive.find(f => (f.itag === 140 || f.itag === 251) && f.url) ||
               adaptive.find(f => f.mime_type?.startsWith('audio/') && f.url)
    }

    if (!format?.url) {
      return res.status(404).json({ success: false, error: 'Direct audio format not found' })
    }

    const duration = info.basic_info?.duration || 0
    const entry = {
      url: format.url,
      mimeType: format.mime_type || 'audio/mp4',
      contentLength: format.content_length,
      duration,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000
    }
    streamCache.set(cacheKey, entry)
    streamCache.set(videoId, entry)

    return res.json({
      success: true,
      streamUrl: `/api/youtube/stream/${videoId}?quality=${quality}`,
      mimeType: format.mime_type || 'audio/mp4',
      contentLength: format.content_length,
      duration
    })
  } catch (err) {
    console.error(`Stream info error for ${videoId}:`, err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
})

// CORS preflight for audio streaming
router.options('/stream/:videoId', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Origin, Content-Type, Accept, Cache-Control',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    'Access-Control-Max-Age': '86400',
  })
  res.sendStatus(204)
})

// Audio streaming proxy: pipes YouTube audio with byte-range support into Web Audio/Native Audio
router.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params
  const quality = (req.query.quality || 'auto').toLowerCase()
  if (!videoId || videoId.length < 5) {
    return res.status(400).end('Invalid videoId')
  }

  const cacheKey = `${videoId}_${quality}`
  try {
    let cached = streamCache.get(cacheKey) || streamCache.get(videoId)
    if (!cached || cached.expiresAt <= Date.now()) {
      const yt = await getInnertube()
      const info = await yt.getBasicInfo(videoId)
      const adaptive = info.streaming_data?.adaptive_formats || []
      
      let format = null
      if (quality === 'low') {
        format = adaptive.find(f => f.itag === 139 && f.url) ||
                 adaptive.find(f => f.mime_type?.startsWith('audio/') && f.url)
      } else {
        format = adaptive.find(f => (f.itag === 140 || f.itag === 251) && f.url) ||
                 adaptive.find(f => f.mime_type?.startsWith('audio/') && f.url)
      }

      if (!format?.url) {
        return res.status(404).json({ error: 'Direct audio format unavailable' })
      }

      cached = {
        url: format.url,
        mimeType: format.mime_type || 'audio/mp4',
        contentLength: format.content_length,
        duration: info.basic_info?.duration || 0,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000
      }
      streamCache.set(cacheKey, cached)
      streamCache.set(videoId, cached)
    }

    const reqHeaders = {
      'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)',
    }
    if (req.headers.range) {
      reqHeaders['Range'] = req.headers.range
    }

    const controller = new AbortController()
    req.on('close', () => {
      try { controller.abort() } catch (_) {}
    })

    const ytRes = await fetch(cached.url, {
      headers: reqHeaders,
      signal: controller.signal
    })

    const resHeaders = {
      'Content-Type': cached.mimeType || 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Origin, Content-Type, Accept, Cache-Control',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Cache-Control': 'public, max-age=3600',
    }

    const cl = ytRes.headers.get('content-length')
    if (cl) resHeaders['Content-Length'] = cl
    const cr = ytRes.headers.get('content-range')
    if (cr) resHeaders['Content-Range'] = cr

    res.writeHead(ytRes.status, resHeaders)
    Readable.fromWeb(ytRes.body).pipe(res)
  } catch (err) {
    if (err.name === 'AbortError') return
    console.error(`Stream proxy error for ${videoId}:`, err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    }
  }
})

export default router

