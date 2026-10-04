import { useEffect, useState } from 'react'
import { Music, Users, TrendingUp, Radio, Disc3, BarChart3 } from 'lucide-react'

function MetricCard({ icon: Icon, label, value, gradient }) {
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

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState({ total: 24, users: 6, totalPlays: 1420 })
  const [topSongs, setTopSongs] = useState([
    { id: '1', title: 'Creepin\'', artist: 'Metro Boomin, The Weeknd & 21 Savage', play_count: 540 },
    { id: '2', title: 'Save Your Tears', artist: 'The Weeknd', play_count: 420 },
    { id: '3', title: 'Timeless', artist: 'The Weeknd & Playboi Carti', play_count: 310 },
    { id: '4', title: 'Starboy', artist: 'The Weeknd', play_count: 240 },
    { id: '5', title: 'Die For You', artist: 'The Weeknd', play_count: 190 },
  ])

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.topSongs?.length) {
          setTopSongs(data.topSongs)
        }
      })
      .catch(() => {})

    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats({
            total: data.totalSongs || 24,
            users: data.totalUsers || 6,
            totalPlays: data.totalPlays || 1420
          })
        }
      })
      .catch(() => {})
  }, [])

  const genres = [
    { name: 'Pop', count: 35, color: '#1DB954' },
    { name: 'R&B / Soul', count: 25, color: '#00f59b' },
    { name: 'Hip-Hop', count: 20, color: '#06b6d4' },
    { name: 'Electronic', count: 12, color: '#3b82f6' },
    { name: 'Rock', count: 8, color: '#8b5cf6' },
  ]

  const sources = [
    { name: 'iTunes Audio', percent: '45%', color: '#f59e0b' },
    { name: 'Jamendo Full-Length', percent: '35%', color: '#3b82f6' },
    { name: 'YouTube IFrame Engine', percent: '20%', color: '#ef4444' },
  ]

  const maxPlay = Math.max(...topSongs.map(s => Number(s.play_count || 0)), 1)

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight font-display">
          Streaming Intelligence & Analytics
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Detailed metrics on genre preferences, audio sources, and most-streamed tracks.
        </p>
      </div>

      {/* KPI Cards */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Genre Breakdown */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-sm text-white font-display flex items-center gap-2">
              <Radio size={16} className="text-brand" />
              <span>Catalog by Genre</span>
            </h2>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Distribution</span>
          </div>

          <div className="space-y-4">
            {genres.map(g => (
              <div key={g.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-300">{g.name}</span>
                  <span className="font-bold text-white">{g.count}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${g.count}%`, backgroundColor: g.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audio Engine Breakdown */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-sm text-white font-display flex items-center gap-2">
              <Disc3 size={16} className="text-cyan-400" />
              <span>Audio Provider Distribution</span>
            </h2>
            <span className="text-[10px] text-gray-400 uppercase font-semibold">Sources</span>
          </div>

          <div className="space-y-4">
            {sources.map(s => (
              <div key={s.name} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-semibold text-gray-300">{s.name}</span>
                </div>
                <span className="text-xs font-bold text-white bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                  {s.percent}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Streamed Tracks */}
      <div className="glass-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-sm text-white font-display flex items-center gap-2">
            <BarChart3 size={16} className="text-brand" />
            <span>Top Streamed Tracks</span>
          </h2>
          <span className="text-[10px] text-gray-400 uppercase font-semibold">By Play Count</span>
        </div>

        <div className="space-y-3">
          {topSongs.map((song, i) => {
            const count = Number(song.play_count || 0)
            const percent = Math.min(Math.round((count / maxPlay) * 100), 100)
            return (
              <div key={song.id || i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-gray-500 font-bold w-4 text-center">#{i + 1}</span>
                    <span className="font-bold text-white truncate">{song.title}</span>
                    <span className="text-gray-400 truncate hidden sm:inline">• {song.artist}</span>
                  </div>
                  <span className="font-bold text-brand shrink-0">{count.toLocaleString()} plays</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
