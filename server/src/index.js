import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './db/index.js'

import authRoutes from './routes/auth.js'
import songsRoutes from './routes/songs.js'
import playlistsRoutes from './routes/playlists.js'
import usersRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Middlewares ──
app.use(cors({
  origin: true, // Allow all origins in dev, or specify frontend origin
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Static file uploads directory if needed
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ── Health Check ──
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected'
  try {
    const { pool } = await import('./db/index.js')
    await pool.query('SELECT 1')
    dbStatus = 'connected'
  } catch (err) {
    dbStatus = `disconnected (${err.message})`
  }

  res.json({
    status: 'ok',
    service: 'SoundWave PostgreSQL API',
    database: dbStatus,
    time: new Date().toISOString()
  })
})

// ── Mount Routes ──
app.use('/api/auth', authRoutes)
app.use('/api/songs', songsRoutes)
app.use('/api/playlists', playlistsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/admin', adminRoutes)

// ── 404 Handler ──
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  })
})

// ── Start Server ──
async function start() {
  await initDb()

  app.listen(PORT, () => {
    console.log(`🚀 SoundWave Server running on http://localhost:${PORT}`)
    console.log(`📡 PostgreSQL API ready at http://localhost:${PORT}/api`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
})
