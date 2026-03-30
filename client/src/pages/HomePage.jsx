import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTopChart, getJamendoTrending, getJamendoNew } from '../services/musicApi'
import SectionRow from '../components/SectionRow'

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

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const { profile } = useAuth()
  const [chart, setChart]           = useState([])
  const [trending, setTrending]     = useState([])
  const [newReleases, setNew]        = useState([])
  const [loading, setLoading]       = useState(true)
  const [apiError, setApiError]     = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.allSettled([
      getTopChart(12),
      getJamendoTrending(12),
      getJamendoNew(12),
    ]).then(([c, t, n]) => {
      if (cancelled) return
      const chartData    = c.status === 'fulfilled' ? c.value : []
      const trendData    = t.status === 'fulfilled' ? t.value : []
      const newData      = n.status === 'fulfilled' ? n.value : []

      setChart(chartData)
      setTrending(trendData)
      setNew(newData)

      // If all failed, show error state
      if (!chartData.length && !trendData.length && !newData.length) {
        setApiError(true)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [])

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

      {/* Global chart */}
      {chart.length > 0 && <SectionRow title="🔥 Global Chart" songs={chart} />}

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
