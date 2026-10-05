import { memo, useId } from 'react'

/**
 * SoundWave Next-Gen Quantum Sonic Helix Logo (Admin Dashboard)
 * 
 * An iconic, ultra-modern acoustic emblem featuring:
 * - Precision-engineered aerospace obsidian squircle chassis
 * - Chromatic refraction rim lighting
 * - Concentric acoustic resonance ripples
 * - Dual-harmonic 3D intertwining sonic helix ribbons (Cyber Emerald + Cosmic Ultraviolet)
 * - Central quantum pulsar starburst singularity
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
  const rawId = useId()
  const uid = 'swadm-' + rawId.replace(/[^a-zA-Z0-9]/g, '')

  return (
    <div 
      className={`inline-flex items-center gap-3 select-none group ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* ── Emblem Container ── */}
      <div 
        className="relative shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        {/* Ambient Chromatic Neon Backlight Glow */}
        {glow && (
          <div 
            className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#1DB954]/40 via-[#00FFA3]/25 to-[#8B5CF6]/35 opacity-70 blur-md group-hover:opacity-95 transition-opacity duration-300 pointer-events-none" 
            style={{ transform: 'scale(1.2)' }}
          />
        )}

        {/* Vector SVG Emblem */}
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] ${animated ? 'animate-pulse' : ''}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Deep Obsidian Titanium Chassis */}
            <radialGradient id={`${uid}-shield`} cx="30%" cy="25%" r="85%">
              <stop offset="0%" stopColor="#15212d" />
              <stop offset="45%" stopColor="#0b121b" />
              <stop offset="100%" stopColor="#04060a" />
            </radialGradient>

            {/* Precision Chromatic Rim Highlight */}
            <linearGradient id={`${uid}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
              <stop offset="30%" stopColor="rgba(0, 255, 163, 0.55)" />
              <stop offset="70%" stopColor="rgba(139, 92, 246, 0.45)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.12)" />
            </linearGradient>

            {/* Primary Cyber Emerald Wave Ribbon */}
            <linearGradient id={`${uid}-emerald`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="45%" stopColor="#1DB954" />
              <stop offset="100%" stopColor="#00D26A" />
            </linearGradient>

            {/* Secondary Cosmic Ultraviolet Wave Ribbon */}
            <linearGradient id={`${uid}-violet`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="45%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>

            {/* Equalizer Sound Ray Gradients */}
            <linearGradient id={`${uid}-ray-em`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1DB954" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id={`${uid}-ray-vi`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
            </linearGradient>

            {/* Radiant Pulsar Core Flare */}
            <radialGradient id={`${uid}-pulsar`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#A7F3D0" />
              <stop offset="70%" stopColor="#00FFA3" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1DB954" stopOpacity="0" />
            </radialGradient>

            {/* Glow Filter */}
            <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Aerodynamic Obsidian Squircle Chassis */}
          <rect
            x="4"
            y="4"
            width="92"
            height="92"
            rx="26"
            fill={`url(#${uid}-shield)`}
            stroke={`url(#${uid}-rim)`}
            strokeWidth="1.5"
          />

          {/* 2. Concentric Acoustic Resonance Waves (Sound Field) */}
          <circle
            cx="50"
            cy="50"
            r="34"
            stroke="rgba(0, 255, 163, 0.08)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="23"
            stroke="rgba(139, 92, 246, 0.12)"
            strokeWidth="1"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="13"
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth="0.8"
            fill="none"
          />

          {/* 3. Dynamic Equalizer Sound Rays */}
          <line x1="24" y1="42" x2="24" y2="58" stroke={`url(#${uid}-ray-em)`} strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />
          <line x1="36" y1="34" x2="36" y2="66" stroke={`url(#${uid}-ray-em)`} strokeWidth="2.6" strokeLinecap="round" opacity="0.65" />
          <line x1="64" y1="34" x2="64" y2="66" stroke={`url(#${uid}-ray-vi)`} strokeWidth="2.6" strokeLinecap="round" opacity="0.65" />
          <line x1="76" y1="42" x2="76" y2="58" stroke={`url(#${uid}-ray-vi)`} strokeWidth="2.2" strokeLinecap="round" opacity="0.4" />

          {/* 4. Secondary Wave Ribbon (Cosmic Ultraviolet - Phase B) */}
          <path
            d="M 16,48 C 22,67 30,74 36,74 C 42.5,74 47,60 50,50 C 53,40 57.5,26 64,26 C 70,26 78,33 84,52"
            stroke={`url(#${uid}-violet)`}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* 5. Primary Wave Ribbon (Cyber Emerald - Phase A) */}
          <path
            d="M 16,52 C 22,33 30,26 36,26 C 42.5,26 47,40 50,50 C 53,60 57.5,74 64,74 C 70,74 78,67 84,48"
            stroke={`url(#${uid}-emerald)`}
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* 6. Harmonic Apex Nodes (High Frequency Resonators) */}
          <circle cx="36" cy="26" r="2.2" fill="#00FFA3" filter={`url(#${uid}-glow)`} />
          <circle cx="64" cy="26" r="2.2" fill="#C084FC" filter={`url(#${uid}-glow)`} />

          {/* 7. Central Quantum Pulsar Singularity (Ignition Core) */}
          <path
            d="M 50 38 Q 50 50 38 50 Q 50 50 50 62 Q 50 50 62 50 Q 50 50 50 38 Z"
            fill={`url(#${uid}-pulsar)`}
            filter={`url(#${uid}-glow)`}
          />
          <circle cx="50" cy="50" r="3.2" fill="#FFFFFF" />
          <circle cx="50" cy="50" r="1.4" fill="#00FFA3" />
        </svg>
      </div>

      {/* ── Brand Typography Wordmark ── */}
      {showText && (
        <span className={`font-bold tracking-tight font-sans inline-flex items-center ${textClassName || 'text-xl'}`}>
          <span className="text-white">Sound</span>
          <span className="bg-gradient-to-r from-[#00FFA3] via-[#1DB954] to-[#8B5CF6] bg-clip-text text-transparent ml-0.5 font-extrabold">Wave</span>
        </span>
      )}
    </div>
  )
}

export const SoundWaveLogo = memo(SoundWaveLogoComponent)
export default SoundWaveLogo
