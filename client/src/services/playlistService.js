import { api } from './api'

export async function getUserPlaylists(uid) {
  try {
    return await api.get('/playlists')
  } catch (err) {
    console.warn('getUserPlaylists error:', err.message)
    return []
  }
}

export async function getPlaylist(id) {
  try {
    if (!id) return null
    return await api.get(`/playlists/${id}`)
  } catch (err) {
    console.error('getPlaylist error:', err.message)
    return null
  }
}

export async function createPlaylist(uid, name, description = '') {
  try {
    const playlistName = typeof name === 'object' ? name.name : name
    const playlistDesc = typeof name === 'object' ? (name.description || '') : description
    const res = await api.post('/playlists', { name: playlistName, description: playlistDesc })
    return res.id
  } catch (err) {
    console.error('createPlaylist error:', err)
    throw err
  }
}

export async function updatePlaylist(id, data) {
  try {
    return await api.put(`/playlists/${id}`, data)
  } catch (err) {
    console.error('updatePlaylist error:', err)
    throw err
  }
}

export async function renamePlaylist(id, name) {
  try {
    return await api.put(`/playlists/${id}`, { name })
  } catch (err) {
    console.error('renamePlaylist error:', err)
    throw err
  }
}

export async function deletePlaylist(id) {
  try {
    return await api.delete(`/playlists/${id}`)
  } catch (err) {
    console.error('deletePlaylist error:', err)
    throw err
  }
}

export async function addSongToPlaylist(playlistId, songId) {
  try {
    return await api.post(`/playlists/${playlistId}/songs`, { songId })
  } catch (err) {
    console.error('addSongToPlaylist error:', err)
    throw err
  }
}

export async function removeSongFromPlaylist(playlistId, songId) {
  try {
    return await api.delete(`/playlists/${playlistId}/songs/${songId}`)
  } catch (err) {
    console.error('removeSongFromPlaylist error:', err)
    throw err
  }
}

export async function reorderPlaylistSongs(playlistId, songIds) {
  try {
    return await api.put(`/playlists/${playlistId}/reorder`, { songIds })
  } catch (err) {
    console.error('reorderPlaylistSongs error:', err)
    throw err
  }
}
