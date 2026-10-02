import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Play, Pause, Heart, ExternalLink, Music, Video, Clock, Tag, Disc3, Sparkles, User } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite, isFavorite } from '../services/userService'
import { searchYouTube } from '../services/musicApi'
import toast from 'react-hot-toast'

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
  
  const isActive = currentSong?.id === song?.id

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
    if (!user || !song) {
      toast.error('Sign in to save favorites')
      return
    }
    const nextState = await toggleFavorite(user.uid, song.id)
    setLiked(nextState)
    toast.success(nextState ? 'Added to Liked Songs' : 'Removed from Liked Songs')
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
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative glass-modal rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-white/15 animate-pop-in flex flex-col">
        
        {/* Dynamic ambient color background matching the cover */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-3xl scale-125 pointer-events-none"
          style={{ backgroundImage: `url(${song.coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/60 via-surface/90 to-surface pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
            <span className="font-bold text-sm tracking-wide text-white/90 uppercase font-display">Track Info</span>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="relative z-10 overflow-y-auto flex-1 p-5 sm:p-7">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            
            {/* Left: Album Art & Track Controls */}
            <div className="lg:w-1/2 flex flex-col items-center text-center">
              
              {/* Artwork with glowing play button */}
              <div className="relative mb-5 group">
                <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/15 relative">
                  <img 
                    src={song.coverUrl || 'https://via.placeholder.com/256'} 
                    alt={song.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {isActive && isPlaying && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                      <div className="flex items-end gap-1 h-6">
                        <span className="w-1.5 bg-brand rounded-full audio-bar-1" />
                        <span className="w-1.5 bg-brand rounded-full audio-bar-2" />
                        <span className="w-1.5 bg-brand rounded-full audio-bar-3" />
                        <span className="w-1.5 bg-brand rounded-full audio-bar-4" />
                        <span className="w-1.5 bg-brand rounded-full audio-bar-5" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Floating Play Button */}
                <button
                  onClick={handlePlay}
                  aria-label={isActive && isPlaying ? 'Pause song' : 'Play song'}
                  className="absolute bottom-3 right-3 w-14 h-14 bg-brand text-black rounded-full flex items-center justify-center shadow-2xl shadow-brand/40 hover:scale-110 active:scale-95 transition-all duration-300 hover:bg-brand-dark"
                >
                  {isActive && isPlaying ? (
                    <Pause size={22} fill="black" />
                  ) : (
                    <Play size={22} fill="black" className="ml-1" />
                  )}
                </button>
              </div>

              {/* Title & Artist */}
              <div className="w-full max-w-sm">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display leading-tight mb-1">
                  {song.title}
                </h1>
                <p className="text-base text-gray-300 font-medium mb-1">
                  <Link
                    to={`/artist/${encodeURIComponent(song.artist)}`}
                    onClick={onClose}
                    className="hover:underline hover:text-brand transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>{song.artist}</span>
                  </Link>
                </p>
                {song.album && (
                  <p className="text-xs text-gray-500 mb-3">{song.album}</p>
                )}
                
                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-300 mb-6">
                  {song.duration && (
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                      <Clock size={12} className="text-brand" />
                      {formatDuration(song.duration)}
                    </span>
                  )}
                  {song.genre && (
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                      <Tag size={12} className="text-brand" />
                      {song.genre}
                    </span>
                  )}
                  <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full border border-white/5">
                    <Disc3 size={12} className="text-brand" />
                    {song.source === 'jamendo' ? 'Full Track (HQ)' : '30s Preview'}
                  </span>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                      liked 
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' 
                        : 'border-white/20 text-gray-300 hover:text-white hover:border-white/40 bg-white/5'
                    }`}
                  >
                    <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                    {liked ? 'Liked' : 'Like'}
                  </button>

                  <Link
                    to={`/artist/${encodeURIComponent(song.artist)}`}
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs sm:text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                  >
                    <User size={14} />
                    <span>View Artist</span>
                  </Link>
                  
                  {song.source === 'itunes' && (
                    <a
                      href={`https://music.apple.com/search?term=${encodeURIComponent(`${song.title} ${song.artist}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/20 text-gray-300 hover:text-white hover:border-white/40 bg-white/5 text-xs sm:text-sm font-semibold transition-all hover:bg-white/10"
                    >
                      <ExternalLink size={14} />
                      Apple Music
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Music Video Integration */}
            <div className="lg:w-1/2 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2 font-display">
                <Video size={18} className="text-brand" />
                Official Music Video
              </h3>
              
              {loadingVideo ? (
                <div className="aspect-video bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/10">
                  <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-gray-400">Searching official video...</p>
                </div>
              ) : videoId ? (
                <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-black">
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
                <div className="aspect-video bg-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500 border border-white/10 p-6 text-center">
                  <Music size={40} className="mb-2 opacity-30 text-white" />
                  <p className="text-sm font-medium text-gray-400">No official video stream available</p>
                  <p className="text-xs text-gray-500 mt-1">Enjoy the studio audio track above</p>
                </div>
              )}
              
              {videoId && (
                <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                  <span>Video powered by YouTube</span>
                  <span className="text-brand">HD Stream</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}