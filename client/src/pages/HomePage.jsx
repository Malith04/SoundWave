import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Play, Pause, Clock, TrendingUp, Sparkles, Zap, Brain, Sun, 
  Coffee, Heart, Moon, Radio, Music, Flame, Disc3, Compass,
  ChevronRight, Volume2
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getTopChart, getJamendoTrending, getJamendoNew, getJamendoByGenre } from '../services/musicApi'
import { getRecommendations, getMoodPlaylist } from '../services/recommendationService'
import SectionRow from '../components/SectionRow'
import MoodSelector from '../components/MoodSelector'
import { usePlayer } from '../context/PlayerContext'
import { getUser } from '../services/userService'
import { getSongById } from '../services/songService'
import toast from 'react-hot-toast'

const GENRES = [
  { name: 'Pop',        color: 'from-pink-500 via-rose-600 to-pink-900',       emoji: '🎤' },
  { name: 'Rock',       color: 'from-red-600 via-red-700 to-red-950',          emoji: '🎸' },
  { name: 'Hip-Hop',    color: 'from-amber-500 via-yellow-600 to-orange-900',  emoji: '🎧' },
  { name: 'Electronic', color: 'from-purple-600 via-indigo-600 to-purple-900', emoji: '🎛️' },
  { name: 'Jazz',       color: 'from-amber-600 via-orange-700 to-stone-900',   emoji: '🎷' },
  { name: 'Classical',  color: 'from-emerald-600 via-teal-700 to-emerald-950', emoji: '🎻' },
  { name: 'Chill',      color: 'from-cyan-500 via-blue-600 to-blue-950',       emoji: '🌊' },
  { name: 'Acoustic',   color: 'from-lime-500 via-green-600 to-emerald-900',   emoji: '🪕' },
]

const MIXES = [
  { id: 1, name: 'Daily Mix 1', genre: 'pop',        gradient: 'from-pink-600 via-purple-700 to-indigo-800',   desc: 'Pop hits & upbeat melodies' },
  { id: 2, name: 'Daily Mix 2', genre: 'electronic', gradient: 'from-cyan-600 via-blue-700 to-purple-800',     desc: 'Electronic beats & synth vibes' },
  { id: 3, name: 'Daily Mix 3', genre: 'rock',       gradient: 'from-red-600 via-orange-700 to-yellow-800',    desc: 'High energy rock anthems' },
  { id: 4, name: 'Chill Mix',   genre: 'ambient',    gradient: 'from-teal-600 via-emerald-700 to-green-800',   desc: 'Calm ambient & relaxation' },
  { id: 5, name: 'Hype Mix',    genre: 'hiphop',     gradient: 'from-yellow-500 via-orange-600 to-red-700',    desc: 'Bangers & heavy basslines' },
  { id: 6, name: 'Late Night',  genre: 'jazz',       gradient: 'from-indigo-700 via-violet-800 to-purple-900', desc: 'Smooth late night melodies' },
]

const QUICK_MOODS = [
  { id: 'energetic', name: 'Energetic', icon: Zap,    color: 'from-amber-500 to-orange-600',   tag: 'Upbeat & Workout' },
  { id: 'focus',     name: 'Focus',     icon: Brain,  color: 'from-blue-500 to-indigo-600',    tag: 'Flow State & Work' },
  { id: 'happy',     name: 'Happy',     icon: Sun,    color: 'from-pink-500 to-rose-600',      tag: 'Positive Vibes' },
  { id: 'chill',     name: 'Chill',     icon: Coffee, color: 'from-emerald-500 to-teal-600',   tag: 'Relax & Unwind' },
  { id: 'romantic',  name: 'Romantic',  icon: Heart,  color: 'from-red-500 to-pink-600',       tag: 'Love & Warmth' },
  { id: 'ambient',   name: 'Sleep',     icon: Moon,   color: 'from-purple-500 to-indigo-700',  tag: 'Peaceful Ambient' },
]

const CATEGORY_TABS = ['All', 'Spotlight', 'Moods', 'Mixes', 'Charts', 'Genres']

function getGreetingContext() {
  const h = new Date().getHours()
  if (h < 12) return { text: 'Good morning', icon: '☀️', vibe: 'Morning Boost' }
  if (h < 17) return { text: 'Good afternoon', icon: '⚡', vibe: 'Daily Flow' }
  if (h < 21) return { text: 'Good evening', icon: '🌆', vibe: 'Evening Groove' }
  return { text: 'Late night session', icon: '🌙', vibe: 'Midnight Chill' }
}

// ── Daily Mix Card ────────────────────────────────────────────
function MixCard({ mix, songs, onPlay, isCurrentPlaying }) {
  const covers = songs.slice(0, 4).map(s => s.coverUrl).filter(Boolean)
  return (
    <div 
      className="group relative rounded-2xl overflow-hidden cursor-pointer glass-card border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/60"
      onClick={() => songs.length && onPlay(songs[0], songs, 0)}
    >
      <div className={`bg-gradient-to-br ${mix.gradient} p-4 sm:p-5 h-44 sm:h-48 flex flex-col justify-between relative overflow-hidden shimmer-card`}>
        {/* Soft radial shine */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        {/* Mini cover mosaic */}
        <div className="flex items-start justify-between">
          {covers.length >= 4 ? (
            <div className="grid grid-cols-2 gap-1 w-16 h-16 rounded-xl overflow-hidden shadow-lg border border-white/15 shrink-0">
              {covers.slice(0, 4).map((c, i) => (
                <img key={i} src={c} alt="" className="w-full h-full object-cover" />
              ))}
            </div>
          ) : covers.length > 0 ? (
            <img src={covers[0]} alt="" className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/15" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl border border-white/10">
              🎵
            </div>
          )}

          <span className="text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full text-white/80 border border-white/10">
            {songs.length || 20} songs
          </span>
        </div>

        <div>
          <h3 className="font-bold text-base text-white font-display tracking-tight group-hover:text-brand transition-colors">
            {mix.name}
          </h3>
          <p className="text-xs text-white/70 line-clamp-1 mt-0.5">{mix.desc}</p>
        </div>

        {/* Hover play button */}
        <button 
          aria-label={`Play ${mix.name}`}
          className="absolute bottom-4 right-4 w-11 h-11 bg-brand text-black rounded-full flex items-center justify-center shadow-xl shadow-black/40 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-300 hover:scale-110 active:scale-95"
        >
          <Play size={18} fill="black" className="ml-0.5" />
        </button>
      </div>
    </div>
  )
}

// ── Hero Spotlight Billboard ──────────────────────────────────
function SpotlightBillboard({ song, queue, onPlay, isPlaying, currentSong }) {
  if (!song) return null
  const isCurrentActive = currentSong?.id === song.id

  return (
    <div className="relative rounded-3xl overflow-hidden mb-8 lg:mb-10 glass-panel border border-white/10 p-5 sm:p-7 shadow-2xl">
      {/* Background blurred aura */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-3xl scale-125 pointer-events-none transition-all duration-1000"
        style={{ backgroundImage: `url(${song.coverUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-surface-2 via-surface-2/80 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5 sm:gap-6">
          {/* Glowing Album Art with Play Button */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl shrink-0 group border border-white/15">
            <img 
              src={song.coverUrl || 'https://via.placeholder.com/200'} 
              alt={song.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <button
              onClick={() => onPlay(song, queue, 0)}
              aria-label="Play spotlight track"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-full bg-brand text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95">
                {isCurrentActive && isPlaying ? (
                  <Pause size={20} fill="black" />
                ) : (
                  <Play size={20} fill="black" className="ml-0.5" />
                )}
              </div>
            </button>
          </div>

          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/20 border border-brand/40 text-brand text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles size={12} className="animate-spin-slow" />
              Spotlight of the Day
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight font-display truncate">
              {song.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-300 font-medium truncate mt-0.5">
              {song.artist}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="bg-white/10 px-2 py-0.5 rounded-md font-medium text-white/80">
                {song.source === 'jamendo' ? 'Full Track' : 'Preview'}
              </span>
              {song.genre && <span>• {song.genre}</span>}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={() => onPlay(song, queue, 0)}
            className="flex items-center gap-2.5 bg-gradient-to-r from-brand to-emerald-400 hover:from-brand-dark hover:to-emerald-500 text-black font-extrabold px-6 py-3.5 rounded-full shadow-lg shadow-brand/25 transition-all duration-300 hover:scale-105 active:scale-95 text-sm"
          >
            {isCurrentActive && isPlaying ? (
              <>
                <Pause size={18} fill="black" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={18} fill="black" className="ml-0.5" />
                <span>Listen Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Skeletons for smooth loading ──────────────────────────────
function FeedSkeleton() {
  return (
    <div className="px-4 lg:px-8 py-6 space-y-8 animate-pulse">
      <div className="h-10 bg-white/5 rounded-xl w-64" />
      <div className="h-44 bg-white/5 rounded-3xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { profile, user } = useAuth()
  const { play, currentSong, isPlaying } = usePlayer()

  const [chart, setChart]               = useState([])
  const [trending, setTrending]         = useState([])
  const [newReleases, setNew]           = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [mixes, setMixes]               = useState({})
  const [recentSongs, setRecent]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showMoodSelector, setShowMoodSelector] = useState(false)
  const [apiError, setApiError]         = useState(false)
  const [activeTab, setActiveTab]       = useState('All')
  const [moodLoading, setMoodLoading]   = useState(null)

  const greetingInfo = getGreetingContext()
  const displayName = profile?.displayName || user?.displayName || 'Music Lover'

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
      MIXES.forEach((m, i) => { 
        mixMap[m.id] = mixResults[i].status === 'fulfilled' ? mixResults[i].value : [] 
      })
      setChart(chartData)
      setTrending(trendData)
      setNew(newData)
      setMixes(mixMap)
      
      const totalSongs = chartData.length + trendData.length + newData.length
      if (totalSongs === 0) {
        setApiError(true)
      }
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Load recently played and recommendations
  useEffect(() => {
    if (!user) return
    
    getUser(user.uid).then(async p => {
      const ids = (p?.recentlyPlayed || []).slice(0, 8)
      if (!ids.length) return
      const songs = (await Promise.all(ids.map(id => getSongById(id)))).filter(Boolean)
      setRecent(songs)
    }).catch(() => {})

    getRecommendations(user.uid, 15).then(recs => {
      setRecommendations(recs)
    }).catch(err => {
      console.warn('Failed to load recommendations:', err)
    })
  }, [user])

  // Quick 1-click play from mood cards
  const handleQuickMood = async (mood) => {
    setMoodLoading(mood.id)
    try {
      const playlist = await getMoodPlaylist(user?.uid || 'guest', mood.id, 20)
      if (playlist?.songs?.length > 0) {
        play(playlist.songs[0], playlist.songs, 0)
        toast.success(`Playing ${mood.name} mix (${playlist.songs.length} tracks)`)
      } else {
        toast.error(`Could not generate ${mood.name} mix`)
      }
    } catch {
      toast.error('Failed to load mood mix')
    } finally {
      setMoodLoading(null)
    }
  }

  if (loading) return <FeedSkeleton />

  const spotlightSong = chart[0] || trending[0]

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-12 max-w-7xl mx-auto animate-fade-in">
      
      {/* ── Top Header & Greeting Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 lg:mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 mb-2">
            <span>{greetingInfo.icon}</span>
            <span>{greetingInfo.vibe}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight font-display text-white">
            {greetingInfo.text}, <span className="bg-gradient-to-r from-brand to-emerald-300 bg-clip-text text-transparent">{displayName}</span>
          </h1>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-brand text-black shadow-md shadow-brand/20 font-bold scale-105'
                  : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Network error banner */}
      {apiError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-8 text-sm text-amber-300 flex items-start gap-3 shadow-lg">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold mb-0.5">Streaming Services Temporarily Offline</p>
            <p className="text-xs text-amber-200/80">
              Unable to reach external streaming servers. Please verify your connection or retry.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-full font-semibold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* ── Featured Spotlight Billboard ── */}
      {(activeTab === 'All' || activeTab === 'Spotlight') && spotlightSong && (
        <SpotlightBillboard
          song={spotlightSong}
          queue={chart.length ? chart : trending}
          onPlay={play}
          isPlaying={isPlaying}
          currentSong={currentSong}
        />
      )}

      {/* ── Recently Played Quick Grid ── */}
      {(activeTab === 'All' || activeTab === 'Spotlight') && recentSongs.length > 0 && (
        <section className="mb-8 lg:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-xl font-bold flex items-center gap-2 text-white font-display">
              <Clock size={19} className="text-brand" />
              Recently Played
            </h2>
            <Link to="/library" className="text-xs text-gray-400 hover:text-brand font-semibold uppercase tracking-wider transition-colors">
              See all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {recentSongs.slice(0, 8).map(song => {
              const isSongActive = currentSong?.id === song.id
              return (
                <button
                  key={song.id}
                  onClick={() => play(song, recentSongs, recentSongs.findIndex(s => s.id === song.id))}
                  className={`flex items-center gap-3 glass-card rounded-xl p-2.5 text-left transition-all duration-200 group relative overflow-hidden ${
                    isSongActive ? 'border-brand/40 bg-white/10' : ''
                  }`}
                >
                  <img
                    src={song.coverUrl || 'https://via.placeholder.com/50'}
                    alt={song.title}
                    className="w-11 h-11 rounded-lg object-cover shadow-sm shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs sm:text-sm font-semibold truncate ${
                      isSongActive ? 'text-brand' : 'text-white group-hover:text-brand'
                    }`}>
                      {song.title}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{song.artist}</p>
                  </div>

                  {/* Play / Pulse wave */}
                  <div className="shrink-0 pr-2">
                    {isSongActive && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-brand rounded-full audio-bar-1" />
                        <span className="w-1 bg-brand rounded-full audio-bar-2" />
                        <span className="w-1 bg-brand rounded-full audio-bar-3" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                        <Play size={13} fill="black" className="ml-0.5" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── "Music for Your Mood" Redesigned Interactive Section ── */}
      {(activeTab === 'All' || activeTab === 'Moods') && (
        <section className="mb-8 lg:mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white font-display flex items-center gap-2">
                <span>🎭</span> Music for Your Mood
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Click any mood to launch an AI vibe playlist instantly</p>
            </div>

            <button
              onClick={() => setShowMoodSelector(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-brand/10 text-brand border border-brand/30 hover:bg-brand/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles size={13} />
              <span>AI Mood Matcher</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_MOODS.map(mood => {
              const isSelected = moodLoading === mood.id
              return (
                <button
                  key={mood.id}
                  onClick={() => handleQuickMood(mood)}
                  disabled={!!moodLoading}
                  className="group relative rounded-2xl overflow-hidden p-4 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-black/50 border border-white/10 active:scale-95 disabled:opacity-60"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-80 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative z-10 flex flex-col h-28 justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        {isSelected ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <mood.icon size={18} className="text-white" />
                        )}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={11} fill="white" className="ml-0.5 text-white" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-sm text-white font-display">{mood.name}</h3>
                      <p className="text-[10px] text-white/80 line-clamp-1 mt-0.5">{mood.tag}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* ── AI Personalized Recommendations ── */}
      {(activeTab === 'All' || activeTab === 'Recommended') && recommendations.length > 0 && (
        <SectionRow 
          title="🤖 Recommended for You" 
          subtitle="Tuned to your listening history and taste"
          songs={recommendations} 
        />
      )}

      {/* ── Global Chart ── */}
      {(activeTab === 'All' || activeTab === 'Charts') && chart.length > 0 && (
        <SectionRow 
          title="🔥 Global Chart" 
          subtitle="The most streamed tracks worldwide right now"
          songs={chart} 
        />
      )}

      {/* ── Your Daily Mixes ── */}
      {(activeTab === 'All' || activeTab === 'Mixes') && (
        <section className="mb-8 lg:mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white font-display flex items-center gap-2">
                <span>🎛️</span> Your Daily Mixes
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Continuous auto-mixes curated for every moment</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {MIXES.map(mix => (
              <MixCard 
                key={mix.id} 
                mix={mix} 
                songs={mixes[mix.id] || []} 
                onPlay={play}
                isCurrentPlaying={isPlaying}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Browse Genres Grid ── */}
      {(activeTab === 'All' || activeTab === 'Genres') && (
        <section className="mb-8 lg:mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white font-display">
                Browse Genres
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Explore by sound, instrument, and genre styles</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
            {GENRES.map(g => (
              <Link
                key={g.name}
                to={`/genre/${g.name}`}
                className={`group relative bg-gradient-to-br ${g.color} rounded-2xl p-3.5 sm:p-4 h-24 sm:h-28 flex flex-col justify-between overflow-hidden shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl border border-white/10`}
              >
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300">
                  {g.emoji}
                </span>
                <span className="font-extrabold text-xs sm:text-sm text-white font-display tracking-tight">
                  {g.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Trending & New Releases ── */}
      {(activeTab === 'All' || activeTab === 'Trending') && trending.length > 0 && (
        <SectionRow 
          title="🎵 Trending Full Tracks" 
          subtitle="Royalty-free high quality full-length streams"
          songs={trending} 
        />
      )}

      {(activeTab === 'All' || activeTab === 'Trending') && newReleases.length > 0 && (
        <SectionRow 
          title="✨ New Releases" 
          subtitle="Freshly uploaded music and premieres"
          songs={newReleases} 
        />
      )}

      {/* ── Mood Selector Modal ── */}
      {showMoodSelector && (
        <MoodSelector onClose={() => setShowMoodSelector(false)} />
      )}
    </div>
  )
}
