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

import AddToPlaylistModal from './AddToPlaylistModal'


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
        className={`mobile-song-row-container flex items-center gap-2 xs:gap-3 sm:gap-4 px-2 xs:px-3 sm:px-4 py-2 xs:py-2.5 rounded-xl group cursor-pointer transition-all duration-200 ${
          isActive 
            ? 'bg-white/10 border border-brand/30 shadow-sm' 
            : 'hover:bg-white/[0.06] border border-transparent'
        }`}
        onClick={handlePlay}
      >
        {showIndex && (
          <div className="w-4 xs:w-5 text-center shrink-0">
            {hovered || isActive ? (
              isActive && isPlaying ? (
                <div className="flex items-end justify-center gap-0.5 h-3.5">
                  <span className="w-0.5 bg-brand rounded-full audio-bar-1" />
                  <span className="w-0.5 bg-brand rounded-full audio-bar-2" />
                  <span className="w-0.5 bg-brand rounded-full audio-bar-3" />
                </div>
              ) : (
                <Play size={13} className="text-white mx-auto" fill="currentColor" />
              )
            ) : (
              <span className={`text-[11px] xs:text-xs font-semibold ${isActive ? 'text-brand' : 'text-gray-500'}`}>
                {index + 1}
              </span>
            )}
          </div>
        )}

        <img
          src={song.coverUrl || 'https://via.placeholder.com/40'}
          alt={song.title}
          className="w-9 h-9 xs:w-10 xs:h-10 rounded-lg object-cover shadow-sm shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className={`text-xs xs:text-sm font-semibold truncate ${isActive ? 'text-brand' : 'text-white'}`}>
            {song.title}
          </p>
          <p className="text-[11px] xs:text-xs text-gray-400 truncate mt-0.5">
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
        <span className="text-[11px] xs:text-xs text-gray-400 w-8 xs:w-10 text-right shrink-0">{formatTime(song.duration)}</span>

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
