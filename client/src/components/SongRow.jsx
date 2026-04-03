import { Play, Pause, Heart, MoreHorizontal, ListPlus, Trash2, PlusCircle, ListMusic, X, Plus } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { toggleFavorite, isFavorite } from '../services/userService'
import { getUserPlaylists, createPlaylist, addSongToPlaylist } from '../services/playlistService'
import toast from 'react-hot-toast'

function formatTime(ms) {
  if (!ms) return '--:--'
  const s = ms > 10000 ? Math.floor(ms / 1000) : Math.floor(ms)
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ── Add to Playlist Modal ─────────────────────────────────────
function AddToPlaylistModal({ song, onClose }) {
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
    try {
      await addSongToPlaylist(playlist.id, song.id)
      toast.success(`Added to "${playlist.name}"`)
      onClose()
    } catch {
      toast.error('Failed to add song')
    }
  }

  const handleCreate = async e => {
    e.preventDefault()
    if (!newName.trim()) return
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

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#282828] rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
          <div>
            <h2 className="font-bold text-base">Add to Playlist</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{song.title} — {song.artist}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Existing playlists */}
        <div className="max-h-56 overflow-y-auto py-2">
          {loading ? (
            <div className="py-6 text-center text-gray-500 text-sm">Loading playlists...</div>
          ) : playlists.length === 0 && !creating ? (
            <div className="py-6 text-center text-gray-500 text-sm">No playlists yet</div>
          ) : (
            playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-9 h-9 bg-surface rounded-lg flex items-center justify-center shrink-0">
                  <ListMusic size={16} className="text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{pl.name}</p>
                  <p className="text-xs text-gray-500">{pl.songIds?.length || 0} songs</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Create new playlist */}
        <div className="border-t border-white/10 p-4">
          {creating ? (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Playlist name..."
                className="flex-1 bg-[#3e3e3e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
              />
              <button
                type="submit"
                disabled={saving || !newName.trim()}
                className="bg-brand text-black font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 shrink-0"
              >
                {saving ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName('') }}
                className="text-gray-400 hover:text-white px-2"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-3 text-brand hover:text-brand/80 transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Create new playlist
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Context Menu ──────────────────────────────────────────────
function SongMenu({ song, queue, onRemove, onClose, anchorRef, onAddToPlaylist }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (user) isFavorite(user.uid, song.id).then(setLiked)
  }, [user, song.id])

  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleFavorite = async e => {
    e.stopPropagation()
    if (!user) return
    const result = await toggleFavorite(user.uid, song.id)
    setLiked(result)
    toast.success(result ? 'Added to Liked Songs' : 'Removed from Liked Songs')
    onClose()
  }

  const handleAddToQueue = e => {
    e.stopPropagation()
    toast.success('Added to queue')
    onClose()
  }

  return (
    <div
      ref={menuRef}
      onClick={e => e.stopPropagation()}
      className="absolute z-50 right-0 top-8 w-56 bg-[#282828] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
    >
      {/* Song info */}
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/10 mb-1">
        <img src={song.coverUrl || 'https://via.placeholder.com/36'} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate">{song.title}</p>
          <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        </div>
      </div>

      <button
        onClick={handleFavorite}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors text-left ${liked ? 'text-brand' : 'text-gray-200'}`}
      >
        <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
        {liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      </button>

      <button
        onClick={handleAddToQueue}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors text-left"
      >
        <ListMusic size={16} />
        Add to Queue
      </button>

      <button
        onClick={e => { e.stopPropagation(); onClose(); onAddToPlaylist() }}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors text-left"
      >
        <ListPlus size={16} />
        Add to Playlist
      </button>
      {onRemove && (
        <>
          <div className="border-t border-white/10 my-1" />
          <button
            onClick={e => { e.stopPropagation(); onRemove(song.id); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors text-left"
          >
            <Trash2 size={16} />
            Remove from Playlist
          </button>
        </>
      )}
    </div>
  )
}

// ── Song Row ──────────────────────────────────────────────────
export default function SongRow({ song, index, queue, onRemove, showIndex = true }) {
  const { currentSong, isPlaying, play, togglePlay } = usePlayer()
  const isActive = currentSong?.id === song.id
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const menuBtnRef = useRef(null)

  const handlePlay = () => {
    if (showPlaylistModal) return   // don't play while modal is open
    if (isActive) togglePlay()
    else play(song, queue || [song], queue ? queue.findIndex(s => s.id === song.id) : 0)
  }

  return (
    <>
      {showPlaylistModal && (
        <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex items-center gap-4 px-4 py-2 rounded-lg group cursor-pointer transition-colors ${
          isActive ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
        onClick={handlePlay}
      >
        {showIndex && (
          <div className="w-5 text-center shrink-0">
            {hovered || isActive ? (
              isActive && isPlaying
                ? <Pause size={14} className="text-brand mx-auto" fill="currentColor" />
                : <Play size={14} className="text-white mx-auto" fill="currentColor" />
            ) : (
              <span className={`text-sm ${isActive ? 'text-brand' : 'text-gray-500'}`}>{index + 1}</span>
            )}
          </div>
        )}

        <img
          src={song.coverUrl || 'https://via.placeholder.com/40'}
          alt={song.title}
          className="w-10 h-10 rounded object-cover shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-brand' : 'text-white'}`}>{song.title}</p>
          <p className="text-xs text-gray-400 truncate">{song.artist}</p>
        </div>

        <p className="text-sm text-gray-500 truncate hidden md:block w-40">{song.album}</p>
        <span className="text-sm text-gray-500 w-10 text-right shrink-0">{formatTime(song.duration)}</span>

        <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
          <button
            ref={menuBtnRef}
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
            className={`p-1.5 rounded-full transition-all ${
              menuOpen ? 'text-white bg-white/10' : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <SongMenu
              song={song}
              queue={queue}
              onRemove={onRemove}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuBtnRef}
              onAddToPlaylist={() => setShowPlaylistModal(true)}
            />
          )}
        </div>
      </div>
    </>
  )
}
