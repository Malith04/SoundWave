import { Router } from 'express'
import { query } from '../db/index.js'
import { optionalAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

// Helper to map DB row to frontend song object
export function mapSongRow(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    album: row.album || '',
    coverUrl: row.cover_url || '',
    audioUrl: row.audio_url,
    duration: row.duration || 0,
    genre: row.genre || 'General',
    source: row.source || 'itunes',
    playCount: row.play_count || 0,
    createdAt: row.created_at
  }
}

// ── 1. Upsert Song ──────────────────────────────────────────
// Called when a track is played or discovered so it gets saved to PostgreSQL
router.post('/', async (req, res) => {
  try {
    const { id, title, artist, album, coverUrl, audioUrl, duration, genre, source } = req.body

    if (!id || !title || !artist) {
      return res.status(400).json({ error: 'Song id, title, and artist are required.' })
    }

    const result = await query(
      `INSERT INTO songs (id, title, artist, album, cover_url, audio_url, duration, genre, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE
       SET title = EXCLUDED.title,
           artist = EXCLUDED.artist,
           album = COALESCE(NULLIF(EXCLUDED.album, ''), songs.album),
           cover_url = COALESCE(NULLIF(EXCLUDED.cover_url, ''), songs.cover_url),
           audio_url = COALESCE(NULLIF(EXCLUDED.audio_url, ''), songs.audio_url),
           duration = CASE WHEN EXCLUDED.duration > 0 THEN EXCLUDED.duration ELSE songs.duration END,
           genre = COALESCE(NULLIF(EXCLUDED.genre, ''), songs.genre),
           source = COALESCE(NULLIF(EXCLUDED.source, ''), songs.source),
           updated_at = NOW()
       RETURNING *`,
      [
        id,
        title,
        artist,
        album || '',
        coverUrl || '',
        audioUrl || '',
        duration || 0,
        genre || 'General',
        source || 'itunes'
      ]
    )

    return res.json(mapSongRow(result.rows[0]))
  } catch (err) {
    console.error('Upsert song error:', err)
    return res.status(500).json({ error: 'Failed to save song.' })
  }
})

// ── 2. Get Song by ID ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM songs WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Song not found.' })
    }
    return res.json(mapSongRow(result.rows[0]))
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch song.' })
  }
})

// ── 3. Increment Play Count ─────────────────────────────────
router.post('/:id/play', async (req, res) => {
  try {
    const result = await query(
      `UPDATE songs SET play_count = play_count + 1, updated_at = NOW() WHERE id = $1 RETURNING play_count`,
      [req.params.id]
    )
    return res.json({ playCount: result.rows[0]?.play_count || 1 })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to increment play count.' })
  }
})

// ── 4. Query Songs (Trending, Genre, Search) ────────────────
router.get('/', async (req, res) => {
  try {
    const { genre, search, sort = 'trending', limit = 50 } = req.query
    let sql = 'SELECT * FROM songs WHERE 1=1'
    const params = []

    if (genre) {
      params.push(genre)
      sql += ` AND LOWER(genre) = LOWER($${params.length})`
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`)
      sql += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(artist) LIKE $${params.length} OR LOWER(album) LIKE $${params.length})`
    }

    if (sort === 'trending') {
      sql += ' ORDER BY play_count DESC, created_at DESC'
    } else if (sort === 'recent') {
      sql += ' ORDER BY created_at DESC'
    } else {
      sql += ' ORDER BY title ASC'
    }

    params.push(parseInt(limit, 10) || 50)
    sql += ` LIMIT $${params.length}`

    const result = await query(sql, params)
    return res.json(result.rows.map(mapSongRow))
  } catch (err) {
    console.error('Get songs error:', err)
    return res.status(500).json({ error: 'Failed to fetch songs.' })
  }
})

// ── 5. Delete Song (Admin) ──────────────────────────────────
router.delete('/:id', optionalAuth, requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM songs WHERE id = $1', [req.params.id])
    return res.json({ message: 'Song deleted.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete song.' })
  }
})

export default router
