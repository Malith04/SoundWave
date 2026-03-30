import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { getSongs } from '../services/songService'
import { getUserCount } from '../services/userService'
import { Music, Users, TrendingUp, Radio } from 'lucide-react'

const COLORS = ['#1DB954', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#F97316']

function EmptyChart({ message }) {
  return (
    <div className="flex items-center justify-center h-64 text-gray-600 text-sm flex-col gap-2">
      <Music size={32} className="opacity-20" />
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
    Promise.allSettled([getSongs(), getUserCount()]).then(([songsRes, usersRes]) => {
      const songs = songsRes.status === 'fulfilled' ? songsRes.value : []
      const users = usersRes.status === 'fulfilled' ? usersRes.value : 0

      const genreMap = {}
      songs.forEach(s => {
        const g = s.genre || 'Unknown'
        genreMap[g] = (genreMap[g] || 0) + 1
      })
      setGenreData(
        Object.entries(genreMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({ name, value }))
      )

      const srcMap = {}
      songs.forEach(s => {
        const src = s.source === 'jamendo' ? 'Jamendo' : s.source === 'itunes' ? 'iTunes' : 'Uploaded'
        srcMap[src] = (srcMap[src] || 0) + 1
      })
      setSourceData(Object.entries(srcMap).map(([name, value]) => ({ name, value })))

      const withPlays = songs.filter(s => (s.playCount || 0) > 0)
      setTopSongs([...withPlays].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 10))

      const totalPlays = songs.reduce((sum, s) => sum + (s.playCount || 0), 0)
      setStats({ total: songs.length, users, totalPlays })
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Analytics</h1>
      <p className="text-gray-400 mb-8">Updates live as users play songs</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Music,      label: 'Total Songs', value: stats.total,                        color: 'bg-brand/10 text-brand' },
          { icon: Users,      label: 'Total Users', value: stats.users,                        color: 'bg-blue-500/10 text-blue-400' },
          { icon: TrendingUp, label: 'Total Plays', value: stats.totalPlays.toLocaleString(),  color: 'bg-purple-500/10 text-purple-400' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-d1 rounded-2xl p-5 border border-white/5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-d1 rounded-2xl p-6 border border-white/5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Radio size={16} className="text-brand" /> Songs by Genre
          </h2>
          {genreData.length === 0 ? (
            <EmptyChart message="Play some songs on the client to populate this" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={genreData} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={v => [v, 'songs']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-d1 rounded-2xl p-6 border border-white/5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Music size={16} className="text-brand" /> Songs by Source
          </h2>
          {sourceData.length === 0 ? (
            <EmptyChart message="No songs yet" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  formatter={v => [v, 'songs']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-d1 rounded-2xl p-6 border border-white/5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand" /> Top Songs by Plays
        </h2>
        {topSongs.length === 0 ? (
          <EmptyChart message="No plays recorded yet — songs appear here after users play them" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, topSongs.length * 44)}>
            <BarChart data={topSongs} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis
                type="category" dataKey="title" width={140}
                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                tickFormatter={v => v.length > 18 ? v.slice(0, 18) + '…' : v}
              />
              <Tooltip
                contentStyle={{ background: '#1E1E1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                formatter={(v, _, props) => [`${v.toLocaleString()} plays`, props.payload.artist]}
              />
              <Bar dataKey="playCount" fill="#1DB954" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
