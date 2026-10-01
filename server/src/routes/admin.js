import { Router } from 'express'
import { query } from '../db/index.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

// ── 1. Dashboard Overview Stats ─────────────────────────────
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const [usersRes, songsRes, playlistsRes, playsRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users'),
      query('SELECT COUNT(*)::int AS count FROM songs'),
      query('SELECT COUNT(*)::int AS count FROM playlists'),
      query('SELECT COALESCE(SUM(play_count), 0)::bigint AS count FROM songs')
    ])

    return res.json({
      totalUsers: usersRes.rows[0].count,
      totalSongs: songsRes.rows[0].count,
      totalPlaylists: playlistsRes.rows[0].count,
      totalPlays: Number(playsRes.rows[0].count)
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ error: 'Failed to fetch admin stats.' })
  }
})

// ── 2. Users List ───────────────────────────────────────────
router.get('/users', optionalAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const result = await query(
      `SELECT id, email, display_name, profile_pic_url, subscription_tier, is_admin, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    )

    return res.json(result.rows)
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch users.' })
  }
})

// ── 3. Analytics Charts Data ────────────────────────────────
router.get('/analytics', optionalAuth, async (req, res) => {
  try {
    // Top 5 genres
    const genreRes = await query(
      `SELECT genre, COUNT(*)::int AS count
       FROM songs
       GROUP BY genre
       ORDER BY count DESC
       LIMIT 5`
    )

    // Top 10 songs by play count
    const topSongsRes = await query(
      `SELECT id, title, artist, play_count
       FROM songs
       ORDER BY play_count DESC
       LIMIT 10`
    )

    return res.json({
      topGenres: genreRes.rows,
      topSongs: topSongsRes.rows
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch analytics.' })
  }
})

export default router
