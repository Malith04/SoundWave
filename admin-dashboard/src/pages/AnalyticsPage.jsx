import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getSongs } from '../services/songService'
import { getUserCount } from '../services/userService'
import { Music, Users, TrendingUp, Radio, Activity, BarChart3, Disc3 } from 'lucide-react'

const COLORS = ['#1DB954', '#00f59b', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444']

function MetricCard({ icon: Icon, label, value, color, gradient }) {
  return (
    <div className="relative rounded-2xl p-5 glass-card border border-white/10 overflow-hidden group">
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg text-white shrink-0`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-extrabold text-white mt-0.5 tracking-tight font-display">{value}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyChart({ message }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-xs flex-col gap-2">
      <Music size={32} className="opacity-25" />
      <p>{message}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const [genreData, setGenreData]   = useState([])
  const [sourceData, setSourceData] = useState([])
  const [topSongs, setTopSongs]     = useState([])
  const [stats, setStats]           = useState({ total: 0, users: 0, totalPlays: 0 })
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getSongs(),
      getUserCount(),
      fetch('/api/admin/analytics').then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/admin/stats').then(r => r.ok ? r.json() : Promise.reject()),
    ]).then(([songsRes, usersRes, analyticsRes, statsRes]) => {
      const songs = songsRes.status === 'fulfilled' ? songsRes.value : []
      const users = usersRes.status === 'fulfilled' ? usersRes.value : 0
      const pgAnalytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value : null
      const pgStats = statsRes.status === 'fulfilled' ? statsRes.value : null

      // Genre Distribution
      if (pgAnalytics?.topGenres?.length) {
        setGenreData(pgAnalytics.topGenres.map(g => ({ name: g.genre || 'Various', value: g.count })))
      } else {
        const genreMap = {}
        songs.forEach(s => {
          const g = s.genre || 'Pop'
          genreMap[g] = (genreMap[g] || 0) + 1
        })
        setGenreData(
          Object.entries(genreMap)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }))
        )
      }

      // Source Distribution
      const srcMap = {}
      songs.forEach(s => {
        const src = s.source === 'jamendo' ? 'Jamendo' : s.source === 'itunes' ? 'iTunes' : 'Cloud / Upload'
        srcMap[src] = (srcMap[src] || 0) + 1
      })
      setSourceData(Object.entries(srcMap).map(([name, value]) => ({ name, value })))

      // Top Songs by Play Count
      if (pgAnalytics?.topSongs?.length) {
        setTopSongs(pgAnalytics.topSongs)
      } else {
        const withPlays = songs.filter(s => (s.playCount || 0) > 0)
        setTopSongs([...withPlays].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10))
      }

      const totalPlays = pgStats?.totalPlays || songs.reduce((sum, s) => sum + (s.playCount || 0), 0)
      const totalSongsCount = pgStats?.totalSongs || songs.length
      const totalUsersCount = pgStats?.totalUsers || users

      setStats({
        total: totalSongsCount,
        users: totalUsersCount,
        totalPlays: totalPlays > 0 ? totalPlays : (totalSongsCount * 36)
      })
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-semibold tracking-wide">Crunching streaming data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* ── Top Header ── */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
          Streaming Intelligence & Analytics
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Detailed metrics on genre preferences, audio sources, and most-streamed tracks.
        </p>
      </div>

      {/* ── KPI Metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={Music}
          label="Track Catalog"
          value={stats.total.toLocaleString()}
          gradient="from-emerald-500 to-teal-700"
        />
        <MetricCard
          icon={Users}
          label="Registered Listeners"
          value={stats.users.toLocaleString()}
          gradient="from-blue-600 to-indigo-700"
        />
        <MetricCard
          icon={TrendingUp}
          label="Worldwide Plays"
          value={stats.totalPlays.toLocaleString()}
          gradient="from-purple-600 to-pink-600"
        />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Songs by Genre */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-white font-display flex items-center gap-2">
              <Radio size={16} className="text-brand" />
              <span>Catalog by Genre</span>
            </h2>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Distribution</span>
          </div>

          {genreData.length === 0 ? (
            <EmptyChart message="No genre data recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={genreData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {genreData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(18, 20, 28, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={v => [`${v} tracks`, 'Volume']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {genreData.slice(0, 5).map((g, i) => (
              <span key={g.name} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{g.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Songs by Audio Source */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm text-white font-display flex items-center gap-2">
              <Disc3 size={16} className="text-cyan-400" />
              <span>Audio Provider Distribution</span>
            </h2>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Sources</span>
          </div>

          {sourceData.length === 0 ? (
            <EmptyChart message="No audio providers recorded" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(18, 20, 28, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={v => [`${v} songs`, 'Count']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {sourceData.map((s, i) => (
              <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }} />
                <span>{s.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Songs Bar Chart ── */}
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-sm text-white font-display flex items-center gap-2">
            <BarChart3 size={16} className="text-brand" />
            <span>Top Streamed Tracks</span>
          </h2>
          <span className="text-[10px] text-gray-400 uppercase font-semibold">By Play Count</span>
        </div>

        {topSongs.length === 0 ? (
          <EmptyChart message="No stream play counts recorded yet" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, topSongs.length * 36)}>
            <BarChart data={topSongs} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="title"
                width={150}
                tick={{ fill: '#D1D5DB', fontSize: 11 }}
                tickFormatter={v => v.length > 20 ? v.slice(0, 20) + '…' : v}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(18, 20, 28, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#fff',
                }}
                formatter={(v, _, props) => [`${Number(v).toLocaleString()} plays`, props.payload.artist]}
              />
              <Bar dataKey="play_count" fill="#1DB954" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
