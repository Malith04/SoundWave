import { Play } from 'lucide-react'
import { useState } from 'react'
import { usePlayer } from '../context/PlayerContext'
import SongModal from './SongModal'

export default function SongCard({ song, queue }) {
  const { play, currentSong, isPlaying, togglePlay } = usePlayer()
  const [showModal, setShowModal] = useState(false)
  const isActive = currentSong?.id === song.id

  const handlePlay = e => {
    e.stopPropagation()
    console.log('SongCard clicked:', { song, queue, isActive })
    
    try {
      if (isActive) {
        console.log('Toggling play for active song')
        togglePlay()
      } else {
        // Ensure song has required properties
        if (!song || !song.id) {
          console.error('Invalid song object:', song)
          return
        }
        const songQueue = queue || [song]
        const index = queue ? queue.findIndex(s => s.id === song.id) : 0
        console.log('Playing new song:', { song: song.title, index, queueLength: songQueue.length })
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
        className="bg-surface-2 hover:bg-surface-3 rounded-xl p-4 cursor-pointer transition-all group relative"
        onClick={handleCardClick}
      >
        <div className="relative mb-4">
          <img
            src={song.coverUrl || 'https://via.placeholder.com/160'}
            alt={song.title}
            className="w-full aspect-square object-cover rounded-lg"
          />
          <button
            onClick={handlePlay}
            className="absolute bottom-2 right-2 w-10 h-10 bg-brand rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:scale-105"
          >
            {isActive && isPlaying
              ? <span className="w-3 h-3 border-l-2 border-r-2 border-black" />
              : <Play size={18} fill="black" className="ml-0.5" />
            }
          </button>
        </div>
        <p className="font-medium text-sm truncate">{song.title}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{song.artist}</p>
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
