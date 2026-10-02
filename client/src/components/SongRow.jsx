import { Play, Pause, Heart, MoreHorizontal, ListPlus, Trash2, PlusCircle, ListMusic, X, Plus, Info, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect } from 'react'
import { toggleFavorite, isFavorite } from '../services/userService'
import { getUserPlaylists, createPlaylist, addSongToPlaylist } from '../services/playlistService'
import SongModal from './SongModal'
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
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-modal rounded-3xl w-full max-w-sm shadow-2xl border border-white/15 overflow-hidden animate-pop-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="font-extrabold text-lg text-white font-display">Add to Playlist</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">{song.title} — {song.artist}</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
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
            playlists.map(pl => (
              <button
                key={pl.id}
                onClick={() => handleAdd(pl)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-left group"
              >
                <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0 border border-white/10 group-hover:border-brand/40">
                  <ListMusic size={16} className="text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-brand transition-colors">{pl.name}</p>
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
                onChange={e => setNewName(e.target.value)}
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
                onClick={() => { setCreating(false); setNewName('') }}
                className="text-gray-400 hover:text-white px-2"
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-brand text-xs font-bold transition-all"
            >
              <Plus size={15} />
              <span>Create New Playlist</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Context Menu ──────────────────────────────────────────────
function SongMenu({ song, queue, onRemove, onClose, anchorRef, onAddToPlaylist, onShowDetails }) {
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
  }, [onClose, anchorRef])

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
    toast.success('Added to playback queue')
    onClose()
  }

  return (
    <div
      ref={menuRef}
      onClick={e => e.stopPropagation()}
      className="absolute z-50 right-0 top-8 w-60 glass-modal border border-white/15 rounded-2xl shadow-2xl overflow-hidden py-1.5 animate-pop-in"
    >
      {/* Song info header */}
      <div className="flex items-center gap-3 px-3.5 py-2.5 border-b border-white/10 mb-1">
        <img src={song.coverUrl || 'https://via.placeholder.com/36'} alt="" className="w-9 h-9 rounded-lg object-cover shadow-sm shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{song.title}</p>
          <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onClose(); onShowDetails() }}
        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
      >
        <Info size={15} className="text-brand" />
        View Song Details & Video
      </button>

      <Link
        to={`/artist/${encodeURIComponent(song.artist)}`}
        onClick={e => { e.stopPropagation(); onClose() }}
        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
      >
        <User size={15} className="text-purple-400" />
        Go to Artist Page
      </Link>

      <button
        onClick={handleFavorite}
        className={`w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-white/10 transition-colors text-left ${
          liked ? 'text-rose-400' : 'text-gray-200 hover:text-white'
        }`}
      >
        <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
        {liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      </button>

      <button
        onClick={handleAddToQueue}
        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
      >
        <ListMusic size={15} />
        Add to Queue
      </button>

      <button
        onClick={e => { e.stopPropagation(); onClose(); onAddToPlaylist() }}
        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
      >
        <ListPlus size={15} />
        Add to Playlist
      </button>

      {onRemove && (
        <>
          <div className="border-t border-white/10 my-1" />
          <button
            onClick={e => { e.stopPropagation(); onRemove(song.id); onClose() }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
          >
            <Trash2 size={15} />
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
  const [showSongModal, setShowSongModal] = useState(false)
  const menuBtnRef = useRef(null)

  const handlePlay = () => {
    if (showPlaylistModal || showSongModal) return
    if (isActive) togglePlay()
    else play(song, queue || [song], queue ? queue.findIndex(s => s.id === song.id) : 0)
  }

  return (
    <>
      {showPlaylistModal && (
        <AddToPlaylistModal song={song} onClose={() => setShowPlaylistModal(false)} />
      )}
      
      {showSongModal && (
        <SongModal song={song} queue={queue} onClose={() => setShowSongModal(false)} />
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`mobile-song-row-container flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 rounded-xl group cursor-pointer transition-all duration-200 ${
          isActive 
            ? 'bg-white/10 border border-brand/30 shadow-sm' 
            : 'hover:bg-white/[0.06] border border-transparent'
        }`}
        onClick={handlePlay}
      >
        {showIndex && (
          <div className="w-5 text-center shrink-0">
            {hovered || isActive ? (
              isActive && isPlaying ? (
                <div className="flex items-end justify-center gap-0.5 h-3.5">
                  <span className="w-0.5 bg-brand rounded-full audio-bar-1" />
                  <span className="w-0.5 bg-brand rounded-full audio-bar-2" />
                  <span className="w-0.5 bg-brand rounded-full audio-bar-3" />
                </div>
              ) : (
                <Play size={14} className="text-white mx-auto" fill="currentColor" />
              )
            ) : (
              <span className={`text-xs font-semibold ${isActive ? 'text-brand' : 'text-gray-500'}`}>
                {index + 1}
              </span>
            )}
          </div>
        )}

        <img
          src={song.coverUrl || 'https://via.placeholder.com/40'}
          alt={song.title}
          className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? 'text-brand' : 'text-white'}`}>
            {song.title}
          </p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            <Link
              to={`/artist/${encodeURIComponent(song.artist)}`}
              onClick={e => e.stopPropagation()}
              className="hover:underline hover:text-white transition-colors"
            >
              {song.artist}
            </Link>
          </p>
        </div>

        <p className="text-xs text-gray-500 truncate hidden lg:block w-32 xl:w-40">{song.album}</p>
        <span className="text-xs text-gray-400 w-10 text-right shrink-0">{formatTime(song.duration)}</span>

        <div className="relative shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowSongModal(true)}
            className="p-1.5 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-all"
            title="Song Details"
          >
            <Info size={15} />
          </button>

          <button
            ref={menuBtnRef}
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
            className={`p-1.5 rounded-full transition-all ${
              menuOpen 
                ? 'text-white bg-white/10' 
                : 'text-gray-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white hover:bg-white/10'
            }`}
            aria-label="More actions"
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
              onShowDetails={() => setShowSongModal(true)}
            />
          )}
        </div>
      </div>
    </>
  )
}
