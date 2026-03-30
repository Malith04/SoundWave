import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Shuffle } from 'lucide-react'
import { getJamendoByGenre, searchiTunesByGenre } from '../services/musicApi'
import { usePlayer } from '../context/PlayerContext'
import SongRow from '../components/SongRow'

const GENRE_COLORS = {
  Pop: 'from-pink-600', Rock: 'from-red-700', 'Hip-Hop': 'from-yellow-500',
  Electronic: 'from-purple-600', Jazz: 'from-amber-600', Classical: 'from-emerald-600',
  Chill: 'from-blue-500', Acoustic: 'from-lime-600',
}

export default function GenrePage() {
  const { genre } = useParams()
  const { play } = usePlayer()
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('full') // full | preview

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getJamendoByGenre(genre, 20),
      searchiTunesByGenre(genre, 15),
    ]).then(([jamendo, itunes]) => {
      setSongs({ full: jamendo, preview: itunes })
      setLoading(false)
    })
  }, [genre])

  const displayed = songs[tab] || []

  const handlePlay = (shuffle = false) => {
    if (!displayed.length) return
    const q = shuffle ? [...displayed].sort(() => Math.random() - 0.5) : displayed
    play(q[0], q, 0)
  }

  return (
    <div>
      {/* Hero */}
      <div className={`bg-gradient-to-b ${GENRE_COLORS[genre] || 'from-gray-700'} to-surface px-6 pt-16 pb-6`}>
        <p className="text-sm font-medium text-white/70 mb-1">Genre</p>
        <h1 className="text-5xl font-black mb-5">{genre}</h1>
        <div className="flex gap-3">
          <button
            onClick={() => handlePlay(false)}
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold px-6 py-3 rounded-full transition-all"
          >
            <Play size={18} fill="black" /> Play All
          </button>
          <button
            onClick={() => handlePlay(true)}
            className="flex items-center gap-2 bg-black/30 hover:bg-black/50 px-5 py-3 rounded-full text-sm font-medium transition-colors"
          >
            <Shuffle size={16} /> Shuffle
          </button>
        </div>
      </div>

      <div className="px-6 py-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('full')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === 'full' ? 'bg-white text-black' : 'bg-surface-2 text-gray-300 hover:bg-surface-3'}`}
          >
            🎵 Full Tracks ({songs.full?.length || 0})
          </button>
          <button
            onClick={() => setTab('preview')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${tab === 'preview' ? 'bg-white text-black' : 'bg-surface-2 text-gray-300 hover:bg-surface-3'}`}
          >
            🎧 iTunes Previews ({songs.preview?.length || 0})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length > 0 ? (
          <div className="space-y-1">
            {displayed.map((song, i) => (
              <SongRow key={song.id} song={song} index={i} queue={displayed} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12">No tracks found for {genre}</p>
        )}
      </div>
    </div>
  )
}
