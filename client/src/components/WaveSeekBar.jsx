import { useState, useRef, useEffect, useCallback } from 'react'

function formatTime(secs) {
  if (!secs || isNaN(secs) || secs < 0) return '00:00'
  const totalSecs = Math.floor(secs)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
}

export default function WaveSeekBar({
  progress = 0,
  currentTime = 0,
  duration = 0,
  seek,
  isPlaying = false,
  waveEnabled = true,
  showTimes = true,
  layout = 'stacked', // 'stacked' | 'inline'
  className = '',
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [scrubFraction, setScrubFraction] = useState(null)

  const phaseRef = useRef(0)
  const sizeRef = useRef({ width: 300, height: 28 })

  // Effective progress accounts for active mouse/touch scrubbing
  const effectiveProgress = scrubFraction !== null ? scrubFraction : Math.min(Math.max(progress || 0, 0), 1)

  const stateRef = useRef({
    progress: effectiveProgress,
    isPlaying,
    isHovered,
    isDragging,
    waveEnabled,
  })

  useEffect(() => {
    stateRef.current = {
      progress: effectiveProgress,
      isPlaying,
      isHovered,
      isDragging,
      waveEnabled,
    }
  }, [effectiveProgress, isPlaying, isHovered, isDragging, waveEnabled])

  // Canvas drawing routine for the fluid wave track (theme color matched to SoundWave brand)
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width: W, height: H } = sizeRef.current
    if (W <= 0 || H <= 0) return

    const { progress: p, waveEnabled: waveOn } = stateRef.current

    // Clear canvas
    ctx.clearRect(0, 0, W, H)

    const Y_base = H - 8 // baseline aligned near bottom
    const X_thumb = Math.min(Math.max(p * W, 0), W)
    const H_max = 14 // wave crest height

    // ── 1. Unplayed Track (Right of thumb) ──
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(X_thumb, Y_base)
    ctx.lineTo(W, Y_base)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()

    // ── 2. Played Section with Undulating Theme-Colored Liquid Sound Wave ──
    if (X_thumb > 1) {
      if (waveOn && X_thumb > 8) {
        const phase = phaseRef.current
        const ampMult = Math.min(1, X_thumb / 40) // smoothly grows as song progresses

        // 3 overlapping translucent liquid layers using SoundWave's vibrant signature theme colors
        const layers = [
          // Layer 1: Back (Luminous soft mint)
          {
            speed: 1.6,
            freq: 2.2,
            amp: H_max * 0.72 * ampMult,
            offset: 0,
            gradTop: 'rgba(110, 231, 183, 0.45)', // emerald-300
            gradBot: 'rgba(29, 185, 84, 0.04)',
          },
          // Layer 2: Middle (Radiant emerald)
          {
            speed: 2.3,
            freq: 2.9,
            amp: H_max * 0.88 * ampMult,
            offset: 1.8,
            gradTop: 'rgba(52, 211, 153, 0.68)', // emerald-400
            gradBot: 'rgba(16, 185, 129, 0.10)',
          },
          // Layer 3: Front (Signature SoundWave brand green)
          {
            speed: 3.1,
            freq: 2.6,
            amp: H_max * 1.0 * ampMult,
            offset: 3.5,
            gradTop: 'rgba(29, 185, 84, 0.92)', // brand green #1DB954
            gradBot: 'rgba(16, 185, 129, 0.30)',
          },
        ]

        layers.forEach((layer) => {
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(0, Y_base)

          const step = 2
          for (let x = 0; x <= X_thumb; x += step) {
            const u = x / X_thumb // normalized [0, 1]

            // Fluid envelope: starts at 0 at x=0, peaks smoothly, and swoops right into the thumb center
            const envelope = Math.pow(Math.sin(Math.PI * u), 1.15) * (0.85 + 0.25 * Math.sin(Math.PI * u))

            // Dual sine harmonics for natural fluid liquid motion
            const wave =
              Math.sin(u * layer.freq * Math.PI * 2 - phase * layer.speed + layer.offset) * 0.65 +
              Math.sin(u * (layer.freq * 1.7) * Math.PI * 2 - phase * (layer.speed * 0.75) + layer.offset * 1.4) * 0.35

            const y = Y_base - envelope * layer.amp * (0.5 + 0.5 * wave)
            ctx.lineTo(x, y)
          }

          ctx.lineTo(X_thumb, Y_base)
          ctx.closePath()

          const grad = ctx.createLinearGradient(0, Y_base - layer.amp, 0, Y_base)
          grad.addColorStop(0, layer.gradTop)
          grad.addColorStop(1, layer.gradBot)
          ctx.fillStyle = grad
          ctx.fill()
          ctx.restore()
        })
      }

      // Crisp SoundWave brand baseline under the wave connecting 0 to thumb
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, Y_base)
      ctx.lineTo(X_thumb, Y_base)
      ctx.strokeStyle = '#1DB954'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.shadowColor = 'rgba(29, 185, 84, 0.6)'
      ctx.shadowBlur = 6
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  // Resize observer with high-DPI canvas backing
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(rect.width, 10)
      const h = Math.max(rect.height, 24)

      sizeRef.current = { width: w, height: h }
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
      draw()
    }

    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  // Continuous 60fps animation loop when playing
  useEffect(() => {
    let animId
    let lastTime = performance.now()

    const loop = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1)
      lastTime = time

      if (stateRef.current.isPlaying) {
        phaseRef.current += dt * 3.4
      }

      draw()
      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [draw])

  // ── Robust Direct Pointer Seeking Handler (Click & Drag) ──
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()

    const updateSeek = (clientX) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      if (rect.width <= 0) return
      const clickX = clientX - rect.left
      const frac = Math.max(0, Math.min(1, clickX / rect.width))
      setScrubFraction(frac)
      seek?.(frac)
    }

    setIsDragging(true)
    updateSeek(e.clientX)

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault()
      updateSeek(moveEvent.clientX)
    }

    const onPointerUp = (upEvent) => {
      const container = containerRef.current
      if (container) {
        const rect = container.getBoundingClientRect()
        if (rect.width > 0) {
          const finalX = upEvent.clientX - rect.left
          const finalFrac = Math.max(0, Math.min(1, finalX / rect.width))
          seek?.(finalFrac)
        }
      }
      setIsDragging(false)
      setScrubFraction(null)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  // Percent position for vector thumb
  const percent = Math.min(Math.max(effectiveProgress * 100, 0), 100)
  const isThumbActive = isHovered || isDragging

  // ── Render Track Element (Vector Thumb + Canvas Wave) ──
  const trackElement = (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsHovered(false)
      }}
      className="relative w-full h-7 flex items-center select-none cursor-pointer group touch-none"
    >
      <canvas ref={canvasRef} className="pointer-events-none block" />

      {/* ── Unique, Ultra-Sharp Vector Thumb (Theme Matching) ── */}
      <div
        className="absolute top-[13px] -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-100 ease-out z-20"
        style={{ left: `${percent}%` }}
      >
        <div
          className={`relative rounded-full transition-all duration-150 flex items-center justify-center ${
            isThumbActive ? 'scale-125' : 'scale-100'
          }`}
        >
          {/* Ambient Theme Glow Aura */}
          <div
            className={`absolute -inset-1.5 rounded-full bg-brand/35 blur-md transition-opacity duration-200 pointer-events-none ${
              isThumbActive ? 'opacity-100' : isPlaying ? 'opacity-70 animate-pulse' : 'opacity-40'
            }`}
          />

          {/* Unique Multi-Layer Ring: Pure crisp vector borders */}
          <div className="w-3.5 h-3.5 rounded-full bg-black/80 border-2 border-white flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.8),0_0_10px_rgba(29,185,84,0.6)]">
            {/* Inner Theme Gem / Audio Node */}
            <div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_4px_var(--brand)] relative">
              {/* Specular light highlight */}
              <div className="absolute top-0 right-0 w-0.5 h-0.5 rounded-full bg-white/90" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── 1. Stacked Layout: Track on top, Timestamps underneath (as seen in media widget) ──
  if (layout === 'stacked' && showTimes) {
    return (
      <div className={`w-full select-none ${className}`}>
        {trackElement}
        <div className="flex items-center justify-between text-xs text-gray-400 font-medium tabular-nums px-0.5 mt-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    )
  }

  // ── 2. Inline Layout: Current Time | Track | Duration (for compact desktop bar) ──
  if (layout === 'inline' && showTimes) {
    return (
      <div className={`flex items-center gap-2.5 w-full select-none ${className}`}>
        <span className="text-xs text-gray-400 tabular-nums shrink-0 w-11 text-right font-medium">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 min-w-0">{trackElement}</div>
        <span className="text-xs text-gray-400 tabular-nums shrink-0 w-11 font-medium">
          {formatTime(duration)}
        </span>
      </div>
    )
  }

  // ── 3. Track-Only Layout (e.g. mobile compact top strip) ──
  return <div className={`w-full select-none ${className}`}>{trackElement}</div>
}
