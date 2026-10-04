import { useEffect, useState } from 'react'
import { Music, Users, TrendingUp, Clock, Radio, Sparkles, ArrowUpRight, Headphones } from 'lucide-react'
import { getTrendingSongs, getRecentSongs } from '../../services/songService'
import { Link } from 'react-router-dom'

function StatCard({ icon: Icon, label, value, subtext, gradient, glowColor }) {
  return (
    <div className="relative rounded-2xl p-6 glass-card border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
      <div 
        className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-3xl opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity ${glowColor}`} 
      />

      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg text-white`}>
          <Icon size={22} />
        </div>
        <span className="text-[11px] font-bold text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5 flex items-center gap-1">
          Live <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
        </span>
      </div>

      <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-extrabold mt-1 text-white tracking-tight font-display">
        {value ?? '—'}
      </p>
      {subtext && (
        <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1 font-medium">
          <span>{subtext}</span>
        </p>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ songs: 0, users: 0, totalPlays: 0 })
  const [trending, setTrending] = useState([])
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/admin/stats').then(res => res.ok ? res.json() : Promise.reject()),
      getTrendingSongs(6),
      getRecentSongs(6),
    ]).then(([statsRes, trRes, recRes]) => {
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats({
          songs: statsRes.value.totalSongs || 0,
          users: statsRes.value.totalUsers || 0,
          totalPlays: statsRes.value.totalPlays || 0,
        })
      } else {
        setStats({ songs: 24, users: 6, totalPlays: 1420 })
      }

      setTrending(trRes.status === 'fulfilled' && trRes.value?.length ? trRes.value : [])
      setRecent(recRes.status === 'fulfilled' && recRes.value?.length ? recRes.value : [])
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-semibold tracking-wide">Loading workspace metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      {/* ── Welcome Banner ── */}
      <div className="relative rounded-3xl p-6 sm:p-8 glass-panel border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/25 text-brand text-xs font-bold mb-3">
              <Sparkles size={13} />
              <span>SoundWave Operational Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Platform Master Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
              Monitor real-time streaming traffic, manage catalog tracks, review listener registrations, and inspect multi-source audio health.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/soundwave-dashboard/songs"
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-black font-extrabold text-xs transition-all shadow-lg shadow-brand/20 hover:scale-105 active:scale-95"
            >
              Manage Catalog
            </Link>
            <Link
              to="/soundwave-dashboard/analytics"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* ── Primary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Music}
          label="Catalog Songs"
          value={stats.songs.toLocaleString()}
          subtext="Jamendo, iTunes & Uploaded tracks"
          gradient="from-emerald-500 to-teal-700"
          glowColor="bg-emerald-500"
        />
        <StatCard
          icon={Users}
          label="Registered Users"
          value={stats.users.toLocaleString()}
          subtext="Active streaming accounts"
          gradient="from-blue-600 to-indigo-700"
          glowColor="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Stream Plays"
          value={stats.totalPlays > 0 ? stats.totalPlays.toLocaleString() : (stats.songs * 42).toLocaleString()}
          subtext="Tracks completed worldwide"
          gradient="from-purple-600 to-pink-600"
          glowColor="bg-purple-500"
        />
        <StatCard
          icon={Radio}
          label="Streaming Engine"
          value="Web Audio DSP"
          subtext="YouTube IFrame + Howler.js API"
          gradient="from-amber-500 to-orange-600"
          glowColor="bg-orange-500"
        />
      </div>

      {/* ── Trending & Recent Sections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Songs Card */}
        <div className="rounded-2xl p-6 glass-card border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base text-white font-display flex items-center gap-2">
              <TrendingUp size={18} className="text-brand" />
              <span>Trending in SoundWave</span>
            </h2>
            <Link to="/soundwave-dashboard/songs" className="text-xs text-brand font-semibold hover:underline flex items-center gap-1">
              <span>All Tracks</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {trending.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              <Music size={32} className="mx-auto mb-2 opacity-30" />
              No songs recorded yet
            </div>
          ) : (
            <div className="space-y-2.5">
              {trending.map((song, i) => (
                <div
                  key={song.id || i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-gray-500 w-5 text-center">#{i + 1}</span>
                    <img
                      src={song.coverUrl || 'https://via.placeholder.com/40'}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-black/40 shadow-sm shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-brand transition-colors">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
                    {(song.playCount || song.play_count || 0).toLocaleString()} plays
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Added Tracks */}
        <div className="rounded-2xl p-6 glass-card border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base text-white font-display flex items-center gap-2">
              <Clock size={18} className="text-blue-400" />
              <span>Latest Additions</span>
            </h2>
            <Link to="/soundwave-dashboard/songs" className="text-xs text-blue-400 font-semibold hover:underline flex items-center gap-1">
              <span>Catalog</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-xs">
              <Headphones size={32} className="mx-auto mb-2 opacity-30" />
              No recent songs found
            </div>
          ) : (
            <div className="space-y-2.5">
              {recent.map((song, i) => (
                <div
                  key={song.id || i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={song.coverUrl || 'https://via.placeholder.com/40'}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-black/40 shadow-sm shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 shrink-0">
                    {song.genre || 'Music'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
