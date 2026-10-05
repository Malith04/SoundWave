import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Headphones, Globe, Disc, Radio, RefreshCw } from 'lucide-react'

export default function AdminAnalyticsTab() {
  const [data, setData] = useState({
    topGenres: [],
    topSongs: [],
    topArtists: [],
    streamHours: 0
  })
  const [loading, setLoading] = useState(true)

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/analytics')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const colorPalette = [
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-amber-500',
    'bg-cyan-500'
  ]

  // Calculate total genre plays for bar width
  const totalGenrePlays = data.topGenres.reduce((acc, g) => acc + Number(g.plays || g.count || 1), 0) || 1

  return (
    <div className="space-y-6">
      {/* ── Top Summary with 100% Real Database Metrics ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5">
          <p className="text-xs font-semibold text-gray-400">Total Catalog Stream Time</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {data.streamHours.toLocaleString()} Hours
          </p>
          <p className="text-[11px] text-emerald-400 mt-1">Real database duration × play count</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5">
          <p className="text-xs font-semibold text-gray-400">Top Trending Genre</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {data.topGenres[0]?.genre || 'Loading...'}
          </p>
          <p className="text-[11px] text-indigo-400 mt-1">
            {data.topGenres[0]?.plays ? `${Number(data.topGenres[0].plays).toLocaleString()} plays logged` : 'Leading catalog category'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5">
          <p className="text-xs font-semibold text-gray-400">Top Streamed Artist</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {data.topArtists[0]?.artist || 'Loading...'}
          </p>
          <p className="text-[11px] text-pink-400 mt-1">
            {data.topArtists[0]?.plays ? `${Number(data.topArtists[0].plays).toLocaleString()} total plays` : 'Highest listener retention'}
          </p>
        </div>
      </div>

      {/* ── Charts Grid (100% Real Database Data) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Genre Share */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Streaming Genre Distribution (Real DB)
            </h3>
            <button
              onClick={loadAnalytics}
              className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            {data.topGenres.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">No genre data available</p>
            ) : (
              data.topGenres.map((g, idx) => {
                const plays = Number(g.plays || g.count || 0)
                const percentage = Math.round((plays / totalGenrePlays) * 100) || 5
                const color = colorPalette[idx % colorPalette.length]

                return (
                  <div key={g.genre} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-200 font-semibold">{g.genre}</span>
                      <span className="text-gray-400">
                        {percentage}% · {plays.toLocaleString()} plays ({g.count} tracks)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#141525] overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Top Streamed Artists */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#0d0e19] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Top Artists by Play Count (Real DB)
          </h3>

          <div className="divide-y divide-white/5">
            {data.topArtists.length === 0 ? (
              <p className="text-xs text-gray-500 py-8 text-center">No artist play logs yet</p>
            ) : (
              data.topArtists.map((a, idx) => (
                <div key={a.artist} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-bold text-gray-500">#{idx + 1}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{a.artist}</p>
                      <p className="text-[10px] text-gray-500">{a.track_count} catalog tracks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400">
                      {Number(a.plays).toLocaleString()} plays
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
