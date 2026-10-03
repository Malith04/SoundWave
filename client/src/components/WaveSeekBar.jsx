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
  const [scrubValue, setScrubValue] = useState(null)

  const phaseRef = useRef(0)
  const animFrameRef = useRef(null)
  const sizeRef = useRef({ width: 300, height: 28 })

  // Effective progress accounts for live scrubbing
  const effectiveProgress = scrubValue !== null ? scrubValue : Math.min(Math.max(progress || 0, 0), 1)

  // Keep latest mutable state in ref to avoid re-binding the 60fps animation loop
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

  // Canvas drawing routine
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width: W, height: H } = sizeRef.current
    if (W <= 0 || H <= 0) return

    const { progress: p, isHovered: hov, isDragging: drag, waveEnabled: waveOn } = stateRef.current

    // Clear canvas
    ctx.clearRect(0, 0, W, H)

    const Y_base = H - 8 // baseline aligned near bottom
    const X_thumb = Math.min(Math.max(p * W, 0), W)
    const H_max = 14 // max height of fluid wave

    // ── 1. Unplayed Track (Right side) ──
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(X_thumb, Y_base)
    ctx.lineTo(W, Y_base)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()

    // ── 2. Played Section with Undulating Fluid Sound Wave ──
    if (X_thumb > 1) {
      if (waveOn && X_thumb > 8) {
        const phase = phaseRef.current
        const ampMult = Math.min(1, X_thumb / 40) // smoothly grows as track progresses

        // 3 overlapping translucent liquid layers (golden-peach, warm coral, vibrant red)
        const layers = [
          {
            speed: 1.6,
            freq: 2.2,
            amp: H_max * 0.72 * ampMult,
            offset: 0,
            gradTop: 'rgba(255, 175, 95, 0.45)',
            gradBot: 'rgba(255, 120, 50, 0.05)',
          },
          {
            speed: 2.3,
            freq: 2.9,
            amp: H_max * 0.88 * ampMult,
            offset: 1.8,
            gradTop: 'rgba(255, 115, 65, 0.68)',
            gradBot: 'rgba(255, 70, 45, 0.12)',
          },
          {
            speed: 3.1,
            freq: 2.6,
            amp: H_max * 1.0 * ampMult,
            offset: 3.5,
            gradTop: 'rgba(255, 75, 55, 0.90)',
            gradBot: 'rgba(235, 55, 40, 0.32)',
          },
        ]

        layers.forEach((layer) => {
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(0, Y_base)

          const step = 2
          for (let x = 0; x <= X_thumb; x += step) {
            const u = x / X_thumb // normalized [0, 1]

            // Fluid envelope: starts at 0 at x=0, rises smoothly, and dips right into thumb
            const envelope = Math.pow(Math.sin(Math.PI * u), 1.15) * (0.85 + 0.25 * Math.sin(Math.PI * u))

            // Undulating wave harmonics
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

      // Crisp coral/red baseline connecting 0 to the thumb
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, Y_base)
      ctx.lineTo(X_thumb, Y_base)
      ctx.strokeStyle = '#ff4242'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.restore()
    }

    // ── 3. The Ring Thumb (White Outer Ring + Solid Coral Center Dot) ──
    ctx.save()
    const activeThumb = hov || drag
    const outerRadius = activeThumb ? 7.5 : 6.5
    const innerRadius = activeThumb ? 4.2 : 3.5

    // Soft glowing drop shadow
    ctx.shadowColor = 'rgba(255, 66, 66, 0.75)'
    ctx.shadowBlur = activeThumb ? 12 : 7

    // Outer white circle
    ctx.beginPath()
    ctx.arc(X_thumb, Y_base, outerRadius, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(24, 24, 24, 0.95)'
    ctx.fill()
    ctx.lineWidth = 2.2
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    // Inner coral dot
    ctx.beginPath()
    ctx.arc(X_thumb, Y_base, innerRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#ff4242'
    ctx.fill()
    ctx.restore()
  }, [])

  // Resize handling with high-DPI canvas backing
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
      canvas.width = w * dpr
      canvas.height = h * dpr

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

  // Scrubbing interactions
  const handleRangeInput = (e) => {
    setIsDragging(true)
    setScrubValue(parseFloat(e.target.value))
  }

  const handleRangeChange = (e) => {
    const val = parseFloat(e.target.value)
    setIsDragging(false)
    setScrubValue(null)
    seek?.(val)
  }

  // ── Render Track Element ──
  const trackElement = (
    <div
      ref={containerRef}
      className="relative w-full h-7 flex items-center select-none cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsDragging(false)
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none block" />
      {/* Invisible native range slider for accessible keyboard, mouse, and touch scrubbing */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={effectiveProgress}
        onInput={handleRangeInput}
        onChange={handleRangeChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        aria-label="Seek track position"
      />
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
