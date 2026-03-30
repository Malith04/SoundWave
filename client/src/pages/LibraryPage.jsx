import { useEffect, useState, useCallback } from 'react'
import { Plus, Heart, Music, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUserPlaylists, createPlaylist } from '../services/playlistService'
import { getUser } from '../services/userService'
import { getSongById } from '../services/songService'
import SongRow from '../components/SongRow'
import toast from 'react-hot-toast'

function CreatePlaylistModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onCreate(name.trim())
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#282828] rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <h2 className="text-xl font-bold">Create Playlist</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Playlist name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My awesome playlist"
              className="w-full bg-[#3e3e3e] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-colors"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-full border border-white/20 text-sm hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2.5 rounded-full bg-brand text-black font-bold text-sm disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('playlists')
  const [playlists, setPlaylists] = useState([])
  const [favSongs, setFavSongs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [likedLoading, setLikedLoading] = useState(false)

  const loadPlaylists = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getUserPlaylists(user.uid)
      setPlaylists(data)
    } catch {
      toast.error('Failed to load playlists')
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadLikedSongs = useCallback(async () => {
    if (!user) return
    setLikedLoading(true)
    try {
      const profile = await getUser(user.uid)
      const ids = profile?.favoriteSongs || []
      if (ids.length === 0) { setFavSongs([]); return }
      const songs = await Promise.all(ids.map(id => getSongById(id)))
      setFavSongs(songs.filter(Boolean))
    } catch {
      toast.error('Failed to load liked songs')
    } finally {
      setLikedLoading(false)
    }
  }, [user])

  useEffect(() => { loadPlaylists() }, [loadPlaylists])

  useEffect(() => {
    if (tab === 'liked') loadLikedSongs()
  }, [tab, loadLikedSongs])

  const handleCreate = async name => {
    try {
      await createPlaylist(user.uid, name)
      await loadPlaylists()
      toast.success('Playlist created')
    } catch {
      toast.error('Failed to create playlist')
    }
  }

  return (
    <div className="p-6">
      {showModal && (
        <CreatePlaylistModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Library</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand text-black font-semibold px-4 py-2 rounded-full text-sm hover:bg-brand-dark transition-colors"
        >
          <Plus size={16} /> New Playlist
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {['playlists', 'liked'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tab === t ? 'bg-white text-black' : 'bg-surface-2 text-gray-300 hover:bg-white/10'
            }`}
          >
            {t === 'liked' ? '❤️ Liked Songs' : '🎵 Playlists'}
          </button>
        ))}
      </div>

      {tab === 'playlists' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-16 text-gray-500">Loading...</div>
          ) : playlists.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              <Music size={48} className="mx-auto mb-3 opacity-20" />
              <p>No playlists yet</p>
              <button onClick={() => setShowModal(true)} className="mt-3 text-brand text-sm hover:underline">
                Create one
              </button>
            </div>
          ) : (
            playlists.map(pl => (
              <Link
                key={pl.id}
                to={`/playlist/${pl.id}`}
                className="bg-surface-2 hover:bg-white/5 rounded-xl p-4 transition-colors group"
              >
                <div className="w-full aspect-square bg-surface rounded-lg flex items-center justify-center mb-3">
                  <Music size={32} className="text-gray-500" />
                </div>
                <p className="font-medium text-sm truncate">{pl.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{pl.songIds?.length || 0} songs</p>
              </Link>
            ))
          )}
        </div>
      )}

      {tab === 'liked' && (
        <div>
          {likedLoading ? (
            <div className="text-center py-16 text-gray-500">Loading liked songs...</div>
          ) : favSongs.length > 0 ? (
            <div className="space-y-1">
              {favSongs.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} queue={favSongs} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <Heart size={48} className="mx-auto mb-3 opacity-20" />
              <p>No liked songs yet</p>
              <p className="text-sm mt-1">Click the ❤️ on any song to save it here</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
