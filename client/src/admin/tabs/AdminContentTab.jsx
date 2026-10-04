import { useState, useEffect, useMemo } from 'react'
import {
  Music2,
  Play,
  Pause,
  Trash2,
  Plus,
  Search,
  ExternalLink,
  Volume2,
  Check,
  Disc3,
  Radio,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import AdminUploadModal from '../components/AdminUploadModal'

const INITIAL_TRACKS = [
  {
    id: 's_1',
    title: 'Starboy',
    artist: 'The Weeknd ft. Daft Punk',
    album: 'Starboy',
    duration: '3:50',
    source: 'YouTube HD',
    bitrate: '320 kbps',
    plays: 14205,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    genre: 'Pop / Synthwave'
  },
  {
    id: 's_2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: '3:20',
    source: 'YouTube HD',
    bitrate: '320 kbps',
    plays: 23190,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop',
    genre: 'Synthpop'
  },
  {
    id: 's_3',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Divide)',
    duration: '3:53',
    source: 'YouTube HD',
    bitrate: '320 kbps',
    plays: 18920,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    genre: 'Pop'
  },
  {
    id: 's_4',
    title: 'Chill Lofi Study Beats',
    artist: 'Lofi Girl / ChilledCow',
    album: 'Lofi Sessions',
    duration: '2:45',
    source: 'Jamendo HiFi',
    bitrate: '256 kbps',
    plays: 8740,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
    genre: 'Lo-Fi Chill'
  },
  {
    id: 's_5',
    title: 'Night Drive Cyberpunk',
    artist: 'Synthwave Radio',
    album: 'Neon City',
    duration: '4:12',
    source: 'Direct Stream',
    bitrate: '320 kbps',
    plays: 6412,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
    genre: 'Electronic'
  },
  {
    id: 's_6',
    title: 'Sunflower',
    artist: 'Post Malone, Swae Lee',
    album: 'Spider-Verse OST',
    duration: '2:38',
    source: 'YouTube HD',
    bitrate: '320 kbps',
    plays: 12400,
    coverUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&h=300&fit=crop',
    genre: 'Hip Hop'
  }
]

export default function AdminContentTab({ search = '' }) {
  const [tracks, setTracks] = useState(INITIAL_TRACKS)
  const [activeSource, setActiveSource] = useState('All sources')
  const [previewTrackId, setPreviewTrackId] = useState(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

  // Fetch real songs from SoundWave API
  useEffect(() => {
    fetch('/api/songs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const apiTracks = data.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album || 'SoundWave Single',
            duration: s.duration ? `${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, '0')}` : '3:30',
            source: s.source_type === 'youtube' ? 'YouTube HD' : 'Direct Stream',
            bitrate: '320 kbps',
            plays: s.play_count || 120,
            coverUrl: s.cover_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
            genre: s.genre || 'Electronic'
          }))
          setTracks(prev => {
            const existingTitles = new Set(prev.map(t => t.title.toLowerCase()))
            const fresh = apiTracks.filter(t => !existingTitles.has(t.title.toLowerCase()))
            return [...fresh, ...prev]
          })
        }
      })
      .catch(() => {})
  }, [])

  const sourceFilters = ['All sources', 'YouTube HD', 'Jamendo HiFi', 'Direct Stream']

  const filtered = useMemo(() => {
    return tracks.filter(t => {
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!t.title.toLowerCase().includes(q) && !t.artist.toLowerCase().includes(q)) {
          return false
        }
      }
      if (activeSource !== 'All sources' && t.source !== activeSource) {
        return false
      }
      return true
    })
  }, [tracks, search, activeSource])

  const handleDelete = track => {
    if (!confirm(`Delete "${track.title}" from catalog?`)) return
    setTracks(prev => prev.filter(t => t.id !== track.id))
    toast.success(`Removed "${track.title}" from SoundWave`)
  }

  const handleTogglePreview = id => {
    if (previewTrackId === id) {
      setPreviewTrackId(null)
    } else {
      setPreviewTrackId(id)
      toast('Previewing audio stream...', { icon: '🎧' })
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Filter Pills and Upload Button ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 pb-2">
        <div className="flex items-center gap-1.5 bg-[#0f101d] p-1 rounded-full border border-white/5">
          {sourceFilters.map(sf => {
            const isSelected = activeSource === sf
            return (
              <button
                key={sf}
                onClick={() => setActiveSource(sf)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-[#6366f1] text-white shadow-md shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {sf}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={14} />
          <span>Add Track to Catalog</span>
        </button>
      </div>

      {/* ── Content Table ── */}
      <div className="w-full bg-[#0d0e19] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="grid grid-cols-12 px-6 py-4 border-b border-white/5 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 select-none">
          <div className="col-span-12 md:col-span-5">TRACK & ARTIST</div>
          <div className="hidden md:block md:col-span-2">GENRE</div>
          <div className="hidden md:block md:col-span-2">SOURCE & BITRATE</div>
          <div className="hidden md:block md:col-span-2">PLAYS</div>
          <div className="col-span-12 md:col-span-1 text-right">ACTIONS</div>
        </div>

        <div className="divide-y divide-white/5">
          {filtered.map(track => {
            const isPlaying = previewTrackId === track.id
            return (
              <div
                key={track.id}
                className="grid grid-cols-12 px-6 py-3.5 items-center hover:bg-white/[0.02] transition-colors group"
              >
                {/* Track Column */}
                <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0 pr-4">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-[#141525] shrink-0 group-hover:shadow-md">
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleTogglePreview(track.id)}
                      className={`absolute inset-0 bg-black/50 flex items-center justify-center text-white transition-opacity ${
                        isPlaying ? 'opacity-100 bg-[#6366f1]/70' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {track.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
                  </div>
                </div>

                {/* Genre Column */}
                <div className="hidden md:block md:col-span-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-gray-300 border border-white/10">
                    {track.genre}
                  </span>
                </div>

                {/* Source & Bitrate */}
                <div className="hidden md:block md:col-span-2">
                  <p className="text-xs font-bold text-gray-200">{track.source}</p>
                  <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{track.bitrate}</p>
                </div>

                {/* Plays */}
                <div className="hidden md:block md:col-span-2">
                  <p className="text-xs font-bold text-emerald-400">
                    {track.plays.toLocaleString()} plays
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{track.duration}</p>
                </div>

                {/* Actions */}
                <div className="col-span-12 md:col-span-1 flex items-center justify-end gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleDelete(track)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-400 hover:underline transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <AdminUploadModal
          isOpen={true}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={newTrack => {
            setTracks(prev => [newTrack, ...prev])
            setUploadModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
