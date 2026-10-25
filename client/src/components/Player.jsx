import { usePlayer } from '../context/PlayerContext'
import { useAudioSettings } from '../context/AudioSettingsContext'
import WaveSeekBar from './WaveSeekBar'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, ListMusic, X, Music, Mic2,
  ChevronDown, ChevronUp, RotateCcw, Maximize2, Timer, PlusCircle, ListPlus, Info,
  GripVertical, Trash2
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite, isFavorite } from '../services/userService'
import AddToPlaylistModal from './AddToPlaylistModal'
import SongModal from './SongModal'
import toast from 'react-hot-toast'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseLRC(lrc) {
  if (!lrc) return []
  return lrc.split('\n').map(line => {
    const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/)
    if (!m) return null
    return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() }
  }).filter(Boolean).sort((a, b) => a.time - b.time)
}

function AudioBars({ isPlaying, size = 'sm' }) {
  const h = size === 'lg' ? 'h-8' : 'h-5'
  const w = size === 'lg' ? 'w-1.5' : 'w-1'
  return (
    <div className={`flex items-end gap-0.5 ${h}`}>
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`${w} rounded-full ${isPlaying ? `audio-bar-${i}` : ''}`}
          style={{ background: 'var(--brand)', height: isPlaying ? undefined : '4px', minHeight: '4px' }} />
      ))}
    </div>
  )
}

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="particle absolute w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--brand)', left: `${8 + i * 7.5}%`, bottom: `${10 + (i % 4) * 8}%`,
            animationDuration: `${2.5 + (i % 5) * 0.7}s`, animationDelay: `${(i % 6) * 0.4}s` }} />
      ))}
    </div>
  )
}

function LyricsPanel({ song, currentTime, onClose, expanded = false }) {
  const [lines, setLines] = useState([])
  const [plain, setPlain] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [synced, setSynced] = useState(false)
  const activeRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (!song) return
    setLoading(true); setErr(false); setLines([]); setPlain('')
    fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(song.title)}&artist_name=${encodeURIComponent(song.artist)}`)
      .then(r => r.json()).then(res => {
        const hit = res?.[0]
        if (hit?.syncedLyrics) { setLines(parseLRC(hit.syncedLyrics)); setSynced(true) }
        else if (hit?.plainLyrics) { setPlain(hit.plainLyrics); setSynced(false) }
        else return fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.title)}`)
          .then(r => r.json()).then(d => d.lyrics ? (setPlain(d.lyrics), setSynced(false)) : setErr(true))
      }).catch(() => setErr(true)).finally(() => setLoading(false))
  }, [song?.id])

  const activeIdx = synced ? lines.reduce((acc, l, i) => l.time <= currentTime ? i : acc, -1) : -1

  // Strictly container-scoped scroll — prevents moving or shifting the parent player window
  useEffect(() => {
    if (!activeRef.current || !listRef.current) return
    const container = listRef.current
    const el = activeRef.current
    const target = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2)
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [activeIdx])

  if (expanded) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
        {synced && <p className="text-sm text-brand mb-4 font-medium shrink-0">● Live synced</p>}
        <div ref={listRef} className="overflow-y-auto flex-1 min-h-0 mobile-scroll no-scrollbar">
          {loading ? <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
            : err ? <div className="flex flex-col items-center justify-center h-32 text-gray-600"><Mic2 size={40} className="mb-2 opacity-30" /><p>Lyrics not found</p></div>
            : synced ? (
              <div className="space-y-5 py-4">
                {lines.map((line, i) => (
                  <p key={i} ref={i === activeIdx ? activeRef : null}
                    className={`font-bold leading-relaxed transition-all duration-300 select-text text-xl sm:text-2xl break-words ${
                      i === activeIdx ? 'text-white scale-105 origin-left' : i < activeIdx ? 'text-gray-600' : 'text-gray-500'
                    }`}>{line.text || '♪'}</p>
                ))}
              </div>
            ) : <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-7 select-text break-words">{plain}</pre>
          }
        </div>
      </div>
    )
  }

  return (
    <div className="fixed right-4 bottom-24 w-[min(480px,calc(100vw-2rem))] h-[70vh] glass-drawer border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40 animate-pop-in">
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 shrink-0" />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{song?.title}</p>
          <p className="text-xs text-gray-400 truncate">{song?.artist}</p>
          {synced && <span className="text-xs text-brand block mt-0.5">● Live synced</span>}
        </div>
        <button onClick={onClose} className="touch-target text-gray-400 hover:text-white ml-4 shrink-0"><X size={20} /></button>
      </div>
      <div ref={listRef} className="overflow-y-auto flex-1 min-h-0 px-5 py-4 mobile-scroll no-scrollbar">
        {loading ? <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
          : err ? <div className="flex flex-col items-center justify-center h-full text-gray-600"><Mic2 size={40} className="mb-2 opacity-30" /><p>Lyrics not found</p></div>
          : synced ? (
            <div className="space-y-5 py-4">
              {lines.map((line, i) => (
                <p key={i} ref={i === activeIdx ? activeRef : null}
                  className={`font-bold leading-relaxed transition-all duration-300 select-text text-xl sm:text-2xl break-words ${
                    i === activeIdx ? 'text-white scale-105 origin-left' : i < activeIdx ? 'text-gray-600' : 'text-gray-500'
                  }`}>{line.text || '♪'}</p>
              ))}
            </div>
          ) : <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-7 select-text break-words">{plain}</pre>
        }
      </div>
    </div>
  )
}

function SentenceLyricsView({ song, currentTime, seek }) {
  const [lines, setLines] = useState([])
  const [plain, setPlain] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const [synced, setSynced] = useState(false)

  useEffect(() => {
    if (!song) return
    setLoading(true); setErr(false); setLines([]); setPlain('')
    fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(song.title)}&artist_name=${encodeURIComponent(song.artist)}`)
      .then(r => r.json()).then(res => {
        const hit = res?.[0]
        if (hit?.syncedLyrics) { setLines(parseLRC(hit.syncedLyrics)); setSynced(true) }
        else if (hit?.plainLyrics) { setPlain(hit.plainLyrics); setSynced(false) }
        else return fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.title)}`)
          .then(r => r.json()).then(d => d.lyrics ? (setPlain(d.lyrics), setSynced(false)) : setErr(true))
      }).catch(() => setErr(true)).finally(() => setLoading(false))
  }, [song?.id])

  const activeIdx = synced ? lines.reduce((acc, l, i) => l.time <= currentTime ? i : acc, -1) : -1

  const prevLine = activeIdx > 0 ? lines[activeIdx - 1] : null
  const currentLine = activeIdx >= 0 ? lines[activeIdx] : (lines[0] || null)
  const nextLine = activeIdx >= 0 && activeIdx < lines.length - 1 ? lines[activeIdx + 1] : null

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[96px] max-w-md mx-auto px-2 select-none">
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-3">
          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Syncing lyrics...</span>
        </div>
      ) : err ? (
        <div className="flex flex-col items-center justify-center py-2 text-gray-500">
          <p className="text-xs font-semibold text-gray-400">No live synced lyrics found</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{song?.title} • {song?.artist}</p>
        </div>
      ) : synced ? (
        <div className="flex flex-col items-center justify-center gap-1 w-full">
          {/* Previous sentence fading out */}
          <p
            onClick={() => prevLine && seek?.(prevLine.time)}
            className={`text-xs sm:text-sm text-gray-400/80 font-medium text-center truncate max-w-full cursor-pointer hover:text-white transition-all duration-300 ${
              prevLine ? 'opacity-60' : 'opacity-0 select-none pointer-events-none'
            }`}
            title={prevLine ? `Jump to ${formatTime(prevLine.time)}` : ''}
          >
            {prevLine?.text || '—'}
          </p>

          {/* Current active sentence prominently highlighted */}
          <p
            onClick={() => currentLine && seek?.(currentLine.time)}
            className="text-base sm:text-lg md:text-xl font-black text-white text-center leading-snug tracking-tight drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)] px-2 cursor-pointer hover:scale-105 active:scale-95 transition-all duration-300 text-brand"
            title={currentLine ? `Jump to ${formatTime(currentLine.time)}` : ''}
          >
            {currentLine?.text || '♪'}
          </p>

          {/* Next upcoming sentence subtly previewed */}
          <p
            onClick={() => nextLine && seek?.(nextLine.time)}
            className={`text-xs sm:text-sm text-gray-500 font-medium text-center truncate max-w-full cursor-pointer hover:text-gray-300 transition-all duration-300 ${
              nextLine ? 'opacity-60' : 'opacity-0 select-none pointer-events-none'
            }`}
            title={nextLine ? `Jump to ${formatTime(nextLine.time)}` : ''}
          >
            {nextLine?.text || '—'}
          </p>
        </div>
      ) : (
        <div className="text-center px-4 py-1">
          <p className="text-xs sm:text-sm text-gray-300 font-medium line-clamp-3 leading-relaxed">{plain || '♪'}</p>
        </div>
      )}
    </div>
  )
}

function SleepTimerPanel({ onClose, onSetTimer, currentTimer, timeLeft }) {
  const [selectedTime, setSelectedTime] = useState(15)
  const presets = [5, 10, 15, 30, 45, 60, 90, 120]
  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`

  return (
    <div className="fixed right-4 bottom-24 w-80 glass-drawer border border-white/15 rounded-3xl shadow-2xl overflow-hidden z-40 animate-pop-in">
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 shrink-0" />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
        <div>
          <p className="font-bold text-sm">Sleep Timer</p>
          <p className="text-xs text-gray-400">Auto-pause after set time</p>
        </div>
        <button onClick={onClose} className="touch-target text-gray-400 hover:text-white"><X size={18} /></button>
      </div>
      <div className="p-5">
        {currentTimer ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--brand)" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (timeLeft / (currentTimer * 60))}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-brand">{fmt(timeLeft)}</span>
                <span className="text-xs text-gray-400">left</span>
              </div>
            </div>
            <button onClick={() => onSetTimer(null)} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors text-sm">
              Cancel Timer
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presets.map(t => (
                <button key={t} onClick={() => setSelectedTime(t)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${selectedTime === t ? 'bg-brand text-black' : 'bg-surface-3 text-gray-300 hover:bg-surface-4'}`}>
                  {t}m
                </button>
              ))}
            </div>
            <button onClick={() => onSetTimer(selectedTime)}
              className="w-full bg-brand text-black font-bold py-2.5 rounded-lg hover:bg-brand-dark transition-colors text-sm">
              Start {selectedTime} min timer
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function QueuePanel({ queue = [], queueIndex, onClose, onPlay, reorderQueue, removeFromQueue, expanded = false }) {
  const activeRef = useRef(null)
  const listRef = useRef(null)

  // Hold-to-reorder state
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const holdTimerRef = useRef(null)
  const isDraggingRef = useRef(false)
  const pointerOriginRef = useRef(null)
  const dragIndexRef = useRef(null)
  const overIndexRef = useRef(null)
  const hasMovedRef = useRef(false)

  // Container-scoped scroll to active track on initial load or queueIndex change
  useEffect(() => {
    if (isDraggingRef.current) return
    if (!activeRef.current || !listRef.current) return
    const container = listRef.current
    const el = activeRef.current
    const target = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2)
    container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  }, [queueIndex])

  // Cleanup hold timer on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    }
  }, [])

  const handlePointerDown = (e, index, song) => {
    if (e.button !== undefined && e.button !== 0) return
    if (e.target.closest('[data-queue-action="remove"]')) return

    pointerOriginRef.current = { x: e.clientX, y: e.clientY, index, song }
    hasMovedRef.current = false
    isDraggingRef.current = false
    dragIndexRef.current = index
    overIndexRef.current = index

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)

    // Hold threshold (250ms) to trigger reorder mode
    holdTimerRef.current = setTimeout(() => {
      isDraggingRef.current = true
      hasMovedRef.current = true
      setDragIndex(index)
      setOverIndex(index)
      if ('vibrate' in navigator) navigator.vibrate(25)
      try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch (_) {}
    }, 250)
  }

  const handlePointerMove = (e) => {
    const origin = pointerOriginRef.current
    if (!origin) return

    const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)

    // If pre-hold and user moves > 8px, cancel hold so native scroll operates freely
    if (!isDraggingRef.current) {
      if (dist > 8) {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
        pointerOriginRef.current = null
      }
      return
    }

    // Active reordering: prevent native page scroll
    if (e.cancelable) e.preventDefault?.()

    // Auto-scroll list if pointer is near container top or bottom edge
    if (listRef.current) {
      const rect = listRef.current.getBoundingClientRect()
      if (e.clientY < rect.top + 45) {
        listRef.current.scrollTop -= 8
      } else if (e.clientY > rect.bottom - 45) {
        listRef.current.scrollTop += 8
      }
    }

    // Identify target item index under pointer
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-queue-index]')
    if (el) {
      const idx = parseInt(el.getAttribute('data-queue-index'), 10)
      if (!isNaN(idx) && idx !== overIndexRef.current && idx >= 0 && idx < queue.length) {
        overIndexRef.current = idx
        setOverIndex(idx)
        if ('vibrate' in navigator) navigator.vibrate(10)
      }
    }
  }

  const handlePointerUp = (e, index, song) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)

    if (isDraggingRef.current) {
      try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch (_) {}
      const from = dragIndexRef.current
      const to = overIndexRef.current
      if (from !== null && to !== null && from !== to) {
        reorderQueue?.(from, to)
        if ('vibrate' in navigator) navigator.vibrate(30)
      }
      isDraggingRef.current = false
      setDragIndex(null)
      setOverIndex(null)
      dragIndexRef.current = null
      overIndexRef.current = null
      pointerOriginRef.current = null
      setTimeout(() => { hasMovedRef.current = false }, 100)
      return
    }

    // Single click / tap (< 250ms and < 10px movement)
    const origin = pointerOriginRef.current
    if (origin && !e.target.closest('[data-queue-action="remove"]')) {
      const dist = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)
      if (dist < 10) {
        onPlay?.(song, queue, index)
      }
    }
    pointerOriginRef.current = null
  }

  const handlePointerCancel = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    isDraggingRef.current = false
    setDragIndex(null)
    setOverIndex(null)
    dragIndexRef.current = null
    overIndexRef.current = null
    pointerOriginRef.current = null
  }

  const inner = (
    <div
      ref={listRef}
      onPointerMove={handlePointerMove}
      onPointerCancel={handlePointerCancel}
      className="overflow-y-auto flex-1 min-h-0 py-1 mobile-scroll no-scrollbar overscroll-contain touch-pan-y select-none relative"
    >
      {queue.map((song, i) => {
        const isCurrent = i === queueIndex
        const isHeld = dragIndex === i
        const isDropTarget = overIndex === i && dragIndex !== null && dragIndex !== i

        return (
          <div
            key={`${song.id}-${i}`}
            data-queue-index={i}
            ref={isCurrent ? activeRef : null}
            onPointerDown={(e) => handlePointerDown(e, i, song)}
            onPointerUp={(e) => handlePointerUp(e, i, song)}
            onClick={(e) => {
              if (e.target.closest('[data-queue-action="remove"]')) return
              if (hasMovedRef.current || isDraggingRef.current) return
              onPlay?.(song, queue, i)
            }}
            className={`group relative flex items-center gap-3 px-3 py-2.5 my-1 rounded-2xl transition-all select-none cursor-pointer ${
              isHeld
                ? 'queue-item-dragging ring-2 ring-brand/60 bg-brand/15 shadow-2xl cursor-grabbing scale-[1.02]'
                : isCurrent
                  ? 'bg-white/10 border border-brand/35 shadow-lg'
                  : 'hover:bg-white/10 active:bg-white/15'
            } ${isDropTarget ? 'queue-drop-indicator' : ''}`}
          >
            {/* Song Cover (square grip handle removed) */}
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-white/5 border border-white/10 shadow-md">
              <img
                src={song.coverUrl || 'https://via.placeholder.com/44'}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                loading="lazy"
              />
              {isCurrent && (
                <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
                  <AudioBars isPlaying={true} size="sm" />
                </div>
              )}
            </div>

            {/* Title & Artist */}
            <div className="flex-1 min-w-0 pointer-events-none">
              <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-brand font-bold' : 'text-white'}`}>
                {song.title}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {song.artist}
              </p>
            </div>

            {/* Active Playing Badge / Remove Button */}
            <div className="flex items-center gap-2 shrink-0">
              {isCurrent ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-brand/20 text-brand border border-brand/30">
                  Now Playing
                </span>
              ) : (
                <button
                  type="button"
                  data-queue-action="remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFromQueue?.(i)
                    toast.success('Removed from queue', { duration: 1500, id: 'queue-remove' })
                  }}
                  title="Remove from queue"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 rounded-xl hover:bg-white/15 text-gray-400 hover:text-red-400 transition-all touch-target cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  if (expanded) {
    return (
      <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
        {inner}
      </div>
    )
  }

  return (
    <div className="fixed inset-x-3 sm:inset-x-auto sm:right-4 bottom-24 sm:w-96 h-[65vh] max-h-[600px] glass-drawer border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40 animate-pop-in">
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 shrink-0" />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">Queue</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/15 text-brand font-medium border border-brand/20">
              Hold to reorder
            </span>
          </div>
          <p className="text-xs text-gray-400">{queue.length} songs</p>
        </div>
        <button
          onClick={onClose}
          className="touch-target p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-2 sm:p-3">
        {inner}
      </div>
    </div>
  )
}

function ExpandedPlayer({ currentSong, isPlaying, progress, currentTime, duration, volume, isMuted,
  isShuffled, repeatMode, isLoading, error, engine, queue, queueIndex, liked, onLike, onClose,
  togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat, play,
  showParticles, settings, switchEngine, onOpenQuickAdd, reorderQueue, removeFromQueue }) {
  const [showLyrics, setShowLyrics] = useState(() => !!settings?.autoLyrics)
  const [viewMode, setViewMode] = useState('audio')
  const [videoId, setVideoId] = useState(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  const containerRef = useRef(null)
  const queueSectionRef = useRef(null)
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  const scrollToQueue = () => {
    queueSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Lock body scroll and anchor viewport at top whenever full player is mounted
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'video' && !videoId && currentSong) {
      setLoadingVideo(true)
      import('../services/musicApi').then(({ searchYouTube }) => {
        searchYouTube(`${currentSong.title} ${currentSong.artist} official music video`)
          .then(id => { setVideoId(id); setLoadingVideo(false) })
          .catch(() => setLoadingVideo(false))
      })
    }
  }, [viewMode, currentSong, videoId])

  return (
    <div ref={containerRef} className="mobile-expanded-player slide-up flex flex-col bg-black text-white no-scrollbar select-none">
      {/* Blurred background pinned to screen */}
      <div className="fixed inset-0 pointer-events-none">
        <img src={currentSong.coverUrl || ''} alt="" className="w-full h-full object-cover scale-110"
          style={{ filter: 'blur(60px) brightness(0.25) saturate(2)' }} />
        <div className="absolute inset-0 bg-black/60" />
      </div>
      {isPlaying && showParticles && <Particles />}

      {/* ── SECTION 1: NOW PLAYING FULL SCREEN ── */}
      <div className="player-snap-section relative z-10 min-h-screen min-h-[100dvh] flex flex-col justify-between mobile-safe-area shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 py-3 shrink-0 bg-transparent">
          <button onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-target cursor-pointer"
            title="Minimize"
          >
            <ChevronDown size={22} />
          </button>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Now Playing</p>
          <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-1">
            {['audio','video'].map(m => (
              <button key={m} onClick={() => {
                setViewMode(m)
                
              }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize cursor-pointer ${viewMode === m ? 'bg-white text-black shadow-sm' : 'text-gray-300 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Center Player Body */}
        <div className="flex-1 overflow-hidden px-4 sm:px-8 flex flex-col justify-center">
          <div className="flex flex-col items-center gap-3 sm:gap-4 max-w-md sm:max-w-lg lg:max-w-xl mx-auto my-auto w-full py-1">

            {/* Art / Video (Strict 1:1 square: full image visible without horizontal or vertical cropping) */}
            <div
              className={`relative ${
                viewMode === 'video'
                  ? 'w-64 xs:w-72 sm:w-80 aspect-video'
                  : 'w-36 h-36 xs:w-40 xs:h-40 sm:w-44 sm:h-44 aspect-square'
              } shrink-0 mx-auto`}
            >
              {viewMode === 'audio' ? (
                <div className="relative w-full h-full">
                  <div className="absolute -inset-2.5 rounded-2xl opacity-30 blur-xl pointer-events-none" style={{ background: 'var(--brand)' }} />
                  <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-2xl ${settings?.animatedArt && isPlaying ? 'album-glow' : ''}`}>
                    <img
                      src={currentSong.coverUrl || 'https://via.placeholder.com/300'}
                      alt={currentSong.title}
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-black">
                  {loadingVideo
                    ? <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
                    : videoId
                      ? <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                          title={currentSong.title} className="w-full h-full" frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      : <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                          <Music size={36} className="mb-2 opacity-30" /><p className="text-xs">No video found</p>
                        </div>
                  }
                </div>
              )}
            </div>

            {/* Middle Section between Album Cover and Seek Bar: Song Info OR Sentence-by-Sentence Live Lyrics */}
            <div className="w-full px-2 flex flex-col items-center justify-center min-h-[96px]">
              {showLyrics ? (
                <SentenceLyricsView
                  song={currentSong}
                  currentTime={currentTime}
                  seek={seek}
                />
              ) : (
                <div className="text-center w-full px-2">
                  <p className="text-xl sm:text-2xl font-black text-white leading-tight truncate drop-shadow-sm">{currentSong.title}</p>
                  <p className="text-gray-300 text-sm sm:text-base font-semibold truncate mt-1">
                    <Link
                      to={`/artist/${encodeURIComponent(currentSong.artist)}`}
                      onClick={() => onClose()}
                      className="hover:underline hover:text-white transition-colors"
                    >
                      {currentSong.artist}
                    </Link>
                  </p>
                  {currentSong.album && <p className="text-xs sm:text-sm text-gray-400 mt-0.5 truncate font-normal">{currentSong.album}</p>}
                  {settings?.showCredits && (
                    <p className="text-[11px] text-gray-500 mt-1">Source: {currentSong.source} {currentSong.genre ? `• ${currentSong.genre}` : ''}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons: Like & Quick Add */}
            <div className="flex items-center justify-between w-full px-2 sm:px-4">
              <button onClick={onLike} className={`touch-target transition-all active:scale-90 cursor-pointer ${liked ? 'text-brand' : 'text-gray-400 hover:text-white'}`} title={liked ? 'Unlike' : 'Like'}>
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onOpenQuickAdd?.()}
                className="touch-target p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all active:scale-90 cursor-pointer"
                title="Add to playlist, queue, or liked"
              >
                <PlusCircle size={22} />
              </button>
            </div>

            {/* Seek bar with fluid undulating wave animation */}
            <div className="w-full px-1 sm:px-2">
              <WaveSeekBar
                progress={progress}
                currentTime={currentTime}
                duration={duration}
                seek={seek}
                isPlaying={isPlaying}
                waveEnabled={settings?.seekBarWave !== false}
                layout="stacked"
                showTimes={true}
              />
              {error && <p className="text-xs text-orange-400 text-center mt-0.5">{error}</p>}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full px-2 sm:px-6">
              <button onClick={toggleShuffle} className={`touch-target transition-colors cursor-pointer ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`} title="Shuffle">
                <Shuffle size={20} />
              </button>
              <button onClick={previous} className="touch-target text-gray-300 hover:text-white transition-colors cursor-pointer" title="Previous">
                <SkipBack size={26} fill="currentColor" />
              </button>
              <button onClick={togglePlay} disabled={isLoading}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}>
                {isLoading
                  ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={next} className="touch-target text-gray-300 hover:text-white transition-colors cursor-pointer" title="Next">
                <SkipForward size={26} fill="currentColor" />
              </button>
              <button onClick={cycleRepeat} className={`touch-target transition-colors cursor-pointer ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`} title="Repeat">
                <RepeatIcon size={20} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full px-2 sm:px-6">
              <button onClick={toggleMute} className="touch-target text-gray-400 hover:text-white transition-colors shrink-0 cursor-pointer" title={isMuted ? "Unmute" : "Mute"}>
                <VolumeIcon size={18} />
              </button>
              <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="flex-1 mobile-volume-bar seek-bar cursor-pointer"
                style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
            </div>

            {/* Centered Lyrics Toggle Button */}
            <div className="flex items-center justify-center w-full pt-1">
              <button
                type="button"
                onClick={() => setShowLyrics(s => !s)}
                className={`touch-target flex items-center gap-2 px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-lg active:scale-95 cursor-pointer ${
                  showLyrics
                    ? 'bg-brand text-black shadow-brand/30 ring-2 ring-brand/40 font-bold'
                    : 'bg-white/10 text-gray-200 hover:bg-white/20 hover:text-white border border-white/10'
                }`}
                title={showLyrics ? "Show Song Details" : "Show Sentence-by-Sentence Live Lyrics"}
              >
                <Mic2 size={15} className={showLyrics ? "animate-pulse" : ""} />
                <span>{showLyrics ? 'Hide Lyrics' : 'Lyrics'}</span>
              </button>
            </div>

          </div>
        </div>

        {/* Scroll down to Queue cue at the bottom of Section 1 */}
        <div className="w-full flex justify-center pb-2 shrink-0">
          <button
            type="button"
            onClick={scrollToQueue}
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-white transition-all py-1 px-4 rounded-full hover:bg-white/5 active:scale-95 group cursor-pointer"
            title="Scroll down to Queue"
          >
            <span className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 group-hover:text-brand transition-colors flex items-center gap-1.5">
              <ListMusic size={13} className="text-brand" />
              Queue ({queue.length})
            </span>
            <ChevronDown size={15} className="animate-bounce text-gray-500 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* ── SECTION 2: QUEUE DIRECTLY BELOW PLAYER (Border removed, clean songs list) ── */}
      <div ref={queueSectionRef} className="player-snap-section relative z-10 w-full max-w-xl sm:max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 shrink-0 flex flex-col min-h-[500px]">
        {/* Subtle minimal header */}
        <div className="flex items-center justify-between pb-3 mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic size={18} className="text-brand" />
            <h3 className="font-bold text-base text-white">Up Next</h3>
            <span className="text-xs text-gray-400">({queue.length})</span>
          </div>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors cursor-pointer touch-target"
            title="Back to Player"
          >
            <ChevronUp size={15} />
            <span>Player</span>
          </button>
        </div>

        {/* Embedded Queue list without container border */}
        <div className="flex-1 min-h-0 flex flex-col">
          <QueuePanel
            queue={queue}
            queueIndex={queueIndex}
            onPlay={play}
            reorderQueue={reorderQueue}
            removeFromQueue={removeFromQueue}
            expanded={true}
          />
        </div>
      </div>
    </div>
  )
}

export default function Player() {
  const {
    currentSong, queue, queueIndex, isPlaying, progress, currentTime, duration,
    volume, isMuted, isShuffled, repeatMode, isLoading, error, engine,
    play, togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat, switchEngine,
    reorderQueue, removeFromQueue
  } = usePlayer()
  const { user } = useAuth()
  const { settings, update } = useAudioSettings()

  const waveEnabled = settings?.seekBarWave !== false

  const [liked, setLiked] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false)
  const [showSongModal, setShowSongModal] = useState(false)
  const quickAddBtnRef = useRef(null)
  const quickAddMenuRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [sleepTimer, setSleepTimer] = useState(null)
  const [sleepTimeLeft, setSleepTimeLeft] = useState(0)
  const sleepRef = useRef(null)

  useEffect(() => {
    if (!showQuickAdd) return
    const handleClickOutside = (e) => {
      if (
        quickAddMenuRef.current &&
        !quickAddMenuRef.current.contains(e.target) &&
        quickAddBtnRef.current &&
        !quickAddBtnRef.current.contains(e.target)
      ) {
        setShowQuickAdd(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [showQuickAdd])

  const nextSong = queue && queue.length > queueIndex + 1 ? queue[queueIndex + 1] : null
  const timeLeft = duration > 0 ? duration - currentTime : 999
  const showNextUp = isPlaying && timeLeft <= 15 && timeLeft > 0 && nextSong && duration > 30

  useEffect(() => {
    if (user && currentSong) isFavorite(user.uid, currentSong.id).then(setLiked)
  }, [currentSong, user])

  useEffect(() => {
    if (sleepTimer && sleepTimeLeft > 0) {
      sleepRef.current = setInterval(() => {
        setSleepTimeLeft(prev => {
          if (prev <= 1) {
            if (isPlaying) { togglePlay(); toast.success('💤 Sleep timer — music paused') }
            setSleepTimer(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(sleepRef.current)
    }
    return () => clearInterval(sleepRef.current)
  }, [sleepTimer, sleepTimeLeft, isPlaying, togglePlay])

  const startSleepTimer = (minutes) => {
    if (!minutes) { setSleepTimer(null); setSleepTimeLeft(0); clearInterval(sleepRef.current); toast.success('Sleep timer cancelled'); return }
    setSleepTimer(minutes); setSleepTimeLeft(minutes * 60); setShowSleepTimer(false)
    toast.success(`💤 Sleep timer set for ${minutes} min`)
  }

  const handleLike = async () => {
    if (!user || !currentSong) return
    setLiked(await toggleFavorite(user.uid, currentSong.id))
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  // ── Empty state ──────────────────────────────────────────
  if (!currentSong) {
    return (
      <div className="h-16 bg-surface-2 border-t border-white/5 flex items-center justify-center shrink-0">
        <div className="flex items-center gap-2 text-gray-600">
          <Music size={16} />
          <span className="text-sm">Search for a song to start listening</span>
        </div>
      </div>
    )
  }

  // ── Compact player bar ───────────────────────────────────
  return (
    <>
      {/* Expanded full-screen player */}
      {expanded && (
        <ExpandedPlayer
          currentSong={currentSong} isPlaying={isPlaying} progress={progress}
          currentTime={currentTime} duration={duration} volume={volume} isMuted={isMuted}
          isShuffled={isShuffled} repeatMode={repeatMode} isLoading={isLoading} error={error}
          engine={engine} queue={queue} queueIndex={queueIndex} liked={liked}
          onLike={handleLike} onClose={() => setExpanded(false)}
          togglePlay={togglePlay} seek={seek} next={next} previous={previous}
          setVolume={setVolume} toggleMute={toggleMute} toggleShuffle={toggleShuffle}
          cycleRepeat={cycleRepeat} play={play}
          showParticles={settings?.particles !== false}
          settings={settings}
          switchEngine={switchEngine}
          onOpenQuickAdd={() => setShowQuickAdd(true)}
          reorderQueue={reorderQueue}
          removeFromQueue={removeFromQueue}
        />
      )}

      {/* Floating panels (desktop) */}
      {!expanded && showLyrics && <LyricsPanel song={currentSong} currentTime={currentTime} onClose={() => setShowLyrics(false)} />}
      {!expanded && showQueue && <QueuePanel queue={queue} queueIndex={queueIndex} onClose={() => setShowQueue(false)} onPlay={play} reorderQueue={reorderQueue} removeFromQueue={removeFromQueue} />}
      {!expanded && showSleepTimer && <SleepTimerPanel onClose={() => setShowSleepTimer(false)} onSetTimer={startSleepTimer} currentTimer={sleepTimer} timeLeft={sleepTimeLeft} />}

      {/* Up-next toast */}
      {!expanded && showNextUp && nextSong && (
        <div className="fixed bottom-20 left-3 z-[999] bg-surface-2/95 backdrop-blur-md border border-brand/30 rounded-xl p-3 shadow-2xl animate-slide-down max-w-[280px]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img src={nextSong.coverUrl || 'https://via.placeholder.com/40'} alt={nextSong.title} className="w-10 h-10 rounded-lg object-cover" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
                <span className="text-xs text-black font-bold leading-none">⏭</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-brand uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-brand rounded-full animate-pulse" /> Up next
              </p>
              <p className="text-sm font-semibold truncate">{nextSong.title}</p>
              <p className="text-xs text-gray-400 truncate">{nextSong.artist}</p>
            </div>
            <div className="w-8 h-8 relative shrink-0">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                <circle cx="16" cy="16" r="14" fill="none" stroke="var(--brand)" strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${2 * Math.PI * 14 * (timeLeft / 15)}`}
                  style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-brand">{Math.ceil(timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── The compact player bar ── */}
      <div className="relative border-t border-white/5 bg-surface-2/95 backdrop-blur-md z-[100]">
        {/* Blurred album art background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img src={currentSong.coverUrl} alt="" className="w-full h-full object-cover scale-110"
            style={{ filter: 'blur(40px) brightness(0.12) saturate(2)' }} />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Mobile layout: stacked seek bar on top, controls below */}
        <div className="sm:hidden">
          {/* Seek bar strip — with dynamic sound wave animation */}
          <div className="px-0">
            <WaveSeekBar
              progress={progress}
              currentTime={currentTime}
              duration={duration}
              seek={seek}
              isPlaying={isPlaying}
              waveEnabled={waveEnabled}
              showTimes={false}
              className="px-0"
            />
          </div>
          {/* Mobile controls row */}
          <div className="flex items-center gap-2 xs:gap-2.5 px-3 py-2">
            <button onClick={() => setExpanded(true)} className="relative shrink-0 touch-target" aria-label="Expand player">
              <img src={currentSong.coverUrl} alt={currentSong.title}
                className={`w-12 h-12 rounded-xl object-cover shadow-sm ${isPlaying ? 'ring-2 ring-brand/60' : ''}`} />
              {isPlaying && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand rounded-full border-2 border-black animate-pulse" />}
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(true)}>
              <p className="text-[14px] font-bold text-white truncate leading-snug">{currentSong.title}</p>
              <p className="text-xs text-gray-300 font-medium truncate mt-0.5">
                <Link
                  to={`/artist/${encodeURIComponent(currentSong.artist)}`}
                  onClick={e => e.stopPropagation()}
                  className="hover:underline hover:text-white transition-colors"
                >
                  {currentSong.artist}
                </Link>
              </p>
            </div>
            <button onClick={handleLike} className={`touch-target shrink-0 p-1.5 ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-white'}`} aria-label={liked ? 'Unlike' : 'Like'}>
              <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={previous} className="touch-target text-gray-300 hidden min-[360px]:inline-flex p-1.5 shrink-0" aria-label="Previous">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button onClick={togglePlay} disabled={isLoading} aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform disabled:opacity-50 shadow-md touch-target shrink-0">
              {isLoading
                ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={next} className="touch-target text-gray-300 p-1.5 shrink-0" aria-label="Next">
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button onClick={() => { setShowQueue(q => !q); setShowLyrics(false) }} aria-label="Queue"
              className={`touch-target p-1.5 shrink-0 hidden min-[410px]:inline-flex ${showQueue ? 'text-brand' : 'text-gray-400'}`}>
              <ListMusic size={17} />
            </button>
          </div>
        </div>

        {/* Desktop layout: full 3-column bar */}
        <div className="hidden sm:flex items-center gap-4 px-4 sm:px-6 py-2 h-[84px]">
          {/* Left: song info */}
          <div className="flex items-center gap-3.5 min-w-0 w-64 sm:w-72 lg:w-80 shrink-0">
            <button onClick={() => setExpanded(true)} className="relative group shrink-0" title="Open full player">
              <img src={currentSong.coverUrl} alt={currentSong.title}
                className={`w-[58px] h-[58px] rounded-xl object-cover shadow-md transition-all group-hover:scale-105 ${isPlaying ? 'ring-2 ring-brand/70 shadow-brand/20' : ''}`} />
              <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={18} className="text-white drop-shadow" />
              </div>
              {isPlaying && <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full border-2 border-black animate-pulse shadow-sm" />}
            </button>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p
                onClick={() => setExpanded(true)}
                className="text-[15px] sm:text-base font-bold text-white truncate leading-snug tracking-tight drop-shadow-sm cursor-pointer hover:underline"
                title={currentSong.title}
              >
                {currentSong.title}
              </p>
              <p className="text-xs sm:text-[13px] text-gray-300 font-medium truncate mt-0.5 leading-normal" title={currentSong.artist}>
                <Link
                  to={`/artist/${encodeURIComponent(currentSong.artist)}`}
                  className="hover:underline hover:text-white transition-colors"
                >
                  {currentSong.artist}
                </Link>
              </p>
            </div>
            <button
              onClick={handleLike}
              className={`p-2 rounded-full hover:bg-white/10 shrink-0 transition-all active:scale-125 ${liked ? 'text-rose-500' : 'text-gray-400 hover:text-white'}`}
              title={liked ? 'Unlike' : 'Like'}
              aria-label={liked ? 'Unlike' : 'Like'}
            >
              <Heart size={19} fill={liked ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Center: controls + seek */}
          <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 lg:gap-4">
              <button onClick={toggleShuffle} className={`touch-target transition-colors hidden lg:flex ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
                <Shuffle size={15} />
              </button>
              <button onClick={previous} className="touch-target text-gray-300 hover:text-white transition-colors">
                <SkipBack size={19} fill="currentColor" />
              </button>
              <button onClick={togglePlay} disabled={isLoading}
                className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 shadow-lg touch-target">
                {isLoading
                  ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={next} className="touch-target text-gray-300 hover:text-white transition-colors">
                <SkipForward size={19} fill="currentColor" />
              </button>
              <button onClick={cycleRepeat} className={`touch-target transition-colors hidden lg:flex ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
                <RepeatIcon size={15} />
              </button>
            </div>
            {/* Seek bar — always visible with fluid wave animation */}
            <WaveSeekBar
              progress={progress}
              currentTime={currentTime}
              duration={duration}
              seek={seek}
              isPlaying={isPlaying}
              waveEnabled={waveEnabled}
              layout="inline"
              showTimes={true}
            />
            {error && !isPlaying && <p className="text-xs text-orange-400 truncate">{error}</p>}
          </div>

          {/* Right: volume + extras */}
          <div className="flex items-center gap-2 lg:gap-2.5 shrink-0 w-64 sm:w-72 lg:w-80 justify-end relative">
            {/* Quick Actions Plus Button replacing equalizer bars */}
            <div className="relative">
              <button
                ref={quickAddBtnRef}
                onClick={() => setShowQuickAdd(q => !q)}
                className={`p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center shrink-0 ${
                  showQuickAdd ? 'bg-brand text-black shadow-lg shadow-brand/30' : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
                title="Add to playlist, queue, or liked"
                aria-label="Add options"
              >
                <PlusCircle size={18} />
              </button>

              {/* Quick Add Popover Menu */}
              {showQuickAdd && (
                <div
                  ref={quickAddMenuRef}
                  className="absolute right-0 bottom-full mb-3 w-56 glass-modal rounded-2xl p-1.5 shadow-2xl border border-white/15 animate-pop-in z-50 overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 py-2 border-b border-white/10">
                    <p className="text-xs font-bold text-white truncate">{currentSong.title}</p>
                    <p className="text-[11px] text-gray-400 truncate">{currentSong.artist}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowQuickAdd(false)
                        setShowAddToPlaylistModal(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <ListPlus size={16} className="text-brand" />
                      Add to Playlist
                    </button>

                    <button
                      onClick={() => {
                        setShowQuickAdd(false)
                        if (currentSong) {
                          setQueue(prev => [...prev, currentSong])
                          toast.success(`Added "${currentSong.title}" to queue`)
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <ListMusic size={16} className="text-purple-400" />
                      Add to Queue
                    </button>

                    <button
                      onClick={() => {
                        setShowQuickAdd(false)
                        handleLike()
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <Heart size={16} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-rose-500' : 'text-gray-400'} />
                      {liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                    </button>

                    <div className="border-t border-white/10 my-1" />

                    <button
                      onClick={() => {
                        setShowQuickAdd(false)
                        setShowSongModal(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-200 hover:text-white hover:bg-white/10 transition-colors text-left"
                    >
                      <Info size={16} className="text-blue-400" />
                      Song Details & Video
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => { setShowLyrics(l => !l); setShowQueue(false); setShowSleepTimer(false) }}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors hidden lg:flex items-center justify-center shrink-0 ${showLyrics ? 'text-brand' : 'text-gray-400 hover:text-white'}`}
              title="Lyrics">
              <Mic2 size={17} />
            </button>
            <button onClick={() => { setShowQueue(q => !q); setShowLyrics(false); setShowSleepTimer(false) }}
              className={`p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 ${showQueue ? 'text-brand' : 'text-gray-400 hover:text-white'}`}
              title="Queue">
              <ListMusic size={17} />
            </button>
            <button onClick={() => { setShowSleepTimer(s => !s); setShowLyrics(false); setShowQueue(false) }}
              className={`p-2 rounded-full hover:bg-white/10 relative transition-colors hidden lg:flex items-center justify-center shrink-0 ${showSleepTimer || sleepTimer ? 'text-brand' : 'text-gray-400 hover:text-white'}`}
              title="Sleep Timer">
              <Timer size={17} />
              {sleepTimer && <span className="absolute top-1 right-1 w-2 h-2 bg-brand rounded-full animate-pulse" />}
            </button>
            <button onClick={toggleMute} className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center shrink-0" title={isMuted ? "Unmute" : "Mute"}>
              <VolumeIcon size={17} />
            </button>
            <div className="w-20 lg:w-24 shrink-0 flex items-center pr-1">
              <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full seek-bar unified-volume-bar cursor-pointer"
                style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add to Playlist Modal */}
      {showAddToPlaylistModal && currentSong && (
        <AddToPlaylistModal
          song={currentSong}
          onClose={() => setShowAddToPlaylistModal(false)}
        />
      )}

      {/* Song Details Modal */}
      {showSongModal && currentSong && (
        <SongModal
          song={currentSong}
          queue={queue}
          onClose={() => setShowSongModal(false)}
        />
      )}
    </>
  )
}
