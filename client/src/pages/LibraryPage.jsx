import { useEffect, useState, useCallback } from 'react'
import { Plus, Heart, Music, X, Clock, Play, LayoutGrid, List } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import { getUserPlaylists, createPlaylist } from '../services/playlistService'
import { getUser, getFavoriteSongs, getRecentlyPlayed } from '../services/userService'
import { getSongById } from '../services/songService'
import SongRow from '../components/SongRow'
import CreatePlaylistModal from '../components/CreatePlaylistModal'
import toast from 'react-hot-toast'

function PlaylistCover({ songIds }) {
  const [covers, setCovers] = useState([])
  useEffect(() => {
    if (!songIds?.length) return
    Promise.all(songIds.slice(0, 4).map(id => getSongById(id)))
      .then(songs => setCovers(songs.filter(Boolean).map(s => s.coverUrl).filter(Boolean)))
  }, [songIds?.join(',')])

  if (covers.length === 0) return (
    <div className="w-full aspect-square bg-surface-3 rounded-lg flex items-center justify-center">
      <Music size={28} className="text-gray-500" />
    </div>
  )
  if (covers.length < 4) return (
    <img src={covers[0]} alt="" className="w-full aspect-square object-cover rounded-lg" />
  )
  return (
    <div className="w-full aspect-square grid grid-cols-2 rounded-lg overflow-hidden">
      {covers.slice(0, 4).map((c, i) => <img key={i} src={c} alt="" className="w-full h-full object-cover" />)}
    </div>
  )
}


export default function LibraryPage() {
  const { user } = useAuth()
  const { play } = usePlayer()
  const [tab, setTab] = useState('playlists')
  const [view, setView] = useState('grid') // 'grid' | 'list'
  const [playlists, setPlaylists] = useState([])
  const [favSongs, setFavSongs] = useState([])
  const [recentSongs, setRecentSongs] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [songsLoading, setSongsLoading] = useState(false)

  const loadPlaylists = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try { setPlaylists(await getUserPlaylists(user.uid)) }
    catch { toast.error('Failed to load playlists') }
    finally { setLoading(false) }
  }, [user])

  const loadSongs = useCallback(async (type) => {
    if (!user) return
    setSongsLoading(true)
    try {
      if (type === 'liked') {
        const songs = await getFavoriteSongs()
        setFavSongs(songs)
      } else {
        const songs = await getRecentlyPlayed()
        setRecentSongs(songs)
      }
    } catch { toast.error('Failed to load songs') }
    finally { setSongsLoading(false) }
  }, [user])

  useEffect(() => { loadPlaylists() }, [loadPlaylists])
  useEffect(() => { if (tab === 'liked') loadSongs('liked'); if (tab === 'recent') loadSongs('recent') }, [tab])

  const handleCreate = async name => {
    try { await createPlaylist(user.uid, name); await loadPlaylists(); toast.success('Playlist created') }
    catch { toast.error('Failed to create playlist') }
  }

  const TABS = [
    { id: 'playlists', label: '🎵 Playlists' },
    { id: 'liked',     label: '❤️ Liked Songs' },
    { id: 'recent',    label: '🕐 Recently Played' },
  ]

  return (
    <div className="px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 pb-16 max-w-7xl mx-auto animate-fade-in">
      <CreatePlaylistModal isOpen={showModal} onClose={() => setShowModal(false)} onCreate={handleCreate} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Your Library</h1>
        <div className="flex items-center gap-1.5 xs:gap-2">
          {tab === 'playlists' && (
            <>
              <button onClick={() => setView(v => v === 'grid' ? 'list' : 'grid')}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                title={view === 'grid' ? 'List view' : 'Grid view'}>
                {view === 'grid' ? <List size={18} /> : <LayoutGrid size={18} />}
              </button>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 xs:gap-2 bg-brand text-black font-semibold px-3 xs:px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-brand-dark transition-all active:scale-95 shadow-md shadow-brand/20">
                <Plus size={14} /> <span className="hidden sm:inline">New Playlist</span><span className="sm:hidden">New</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-white text-black font-semibold shadow-sm' : 'bg-surface-2 text-gray-300 hover:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Playlists */}
      {tab === 'playlists' && (
        <>
          {loading ? <div className="text-center py-16 text-gray-500">Loading...</div>
          : playlists.length === 0 ? (
            <div className="text-center py-12 sm:py-16 text-gray-500">
              <Music size={40} className="sm:hidden mx-auto mb-3 opacity-20" />
              <Music size={48} className="hidden sm:block mx-auto mb-3 opacity-20" />
              <p className="text-sm sm:text-base">No playlists yet</p>
              <button onClick={() => setShowModal(true)} className="mobile-touch-target mt-3 text-brand text-sm hover:underline">Create one</button>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {playlists.map(pl => (
                <Link key={pl.id} to={`/playlist/${pl.id}`}
                  className="bg-surface-2 hover:bg-surface-3 rounded-xl p-3 sm:p-4 transition-all hover:scale-[1.02] group">
                  <div className="mb-3 relative">
                    <PlaylistCover songIds={pl.songIds} />
                    <button onClick={e => { e.preventDefault(); /* play */ }}
                      className="mobile-touch-target absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 bg-brand rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
                      <Play size={14} className="sm:hidden ml-0.5" fill="black" />
                      <Play size={16} className="hidden sm:block ml-0.5" fill="black" />
                    </button>
                  </div>
                  <p className="font-semibold text-xs sm:text-sm break-words">{pl.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{pl.songIds?.length || 0} songs</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {playlists.map(pl => (
                <Link key={pl.id} to={`/playlist/${pl.id}`}
                  className="mobile-song-row-container flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg overflow-hidden">
                    <PlaylistCover songIds={pl.songIds} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm break-words">{pl.name}</p>
                    <p className="text-xs text-gray-500">Playlist · {pl.songIds?.length || 0} songs</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Liked Songs */}
      {tab === 'liked' && (
        <div>
          {songsLoading ? <div className="text-center py-16 text-gray-500">Loading...</div>
          : favSongs.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => play(favSongs[0], favSongs, 0)}
                  className="mobile-touch-target flex items-center gap-2 bg-brand text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-brand-dark transition-colors text-sm sm:text-base">
                  <Play size={16} className="sm:hidden" fill="black" />
                  <Play size={18} className="hidden sm:block" fill="black" />
                  Play All
                </button>
                <span className="text-gray-400 text-xs sm:text-sm">{favSongs.length} songs</span>
              </div>
              <div className="space-y-1">
                {favSongs.map((song, i) => <SongRow key={song.id} song={song} index={i} queue={favSongs} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-12 sm:py-16 text-gray-500">
              <Heart size={40} className="sm:hidden mx-auto mb-3 opacity-20" />
              <Heart size={48} className="hidden sm:block mx-auto mb-3 opacity-20" />
              <p className="text-sm sm:text-base">No liked songs yet</p>
              <p className="text-xs sm:text-sm mt-1">Click ❤️ on any song to save it here</p>
            </div>
          )}
        </div>
      )}

      {/* Recently Played */}
      {tab === 'recent' && (
        <div>
          {songsLoading ? <div className="text-center py-16 text-gray-500">Loading...</div>
          : recentSongs.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => play(recentSongs[0], recentSongs, 0)}
                  className="mobile-touch-target flex items-center gap-2 bg-brand text-black font-bold px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-brand-dark transition-colors text-sm sm:text-base">
                  <Play size={16} className="sm:hidden" fill="black" />
                  <Play size={18} className="hidden sm:block" fill="black" />
                  Play All
                </button>
                <span className="text-gray-400 text-xs sm:text-sm">{recentSongs.length} songs</span>
              </div>
              <div className="space-y-1">
                {recentSongs.map((song, i) => <SongRow key={song.id} song={song} index={i} queue={recentSongs} />)}
              </div>
            </>
          ) : (
            <div className="text-center py-12 sm:py-16 text-gray-500">
              <Clock size={40} className="sm:hidden mx-auto mb-3 opacity-20" />
              <Clock size={48} className="hidden sm:block mx-auto mb-3 opacity-20" />
              <p className="text-sm sm:text-base">No listening history yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
