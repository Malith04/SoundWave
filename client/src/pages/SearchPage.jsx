import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  X,
  Music,
  Clock,
  Sparkles,
  Flame,
  Play,
  Disc,
  Compass,
  Headphones,
  TrendingUp,
  Zap,
  ArrowRight
} from 'lucide-react'
import { searchAll, getTopChart } from '../services/musicApi'
import { searchArtists } from '../services/artistService'
import { getSearchHistory, addToSearchHistory, clearSearchHistory } from '../services/userService'
import { useAuth } from '../context/AuthContext'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'
import ArtistCard from '../components/ArtistCard'

const SOURCE_LABELS = {
  itunes:  { label: '30s Preview', color: 'bg-blue-500/20 text-blue-400' },
  jamendo: { label: 'Full Track',  color: 'bg-brand/20 text-brand' },
}

// ── Curated Artists to Discover ──
const DISCOVERY_ARTISTS = [
  { id: 'dz_12246', name: 'Taylor Swift', picture: 'https://cdn-images.dzcdn.net/images/artist/cc2495870fe1a792ad0cdb05501ad5ec/500x500-000000-80-0-0.jpg', fanCount: 12738289, genre: 'Pop' },
  { id: 'dz_58169', name: 'The Weeknd', picture: 'https://cdn-images.dzcdn.net/images/artist/581693b4724a7fcfa754455101e13a44/500x500-000000-80-0-0.jpg', fanCount: 14715455, genre: 'R&B/Soul' },
  { id: 'dz_24e03', name: 'Drake', picture: 'https://cdn-images.dzcdn.net/images/artist/24e030a21051fa69d4c72170366eb50e/500x500-000000-80-0-0.jpg', fanCount: 10450000, genre: 'Hip-Hop' },
  { id: 'dz_11c29', name: 'Billie Eilish', picture: 'https://cdn-images.dzcdn.net/images/artist/11c29668ec739e802058b4ecaa0802c0/500x500-000000-80-0-0.jpg', fanCount: 9500000, genre: 'Alternative' },
  { id: 'dz_5256e', name: 'Ed Sheeran', picture: 'https://cdn-images.dzcdn.net/images/artist/5256e29712ee80f76022e1b10bd112ee/500x500-000000-80-0-0.jpg', fanCount: 11200000, genre: 'Pop' },
  { id: 'dz_066b5', name: 'Coldplay', picture: 'https://cdn-images.dzcdn.net/images/artist/066b579cfeb174f1f516ec221379f824/500x500-000000-80-0-0.jpg', fanCount: 8800000, genre: 'Rock' },
  { id: 'dz_0270a', name: 'Dua Lipa', picture: 'https://cdn-images.dzcdn.net/images/artist/0270a2f5f11e9f4d7bfa529f7957e841/500x500-000000-80-0-0.jpg', fanCount: 7800000, genre: 'Pop/Dance' },
  { id: 'dz_cf998', name: 'Bruno Mars', picture: 'https://cdn-images.dzcdn.net/images/artist/cf998a44d0b13ceadcc09df8c996615b/500x500-000000-80-0-0.jpg', fanCount: 9200000, genre: 'Funk/Pop' }
]

// ── Curated Playlists & Mood Vibes ──
const DISCOVERY_PLAYLISTS = [
  { id: 'top-hits', title: "Today's Top Hits", desc: 'The biggest global chart-toppers & fresh viral tracks', gradient: 'from-pink-600 via-rose-600 to-amber-600', query: 'Top Hits 2025', emoji: '🔥' },
  { id: 'night-drive', title: 'Late Night Vibes', desc: 'Mellow synthwave, smooth R&B & night drive rhythms', gradient: 'from-purple-700 via-indigo-800 to-blue-900', query: 'Night Drive Synthwave', emoji: '🌆' },
  { id: 'deep-focus', title: 'Focus & Flow State', desc: 'Calm lo-fi beats, ambient piano & zero distractions', gradient: 'from-blue-600 via-cyan-700 to-teal-800', query: 'Lofi Chill Beats', emoji: '🧠' },
  { id: 'beast-workout', title: 'Gym & Workout Hype', desc: 'High-energy electronic, heavy bass & workout motivation', gradient: 'from-amber-500 via-orange-600 to-red-700', query: 'Workout Electronic Bass', emoji: '⚡' },
  { id: 'acoustic-chill', title: 'Coffeehouse Acoustic', desc: 'Warm acoustic guitars, indie singer-songwriters & cozy vibes', gradient: 'from-emerald-600 via-teal-700 to-stone-800', query: 'Acoustic Guitar Indie', emoji: '☕' },
  { id: 'dance-party', title: 'Club & Dance Party', desc: 'Upbeat pop anthems, club bangers & festival drops', gradient: 'from-fuchsia-600 via-pink-700 to-purple-900', query: 'Dance Party Pop Hits', emoji: '🪩' }
]

// ── Quick Suggested Search Chips ──
const QUICK_SUGGESTIONS = [
  { label: '🔥 Top 50 Global', query: 'Top 50' },
  { label: '🎤 Taylor Swift', query: 'Taylor Swift' },
  { label: '🎧 The Weeknd', query: 'The Weeknd' },
  { label: '🌊 Chill Lofi', query: 'Chill Lofi' },
  { label: '🎸 Rock Classics', query: 'Classic Rock' },
  { label: '🎛️ Synthwave', query: 'Synthwave' },
  { label: '☕ Acoustic Morning', query: 'Acoustic Morning' },
  { label: '⚡ Workout EDM', query: 'Workout EDM' }
]

// ── Browse All Genres ──
const DISCOVER_GENRES = [
  { name: 'Pop', color: 'from-pink-500 via-rose-600 to-pink-900', emoji: '🎤', count: '10M+ Tracks' },
  { name: 'Hip-Hop', color: 'from-amber-500 via-yellow-600 to-orange-900', emoji: '🎧', count: '8M+ Tracks' },
  { name: 'Electronic', color: 'from-purple-600 via-indigo-600 to-purple-900', emoji: '🎛️', count: '6M+ Tracks' },
  { name: 'Rock', color: 'from-red-600 via-red-700 to-red-950', emoji: '🎸', count: '5M+ Tracks' },
  { name: 'R&B', color: 'from-violet-600 via-purple-700 to-indigo-900', emoji: '💜', count: '4M+ Tracks' },
  { name: 'Chill', color: 'from-cyan-500 via-blue-600 to-blue-950', emoji: '🌊', count: '3M+ Tracks' },
  { name: 'Jazz', color: 'from-amber-600 via-orange-700 to-stone-900', emoji: '🎷', count: '2M+ Tracks' },
  { name: 'Classical', color: 'from-emerald-600 via-teal-700 to-emerald-950', emoji: '🎻', count: '2M+ Tracks' },
  { name: 'Acoustic', color: 'from-lime-500 via-green-600 to-emerald-900', emoji: '🪕', count: '1M+ Tracks' },
  { name: 'Latin', color: 'from-orange-500 via-rose-600 to-red-800', emoji: '🔥', count: '3M+ Tracks' },
  { name: 'Indie', color: 'from-teal-500 via-emerald-600 to-cyan-900', emoji: '🌿', count: '2M+ Tracks' },
  { name: 'Dance', color: 'from-fuchsia-500 via-pink-600 to-purple-800', emoji: '✨', count: '2M+ Tracks' }
]

export default function SearchPage() {
  const { user } = useAuth()
  const { play } = usePlayer()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ itunes: [], jamendo: [], all: [] })
  const [artists, setArtists] = useState([])
  const [tab, setTab] = useState('all') // 'all' | 'artists' | 'itunes' | 'jamendo'
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const debounceRef = useRef(null)

  // Discover state for new releases
  const [discoverNewReleases, setDiscoverNewReleases] = useState([])
  const [discoverLoading, setDiscoverLoading] = useState(true)

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

  // Load new releases / top tracks for Discover view on mount
  useEffect(() => {
    let isMounted = true
    getTopChart(12)
      .then(tracks => {
        if (isMounted && tracks?.length) {
          setDiscoverNewReleases(tracks)
        }
      })
      .catch(err => {
        console.warn('Failed to load discovery tracks:', err)
      })
      .finally(() => {
        if (isMounted) setDiscoverLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Auto-search on typing
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults({ itunes: [], jamendo: [], all: [] })
      setArtists([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const [songsRes, artistsRes] = await Promise.allSettled([
        searchAll(trimmed),
        searchArtists(trimmed)
      ])
      if (songsRes.status === 'fulfilled') setResults(songsRes.value)
      if (artistsRes.status === 'fulfilled') setArtists(artistsRes.value)
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

    // Save history ONLY on explicit user submit (Enter key, search icon click, or clicking a tag)
    commitSearchHistory(term)

    if (term.length >= 2) {
      clearTimeout(debounceRef.current)
      setLoading(true)
      Promise.allSettled([
        searchAll(term),
        searchArtists(term)
      ]).then(([songsRes, artistsRes]) => {
        if (songsRes.status === 'fulfilled') setResults(songsRes.value)
        if (artistsRes.status === 'fulfilled') setArtists(artistsRes.value)
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
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight text-white font-display">
          Search & Discover
        </h1>
        <p className="text-xs sm:text-sm text-gray-400">
          Find songs, artists, albums, or discover something fresh across global genres
        </p>
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mb-6">
        <button
          type="submit"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black p-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
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
          placeholder="Search songs, artists, albums, playlists..."
          className="w-full bg-white text-black placeholder-gray-500 rounded-full pl-11 pr-10 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand shadow-lg transition-shadow"
          autoFocus
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults({ itunes: [], jamendo: [], all: [] })
              setArtists([])
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black p-1 transition-colors"
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {/* ── Search History (shown only when no active query) ── */}
      {!query && history.length > 0 && (
        <div className="max-w-3xl mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Clock size={13} className="text-brand" />
              <span>Recent Searches</span>
            </p>
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
                  className="text-xs sm:text-sm text-gray-300 group-hover:text-white transition-colors"
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

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── BROWSE & DISCOVER HUB (Displayed when search is empty) ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {!query && (
        <div className="space-y-12 animate-fade-in mt-4">
          {/* 1. Trending Quick Search Chips */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand" />
              <span>Trending & Quick Searches</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setQuery(s.query)
                    handleSearchSubmit(null, s.query)
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-white/10 hover:border-brand/50 text-gray-200 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Featured Artists to Discover */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>🎤</span> Discover Artists
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Explore full discographies, hit songs & official albums</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
              {DISCOVERY_ARTISTS.map(art => (
                <ArtistCard key={art.name} artist={art} />
              ))}
            </div>
          </div>

          {/* 3. New Releases & Global Chart Hits */}
          {discoverNewReleases.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <Flame size={22} className="text-amber-400" />
                    <span>New Releases & Chart Drops</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Stream trending songs and latest releases worldwide</p>
                </div>
                <button
                  onClick={() => {
                    play(discoverNewReleases[0], discoverNewReleases, 0)
                  }}
                  className="text-xs font-bold text-brand hover:underline flex items-center gap-1"
                >
                  <Play size={13} fill="currentColor" /> Play All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {discoverNewReleases.slice(0, 6).map((song, i) => (
                  <div
                    key={song.id}
                    onClick={() => play(song, discoverNewReleases, i)}
                    className="group relative flex flex-col p-3 rounded-2xl bg-surface-2/60 hover:bg-surface-3/90 border border-white/5 hover:border-white/15 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-3 mb-2.5 shadow-md">
                      <img
                        src={song.coverUrl}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-brand text-black flex items-center justify-center shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                          <Play size={16} fill="black" className="translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">
                      {song.title}
                    </h4>
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
                ))}
              </div>
            </div>
          )}

          {/* 4. Curated Playlists & Mood Vibes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>✨</span> Curated Playlists & Vibes
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Handcrafted mixes for energy, chill, night drives and focus</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DISCOVERY_PLAYLISTS.map(pl => (
                <div
                  key={pl.id}
                  onClick={() => {
                    setQuery(pl.query)
                    handleSearchSubmit(null, pl.query)
                  }}
                  className="group relative rounded-2xl p-5 cursor-pointer bg-gradient-to-br border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                  style={{
                    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(0,0,0,0.5))`
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${pl.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">{pl.emoji}</span>
                    <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-brand group-hover:text-black text-white flex items-center justify-center transition-all shadow-md">
                      <Play size={13} fill="currentColor" className="translate-x-0.5" />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-base font-extrabold text-white group-hover:text-brand transition-colors">
                      {pl.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {pl.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Browse All Genres Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>🎛️</span> Browse All Genres
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Explore by musical styles, instrumentations & roots</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {DISCOVER_GENRES.map(g => (
                <Link
                  key={g.name}
                  to={`/genre/${g.name}`}
                  className={`group relative bg-gradient-to-br ${g.color} rounded-2xl p-4 h-28 flex flex-col justify-between overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/10`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                    {g.emoji}
                  </span>
                  <div>
                    <span className="font-extrabold text-sm text-white font-display tracking-tight block">
                      {g.name}
                    </span>
                    <span className="text-[10px] text-white/70 font-semibold">{g.count}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── ACTIVE SEARCH RESULTS (Displayed when query is typed) ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {query && (
        <div className="space-y-6">
          {/* Tabs */}
          {(results.all.length > 0 || artists.length > 0) && (
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
              {[
                { key: 'all',     label: `All (${results.all.length + artists.length})` },
                ...(artists.length > 0 ? [{ key: 'artists', label: `🎤 Artists (${artists.length})` }] : []),
                { key: 'itunes',  label: `🎧 Previews (${results.itunes.length})` },
                { key: 'jamendo', label: `🎵 Full Tracks (${results.jamendo.length})` },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                    tab === t.key ? 'bg-white text-black shadow-md' : 'bg-surface-2 text-gray-300 hover:bg-surface-3'
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
              <span className="text-gray-400 text-sm">Searching songs, artists & albums...</span>
            </div>
          )}

          {/* ── Artists Dedicated Tab ── */}
          {!loading && tab === 'artists' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {artists.map(art => (
                  <ArtistCard key={art.id} artist={art} />
                ))}
              </div>
            </div>
          )}

          {/* ── Top Artist Recommendation (Shown on 'All' Tab) ── */}
          {!loading && tab === 'all' && artists.length > 0 && (
            <div className="mb-8 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand" />
                  <span>Top Artist Recommendation</span>
                </h2>
                {artists.length > 1 && (
                  <button
                    onClick={() => setTab('artists')}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    View all {artists.length} matching artists →
                  </button>
                )}
              </div>
              <ArtistCard artist={artists[0]} layout="banner" />
            </div>
          )}

          {/* ── Songs Results (All, Previews, Full Tracks) ── */}
          {!loading && tab !== 'artists' && displayed.length > 0 && (
            <div className="space-y-1">
              {tab === 'all' && <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Songs</h2>}
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
          {!loading && query.length >= 2 && results.all.length === 0 && artists.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg">No results for "{query}"</p>
              <p className="text-sm mt-1 text-gray-600">Try a different spelling, genre, or artist name</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
