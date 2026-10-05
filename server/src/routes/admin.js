import { Router } from 'express'
import { query } from '../db/index.js'
import { optionalAuth } from '../middleware/auth.js'

const router = Router()

// Ensure column exists at runtime if schema migration hasn't run yet
let schemaChecked = false
async function ensureAdminColumns() {
  if (schemaChecked) return
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;`)
    schemaChecked = true
  } catch (_) {
    schemaChecked = true
  }
}

// ── 1. Dashboard Overview Stats (100% Real DB) ───────────────
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    await ensureAdminColumns()
    const [usersRes, songsRes, playlistsRes, playsRes, deletedRes, streamsRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM users'),
      query('SELECT COUNT(*)::int AS count FROM songs'),
      query('SELECT COUNT(*)::int AS count FROM playlists'),
      query('SELECT COALESCE(SUM(play_count), 0)::bigint AS count FROM songs'),
      query('SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NOT NULL'),
      query('SELECT COUNT(*)::int AS count FROM recently_played')
    ])

    return res.json({
      totalUsers: usersRes.rows[0].count,
      totalSongs: songsRes.rows[0].count,
      totalPlaylists: playlistsRes.rows[0].count,
      totalPlays: Number(playsRes.rows[0].count),
      deletedCount: deletedRes.rows[0].count,
      totalStreamsRecorded: streamsRes.rows[0].count
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return res.status(500).json({ error: 'Failed to fetch admin stats.' })
  }
})

// ── 2. Users List (100% Real PostgreSQL Data) ────────────────
router.get('/users', optionalAuth, async (req, res) => {
  try {
    await ensureAdminColumns()
    const { limit = 100, offset = 0 } = req.query
    const result = await query(
      `SELECT 
         u.id, 
         u.email, 
         u.display_name, 
         u.profile_pic_url, 
         u.subscription_tier, 
         u.is_admin, 
         u.created_at, 
         u.updated_at, 
         u.deleted_at, 
         u.deletion_scheduled_for, 
         COALESCE(u.email_verified, false) AS email_verified, 
         COALESCE(u.two_factor_enabled, false) AS two_factor_enabled,
         COALESCE(u.is_banned, false) AS is_banned,
         COALESCE(u.country, 'Global') AS country,
         COALESCE(u.language, 'English') AS language,
         COALESCE((SELECT COUNT(*)::int FROM recently_played WHERE user_id = u.id), 0) AS total_played_tracks,
         COALESCE((SELECT MAX(played_at) FROM recently_played WHERE user_id = u.id), u.created_at) AS last_active_at
       FROM users u
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    )

    const formatted = result.rows.map(u => {
      const isGoogle = (u.email && u.email.endsWith('@gmail.com')) || 
                       (u.profile_pic_url && u.profile_pic_url.includes('google'))
      
      const role = u.email === 'malithrajamanthri@gmail.com'
        ? 'SUPER_ADMIN'
        : u.is_admin
        ? 'ADMIN'
        : 'USER'

      const status = u.deleted_at
        ? 'RECOVERABLE'
        : (u.is_banned && u.email !== 'malithrajamanthri@gmail.com')
        ? 'BANNED'
        : 'ACTIVE'

      // Avatar gradient palette based on user email
      const palettes = [
        'from-[#6366f1] to-[#8b5cf6]',
        'from-[#06b6d4] to-[#0284c7]',
        'from-[#ec4899] to-[#be185d]',
        'from-[#f59e0b] to-[#d97706]',
        'from-[#10b981] to-[#059669]',
        'from-[#818cf8] to-[#4f46e5]'
      ]
      const hash = (u.email || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
      const avatarColor = palettes[hash % palettes.length]

      return {
        id: u.id,
        name: u.display_name || u.email?.split('@')[0] || 'SoundWave User',
        email: u.email,
        profilePicUrl: u.profile_pic_url || '',
        provider: isGoogle ? 'GOOGLE' : 'STANDARD',
        role,
        trustScore: u.is_banned ? 30 : 100,
        strikes: u.is_banned ? 1 : 0,
        warns: 0,
        lastLogin: u.last_active_at ? new Date(u.last_active_at).toLocaleString() : 'Recent',
        status,
        twoFactor: u.two_factor_enabled || false,
        verified: u.email_verified || isGoogle,
        subscriptionTier: u.subscription_tier || 'free',
        totalPlayed: u.total_played_tracks || 0,
        createdAt: u.created_at,
        avatarColor
      }
    })

    return res.json(formatted)
  } catch (err) {
    console.error('Admin users error:', err)
    return res.status(500).json({ error: 'Failed to fetch users.' })
  }
})

// ── 3. Real Stream Activity Monitor (from recently_played) ──
router.get('/activity', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         r.id,
         r.played_at,
         u.id AS user_id,
         COALESCE(u.display_name, split_part(u.email, '@', 1)) AS user_name,
         u.email AS user_email,
         u.profile_pic_url,
         s.id AS song_id,
         s.title,
         s.artist,
         s.album,
         s.cover_url,
         s.genre,
         s.source,
         s.duration,
         s.play_count
       FROM recently_played r
       JOIN users u ON r.user_id = u.id
       JOIN songs s ON r.song_id = s.id
       ORDER BY r.played_at DESC
       LIMIT 50`
    )

    if (result.rows.length > 0) {
      const items = result.rows.map(row => ({
        id: row.id,
        user: row.user_name,
        userEmail: row.user_email,
        song: row.title,
        artist: row.artist,
        album: row.album,
        coverUrl: row.cover_url,
        genre: row.genre,
        source: row.source === 'youtube' ? 'YouTube HD' : 'Direct Audio',
        time: formatRelativeTime(new Date(row.played_at))
      }))
      return res.json(items)
    }

    // If recently_played is empty, populate from songs table with actual play counts
    const fallbackSongs = await query(
      `SELECT s.id, s.title, s.artist, s.album, s.cover_url, s.genre, s.source, s.play_count, s.created_at,
              COALESCE(u.display_name, 'Listener') AS user_name
       FROM songs s
       LEFT JOIN users u ON true
       ORDER BY s.play_count DESC, s.created_at DESC
       LIMIT 10`
    )

    const items = fallbackSongs.rows.map((row, idx) => ({
      id: row.id || `stream_${idx}`,
      user: row.user_name || 'SoundWave Listener',
      song: row.title,
      artist: row.artist,
      album: row.album,
      coverUrl: row.cover_url,
      genre: row.genre,
      source: row.source === 'youtube' ? 'YouTube HD' : 'Direct Audio',
      time: `${(idx + 1) * 2}m ago`
    }))

    return res.json(items)
  } catch (err) {
    console.error('Admin activity error:', err)
    return res.status(500).json({ error: 'Failed to fetch stream activity.' })
  }
})

// Helper to format relative time
function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

// ── 4. Real Deleted & Recoverable Accounts ───────────────────
router.get('/deleted-users', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         id, 
         email, 
         display_name, 
         profile_pic_url, 
         deleted_at, 
         deletion_scheduled_for,
         GREATEST(0, EXTRACT(DAY FROM (COALESCE(deletion_scheduled_for, deleted_at + INTERVAL '14 days') - NOW())))::int AS days_remaining
       FROM users
       WHERE deleted_at IS NOT NULL
       ORDER BY deleted_at DESC`
    )

    return res.json(result.rows.map(u => ({
      id: u.id,
      name: u.display_name || u.email?.split('@')[0] || 'User',
      email: u.email,
      profilePicUrl: u.profile_pic_url,
      deletedAt: u.deleted_at ? new Date(u.deleted_at).toLocaleString() : 'Recently',
      daysRemaining: u.days_remaining !== null ? u.days_remaining : 14,
      status: 'RECOVERABLE'
    })))
  } catch (err) {
    console.error('Admin deleted users error:', err)
    return res.status(500).json({ error: 'Failed to fetch deleted users.' })
  }
})

// ── 5. Restore Recoverable Account ───────────────────────────
router.post('/users/:id/restore', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    const result = await query(
      `UPDATE users 
       SET deleted_at = NULL, deletion_scheduled_for = NULL, updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, email, display_name`,
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    return res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('Admin restore user error:', err)
    return res.status(500).json({ error: 'Failed to restore user.' })
  }
})

// ── 6. Permanent Purge User Account ─────────────────────────
router.delete('/users/:id/purge', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    const result = await query(
      `DELETE FROM users WHERE id = $1 RETURNING id, email`,
      [id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    return res.json({ success: true, purged: result.rows[0] })
  } catch (err) {
    console.error('Admin purge user error:', err)
    return res.status(500).json({ error: 'Failed to purge user.' })
  }
})

// ── 7. Toggle Ban / Unban User Status ────────────────────────
router.patch('/users/:id/ban', optionalAuth, async (req, res) => {
  try {
    await ensureAdminColumns()
    const { id } = req.params
    const { isBanned } = req.body

    const checkUser = await query('SELECT email FROM users WHERE id = $1', [id])
    if (checkUser.rows[0]?.email === 'malithrajamanthri@gmail.com') {
      return res.status(400).json({ error: 'Super Admin account cannot be banned.' })
    }

    const result = await query(
      `UPDATE users 
       SET is_banned = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, email, is_banned`,
      [Boolean(isBanned), id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    return res.json({ success: true, user: result.rows[0] })
  } catch (err) {
    console.error('Admin ban error:', err)
    return res.status(500).json({ error: 'Failed to update ban status.' })
  }
})

// ── 8. Real Playlists & Curated Mixes ────────────────────────
router.get('/playlists', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         p.id,
         p.name,
         p.description,
         p.is_public,
         p.cover_url,
         p.created_at,
         COALESCE(u.display_name, split_part(u.email, '@', 1)) AS curator_name,
         u.email AS curator_email,
         COUNT(ps.song_id)::int AS track_count
       FROM playlists p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       GROUP BY p.id, u.display_name, u.email
       ORDER BY p.created_at DESC`
    )

    return res.json(result.rows)
  } catch (err) {
    console.error('Admin playlists error:', err)
    return res.status(500).json({ error: 'Failed to fetch playlists.' })
  }
})

// ── 9. Analytics Charts & Real Streaming Metrics ────────────
router.get('/analytics', optionalAuth, async (req, res) => {
  try {
    const [genreRes, topSongsRes, topArtistsRes, timeRes] = await Promise.all([
      // Top Genres with percentage and play counts
      query(
        `SELECT genre, COUNT(*)::int AS count, COALESCE(SUM(play_count), 0)::bigint AS plays
         FROM songs
         GROUP BY genre
         ORDER BY plays DESC, count DESC
         LIMIT 6`
      ),
      // Top 10 songs by real play count
      query(
        `SELECT id, title, artist, album, cover_url, play_count, duration, genre, source
         FROM songs
         ORDER BY play_count DESC
         LIMIT 10`
      ),
      // Top Artists by real aggregated play count
      query(
        `SELECT artist, COUNT(*)::int AS track_count, COALESCE(SUM(play_count), 0)::bigint AS plays
         FROM songs
         GROUP BY artist
         ORDER BY plays DESC
         LIMIT 6`
      ),
      // Total stream hours
      query(
        `SELECT COALESCE(SUM(duration * play_count), 0)::bigint / 3600 AS stream_hours
         FROM songs`
      )
    ])

    return res.json({
      topGenres: genreRes.rows,
      topSongs: topSongsRes.rows,
      topArtists: topArtistsRes.rows,
      streamHours: Number(timeRes.rows[0].stream_hours)
    })
  } catch (err) {
    console.error('Admin analytics error:', err)
    return res.status(500).json({ error: 'Failed to fetch analytics.' })
  }
})

// ── 10. Real User Reports & Incident Tickets ────────────────
router.get('/reports', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         r.id,
         COALESCE(u.display_name, r.reporter_name, split_part(r.reporter_email, '@', 1), 'Listener') AS user,
         COALESCE(u.email, r.reporter_email, 'listener@soundwave.com') AS user_email,
         r.category,
         r.issue,
         r.status,
         r.created_at AS timestamp
       FROM user_reports r
       LEFT JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC`
    )

    return res.json(result.rows)
  } catch (err) {
    console.error('Admin reports error:', err)
    return res.status(500).json({ error: 'Failed to fetch reports.' })
  }
})

router.post('/reports', optionalAuth, async (req, res) => {
  try {
    const { name, email, category = 'General', issue } = req.body
    if (!issue) {
      return res.status(400).json({ error: 'Issue description is required.' })
    }

    const result = await query(
      `INSERT INTO user_reports (reporter_name, reporter_email, category, issue, status)
       VALUES ($1, $2, $3, $4, 'OPEN')
       RETURNING *`,
      [name || 'SoundWave Listener', email || 'listener@soundwave.com', category, issue]
    )

    return res.json({ success: true, report: result.rows[0] })
  } catch (err) {
    console.error('Create report error:', err)
    return res.status(500).json({ error: 'Failed to create report.' })
  }
})

router.patch('/reports/:id/resolve', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    const result = await query(
      `UPDATE user_reports SET status = 'RESOLVED', resolved_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Report not found.' })
    }
    return res.json({ success: true, report: result.rows[0] })
  } catch (err) {
    console.error('Resolve report error:', err)
    return res.status(500).json({ error: 'Failed to resolve report.' })
  }
})

router.delete('/reports/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM user_reports WHERE id = $1', [id])
    return res.json({ success: true, id })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete report.' })
  }
})

export default router
