import { useState, useEffect, useRef } from 'react'
import { Search, X, Music, Clock } from 'lucide-react'
import { searchAll } from '../services/musicApi'
import SongRow from '../components/SongRow'

const SOURCE_LABELS = {
  itunes:  { label: '30s Preview', color: 'bg-blue-500/20 text-blue-400' },
  jamendo: { label: 'Full Track',  color: 'bg-brand/20 text-brand' },
}

const HISTORY_KEY = 'sw_search_history'
const MAX_HISTORY = 8

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [] } catch { return [] }
}

function saveHistory(term) {
  const prev = loadHistory().filter(h => h !== term)
  const next = [term, ...prev].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ itunes: [], jamendo: [], all: [] })
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState(loadHistory)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults({ itunes: [], jamendo: [], all: [] })
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await searchAll(query)
      setResults(res)
      setLoading(false)
      if (res.all.length > 0) {
        saveHistory(query.trim())
        setHistory(loadHistory())
      }
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const removeHistory = (term) => {
    const next = history.filter(h => h !== term)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    setHistory(next)
  }

  const clearAllHistory = () => {
    localStorage.removeItem(HISTORY_KEY)
    setHistory([])
  }

  const displayed = tab === 'all' ? results.all : results[tab] || []

  return (
    <div className="px-6 py-6">
      <h1 className="text-3xl font-bold mb-6">Search</h1>

      {/* Search bar */}
      <div className="relative max-w-2xl mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums..."
          className="w-full bg-white text-black placeholder-gray-500 rounded-full pl-11 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Search history — shown only when no query */}
      {!query && history.length > 0 && (
        <div className="max-w-2xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-300">Recent searches</p>
            <button onClick={clearAllHistory} className="text-xs text-gray-500 hover:text-white transition-colors">
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map(term => (
              <div key={term} className="flex items-center gap-1.5 bg-surface-2 hover:bg-surface-3 rounded-full pl-3 pr-2 py-1.5 transition-colors group">
                <Clock size={12} className="text-gray-500 shrink-0" />
                <button
                  onClick={() => setQuery(term)}
                  className="text-sm text-gray-300 group-hover:text-white transition-colors"
                >
                  {term}
                </button>
                <button
                  onClick={() => removeHistory(term)}
                  className="text-gray-600 hover:text-gray-300 transition-colors ml-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      {results.all.length > 0 && (
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all',     label: `All (${results.all.length})` },
            { key: 'itunes',  label: `🎧 Previews (${results.itunes.length})` },
            { key: 'jamendo', label: `🎵 Full Tracks (${results.jamendo.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-black' : 'bg-surface-2 text-gray-300 hover:bg-surface-3'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-16">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Searching millions of tracks...</span>
        </div>
      )}

      {/* Results */}
      {!loading && displayed.length > 0 && (
        <div className="space-y-1">
          {displayed.map((song, i) => (
            <div key={song.id} className="flex items-center gap-2 group">
              <div className="flex-1 min-w-0">
                <SongRow song={song} index={i} queue={displayed} showIndex />
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${SOURCE_LABELS[song.source]?.color}`}>
                {SOURCE_LABELS[song.source]?.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && query.length >= 2 && results.all.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Search size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg">No results for "{query}"</p>
          <p className="text-sm mt-1 text-gray-600">Try a different spelling or artist name</p>
        </div>
      )}

      {/* Initial hint */}
      {!query && history.length === 0 && (
        <div className="text-center py-16 text-gray-600">
          <Music size={56} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg text-gray-400">Find your next favourite song</p>
          <p className="text-sm mt-2">Search across iTunes & Jamendo — millions of tracks</p>
        </div>
      )}
    </div>
  )
}
