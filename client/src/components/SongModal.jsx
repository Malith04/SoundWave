import { useState, useEffect } from 'react'
import { X, Play, Pause, Heart, ExternalLink, Music, Video } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite, isFavorite } from '../services/userService'
import { searchYouTube } from '../services/musicApi'

function formatDuration(ms) {
  if (!ms) return '0:00'
  const secs = Math.floor(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function SongModal({ song, queue, onClose }) {
  const { currentSong, isPlaying, play, togglePlay } = usePlayer()
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [videoId, setVideoId] = useState(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  
  const isActive = currentSong?.id === song.id

  useEffect(() => {
    if (user && song) {
      isFavorite(user.uid, song.id).then(setLiked)
    }
  }, [user, song])

  useEffect(() => {
    // Search for official music video
    const searchForVideo = async () => {
      setLoadingVideo(true)
      try {
        const query = `${song.title} ${song.artist} official music video`
        const id = await searchYouTube(query)
        setVideoId(id)
      } catch (error) {
        console.warn('Failed to find music video:', error)
      } finally {
        setLoadingVideo(false)
      }
    }

    if (song) {
      searchForVideo()
    }
  }, [song])

  const handleLike = async () => {
    if (!user || !song) return
    setLiked(await toggleFavorite(user.uid, song.id))
  }

  const handlePlay = () => {
    if (isActive) {
      togglePlay()
    } else {
      const songQueue = queue || [song]
      const index = queue ? queue.findIndex(s => s.id === song.id) : 0
      play(song, songQueue, index)
    }
  }

  if (!song) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121212] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Song Details</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          
          {/* Left: Album Art & Info */}
          <div className="lg:w-1/2 p-6 flex flex-col items-center text-center">
            
            {/* Album Art */}
            <div className="relative mb-6">
              <div className="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={song.coverUrl || 'https://via.placeholder.com/256'} 
                  alt={song.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Play Button Overlay */}
              <button
                onClick={handlePlay}
                className="absolute bottom-4 right-4 w-16 h-16 bg-brand rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-all"
              >
                {isActive && isPlaying ? (
                  <Pause size={24} fill="black" />
                ) : (
                  <Play size={24} fill="black" className="ml-1" />
                )}
              </button>
            </div>

            {/* Song Info */}
            <div className="w-full max-w-sm">
              <h1 className="text-2xl font-bold mb-2 leading-tight">{song.title}</h1>
              <p className="text-lg text-gray-400 mb-1">{song.artist}</p>
              {song.album && (
                <p className="text-sm text-gray-500 mb-4">{song.album}</p>
              )}
              
              {/* Metadata */}
              <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-6">
                {song.duration && (
                  <span>{formatDuration(song.duration)}</span>
                )}
                {song.genre && (
                  <span>• {song.genre}</span>
                )}
                <span>• {song.source === 'jamendo' ? 'Full Track' : '30s Preview'}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                    liked 
                      ? 'bg-brand/20 border-brand text-brand' 
                      : 'border-white/20 text-gray-400 hover:text-white hover:border-white/40'
                  }`}
                >
                  <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                  {liked ? 'Liked' : 'Like'}
                </button>
                
                {song.source === 'itunes' && (
                  <a
                    href={`https://music.apple.com/search?term=${encodeURIComponent(`${song.title} ${song.artist}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-all"
                  >
                    <ExternalLink size={16} />
                    Apple Music
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right: Music Video */}
          <div className="lg:w-1/2 p-6 border-t lg:border-t-0 lg:border-l border-white/10">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Video size={20} />
              Official Music Video
            </h3>
            
            {loadingVideo ? (
              <div className="aspect-video bg-surface-2 rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            ) : videoId ? (
              <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                  title={`${song.title} - ${song.artist}`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="aspect-video bg-surface-2 rounded-xl flex flex-col items-center justify-center text-gray-500">
                <Music size={48} className="mb-3 opacity-30" />
                <p className="text-sm">No official music video found</p>
              </div>
            )}
            
            {videoId && (
              <div className="mt-4 text-xs text-gray-500 text-center">
                Video provided by YouTube
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}