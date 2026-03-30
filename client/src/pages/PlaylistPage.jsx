import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Shuffle, Pencil, Trash2 } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { getSongById } from '../services/songService'
import { deletePlaylist, renamePlaylist } from '../services/playlistService'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'
import toast from 'react-hot-toast'

export default function PlaylistPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { play } = usePlayer()
  const [playlist, setPlaylist] = useState(null)
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'playlists', id))
      if (!snap.exists()) { navigate('/library'); return }
      const pl = { id: snap.id, ...snap.data() }
      setPlaylist(pl)
      const loaded = await Promise.all((pl.songIds || []).map(sid => getSongById(sid)))
      setSongs(loaded.filter(Boolean))
      setLoading(false)
    }
    load()
  }, [id])

  const handlePlay = (shuffle = false) => {
    if (!songs.length) return
    const queue = shuffle ? [...songs].sort(() => Math.random() - 0.5) : songs
    play(queue[0], queue, 0)
  }

  const handleRename = async () => {
    const name = prompt('New name:', playlist.name)
    if (!name?.trim() || name === playlist.name) return
    await renamePlaylist(id, name.trim())
    setPlaylist(p => ({ ...p, name: name.trim() }))
    toast.success('Renamed')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this playlist?')) return
    await deletePlaylist(id)
    toast.success('Playlist deleted')
    navigate('/library')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="flex items-end gap-6 mb-8">
        <div className="w-48 h-48 bg-gradient-to-br from-surface-3 to-surface-4 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-6xl">🎵</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Playlist</p>
          <h1 className="text-4xl font-bold mb-2 truncate">{playlist.name}</h1>
          <p className="text-gray-400 text-sm">{songs.length} songs</p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => handlePlay(false)}
              className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-full transition-all"
            >
              <Play size={18} fill="black" /> Play
            </button>
            <button
              onClick={() => handlePlay(true)}
              className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 px-5 py-3 rounded-full text-sm font-medium transition-colors"
            >
              <Shuffle size={16} /> Shuffle
            </button>
            <button onClick={handleRename} className="p-2 text-gray-400 hover:text-white transition-colors">
              <Pencil size={18} />
            </button>
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Songs */}
      {songs.length > 0 ? (
        <div className="space-y-1">
          {songs.map((song, i) => (
            <SongRow key={song.id} song={song} index={i} queue={songs} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-12">This playlist is empty</p>
      )}
    </div>
  )
}
