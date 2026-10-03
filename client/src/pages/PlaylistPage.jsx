import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Shuffle, Pencil, Trash2, ChevronUp, ChevronDown, X, Music } from 'lucide-react'
import { getPlaylist, deletePlaylist, renamePlaylist, removeSongFromPlaylist, reorderPlaylistSongs } from '../services/playlistService'
import { getSongById } from '../services/songService'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'
import CreatePlaylistModal from '../components/CreatePlaylistModal'
import toast from 'react-hot-toast'

// ── Playlist cover: 1 song = its cover, 2-4 = grid, else first 4 grid ──
function PlaylistCover({ songs }) {
  const covers = songs.slice(0, 4).map(s => s.coverUrl).filter(Boolean)

  if (covers.length === 0) {
    return (
      <div className="w-28 h-28 xs:w-36 xs:h-36 sm:w-48 sm:h-48 bg-gradient-to-br from-surface-3 to-surface-4 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
        <Music size={32} className="sm:hidden text-gray-500" />
        <Music size={56} className="hidden sm:block text-gray-500" />
      </div>
    )
  }

  if (covers.length === 1) {
    return (
      <img src={covers[0]} alt="Playlist cover"
        className="w-28 h-28 xs:w-36 xs:h-36 sm:w-48 sm:h-48 rounded-xl object-cover shrink-0 shadow-lg" />
    )
  }

  // 2x2 grid for 2–4 covers
  const grid = [...covers]
  while (grid.length < 4) grid.push(grid[0])
  return (
    <div className="w-28 h-28 xs:w-36 xs:h-36 sm:w-48 sm:h-48 rounded-xl overflow-hidden grid grid-cols-2 shrink-0 shadow-lg">
      {grid.slice(0, 4).map((url, i) => (
        <img key={i} src={url} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  )
}

export default function PlaylistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { play } = usePlayer()
  const [playlist, setPlaylist] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [reordering, setReordering] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const pl = await getPlaylist(id)
        if (!pl) { navigate('/library'); return }
        setPlaylist(pl)
        if (pl.songs && pl.songs.length) {
          setSongs(pl.songs)
        } else if (pl.songIds && pl.songIds.length) {
          const loaded = await Promise.all(pl.songIds.map(sid => getSongById(sid)))
          setSongs(loaded.filter(Boolean))
        } else {
          setSongs([])
        }
      } catch (err) {
        navigate('/library')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handlePlay = (shuffle = false) => {
    if (!songs.length) return
    const queue = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs
    play(queue[0], queue, 0)
  }

  const [showRenameModal, setShowRenameModal] = useState(false)

  const handleRename = () => {
    setShowRenameModal(true)
  }

  const handleRenameSubmit = async (newName) => {
    if (!newName?.trim() || newName === playlist.name) return
    await renamePlaylist(id, newName.trim())
    setPlaylist(p => ({ ...p, name: newName.trim() }))
    toast.success('Playlist renamed')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this playlist?')) return
    await deletePlaylist(id)
    toast.success('Playlist deleted')
    navigate('/library')
  }

  const handleRemoveSong = useCallback(async (songId) => {
    await removeSongFromPlaylist(id, songId)
    setSongs(prev => prev.filter(s => s.id !== songId))
    toast.success('Removed from playlist')
  }, [id])

  const moveUp = async (index) => {
    if (index === 0) return
    const next = [...songs]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setSongs(next)
    await reorderPlaylistSongs(id, next.map(s => s.id))
  }

  const moveDown = async (index) => {
    if (index === songs.length - 1) return
    const next = [...songs]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setSongs(next)
    await reorderPlaylistSongs(id, next.map(s => s.id))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 pb-16 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 mb-8 text-center sm:text-left">
        <PlaylistCover songs={songs} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Playlist</p>
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 break-words">{playlist.name}</h1>
          <p className="text-gray-400 text-sm">{songs.length} songs</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-4">
            <button
              onClick={() => handlePlay(false)}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all text-xs xs:text-sm sm:text-base active:scale-95"
            >
              <Play size={16} fill="black" /> Play
            </button>
            <button
              onClick={() => handlePlay(true)}
              className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 px-3 sm:px-5 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-colors active:scale-95"
            >
              <Shuffle size={14} /> Shuffle
            </button>
            <button onClick={handleRename} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Rename">
              <Pencil size={16} />
            </button>
            <button onClick={handleDelete} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 size={16} />
            </button>
            {songs.length > 1 && (
              <button
                onClick={() => setReordering(r => !r)}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                  reordering ? 'bg-brand text-black' : 'bg-surface-2 hover:bg-surface-3 text-gray-300'
                }`}
              >
                {reordering ? 'Done' : 'Reorder'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Songs */}
      {songs.length > 0 ? (
        <div className="space-y-1">
          {songs.map((song, i) => (
            <div key={song.id} className="flex items-center gap-1 group">
              {reordering && (
                <div className="flex flex-col items-center shrink-0">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === songs.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <SongRow
                  key={song.id}
                  song={song}
                  index={i}
                  queue={songs}
                  onRemove={handleRemoveSong}
                />
              </div>
              {reordering && (
                <button
                  onClick={() => handleRemoveSong(song.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">This playlist is empty</p>
      )}
      {showRenameModal && (
        <CreatePlaylistModal
          isOpen={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          onCreate={handleRenameSubmit}
          initialName={playlist?.name || ''}
          title="Rename Playlist"
          buttonText="Save Name"
        />
      )}
    </div>
  )
}
