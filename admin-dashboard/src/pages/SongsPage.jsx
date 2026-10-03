import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, Trash2, Music, RefreshCw, Radio, Sparkles } from 'lucide-react'
import { getSongs, deleteSong } from '../services/songService'
import { getTopChart, getJamendoTrending, searchAll } from '../services/musicApi'
import UploadSongModal from '../components/UploadSongModal'
import toast from 'react-hot-toast'

const TABS = [
  { key: 'firestore', label: 'Uploaded & Cloud' },
  { key: 'itunes',    label: 'iTunes Global Top' },
  { key: 'jamendo',   label: 'Jamendo Creative Commons' },
]

function SourceBadge({ source }) {
  const map = {
    jamendo:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
    itunes:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    uploaded: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  }
  const label = source === 'jamendo' ? 'Jamendo' : source === 'itunes' ? 'iTunes' : 'Uploaded'
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${map[source] || map.uploaded}`}>
      {label}
    </span>
  )
}

function SongTable({ songs, loading, error, onDelete, showDelete = false }) {
  if (loading) {
    return (
      <div className="p-16 text-center text-gray-500 text-xs flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        <span>Loading catalog tracks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <p className="text-red-400 font-bold mb-1 text-sm">Failed to load songs</p>
        <p className="text-gray-400 text-xs">{error}</p>
      </div>
    )
  }

  if (songs.length === 0) {
    return (
      <div className="p-16 text-center text-gray-500 text-xs">
        <Music size={40} className="mx-auto mb-3 opacity-25" />
        No songs found in this category
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-gray-400 text-[11px] uppercase tracking-wider bg-white/[0.02]">
            <th className="p-4 font-bold w-12 text-center">#</th>
            <th className="p-4 font-bold">Track Title</th>
            <th className="p-4 font-bold hidden md:table-cell">Artist</th>
            <th className="p-4 font-bold hidden lg:table-cell">Genre</th>
            <th className="p-4 font-bold hidden lg:table-cell">Source</th>
            <th className="p-4 font-bold hidden sm:table-cell">Duration</th>
            {showDelete && <th className="p-4 font-bold text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {songs.map((song, i) => (
            <tr key={song.id || i} className="hover:bg-white/[0.03] transition-colors group">
              <td className="p-4 text-gray-500 font-mono text-center">{i + 1}</td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={song.coverUrl || 'https://via.placeholder.com/40'}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover shrink-0 bg-black/40 border border-white/10 shadow-sm"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate max-w-[220px] group-hover:text-brand transition-colors">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate md:hidden">{song.artist}</p>
                  </div>
                </div>
              </td>
              <td className="p-4 text-gray-300 font-medium hidden md:table-cell">{song.artist}</td>
              <td className="p-4 hidden lg:table-cell">
                {song.genre ? (
                  <span className="bg-white/5 border border-white/10 text-gray-300 text-[10px] px-2 py-0.5 rounded-md font-medium">
                    {song.genre}
                  </span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
              <td className="p-4 hidden lg:table-cell">
                <SourceBadge source={song.source || 'uploaded'} />
              </td>
              <td className="p-4 text-gray-400 font-mono hidden sm:table-cell">
                {song.duration
                  ? `${Math.floor(song.duration / 60000)}:${String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}`
                  : '—'}
              </td>
              {showDelete && (
                <td className="p-4 text-right">
                  <button
                    onClick={() => onDelete(song)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Delete Track"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SongsPage() {
  const [tab, setTab] = useState('firestore')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)

  const [fsSongs, setFsSongs]     = useState([])
  const [fsLoading, setFsLoading] = useState(true)
  const [fsError, setFsError]     = useState(null)

  const [itSongs, setItSongs]     = useState([])
  const [itLoading, setItLoading] = useState(true)
  const [itError, setItError]     = useState(null)

  const [jmSongs, setJmSongs]     = useState([])
  const [jmLoading, setJmLoading] = useState(true)
  const [jmError, setJmError]     = useState(null)

  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

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

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearchLoading(true)
      const results = await searchAll(search)
      setSearchResults(results)
      setSearchLoading(false)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const handleDelete = async song => {
    if (!confirm(`Delete "${song.title}"?`)) return
    await deleteSong(song)
    toast.success('Song deleted successfully')
    loadFirestore()
  }

  const isSearching = search.trim().length > 0

  const tabSongs = () => {
    if (tab === 'firestore') return fsSongs
    if (tab === 'itunes')    return itSongs
    return jmSongs
  }
  const tabLoading = tab === 'firestore' ? fsLoading : tab === 'itunes' ? itLoading : jmLoading
  const tabError   = tab === 'firestore' ? fsError   : tab === 'itunes' ? itError   : jmError

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* ── Top Action Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
            Song Catalog & Media
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Browse and manage audio files from Jamendo, iTunes, and cloud uploads.
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-hover hover:to-emerald-300 text-black font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-brand/20 hover:scale-105 active:scale-95 text-xs uppercase tracking-wider shrink-0"
        >
          <Plus size={16} />
          <span>Upload Track</span>
        </button>
      </div>

      {/* ── Tabs & Search Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/5 w-fit">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSearch('') }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === key && !isSearching
                  ? 'bg-brand text-black shadow-md shadow-brand/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all music sources..."
            className="w-full bg-[#12141c] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </div>
      </div>

      {/* ── Table Container ── */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {isSearching ? (
          <div>
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">Search results for "{search}"</span>
              <span className="text-brand font-bold">{searchResults.length} tracks found</span>
            </div>
            <SongTable songs={searchResults} loading={searchLoading} />
          </div>
        ) : (
          <SongTable
            songs={tabSongs()}
            loading={tabLoading}
            error={tabError}
            onDelete={handleDelete}
            showDelete={tab === 'firestore'}
          />
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadSongModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); loadFirestore() }}
        />
      )}
    </div>
  )
}
