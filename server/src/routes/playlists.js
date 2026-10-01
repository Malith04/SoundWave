import { Router } from 'express'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { mapSongRow } from './songs.js'

const router = Router()

// ── 1. Get User's Playlists ─────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*,
              COUNT(ps.song_id)::int AS song_count,
              ARRAY_REMOVE(ARRAY_AGG(ps.song_id ORDER BY ps.position ASC), NULL) AS song_ids,
              ARRAY_REMOVE(ARRAY_AGG(s.cover_url ORDER BY ps.position ASC), NULL) AS cover_urls
       FROM playlists p
       LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
       LEFT JOIN songs s ON ps.song_id = s.id
       WHERE p.user_id = $1
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    )

    const playlists = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      ownerId: row.user_id,
      isPublic: row.is_public,
      coverUrl: row.cover_url || (row.cover_urls && row.cover_urls[0]) || '',
      songCount: row.song_count || 0,
      songIds: row.song_ids || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    return res.json(playlists)
  } catch (err) {
    console.error('Get playlists error:', err)
    return res.status(500).json({ error: 'Failed to fetch playlists.' })
  }
})

// ── 2. Create Playlist ──────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description = '', isPublic = false } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required.' })
    }

    const result = await query(
      `INSERT INTO playlists (user_id, name, description, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, name.trim(), description.trim(), isPublic]
    )

    const p = result.rows[0]
    return res.status(201).json({
      id: p.id,
      name: p.name,
      description: p.description,
      ownerId: p.user_id,
      isPublic: p.is_public,
      coverUrl: p.cover_url || '',
      songIds: [],
      createdAt: p.created_at,
      updatedAt: p.updated_at
    })
  } catch (err) {
    console.error('Create playlist error:', err)
    return res.status(500).json({ error: 'Failed to create playlist.' })
  }
})

// ── 3. Get Playlist with All Joined Songs ───────────────────
router.get('/:id', async (req, res) => {
  try {
    // Fetch playlist
    const pResult = await query(
      `SELECT * FROM playlists WHERE id = $1`,
      [req.params.id]
    )

    if (pResult.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found.' })
    }

    const playlist = pResult.rows[0]

    // Fetch songs in order
    const sResult = await query(
      `SELECT s.*, ps.position, ps.added_at
       FROM playlist_songs ps
       JOIN songs s ON ps.song_id = s.id
       WHERE ps.playlist_id = $1
       ORDER BY ps.position ASC`,
      [playlist.id]
    )

    const songs = sResult.rows.map(mapSongRow)
    const songIds = songs.map(s => s.id)

    return res.json({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      ownerId: playlist.user_id,
      isPublic: playlist.is_public,
      coverUrl: playlist.cover_url || (songs[0]?.coverUrl || ''),
      songIds,
      songs,
      createdAt: playlist.created_at,
      updatedAt: playlist.updated_at
    })
  } catch (err) {
    console.error('Get playlist error:', err)
    return res.status(500).json({ error: 'Failed to fetch playlist details.' })
  }
})

// ── 4. Update Playlist ──────────────────────────────────────
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, isPublic, coverUrl } = req.body

    const result = await query(
      `UPDATE playlists
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_public = COALESCE($3, is_public),
           cover_url = COALESCE($4, cover_url),
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, description, isPublic, coverUrl, req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found or unauthorized.' })
    }

    const p = result.rows[0]
    return res.json({
      id: p.id,
      name: p.name,
      description: p.description,
      ownerId: p.user_id,
      isPublic: p.is_public,
      coverUrl: p.cover_url,
      updatedAt: p.updated_at
    })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update playlist.' })
  }
})

// ── 5. Delete Playlist ──────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Playlist not found or unauthorized.' })
    }

    return res.json({ message: 'Playlist deleted.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete playlist.' })
  }
})

// ── 6. Add Song to Playlist ─────────────────────────────────
router.post('/:id/songs', authenticate, async (req, res) => {
  try {
    const { songId } = req.body
    if (!songId) return res.status(400).json({ error: 'songId is required.' })

    // Check playlist ownership
    const check = await query('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Playlist not found or unauthorized.' })
    }

    // Determine max position
    const posRes = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM playlist_songs WHERE playlist_id = $1',
      [req.params.id]
    )
    const position = posRes.rows[0].next_pos

    await query(
      `INSERT INTO playlist_songs (playlist_id, song_id, position)
       VALUES ($1, $2, $3)
       ON CONFLICT (playlist_id, song_id) DO NOTHING`,
      [req.params.id, songId, position]
    )

    await query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [req.params.id])

    return res.status(201).json({ message: 'Song added to playlist.' })
  } catch (err) {
    console.error('Add song to playlist error:', err)
    return res.status(500).json({ error: 'Failed to add song to playlist.' })
  }
})

// ── 7. Remove Song from Playlist ────────────────────────────
router.delete('/:id/songs/:songId', authenticate, async (req, res) => {
  try {
    // Check playlist ownership
    const check = await query('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Playlist not found or unauthorized.' })
    }

    await query(
      'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      [req.params.id, req.params.songId]
    )

    await query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [req.params.id])

    return res.json({ message: 'Song removed from playlist.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove song from playlist.' })
  }
})

// ── 8. Reorder Songs ────────────────────────────────────────
router.put('/:id/reorder', authenticate, async (req, res) => {
  try {
    const { songIds } = req.body
    if (!Array.isArray(songIds)) return res.status(400).json({ error: 'songIds array required.' })

    const check = await query('SELECT id FROM playlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    if (check.rows.length === 0) {
      return res.status(403).json({ error: 'Playlist not found or unauthorized.' })
    }

    // Update positions in a transaction
    for (let i = 0; i < songIds.length; i++) {
      await query(
        'UPDATE playlist_songs SET position = $1 WHERE playlist_id = $2 AND song_id = $3',
        [i, req.params.id, songIds[i]]
      )
    }

    await query('UPDATE playlists SET updated_at = NOW() WHERE id = $1', [req.params.id])

    return res.json({ message: 'Playlist reordered.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reorder playlist.' })
  }
})

export default router
