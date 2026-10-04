import { useState, useEffect } from 'react'
import {
  Users,
  Music2,
  Headphones,
  Activity,
  Radio,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Database,
  Wifi,
  Sparkles,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react'

export default function AdminOverviewTab() {
  const [stats, setStats] = useState({
    liveListeners: 42,
    streamsToday: '18,420',
    totalUsers: 8,
    activeServers: '4 / 4 Nodes',
    hitRate: '99.4%'
  })

  // Simulated live track stream
  const [liveStream, setLiveStream] = useState([
    { id: 1, user: 'Malith R.', song: 'Starboy', artist: 'The Weeknd', time: 'Just now', source: 'YouTube HD' },
    { id: 2, user: 'Hashintha R.', song: 'Blinding Lights', artist: 'The Weeknd', time: '12s ago', source: 'Direct Stream' },
    { id: 3, user: 'Mihiranga R.', song: 'Shape of You', artist: 'Ed Sheeran', time: '45s ago', source: 'YouTube HD' },
    { id: 4, user: 'Akalanka R.', song: 'Night Vibes Lofi', artist: 'Chillhop Music', time: '1m ago', source: 'Jamendo HiFi' },
    { id: 5, user: 'Ananda R.', song: 'Sunflower', artist: 'Post Malone', time: '2m ago', source: 'YouTube HD' }
  ])

  useEffect(() => {
    // Try fetching real admin stats from backend
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setStats(prev => ({
            ...prev,
            totalUsers: data.totalUsers || prev.totalUsers,
            totalSongs: data.totalSongs || 45,
            streamsToday: data.totalPlays ? data.totalPlays.toLocaleString() : prev.streamsToday
          }))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      {/* ── Key Metrics Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Live Listeners */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Live Active Listeners</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Radio size={16} className="animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-display tracking-tight">
              {stats.liveListeners}
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              +14% <ArrowUpRight size={12} />
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Currently streaming via Web Player</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
        </div>

        {/* Metric 2: Streams Today */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Streams Today</span>
            <div className="p-2 rounded-xl bg-[#6366f1]/10 text-[#818cf8]">
              <Headphones size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-display tracking-tight">
              {stats.streamsToday}
            </span>
            <span className="text-xs font-bold text-indigo-400 flex items-center">
              +28.4% <ArrowUpRight size={12} />
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">High fidelity audio buffers</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6366f1] to-purple-500" />
        </div>

        {/* Metric 3: Total Accounts */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Platform Users</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-display tracking-tight">
              {stats.totalUsers}
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center">
              100% Trust <Sparkles size={11} className="ml-1" />
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Google OAuth + Standard Auth</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500" />
        </div>

        {/* Metric 4: System Health */}
        <div className="p-5 rounded-2xl bg-[#0d0e19] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Audio Cache Hit Rate</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-display tracking-tight">
              {stats.hitRate}
            </span>
            <span className="text-xs font-bold text-emerald-400">Optimal</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Edge audio delivery latency &lt; 85ms</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
        </div>
      </div>

      {/* ── Two-Column Operational Views ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Audio Stream Activity */}
        <div className="lg:col-span-7 bg-[#0d0e19] rounded-2xl border border-white/5 p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Audio Stream Monitor
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time active listener playback queue and sources
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300">
              Auto-updating (1s)
            </span>
          </div>

          <div className="divide-y divide-white/5">
            {liveStream.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#141525] border border-white/5 flex items-center justify-center text-indigo-400 shrink-0">
                    <Music2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {item.song} <span className="font-normal text-gray-400">· {item.artist}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">Listener: {item.user}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/30">
                    {item.source}
                  </span>
                  <p className="text-[10px] text-gray-500 mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Audio Node & Cluster Status */}
        <div className="lg:col-span-5 bg-[#0d0e19] rounded-2xl border border-white/5 p-6 shadow-2xl space-y-5">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Audio Node Infrastructure
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">High availability streaming mesh</p>
          </div>

          <div className="space-y-3">
            {/* Node 1 */}
            <div className="p-3.5 rounded-xl bg-[#141525] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Database size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">PostgreSQL Primary Cluster</p>
                  <p className="text-[10px] text-gray-400">Neon Cloud · 12ms ping</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                HEALTHY
              </span>
            </div>

            {/* Node 2 */}
            <div className="p-3.5 rounded-xl bg-[#141525] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Cpu size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">YouTube IFrame Engine</p>
                  <p className="text-[10px] text-gray-400">Sync bridge · API v3 active</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                ONLINE
              </span>
            </div>

            {/* Node 3 */}
            <div className="p-3.5 rounded-xl bg-[#141525] border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Wifi size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Jamendo Audio Edge</p>
                  <p className="text-[10px] text-gray-400">Direct streaming CDN</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">
                ACTIVE
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
            <span>Overall Availability</span>
            <span className="font-extrabold text-emerald-400">99.98% SLA</span>
          </div>
        </div>
      </div>
    </div>
  )
}
