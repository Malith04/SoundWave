import { useState, useEffect } from 'react'
import { ListMusic, X, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getUserPlaylists, createPlaylist, addSongToPlaylist } from '../services/playlistService'
import toast from 'react-hot-toast'

export default function AddToPlaylistModal({ song, onClose }) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    getUserPlaylists(user.uid)
      .then(setPlaylists)
      .finally(() => setLoading(false))
  }, [user])

  const handleAdd = async (playlist) => {
    if (!song) return
    try {
      await addSongToPlaylist(playlist.id, song.id)
      toast.success(`Added "${song.title}" to "${playlist.name}"`)
      onClose()
    } catch {
      toast.error('Failed to add song')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !user || !song) return
    setSaving(true)
    try {
      const plId = await createPlaylist(user.uid, newName.trim())
      await addSongToPlaylist(plId, song.id)
      toast.success(`Created "${newName.trim()}" and added song`)
      onClose()
    } catch {
      toast.error('Failed to create playlist')
    } finally {
      setSaving(false)
    }
  }

  if (!song) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="glass-modal rounded-3xl w-full max-w-sm shadow-2xl border border-white/15 overflow-hidden animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="font-extrabold text-lg text-white font-display">Add to Playlist</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">
              {song.title} — {song.artist}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Existing playlists */}
        <div className="max-h-60 overflow-y-auto py-2 px-3 space-y-1">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <span>Loading playlists...</span>
            </div>
          ) : playlists.length === 0 && !creating ? (
            <div className="py-8 text-center text-gray-500 text-xs">No playlists created yet</div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
              >
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/10 group-hover:border-brand/40">
                  <ListMusic size={16} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-brand transition-colors">
                    {pl.name}
                  </p>
                  <p className="text-[11px] text-gray-400">{pl.songIds?.length || 0} songs</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Create new playlist */}
        <div className="border-t border-white/10 p-4 bg-white/[0.02]">
          {creating ? (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 glass-input rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="bg-brand text-black font-extrabold px-4 py-2 rounded-xl text-xs disabled:opacity-50 shrink-0 hover:bg-brand-dark transition-colors"
              >
                {saving ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setNewName('')
                }}
                className="text-gray-400 hover:text-white px-2"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-white/20 hover:border-brand/50 text-gray-300 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold hover:bg-white/5 transition-all"
            >
              <Plus size={15} className="text-brand" /> Create New Playlist
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
