import { useState, useEffect } from 'react'
import { ListMusic, Star, Users, Eye, Plus, Sparkles, Check, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminPlaylistsTab() {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPlaylists = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/playlists')
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load playlists')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlaylists()
  }, [])

  const toggleFeatured = id => {
    setPlaylists(prev =>
      prev.map(p => {
        if (p.id === id) {
          const nextVal = !p.is_public
          toast.success(nextVal ? `Made "${p.name}" public on SoundWave` : `Made "${p.name}" private`)
          return { ...p, is_public: nextVal }
        }
        return p
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header Bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400">Total Playlists in Database:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#6366f1]/20 text-[#a5b4fc]">
            {playlists.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPlaylists}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#141525] border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Playlists Table ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-5">PLAYLIST / MIX</div>
          <div className="hidden md:block md:col-span-3">CREATOR</div>
          <div className="hidden md:block md:col-span-2">SONGS COUNT</div>
          <div className="col-span-12 md:col-span-2 text-right">VISIBILITY</div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div className="w-8 h-8 border-2 border-[#6366f1] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-gray-400">Loading playlists from database...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <ListMusic size={44} className="mx-auto mb-3 opacity-20 text-indigo-400" />
              <p className="text-sm font-semibold text-gray-400">No user playlists found in database</p>
            </div>
          ) : (
            playlists.map(pl => (
              <div
                key={pl.id}
                className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                <div className="col-span-12 md:col-span-5 flex items-center gap-3.5 pr-4">
                  {pl.cover_url ? (
                    <img
                      src={pl.cover_url}
                      alt={pl.name}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-md ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-[#141525] border border-white/5 flex items-center justify-center text-indigo-400 shrink-0">
                      <ListMusic size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-bold text-white truncate">{pl.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Created: {new Date(pl.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="hidden md:block md:col-span-3">
                  <p className="text-xs font-semibold text-gray-300">{pl.curator_name || 'Listener'}</p>
                  <p className="text-[11px] text-gray-500">{pl.curator_email}</p>
                </div>

                <div className="hidden md:block md:col-span-2">
                  <p className="text-xs font-bold text-emerald-400">
                    {pl.track_count || 0} tracks
                  </p>
                </div>

                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => toggleFeatured(pl.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      pl.is_public
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{pl.is_public ? 'Public' : 'Private'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
