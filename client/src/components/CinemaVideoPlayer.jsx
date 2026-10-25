import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Volume1, Maximize2, Minimize2,
  RotateCcw, RotateCw, FastForward, Rewind, Sparkles, SlidersHorizontal
} from 'lucide-react'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * CinemaVideoPlayer
 * 
 * High-performance YouTube Cinema Player with:
 * - 16:9 responsive theater canvas & native Fullscreen (F key)
 * - Click-to-Play/Pause with animated YouTube splash ripple
 * - Auto-hiding floating controls on mouse hover / idle (2.5s)
 * - YouTube keyboard shortcuts (Space, F, M, J/K/L, Arrow keys)
 * - Non-music intro offset timeline sync & micro-nudge adjuster
 */
export default function CinemaVideoPlayer({
  videoId,
  initialStartTime = 0,
  introOffset = 0,
  onIntroOffsetNudge,
  onTimeUpdate,
  onPlayingChange,
  songTitle = 'Now Playing',
  artist = '',
  volume = 80,
  isMuted = false,
  onVolumeChange,
  onToggleMute,
  className = '',
}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const intervalRef = useRef(null)
  const hideControlsTimeout = useRef(null)

  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(initialStartTime)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [splash, setSplash] = useState(null) // { type: 'play' | 'pause', id: number }
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isHoveringSeekBar, setIsHoveringSeekBar] = useState(false)
  const [hoverTime, setHoverTime] = useState(null)
  const [hoverPosition, setHoverPosition] = useState(0)

  // ── 1. Initialize YouTube Iframe Player ───────────────────────
  useEffect(() => {
    let isCancelled = false

    const createPlayer = () => {
      if (!window.YT || !window.YT.Player || isCancelled) return

      try {
        if (playerRef.current?.destroy) {
          try { playerRef.current.destroy() } catch (_) {}
        }

        playerRef.current = new window.YT.Player('cinema-yt-iframe-mount', {
          videoId,
          playerVars: {
            autoplay: 1,
            start: Math.max(0, Math.floor(initialStartTime)),
            controls: 0,
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            playsinline: 1,
            disablekb: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              if (isCancelled) return
              setIsPlayerReady(true)
              try {
                event.target.setVolume(isMuted ? 0 : volume)
                if (initialStartTime > 0) {
                  event.target.seekTo(initialStartTime, true)
                }
                event.target.playVideo()
              } catch (_) {}
            },
            onStateChange: (event) => {
              if (isCancelled) return
              const playing = event.data === window.YT.PlayerState.PLAYING
              setIsPlaying(playing)
              onPlayingChange?.(playing)
            }
          }
        })
      } catch (err) {
        console.warn('[CinemaVideoPlayer] Initialization note:', err)
      }
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prevCallback?.()
        createPlayer()
      }
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script')
        tag.id = 'yt-iframe-api'
        tag.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(tag)
      }
    }

    return () => {
      isCancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy() } catch (_) {}
      }
    }
  }, [videoId])

  // ── 2. Real-time timeline progress polling ───────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        try {
          const cur = playerRef.current.getCurrentTime() || 0
          const dur = playerRef.current.getDuration() || 0
          setCurrentTime(cur)
          if (dur > 0) setDuration(dur)
          onTimeUpdate?.(cur, dur)
        } catch (_) {}
      }
    }, 250)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [onTimeUpdate])

  // ── 3. Volume synchronization ────────────────────────────────
  useEffect(() => {
    if (playerRef.current?.setVolume) {
      try {
        playerRef.current.setVolume(isMuted ? 0 : volume)
      } catch (_) {}
    }
  }, [volume, isMuted])

  // ── 4. Play / Pause Action & Animated Splash ──────────────────
  const togglePlay = useCallback(() => {
    if (!playerRef.current) return
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo()
        setSplash({ type: 'pause', id: Date.now() })
      } else {
        playerRef.current.playVideo()
        setSplash({ type: 'play', id: Date.now() })
      }
    } catch (_) {}
  }, [isPlaying])

  // ── 5. Fullscreen Toggle (F key & button) ─────────────────────
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {})
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // ── 6. Seek control ──────────────────────────────────────────
  const handleSeek = (newTime) => {
    const clamped = Math.max(0, Math.min(newTime, duration || 9999))
    setCurrentTime(clamped)
    if (playerRef.current?.seekTo) {
      try {
        playerRef.current.seekTo(clamped, true)
      } catch (_) {}
    }
  }

  const handleJump = (delta) => {
    handleSeek(currentTime + delta)
    setSplash({
      type: delta > 0 ? 'forward' : 'backward',
      text: `${Math.abs(delta)}s`,
      id: Date.now()
    })
  }

  // ── 7. Auto-hiding Controls on Mouse Move ────────────────────
  const handleMouseMove = () => {
    setShowControls(true)
    if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current)
    hideControlsTimeout.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 2500)
  }

  const handleMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false)
    }
  }

  // ── 8. Desktop Keyboard Shortcuts ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input or textarea
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) {
        return
      }

      const key = e.key.toLowerCase()

      if (key === 'f') {
        e.preventDefault()
        toggleFullscreen()
      } else if (key === ' ' || key === 'k') {
        e.preventDefault()
        togglePlay()
      } else if (key === 'arrowleft' || key === 'j') {
        e.preventDefault()
        handleJump(-5)
      } else if (key === 'arrowright' || key === 'l') {
        e.preventDefault()
        handleJump(5)
      } else if (key === 'm') {
        e.preventDefault()
        onToggleMute?.()
      } else if (key === 'arrowup') {
        e.preventDefault()
        onVolumeChange?.(Math.min(100, volume + 5))
      } else if (key === 'arrowdown') {
        e.preventDefault()
        onVolumeChange?.(Math.max(0, volume - 5))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen, togglePlay, volume, onVolumeChange, onToggleMute])

  // Clear splash icon after 550ms
  useEffect(() => {
    if (!splash) return
    const timer = setTimeout(() => setSplash(null), 550)
    return () => clearTimeout(timer)
  }, [splash])

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-black select-none group border border-white/10 ${
        isFullscreen ? '!fixed !inset-0 !z-[250] !max-w-none !w-screen !h-screen !rounded-none !border-none' : ''
      } ${!showControls && isPlaying ? 'cursor-none' : 'cursor-default'} ${className}`}
    >
      {/* ── YouTube IFrame Mount ── */}
      <style>{`
        #cinema-yt-iframe-mount { width: 100% !important; height: 100% !important; border: none !important; }
      `}</style>
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div id="cinema-yt-iframe-mount" className="w-full h-full" />
      </div>

      {/* ── Interactive Click-to-Play/Pause & Double-Click Fullscreen Overlay ── */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        className="absolute inset-0 z-10 cursor-pointer bg-transparent"
        title="Click to Play/Pause, Double-click for Fullscreen (F)"
      />

      {/* ── Animated Center Splash Icon (YouTube Style) ── */}
      {splash && (
        <div
          key={splash.id}
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none animate-pop-in"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white shadow-2xl transition-all">
            {splash.type === 'play' && <Play size={32} fill="currentColor" className="ml-1" />}
            {splash.type === 'pause' && <Pause size={32} fill="currentColor" />}
            {splash.type === 'forward' && (
              <>
                <RotateCw size={26} />
                <span className="text-[10px] font-bold mt-0.5">+{splash.text}</span>
              </>
            )}
            {splash.type === 'backward' && (
              <>
                <RotateCcw size={26} />
                <span className="text-[10px] font-bold mt-0.5">-{splash.text}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Top Header Controls Bar (Fades out when idle) ── */}
      <div
        className={`absolute top-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-sm sm:text-base font-extrabold text-white truncate drop-shadow-md">{songTitle}</p>
          <p className="text-xs text-gray-300 font-semibold truncate drop-shadow-sm">{artist}</p>
        </div>

        {/* Intro Offset & Auto-Sync Pill */}
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg shrink-0">
          <Sparkles size={13} className="text-brand shrink-0 animate-pulse" />
          <span className="text-[11px] font-semibold text-gray-300">
            {introOffset > 0 ? `Intro Skipped: ${introOffset}s` : 'Timeline Synced'}
          </span>
          <div className="flex items-center gap-0.5 ml-1 border-l border-white/15 pl-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleJump(-1)
                onIntroOffsetNudge?.(-1)
              }}
              className="px-1.5 py-0.5 hover:bg-white/20 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
              title="Nudge sync -1 second"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleJump(1)
                onIntroOffsetNudge?.(1)
              }}
              className="px-1.5 py-0.5 hover:bg-white/20 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer"
              title="Nudge sync +1 second"
            >
              +1s
            </button>
          </div>
        </div>
      </div>

      {/* ── Bottom Cinema Floating Controls Bar (Fades out when idle) ── */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2 transition-opacity duration-300 pointer-events-auto ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cinema Progress & Seek Bar */}
        <div
          className="relative w-full py-1.5 group/seek cursor-pointer"
          onMouseEnter={() => setIsHoveringSeekBar(true)}
          onMouseLeave={() => setIsHoveringSeekBar(false)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            setHoverPosition(e.clientX - rect.left)
            setHoverTime(pos * (duration || 0))
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
            handleSeek(pos * (duration || 0))
          }}
        >
          {/* Time tooltip hover bubble */}
          {isHoveringSeekBar && hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-black/90 border border-white/20 rounded text-[10px] font-mono font-bold text-white shadow-lg pointer-events-none"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Track background */}
          <div className="w-full h-1 group-hover/seek:h-1.5 bg-white/25 rounded-full overflow-hidden transition-all duration-150">
            <div
              className="h-full bg-brand rounded-full transition-all duration-75 relative"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>

          {/* Scrubbing thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/seek:scale-100 transition-transform duration-150 pointer-events-none"
            style={{ left: `calc(${progressRatio * 100}% - 7px)` }}
          />
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between w-full pt-0.5">
          {/* Left: Play/Pause, Jumps, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-white text-black hover:scale-105 active:scale-95 flex items-center justify-center transition-all shadow-md cursor-pointer"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => handleJump(-5)}
              className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Back 5s (←)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={() => handleJump(5)}
              className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Forward 5s (→)"
            >
              <RotateCw size={16} />
            </button>

            <span className="text-xs font-mono font-semibold text-gray-300 ml-1 select-none">
              {formatTime(currentTime)} <span className="text-gray-500">/</span> {formatTime(duration)}
            </span>
          </div>

          {/* Right: Volume & Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Volume slider */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                <VolumeIcon size={17} />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="w-16 sm:w-20 seek-bar unified-volume-bar cursor-pointer"
                style={{ '--progress': `${isMuted ? 0 : volume}%` }}
                title="Volume (↑/↓)"
              />
            </div>

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
