import { useEffect, useState } from 'react'
import { Music, Users, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { getSongCount, getTrendingSongs, getSongs } from '../services/songService'
import { getUserCount, getUsers } from '../services/userService'

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-d1 rounded-2xl p-6 border border-white/5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        <Icon size={22} />
      </div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats]   = useState({ songs: 0, users: 0 })
  const [trending, setTrending] = useState([])
  const [recent, setRecent] = useState([])
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      getSongCount(),
      getUserCount(),
      getTrendingSongs(5),
      getSongs('createdAt', 'desc'),
    ]).then(([sc, uc, tr, sg]) => {
      if (sc.status === 'rejected' || uc.status === 'rejected') {
        setError('Firestore permission denied. Deploy the updated security rules.')
      }
      setStats({
        songs: sc.status === 'fulfilled' ? sc.value : 0,
        users: uc.status === 'fulfilled' ? uc.value : 0,
      })
      setTrending(tr.status === 'fulfilled' ? tr.value : [])
      setRecent(sg.status === 'fulfilled' ? sg.value.slice(0, 5) : [])
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
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-gray-400 mb-6">Welcome back — here's your platform overview.</p>

      {/* Firestore rules error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-sm text-red-400">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Firestore Rules Need Update</p>
            <p>{error}</p>
            <p className="mt-1 text-red-300">Go to Firebase Console → Firestore → Rules → paste the rules from <code>firebase/firestore.rules</code> → Publish</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Music}      label="Total Songs"    value={stats.songs} color="bg-brand/10 text-brand" />
        <StatCard icon={Users}      label="Total Users"    value={stats.users} color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={TrendingUp} label="Top Song"       value={trending[0]?.title ?? 'No songs yet'} color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Clock}      label="Latest Upload"  value={recent[0]?.title  ?? 'No songs yet'} color="bg-orange-500/10 text-orange-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending */}
        <div className="bg-d1 rounded-2xl p-6 border border-white/5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-brand" /> Trending Songs
          </h2>
          {trending.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No songs uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {trending.map((song, i) => (
                <div key={song.id} className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm w-5">{i + 1}</span>
                  <img src={song.coverUrl || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-lg object-cover bg-d4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
                  <span className="text-xs text-gray-500">{(song.playCount || 0).toLocaleString()} plays</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently added */}
        <div className="bg-d1 rounded-2xl p-6 border border-white/5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-brand" /> Recently Added
          </h2>
          {recent.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No songs uploaded yet. Go to Songs → Upload Song.</p>
          ) : (
            <div className="space-y-3">
              {recent.map(song => (
                <div key={song.id} className="flex items-center gap-3">
                  <img src={song.coverUrl || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-lg object-cover bg-d4" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artist} · {song.genre}</p>
                  </div>
                  <span className="text-xs text-gray-600">{new Date(song.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
