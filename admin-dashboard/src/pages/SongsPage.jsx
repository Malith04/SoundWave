import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Music, RefreshCw } from 'lucide-react'
import { getSongs, deleteSong } from '../services/songService'
import { getTopChart, getJamendoTrending, searchAll } from '../services/musicApi'
import UploadSongModal from '../components/UploadSongModal'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'firestore', label: '🗄️ Uploaded' },
  { key: 'itunes',    label: '🎵 iTunes Top' },
  { key: 'jamendo',   label: '🎸 Jamendo' },
]

function SourceBadge({ source }) {
  const map = {
    jamendo:  'bg-blue-500/10 text-blue-400',
    itunes:   'bg-orange-500/10 text-orange-400',
    uploaded: 'bg-white/10 text-gray-400',
  }
  const label = source === 'jamendo' ? 'Jamendo' : source === 'itunes' ? 'iTunes' : 'Uploaded'
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${map[source] || map.uploaded}`}>
      {label}
    </span>
  )
}

function SongTable({ songs, loading, error, onDelete, showDelete = false }) {
  if (loading) return <div className="p-12 text-center text-gray-500">Loading...</div>
  if (error)   return (
    <div className="p-12 text-center">
      <p className="text-red-400 font-semibold mb-1">Failed to load</p>
      <p className="text-gray-500 text-sm">{error}</p>
    </div>
  )
  if (songs.length === 0) return (
    <div className="p-12 text-center text-gray-500">
      <Music size={40} className="mx-auto mb-3 opacity-20" />
      No songs found
    </div>
  )

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-white/5 text-gray-500 text-xs uppercase">
          <th className="text-left p-4 font-medium">#</th>
          <th className="text-left p-4 font-medium">Song</th>
          <th className="text-left p-4 font-medium hidden md:table-cell">Artist</th>
          <th className="text-left p-4 font-medium hidden lg:table-cell">Genre</th>
          <th className="text-left p-4 font-medium hidden lg:table-cell">Source</th>
          <th className="text-left p-4 font-medium hidden lg:table-cell">Duration</th>
          {showDelete && <th className="text-right p-4 font-medium">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {songs.map((song, i) => (
          <tr key={song.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
            <td className="p-4 text-gray-500 text-sm">{i + 1}</td>
            <td className="p-4">
              <div className="flex items-center gap-3">
                <img
                  src={song.coverUrl || 'https://via.placeholder.com/40'}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/5"
                />
                <span className="font-medium text-sm truncate max-w-[180px]">{song.title}</span>
              </div>
            </td>
            <td className="p-4 text-gray-400 text-sm hidden md:table-cell">{song.artist}</td>
            <td className="p-4 hidden lg:table-cell">
              {song.genre
                ? <span className="bg-brand/10 text-brand text-xs px-2 py-1 rounded-full">{song.genre}</span>
                : <span className="text-gray-600 text-xs">—</span>
              }
            </td>
            <td className="p-4 hidden lg:table-cell">
              <SourceBadge source={song.source || 'uploaded'} />
            </td>
            <td className="p-4 text-gray-500 text-sm hidden lg:table-cell">
              {song.duration ? `${Math.floor(song.duration / 60000)}:${String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}` : '—'}
            </td>
            {showDelete && (
              <td className="p-4 text-right">
                <button
                  onClick={() => onDelete(song)}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function SongsPage() {
  const [tab, setTab] = useState('firestore')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  // Firestore songs
  const [fsSongs, setFsSongs]     = useState([])
  const [fsLoading, setFsLoading] = useState(true)
  const [fsError, setFsError]     = useState(null)

  // iTunes songs
  const [itSongs, setItSongs]     = useState([])
  const [itLoading, setItLoading] = useState(true)
  const [itError, setItError]     = useState(null)

  // Jamendo songs
  const [jmSongs, setJmSongs]     = useState([])
  const [jmLoading, setJmLoading] = useState(true)
  const [jmError, setJmError]     = useState(null)

  // Search results
  const [searchResults, setSearchResults]   = useState([])
  const [searchLoading, setSearchLoading]   = useState(false)
  const [searchQuery, setSearchQuery]       = useState('')

  const loadFirestore = useCallback(async () => {
    setFsLoading(true); setFsError(null)
    try { setFsSongs(await getSongs()) }
    catch (e) { setFsError(e.code === 'permission-denied' ? 'Firestore rules not published yet.' : e.message) }
    finally { setFsLoading(false) }
  }, [])

  const loadItunes = useCallback(async () => {
    setItLoading(true); setItError(null)
    try { setItSongs(await getTopChart(50)) }
    catch (e) { setItError(e.message) }
    finally { setItLoading(false) }
  }, [])

  const loadJamendo = useCallback(async () => {
    setJmLoading(true); setJmError(null)
    try { setJmSongs(await getJamendoTrending(50)) }
    catch (e) { setJmError(e.message) }
    finally { setJmLoading(false) }
  }, [])

  useEffect(() => { loadFirestore() }, [loadFirestore])
  useEffect(() => { loadItunes() },   [loadItunes])
  useEffect(() => { loadJamendo() },  [loadJamendo])

  // Debounced search across all sources
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setSearchQuery(''); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      setSearchQuery(search)
      const results = await searchAll(search)
      setSearchResults(results)
      setSearchLoading(false)
    }, 500)
    return () => clearTimeout(t)
  }, [search])

  const handleDelete = async song => {
    if (!confirm(`Delete "${song.title}"?`)) return
    await deleteSong(song)
    toast.success('Song deleted')
    loadFirestore()
  }

  const isSearching = search.trim().length > 0

  // Which songs to show in current tab
  const tabSongs = () => {
    if (tab === 'firestore') return fsSongs
    if (tab === 'itunes')    return itSongs
    return jmSongs
  }
  const tabLoading = tab === 'firestore' ? fsLoading : tab === 'itunes' ? itLoading : jmLoading
  const tabError   = tab === 'firestore' ? fsError   : tab === 'itunes' ? itError   : jmError

  const totalCount = fsSongs.length + itSongs.length + jmSongs.length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Songs</h1>
          <p className="text-gray-400 text-sm">{totalCount} songs across all sources</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-black font-semibold px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus size={18} /> Upload Song
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search across iTunes + Jamendo + uploaded songs..."
          className="w-full bg-d1 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">
            ✕
          </button>
        )}
      </div>

      {isSearching ? (
        /* ── Search results ── */
        <div className="bg-d1 rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-sm text-gray-400">
            {searchLoading ? 'Searching...' : `${searchResults.length} results for "${searchQuery}"`}
          </div>
          <SongTable songs={searchResults} loading={searchLoading} error={null} showDelete={false} />
        </div>
      ) : (
        /* ── Tabs ── */
        <>
          <div className="flex gap-1 mb-4 bg-d1 p-1 rounded-xl w-fit">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.key ? 'bg-brand text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
                <span className="ml-1.5 text-xs opacity-60">
                  ({t.key === 'firestore' ? fsSongs.length : t.key === 'itunes' ? itSongs.length : jmSongs.length})
                </span>
              </button>
            ))}
            <button
              onClick={() => { loadFirestore(); loadItunes(); loadJamendo() }}
              className="ml-1 p-2 text-gray-500 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="bg-d1 rounded-2xl border border-white/5 overflow-hidden">
            <SongTable
              songs={tabSongs()}
              loading={tabLoading}
              error={tabError}
              onDelete={handleDelete}
              showDelete={tab === 'firestore'}
            />
          </div>
        </>
      )}

      {showUpload && <UploadSongModal onClose={() => setShowUpload(false)} onSuccess={loadFirestore} />}
    </div>
  )
}
