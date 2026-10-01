import { useState, useEffect, useRef } from 'react'
import { Search, X, Music, Clock } from 'lucide-react'
import { searchAll } from '../services/musicApi'
import { getSearchHistory, addToSearchHistory, clearSearchHistory } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import SongRow from '../components/SongRow'

const SOURCE_LABELS = {
  itunes:  { label: '30s Preview', color: 'bg-blue-500/20 text-blue-400' },
  jamendo: { label: 'Full Track',  color: 'bg-brand/20 text-brand' },
}

export default function SearchPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ itunes: [], jamendo: [], all: [] })
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const debounceRef = useRef(null)

  const historyKey = user?.uid ? `sw_search_history_${user.uid}` : 'sw_search_history_guest'

  // Load user-isolated search history on mount / user change
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(historyKey)) || []
      setHistory(cached)
    } catch (_) {
      setHistory([])
    }

    if (user?.uid) {
      getSearchHistory().then(backendHistory => {
        if (Array.isArray(backendHistory) && backendHistory.length > 0) {
          setHistory(backendHistory)
          try {
            localStorage.setItem(historyKey, JSON.stringify(backendHistory))
          } catch (_) {}
        }
      })
    }
  }, [user?.uid, historyKey])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults({ itunes: [], jamendo: [], all: [] })
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await searchAll(trimmed)
      setResults(res)
      setLoading(false)
    }, 450)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const commitSearchHistory = (searchTerm) => {
    const term = (searchTerm !== undefined ? searchTerm : query).trim()
    if (!term || term.length < 2) return
    addToSearchHistory(term)
    setHistory(prev => {
      const next = [term, ...prev.filter(h => h.toLowerCase() !== term.toLowerCase())].slice(0, 10)
      try { localStorage.setItem(historyKey, JSON.stringify(next)) } catch (_) {}
      return next
    })
  }

  const handleSearchSubmit = (e, explicitTerm) => {
    if (e && e.preventDefault) e.preventDefault()
    const term = (explicitTerm !== undefined ? explicitTerm : query).trim()
    if (!term) return

    // Save history ONLY on explicit user submit (Enter key, search icon click, or clicking a history tag)
    commitSearchHistory(term)

    if (term.length >= 2) {
      clearTimeout(debounceRef.current)
      setLoading(true)
      searchAll(term).then(res => {
        setResults(res)
        setLoading(false)
      })
    }
  }

  const removeHistory = (term) => {
    const next = history.filter(h => h !== term)
    try { localStorage.setItem(historyKey, JSON.stringify(next)) } catch (_) {}
    setHistory(next)
  }

  const clearAllHistory = async () => {
    await clearSearchHistory()
    try { localStorage.removeItem(historyKey) } catch (_) {}
    setHistory([])
  }

  const displayed = tab === 'all' ? results.all : results[tab] || []

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-16 max-w-7xl mx-auto animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 tracking-tight">Search</h1>

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mb-6">
        <button
          type="submit"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
          title="Search"
          aria-label="Search"
        >
          <Search size={18} />
        </button>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              handleSearchSubmit(e)
            }
          }}
          placeholder="Search songs, artists, albums..."
          className="w-full bg-white text-black placeholder-gray-500 rounded-full pl-11 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand shadow-sm transition-shadow"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults({ itunes: [], jamendo: [], all: [] })
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black p-1 transition-colors"
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </form>

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
                  type="button"
                  onClick={() => {
                    setQuery(term)
                    handleSearchSubmit(null, term)
                  }}
                  className="text-sm text-gray-300 group-hover:text-white transition-colors"
                >
                  {term}
                </button>
                <button
                  type="button"
                  onClick={() => removeHistory(term)}
                  className="text-gray-600 hover:text-gray-300 transition-colors ml-0.5 p-0.5"
                  title={`Remove ${term}`}
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
