import { useState } from 'react'
import { Waves } from 'lucide-react'

function formatTime(secs) {
  if (!secs || isNaN(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default function WaveSeekBar({
  progress = 0,
  currentTime = 0,
  duration = 0,
  seek,
  isPlaying = false,
  waveEnabled = true,
  onToggleWave,
  showTimes = true,
  className = '',
}) {
  const [isHovered, setIsHovered] = useState(false)
  const percent = Math.min(Math.max((progress || 0) * 100, 0), 100)

  return (
    <div className={`flex items-center gap-2.5 w-full select-none ${className}`}>
      {/* Current Time Display */}
      {showTimes && (
        <span className="text-xs text-gray-500 tabular-nums shrink-0 w-9 text-right font-medium">
          {formatTime(currentTime)}
        </span>
      )}

      {/* Interactive Track Area */}
      <div
        className="relative flex-1 flex items-center h-6 cursor-pointer group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background Track (Unplayed) */}
        <div
          className={`w-full rounded-full overflow-hidden transition-all duration-200 relative ${
            isHovered ? 'h-2 bg-white/25' : 'h-1.5 bg-white/15'
          }`}
        >
          {/* Active Progress Track (Currently Playing Area) */}
          <div
            className="h-full rounded-full relative overflow-hidden transition-[width] duration-75 ease-out"
            style={{
              width: `${percent}%`,
              background: 'linear-gradient(90deg, #10b981 0%, var(--brand, #1DB954) 75%, #34d399 100%)',
              boxShadow: isPlaying ? '0 0 10px rgba(29, 185, 84, 0.45)' : 'none',
            }}
          >
            {/* Animated Wave Pattern inside the active playing portion */}
            {waveEnabled && percent > 0.5 && (
              <div
                className={`absolute inset-0 pointer-events-none ${
                  isPlaying ? 'seek-wave-active' : 'seek-wave-paused'
                }`}
              />
            )}
          </div>
        </div>

        {/* Playhead Thumb */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full pointer-events-none transition-all duration-150 -translate-x-1/2 shadow-[0_1px_8px_rgba(0,0,0,0.8)] ${
            isHovered ? 'scale-125 ring-2 ring-brand' : 'scale-100'
          }`}
          style={{ left: `${percent}%` }}
        />

        {/* Transparent native range slider for perfect keyboard, mouse, and touch interaction */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={progress || 0}
          onChange={(e) => seek?.(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Seek track position"
        />
      </div>

      {/* Duration Display */}
      {showTimes && (
        <span className="text-xs text-gray-500 tabular-nums shrink-0 w-9 font-medium">
          {formatTime(duration)}
        </span>
      )}

      {/* Wave Animation Option Toggle Button */}
      {onToggleWave && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleWave()
          }}
          className={`p-1.5 rounded-full transition-all text-xs flex items-center justify-center shrink-0 ${
            waveEnabled
              ? 'text-brand bg-brand/10 hover:bg-brand/20 shadow-sm'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
          title={
            waveEnabled
              ? 'Seek bar wave animation: ON (Click to toggle OFF)'
              : 'Seek bar wave animation: OFF (Click to toggle ON)'
          }
          aria-label="Toggle wave animation on seek bar"
        >
          <Waves
            size={14}
            className={`transition-transform ${waveEnabled && isPlaying ? 'animate-pulse' : ''}`}
          />
        </button>
      )}
    </div>
  )
}
