import { useState } from 'react'
import { ListMusic, Star, Users, Eye, Plus, Sparkles, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const INITIAL_PLAYLISTS = [
  {
    id: 'pl_1',
    name: 'Top 50 - Sri Lanka',
    curator: 'SoundWave Editorial',
    trackCount: 50,
    followers: 1240,
    featured: true,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop'
  },
  {
    id: 'pl_2',
    name: 'Synthwave Night Ride',
    curator: 'Malith Rajamanthri',
    trackCount: 38,
    followers: 890,
    featured: true,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop'
  },
  {
    id: 'pl_3',
    name: 'Lofi Study Chill Beats',
    curator: 'SoundWave AI Mix',
    trackCount: 65,
    followers: 2150,
    featured: true,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop'
  },
  {
    id: 'pl_4',
    name: 'Deep Focus Electronics',
    curator: 'SoundWave Editorial',
    trackCount: 42,
    followers: 670,
    featured: false,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop'
  }
]

export default function AdminPlaylistsTab() {
  const [playlists, setPlaylists] = useState(INITIAL_PLAYLISTS)

  const toggleFeatured = id => {
    setPlaylists(prev =>
      prev.map(p => {
        if (p.id === id) {
          const nextVal = !p.featured
          toast.success(nextVal ? `Featured "${p.name}" on homepage` : `Unfeatured "${p.name}"`)
          return { ...p, featured: nextVal }
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
          <span className="text-xs font-semibold text-gray-400">Total Curated Mixes:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#6366f1]/20 text-[#a5b4fc]">
            {playlists.length}
          </span>
        </div>

        <button
          onClick={() => toast.success('New Playlist creation modal opened')}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>Create Official Mix</span>
        </button>
      </div>

      {/* ── Playlists Table ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-5">PLAYLIST / MIX</div>
          <div className="hidden md:block md:col-span-3">CURATOR</div>
          <div className="hidden md:block md:col-span-2">TRACKS & FOLLOWERS</div>
          <div className="col-span-12 md:col-span-2 text-right">HOMEPAGE STATUS</div>
        </div>

        <div className="divide-y divide-white/5">
          {playlists.map(pl => (
            <div
              key={pl.id}
              className="grid grid-cols-12 px-6 py-4 items-center hover:bg-white/[0.02] transition-colors"
            >
              <div className="col-span-12 md:col-span-5 flex items-center gap-3.5 pr-4">
                <img
                  src={pl.coverUrl}
                  alt={pl.name}
                  className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-md ring-1 ring-white/10"
                />
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-bold text-white truncate">{pl.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{pl.trackCount} tracks</p>
                </div>
              </div>

              <div className="hidden md:block md:col-span-3">
                <p className="text-xs font-semibold text-gray-300">{pl.curator}</p>
              </div>

              <div className="hidden md:block md:col-span-2">
                <p className="text-xs font-bold text-emerald-400">
                  {pl.followers.toLocaleString()} listeners
                </p>
              </div>

              <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0">
                <button
                  onClick={() => toggleFeatured(pl.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    pl.featured
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Star size={12} className={pl.featured ? 'fill-amber-400 text-amber-400' : ''} />
                  <span>{pl.featured ? 'Featured' : 'Feature'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
