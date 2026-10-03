import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

import authRoutes from './routes/auth.js'
import songsRoutes from './routes/songs.js'
import playlistsRoutes from './routes/playlists.js'
import usersRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import artistsRoutes from './routes/artists.js'
import youtubeRoutes from './routes/youtube.js'

dotenv.config()

const app = express()

// ── Middlewares ──
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static file uploads directory if needed
const uploadsDir = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

// ── Health Check ──
const healthHandler = async (req, res) => {
  let dbStatus = 'disconnected'
  try {
    const { query } = await import('./db/index.js')
    await query('SELECT 1')
    dbStatus = 'connected'
  } catch (err) {
    dbStatus = `disconnected (${err.message})`
  }

  res.json({
    status: 'ok',
    service: 'SoundWave PostgreSQL API (Netlify / Node)',
    database: dbStatus,
    time: new Date().toISOString()
  })
}

app.get('/api/health', healthHandler)
app.get('/health', healthHandler)

// ── Mount Routes (both with and without /api prefix for serverless compatibility) ──
const routeMap = [
  ['/auth', authRoutes],
  ['/songs', songsRoutes],
  ['/playlists', playlistsRoutes],
  ['/users', usersRoutes],
  ['/admin', adminRoutes],
  ['/artists', artistsRoutes],
  ['/youtube', youtubeRoutes]
]

routeMap.forEach(([routePath, router]) => {
  app.use(`/api${routePath}`, router)
  app.use(routePath, router)
})

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

export default app
