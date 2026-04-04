import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getTopChart, getJamendoTrending, getJamendoNew, getJamendoByGenre } from '../services/musicApi'
import SectionRow from '../components/SectionRow'
import { usePlayer } from '../context/PlayerContext'
import { getUser } from '../services/userService'
import { getSongById } from '../services/songService'

const GENRES = [
  { name: 'Pop',        color: 'from-pink-600 to-pink-900',       emoji: '🎤' },
  { name: 'Rock',       color: 'from-red-700 to-red-950',         emoji: '🎸' },
  { name: 'Hip-Hop',    color: 'from-yellow-500 to-yellow-900',   emoji: '🎧' },
  { name: 'Electronic', color: 'from-purple-600 to-purple-900',   emoji: '🎛️' },
  { name: 'Jazz',       color: 'from-amber-600 to-amber-900',     emoji: '🎷' },
  { name: 'Classical',  color: 'from-emerald-600 to-emerald-900', emoji: '🎻' },
  { name: 'Chill',      color: 'from-blue-500 to-blue-900',       emoji: '🌊' },
  { name: 'Acoustic',   color: 'from-lime-600 to-lime-900',       emoji: '🪕' },
]

const MIXES = [
  { id: 1, name: 'Daily Mix 1', genre: 'pop',        gradient: 'from-pink-600 via-purple-700 to-indigo-800',   desc: 'Pop hits & more' },
  { id: 2, name: 'Daily Mix 2', genre: 'electronic', gradient: 'from-cyan-600 via-blue-700 to-purple-800',     desc: 'Electronic vibes' },
  { id: 3, name: 'Daily Mix 3', genre: 'rock',       gradient: 'from-red-600 via-orange-700 to-yellow-800',    desc: 'Rock anthems' },
  { id: 4, name: 'Chill Mix',   genre: 'ambient',    gradient: 'from-teal-600 via-emerald-700 to-green-800',   desc: 'Relax & unwind' },
  { id: 5, name: 'Hype Mix',    genre: 'hiphop',     gradient: 'from-yellow-500 via-orange-600 to-red-700',    desc: 'High energy bangers' },
  { id: 6, name: 'Late Night',  genre: 'jazz',       gradient: 'from-indigo-700 via-violet-800 to-purple-900', desc: 'Smooth late night' },
]

// ── Daily Mix Card ────────────────────────────────────────────
function MixCard({ mix, songs, onPlay }) {
  const covers = songs.slice(0, 4).map(s => s.coverUrl).filter(Boolean)
  return (
    <div className="group relative rounded-xl overflow-hidden cursor-pointer hover:scale-[1.03] transition-transform duration-300"
      onClick={() => songs.length && onPlay(songs[0], songs, 0)}>
      <div className={`bg-gradient-to-br ${mix.gradient} p-4 h-36 flex flex-col justify-between relative overflow-hidden`}>
        {/* Animated shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        {/* Mini cover grid */}
        {covers.length >= 4 ? (
          <div className="grid grid-cols-2 gap-0.5 w-16 h-16 rounded-lg overflow-hidden shrink-0">
            {covers.slice(0,4).map((c,i) => <img key={i} src={c} alt="" className="w-full h-full object-cover" />)}
          </div>
        ) : covers.length > 0 ? (
          <img src={covers[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center text-2xl">🎵</div>
        )}
        <div>
          <p className="font-bold text-sm">{mix.name}</p>
          <p className="text-xs text-white/60">{mix.desc}</p>
        </div>
        {/* Play button */}
        <button className="absolute bottom-3 right-3 w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-110">
          <Play size={16} fill="black" className="ml-0.5" />
        </button>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const { profile, user } = useAuth()
  const { play } = usePlayer()
  const [chart, setChart]       = useState([])
  const [trending, setTrending] = useState([])
  const [newReleases, setNew]   = useState([])
  const [mixes, setMixes]       = useState({})
  const [recentSongs, setRecent] = useState([])
  const [loading, setLoading]   = useState(true)
  const [apiError, setApiError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      getTopChart(12),
      getJamendoTrending(12),
      getJamendoNew(12),
      ...MIXES.map(m => getJamendoByGenre(m.genre, 20)),
    ]).then(results => {
      if (cancelled) return
      const [c, t, n, ...mixResults] = results
      const chartData   = c.status === 'fulfilled' ? c.value : []
      const trendData   = t.status === 'fulfilled' ? t.value : []
      const newData     = n.status === 'fulfilled' ? n.value : []
      const mixMap = {}
      MIXES.forEach((m, i) => { mixMap[m.id] = mixResults[i].status === 'fulfilled' ? mixResults[i].value : [] })
      setChart(chartData); setTrending(trendData); setNew(newData); setMixes(mixMap)
      if (!chartData.length && !trendData.length && !newData.length) setApiError(true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Load recently played
  useEffect(() => {
    if (!user) return
    getUser(user.uid).then(async p => {
      const ids = (p?.recentlyPlayed || []).slice(0, 8)
      if (!ids.length) return
      const songs = (await Promise.all(ids.map(id => getSongById(id)))).filter(Boolean)
      setRecent(songs)
    }).catch(() => {})
  }, [user])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Loading music...</p>
    </div>
  )

  return (
    <div className="px-6 py-6 pb-8">
      <h1 className="text-3xl font-bold mb-8">
        {greeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''} 👋
      </h1>

      {/* API error notice */}
      {apiError && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-sm text-yellow-400">
          ⚠️ Could not reach music servers. Check your internet connection and refresh.
        </div>
      )}

      {/* Recently Played quick row */}
      {recentSongs.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Clock size={20} /> Recently Played</h2>
            <Link to="/library" className="text-xs text-gray-400 hover:text-white uppercase tracking-wider transition-colors">See all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {recentSongs.map(song => (
              <button key={song.id} onClick={() => play(song, recentSongs, recentSongs.findIndex(s => s.id === song.id))}
                className="flex items-center gap-3 bg-surface-2 hover:bg-surface-3 rounded-lg px-3 py-2 transition-all hover:scale-[1.02] group text-left">
                <img src={song.coverUrl || 'https://via.placeholder.com/40'} alt={song.title}
                  className="w-10 h-10 rounded object-cover shrink-0" />
                <p className="text-sm font-medium truncate">{song.title}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Global chart */}
      {chart.length > 0 && <SectionRow title="🔥 Global Chart" songs={chart} />}

      {/* Daily Mixes */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">🎛️ Your Daily Mixes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MIXES.map(mix => (
            <MixCard key={mix.id} mix={mix} songs={mixes[mix.id] || []} onPlay={play} />
          ))}
        </div>
      </section>

      {/* Genre grid — always show */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Browse Genres</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {GENRES.map(g => (
            <Link
              key={g.name}
              to={`/genre/${g.name}`}
              className={`bg-gradient-to-br ${g.color} rounded-xl p-4 h-24 flex flex-col justify-between hover:scale-105 transition-transform`}
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="font-bold text-sm">{g.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {trending.length > 0 && <SectionRow title="🎵 Trending Full Tracks" songs={trending} />}
      {newReleases.length > 0 && <SectionRow title="✨ New Releases" songs={newReleases} />}
    </div>
  )
}
