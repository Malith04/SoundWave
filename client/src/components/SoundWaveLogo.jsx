import { memo } from 'react'

/**
 * SoundWave Modern Signature Brand Logo
 * 
 * Features:
 * - Bespoke harmonic audio wave + energetic kinetic pulse design
 * - Custom gradient blending (Emerald Neon #1DB954 to Electric Cyan #00F59B)
 * - Scalable pure vector SVG with glow aura
 * - Optional subtle audio equalizer wave animation
 * - Optional integrated high-end typography wordmark
 */
function SoundWaveLogoComponent({
  size = 36,
  showText = false,
  animated = false,
  glow = true,
  className = '',
  textClassName = '',
  onClick
}) {
  return (
    <div 
      className={`inline-flex items-center gap-3 select-none group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* ── Logo Icon Container ── */}
      <div 
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        {/* Ambient Neon Backlight Glow */}
        {glow && (
          <div 
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-brand to-emerald-400 opacity-30 blur-md group-hover:opacity-50 transition-opacity duration-300 pointer-events-none" 
            style={{ transform: 'scale(1.15)' }}
          />
        )}

        {/* Vector SVG Emblem */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(29,185,84,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background container gradient */}
            <linearGradient id="swBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#141722" />
              <stop offset="100%" stopColor="#090a0f" />
            </linearGradient>

            {/* Core SoundWave neon gradient */}
            <linearGradient id="swCoreGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="45%" stopColor="#1DB954" />
              <stop offset="100%" stopColor="#00f59b" />
            </linearGradient>

            {/* Electric Cyan Secondary Gradient */}
            <linearGradient id="swCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f59b" />
              <stop offset="60%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>

            {/* Inner Border Linear Glow */}
            <linearGradient id="swBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
              <stop offset="50%" stopColor="rgba(29,185,84,0.4)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>

          {/* Squircle Chassis */}
          <rect
            x="3"
            y="3"
            width="94"
            height="94"
            rx="26"
            fill="url(#swBgGrad)"
            stroke="url(#swBorderGrad)"
            strokeWidth="2"
          />

          {/* Internal Radial Atmosphere */}
          <circle cx="50" cy="50" r="32" fill="#1DB954" opacity="0.18" />

          {/* ── SoundWave Harmonic Audio Frequency Bars ── */}
          <g className={animated ? 'animate-pulse' : ''}>
            {/* Bar 1: Intro wave */}
            <rect
              x="21"
              y="41"
              width="6.5"
              height="18"
              rx="3.25"
              fill="url(#swCoreGrad)"
              opacity="0.8"
            />

            {/* Bar 2: Harmonic rise */}
            <rect
              x="32.5"
              y="28"
              width="6.5"
              height="44"
              rx="3.25"
              fill="url(#swCoreGrad)"
              opacity="0.95"
            />

            {/* Bar 3: Apex Central Peak */}
            <rect
              x="44"
              y="17"
              width="6.5"
              height="66"
              rx="3.25"
              fill="url(#swCoreGrad)"
            />

            {/* Bar 4: Kinetic Cyan Resonance */}
            <rect
              x="55.5"
              y="25"
              width="6.5"
              height="50"
              rx="3.25"
              fill="url(#swCyanGrad)"
            />

            {/* Bar 5: Harmonic descent */}
            <rect
              x="67"
              y="36"
              width="6.5"
              height="28"
              rx="3.25"
              fill="url(#swCyanGrad)"
              opacity="0.9"
            />

            {/* Bar 6: Outro wave */}
            <rect
              x="78"
              y="44"
              width="5.5"
              height="12"
              rx="2.75"
              fill="url(#swCyanGrad)"
              opacity="0.65"
            />

            {/* Acoustic Sine Wave Waveform (Connecting Harmonics) */}
            <path
              d="M 18 50 Q 32.5 22, 47.25 50 T 82 50"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="2 3"
              opacity="0.5"
            />

            {/* Pulsing Acoustic Center Node */}
            <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {/* ── Brand Typography Wordmark ── */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className={`font-extrabold tracking-tight font-display bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent ${textClassName || 'text-xl'}`}>
              SoundWave
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export const SoundWaveLogo = memo(SoundWaveLogoComponent)
export default SoundWaveLogo
