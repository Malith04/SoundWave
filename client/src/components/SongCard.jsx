import { Play, Pause } from 'lucide-react'
import { useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import SongModal from './SongModal'

export default function SongCard({ song, queue }) {
  const { play, currentSong, isPlaying, togglePlay } = usePlayer()
  const [showModal, setShowModal] = useState(false)
  const isActive = currentSong?.id === song.id

  const handlePlay = e => {
    e.stopPropagation()
    try {
      if (isActive) {
        togglePlay()
      } else {
        if (!song || !song.id) return
        const songQueue = queue || [song]
        const index = queue ? queue.findIndex(s => s.id === song.id) : 0
        play(song, songQueue, index)
      }
    } catch (error) {
      console.error('Error playing song:', error)
    }
  }

  const handleCardClick = () => {
    setShowModal(true)
  }

  return (
    <>
      <div 
        className={`glass-card rounded-2xl p-3 sm:p-4 cursor-pointer group relative flex flex-col justify-between ${
          isActive ? 'border-brand/40 shadow-lg shadow-brand/10 bg-white/[0.06]' : ''
        }`}
        onClick={handleCardClick}
      >
        <div className="relative mb-3 overflow-hidden rounded-xl">
          <img
            src={song.coverUrl || 'https://via.placeholder.com/160'}
            alt={song.title}
            className={`w-full aspect-square object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              isActive ? 'scale-[1.02]' : ''
            }`}
            loading="lazy"
          />

          {/* Source badge */}
          {song.source && (
            <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 border border-white/10 uppercase tracking-wider">
              {song.source === 'jamendo' ? 'Full' : 'Preview'}
            </span>
          )}

          {/* Playing wave overlay when active */}
          {isActive && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-brand/30">
              <span className={`w-1 h-3 rounded-full bg-brand ${isPlaying ? 'audio-bar-1' : 'h-1.5'}`} />
              <span className={`w-1 h-3 rounded-full bg-brand ${isPlaying ? 'audio-bar-2' : 'h-2'}`} />
              <span className={`w-1 h-3 rounded-full bg-brand ${isPlaying ? 'audio-bar-3' : 'h-1'}`} />
            </div>
          )}

          {/* Floating Play/Pause Action Button */}
          <button
            onClick={handlePlay}
            aria-label={isActive && isPlaying ? 'Pause song' : 'Play song'}
            className={`absolute bottom-2.5 right-2.5 w-11 h-11 bg-brand text-black rounded-full flex items-center justify-center shadow-xl shadow-black/50 transition-all duration-300 hover:scale-110 active:scale-95 ${
              isActive
                ? 'opacity-100 translate-y-0 shadow-brand/40'
                : 'opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0'
            }`}
          >
            {isActive && isPlaying ? (
              <Pause size={18} fill="black" />
            ) : (
              <Play size={18} fill="black" className="ml-0.5" />
            )}
          </button>
        </div>

        <div>
          <p className={`font-semibold text-sm truncate transition-colors ${
            isActive ? 'text-brand' : 'text-white group-hover:text-brand'
          }`}>
            {song.title}
          </p>
          <p className="text-xs text-gray-400 truncate mt-1">
            {song.artist}
          </p>
        </div>
      </div>

      {showModal && (
        <SongModal 
          song={song} 
          queue={queue} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </>
  )
}
