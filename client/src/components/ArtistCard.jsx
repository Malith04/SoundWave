import { useNavigate } from 'react-router-dom'
import { Play, CheckCircle2, User } from 'lucide-react'
import { usePlayer } from '../context/PlayerContext'

export default function ArtistCard({ artist, onPlay, layout = 'vertical' }) {
  const navigate = useNavigate()
  const { play } = usePlayer()

  const handleCardClick = () => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`)
  }

  const handlePlayClick = (e) => {
    e.stopPropagation()
    if (onPlay) {
      onPlay(artist)
    } else {
      navigate(`/artist/${encodeURIComponent(artist.name)}`)
    }
  }

  // Format listeners / fan count
  const formattedFans = artist.fanCount
    ? artist.fanCount >= 1000000
      ? `${(artist.fanCount / 1000000).toFixed(1)}M listeners`
      : artist.fanCount >= 1000
      ? `${(artist.fanCount / 1000).toFixed(0)}K listeners`
      : `${artist.fanCount} listeners`
    : artist.genre || 'Artist'

  if (layout === 'banner') {
    return (
      <div
        onClick={handleCardClick}
        className="group relative flex items-center gap-5 p-5 bg-gradient-to-r from-surface-2/90 via-surface-2/60 to-surface-1/40 hover:from-surface-3/90 hover:via-surface-3/70 hover:to-surface-2/60 border border-white/10 hover:border-white/20 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-black/50 overflow-hidden"
      >
        {/* Glow backlight */}
        <div className="absolute -left-10 -top-10 w-44 h-44 bg-brand/15 rounded-full blur-3xl pointer-events-none group-hover:bg-brand/25 transition-all" />

        {/* Circular Avatar */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-surface-3 border-2 border-white/10 group-hover:border-brand/60 shadow-xl transition-all duration-300 group-hover:scale-105">
            {artist.picture ? (
              <img
                src={artist.picture}
                alt={artist.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-3 text-gray-400">
                <User size={36} />
              </div>
            )}
          </div>
          {/* Verified Badge */}
          <div className="absolute bottom-0 right-0 bg-[#121216] rounded-full p-1 shadow-md border border-white/10" title="Verified Artist">
            <CheckCircle2 size={18} className="text-brand fill-brand/20" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-gray-300 mb-1.5">
            <span>Verified Artist</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white truncate group-hover:text-brand transition-colors">
            {artist.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate flex items-center gap-2">
            <span>{formattedFans}</span>
            {artist.genre && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-500" />
                <span className="text-gray-300">{artist.genre}</span>
              </>
            )}
          </p>
        </div>

        {/* Quick Play / View Button */}
        <button
          onClick={handlePlayClick}
          className="shrink-0 w-12 h-12 rounded-full bg-brand text-black flex items-center justify-center shadow-lg shadow-brand/30 hover:scale-110 active:scale-95 transition-all duration-200"
          title={`Play ${artist.name}`}
          aria-label={`Play ${artist.name}`}
        >
          <Play size={20} fill="black" className="translate-x-0.5" />
        </button>
      </div>
    )
  }

  // Default Grid / Vertical Layout
  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col items-center text-center p-4 sm:p-5 bg-surface-2/60 hover:bg-surface-3/80 border border-white/5 hover:border-white/15 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/40 hover:-translate-y-1"
    >
      {/* Circular Avatar */}
      <div className="relative mb-3.5">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-surface-3 border-2 border-white/10 group-hover:border-brand/60 shadow-lg transition-all duration-300 group-hover:scale-105">
          {artist.picture ? (
            <img
              src={artist.picture}
              alt={artist.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface-3 text-gray-400">
              <User size={38} />
            </div>
          )}
        </div>

        {/* Hover Play Button */}
        <button
          onClick={handlePlayClick}
          className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-brand text-black flex items-center justify-center shadow-xl shadow-brand/30 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95 transition-all duration-200"
          title={`Play ${artist.name}`}
          aria-label={`Play ${artist.name}`}
        >
          <Play size={16} fill="black" className="translate-x-0.5" />
        </button>
      </div>

      {/* Artist Name */}
      <div className="w-full">
        <div className="flex items-center justify-center gap-1.5 max-w-full">
          <h4 className="text-sm sm:text-base font-bold text-white truncate group-hover:text-brand transition-colors">
            {artist.name}
          </h4>
          <CheckCircle2 size={14} className="text-brand shrink-0" title="Verified Artist" />
        </div>
        <p className="text-xs text-gray-400 mt-1 truncate">
          {formattedFans}
        </p>
      </div>
    </div>
  )
}
