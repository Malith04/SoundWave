import { Router } from 'express'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { mapSongRow } from './songs.js'

const router = Router()

// ── 1. Favorites (Liked Songs) ──────────────────────────────
router.get('/favorites', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, uf.created_at AS liked_at
       FROM user_favorites uf
       JOIN songs s ON uf.song_id = s.id
       WHERE uf.user_id = $1
       ORDER BY uf.created_at DESC`,
      [req.user.id]
    )
    return res.json(result.rows.map(mapSongRow))
  } catch (err) {
    console.error('Get favorites error:', err)
    return res.status(500).json({ error: 'Failed to fetch favorites.' })
  }
})

router.post('/favorites/:songId', authenticate, async (req, res) => {
  try {
    const { songId } = req.params
    // Check if song exists in songs table, if not ensure a row exists
    await query(
      `INSERT INTO songs (id, title, artist, audio_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [songId, req.body.title || 'Track', req.body.artist || 'Artist', req.body.audioUrl || '']
    )

    // Check if already favorite
    const existing = await query(
      'SELECT * FROM user_favorites WHERE user_id = $1 AND song_id = $2',
      [req.user.id, songId]
    )

    if (existing.rows.length > 0) {
      await query('DELETE FROM user_favorites WHERE user_id = $1 AND song_id = $2', [req.user.id, songId])
      return res.json({ isFavorite: false })
    } else {
      await query('INSERT INTO user_favorites (user_id, song_id) VALUES ($1, $2)', [req.user.id, songId])
      return res.json({ isFavorite: true })
    }
  } catch (err) {
    console.error('Toggle favorite error:', err)
    return res.status(500).json({ error: 'Failed to toggle favorite.' })
  }
})

router.get('/favorites/:songId/check', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT 1 FROM user_favorites WHERE user_id = $1 AND song_id = $2',
      [req.user.id, req.params.songId]
    )
    return res.json({ isFavorite: result.rows.length > 0 })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check favorite status.' })
  }
})

// ── 2. Recently Played ──────────────────────────────────────
router.get('/recently-played', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (s.id) s.*, rp.played_at
       FROM recently_played rp
       JOIN songs s ON rp.song_id = s.id
       WHERE rp.user_id = $1
       ORDER BY s.id, rp.played_at DESC
       LIMIT 30`,
      [req.user.id]
    )
    // Sort final list by played_at descending
    const songs = result.rows
      .sort((a, b) => new Date(b.played_at) - new Date(a.played_at))
      .map(mapSongRow)

    return res.json(songs)
  } catch (err) {
    console.error('Get recently played error:', err)
    return res.status(500).json({ error: 'Failed to fetch recently played.' })
  }
})

router.post('/recently-played/:songId', authenticate, async (req, res) => {
  try {
    const { songId } = req.params

    // Ensure song row exists
    if (req.body.title && req.body.artist) {
      await query(
        `INSERT INTO songs (id, title, artist, album, cover_url, audio_url, duration, genre, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE
         SET cover_url = COALESCE(NULLIF(EXCLUDED.cover_url, ''), songs.cover_url)`,
        [
          songId,
          req.body.title,
          req.body.artist,
          req.body.album || '',
          req.body.coverUrl || '',
          req.body.audioUrl || '',
          req.body.duration || 0,
          req.body.genre || 'General',
          req.body.source || 'itunes'
        ]
      )
    }

    await query(
      `INSERT INTO recently_played (user_id, song_id, played_at)
       VALUES ($1, $2, NOW())`,
      [req.user.id, songId]
    )

    return res.json({ message: 'Recorded play.' })
  } catch (err) {
    console.error('Add recently played error:', err)
    return res.status(500).json({ error: 'Failed to record play.' })
  }
})

router.delete('/recently-played', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM recently_played WHERE user_id = $1', [req.user.id])
    return res.json({ message: 'Listening history cleared.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear history.' })
  }
})

// ── 3. Search History ───────────────────────────────────────
router.get('/search-history', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (LOWER(query)) query, searched_at
       FROM search_history
       WHERE user_id = $1
       ORDER BY LOWER(query), searched_at DESC
       LIMIT 10`,
      [req.user.id]
    )
    return res.json(result.rows.map(r => r.query))
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch search history.' })
  }
})

router.post('/search-history', authenticate, async (req, res) => {
  try {
    const { query: searchQuery } = req.body
    if (!searchQuery?.trim()) return res.json({ message: 'Empty query.' })

    await query(
      'INSERT INTO search_history (user_id, query) VALUES ($1, $2)',
      [req.user.id, searchQuery.trim()]
    )
    return res.json({ message: 'Search recorded.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save search.' })
  }
})

router.delete('/search-history', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM search_history WHERE user_id = $1', [req.user.id])
    return res.json({ message: 'Search history cleared.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to clear search history.' })
  }
})

// ── 4. Real User Stats & Listening Time ──────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Ensure column exists
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS listening_time_seconds INTEGER DEFAULT 0;').catch(() => {})

    const result = await query(
      `SELECT
         COALESCE((SELECT COUNT(*)::int FROM user_favorites WHERE user_id = $1), 0) AS liked_songs,
         COALESCE((SELECT COUNT(*)::int FROM recently_played WHERE user_id = $1), 0) AS tracks_played,
         COALESCE((SELECT COUNT(*)::int FROM playlists WHERE user_id = $1), 0) AS saved_playlists,
         COALESCE(u.listening_time_seconds, 0) AS listening_time_seconds
       FROM users u
       WHERE u.id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.json({
        likedSongs: 0,
        tracksPlayed: 0,
        savedPlaylists: 0,
        listeningTimeSeconds: 0,
        listeningTimeMinutes: 0
      })
    }

    const row = result.rows[0]
    const sec = row.listening_time_seconds || 0
    return res.json({
      likedSongs: row.liked_songs,
      tracksPlayed: row.tracks_played,
      savedPlaylists: row.saved_playlists,
      listeningTimeSeconds: sec,
      listeningTimeMinutes: Math.round(sec / 60)
    })
  } catch (err) {
    console.error('Get user stats error:', err)
    return res.status(500).json({ error: 'Failed to fetch user stats.' })
  }
})

router.post('/listening-time', authenticate, async (req, res) => {
  try {
    const seconds = parseInt(req.body.seconds, 10)
    if (isNaN(seconds) || seconds <= 0 || seconds > 300) {
      return res.status(400).json({ error: 'Invalid listening seconds.' })
    }

    // Ensure column exists
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS listening_time_seconds INTEGER DEFAULT 0;').catch(() => {})

    const result = await query(
      `UPDATE users
       SET listening_time_seconds = COALESCE(listening_time_seconds, 0) + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING listening_time_seconds`,
      [seconds, req.user.id]
    )

    const updated = result.rows[0]?.listening_time_seconds || 0
    return res.json({
      listeningTimeSeconds: updated,
      listeningTimeMinutes: Math.round(updated / 60)
    })
  } catch (err) {
    console.error('Record listening time error:', err)
    return res.status(500).json({ error: 'Failed to record listening time.' })
  }
})

// ── 5. Public Profile by User ID ────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, display_name, profile_pic_url, bio, country, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    const u = result.rows[0]
    return res.json({
      id: u.id,
      displayName: u.display_name,
      profilePicUrl: u.profile_pic_url,
      bio: u.bio,
      country: u.country,
      createdAt: u.created_at
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user.' })
  }
})

export default router
