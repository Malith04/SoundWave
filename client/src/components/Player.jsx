import { usePlayer } from '../context/PlayerContext'
import { useAudioSettings } from '../context/AudioSettingsContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, ListMusic, X, Music, Mic2,
  ChevronDown, Maximize2, Timer
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite, isFavorite } from '../services/userService'
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
  useEffect(() => { activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [activeIdx])

  if (expanded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {synced && <p className="text-sm text-brand mb-4 font-medium shrink-0">● Live synced</p>}
        <div className="overflow-y-auto flex-1 mobile-scroll">
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
      <div className="overflow-y-auto flex-1 px-5 py-4 mobile-scroll">
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

function QueuePanel({ queue, queueIndex, onClose, onPlay, expanded = false }) {
  const activeRef = useRef(null)
  useEffect(() => { activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [queueIndex])

  const inner = (
    <div className="overflow-y-auto flex-1 py-1 mobile-scroll">
      {queue.map((song, i) => (
        <div key={`${song.id}-${i}`} ref={i === queueIndex ? activeRef : null}
          onClick={() => onPlay(song, queue, i)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${i === queueIndex ? 'bg-white/10' : 'hover:bg-white/5'}`}>
          <img src={song.coverUrl || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${i === queueIndex ? 'text-brand' : ''}`}>{song.title}</p>
            <p className="text-xs text-gray-500 truncate">{song.artist}</p>
          </div>
          {i === queueIndex && <AudioBars isPlaying={true} />}
        </div>
      ))}
    </div>
  )

  if (expanded) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider shrink-0">Up next · {queue.length} songs</p>
        {inner}
      </div>
    )
  }

  return (
    <div className="fixed right-4 bottom-24 w-80 h-[65vh] glass-drawer border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40 animate-pop-in">
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 -mb-1 shrink-0" />
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 shrink-0">
        <div><p className="font-bold text-sm">Queue</p><p className="text-xs text-gray-400">{queue.length} songs</p></div>
        <button onClick={onClose} className="touch-target text-gray-400 hover:text-white"><X size={18} /></button>
      </div>
      {inner}
    </div>
  )
}

function ExpandedPlayer({ currentSong, isPlaying, progress, currentTime, duration, volume, isMuted,
  isShuffled, repeatMode, isLoading, error, engine, queue, queueIndex, liked, onLike, onClose,
  togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat, play,
  showParticles }) {
  const [panel, setPanel] = useState(null)
  const [viewMode, setViewMode] = useState('audio')
  const [videoId, setVideoId] = useState(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

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
    <div className="mobile-expanded-player slide-up flex flex-col bg-black overflow-hidden">
      {/* Blurred background */}
      <div className="absolute inset-0">
        <img src={currentSong.coverUrl || ''} alt="" className="w-full h-full object-cover scale-110"
          style={{ filter: 'blur(60px) brightness(0.25) saturate(2)' }} />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      {isPlaying && showParticles && <Particles />}

      <div className="relative z-10 flex flex-col h-full mobile-safe-area">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0">
          <button onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-target">
            <ChevronDown size={22} />
          </button>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Now Playing</p>
          <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-1">
            {['audio','video'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all capitalize ${viewMode === m ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto mobile-scroll px-4 sm:px-6">
          <div className="flex flex-col items-center gap-5 max-w-sm mx-auto pb-4">

            {/* Art / Video */}
            <div className="relative w-full max-w-[260px] sm:max-w-xs shrink-0">
              {viewMode === 'audio' ? (
                <>
                  <div className="absolute -inset-3 rounded-2xl opacity-30 blur-2xl" style={{ background: 'var(--brand)' }} />
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
                    <img src={currentSong.coverUrl || 'https://via.placeholder.com/300'} alt={currentSong.title} className="w-full h-full object-cover" />
                  </div>
                </>
              ) : (
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-black">
                  {loadingVideo
                    ? <div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
                    : videoId
                      ? <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                          title={currentSong.title} className="w-full h-full" frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      : <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                          <Music size={40} className="mb-2 opacity-30" /><p className="text-sm">No video found</p>
                        </div>
                  }
                </div>
              )}
            </div>

            {/* Song info */}
            <div className="text-center w-full">
              <p className="text-xl font-bold leading-tight mb-1 truncate">{currentSong.title}</p>
              <p className="text-gray-400 text-sm truncate">{currentSong.artist}</p>
              {currentSong.album && <p className="text-xs text-gray-600 mt-0.5 truncate">{currentSong.album}</p>}
            </div>

            {/* Like + badge */}
            <div className="flex items-center justify-between w-full px-2">
              <button onClick={onLike} className={`touch-target transition-all active:scale-90 ${liked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}>
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${currentSong.source === 'jamendo' ? 'bg-brand/20 text-brand' : 'bg-purple-500/20 text-purple-400'}`}>
                {currentSong.source === 'jamendo' ? 'Full Track' : engine === 'youtube' ? 'Full Track' : '30s Preview'}
              </span>
              <AudioBars isPlaying={isPlaying} size="lg" />
            </div>

            {/* Seek bar */}
            <div className="w-full">
              <input type="range" min={0} max={1} step={0.001} value={progress}
                onChange={e => seek(parseFloat(e.target.value))}
                className="w-full mobile-seek-bar seek-bar cursor-pointer"
                style={{ '--progress': `${progress * 100}%` }} />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400 tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-xs text-gray-400 tabular-nums">{formatTime(duration)}</span>
              </div>
              {error && <p className="text-xs text-orange-400 text-center mt-1">{error}</p>}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full px-2">
              <button onClick={toggleShuffle} className={`touch-target transition-colors ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
                <Shuffle size={20} />
              </button>
              <button onClick={previous} className="touch-target text-gray-300 hover:text-white transition-colors">
                <SkipBack size={26} fill="currentColor" />
              </button>
              <button onClick={togglePlay} disabled={isLoading}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50">
                {isLoading
                  ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={next} className="touch-target text-gray-300 hover:text-white transition-colors">
                <SkipForward size={26} fill="currentColor" />
              </button>
              <button onClick={cycleRepeat} className={`touch-target transition-colors ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
                <RepeatIcon size={20} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full">
              <button onClick={toggleMute} className="touch-target text-gray-400 hover:text-white transition-colors shrink-0">
                <VolumeIcon size={18} />
              </button>
              <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="flex-1 mobile-volume-bar seek-bar cursor-pointer"
                style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
            </div>
          </div>
        </div>

        {/* Bottom panel toggles */}
        <div className="flex justify-center gap-3 py-4 px-4 shrink-0 bg-black/20 backdrop-blur-sm"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => setPanel(p => p === 'lyrics' ? null : 'lyrics')}
            className={`touch-target flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${panel === 'lyrics' ? 'bg-brand text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
            <Mic2 size={15} /> Lyrics
          </button>
          <button onClick={() => setPanel(p => p === 'queue' ? null : 'queue')}
            className={`touch-target flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${panel === 'queue' ? 'bg-brand text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
            <ListMusic size={15} /> Queue
          </button>
        </div>

        {/* Slide-up panel overlay */}
        {panel && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setPanel(null)}>
            <div className="absolute bottom-0 left-0 right-0 bg-surface-2 rounded-t-2xl border-t border-white/10 max-h-[72vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                <h3 className="font-bold capitalize">{panel}</h3>
                <button onClick={() => setPanel(null)} className="touch-target text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                {panel === 'lyrics'
                  ? <LyricsPanel song={currentSong} currentTime={currentTime} expanded />
                  : <QueuePanel queue={queue} queueIndex={queueIndex} onPlay={play} expanded />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Player() {
  const {
    currentSong, queue, queueIndex, isPlaying, progress, currentTime, duration,
    volume, isMuted, isShuffled, repeatMode, isLoading, error, engine,
    play, togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat
  } = usePlayer()
  const { user } = useAuth()
  const { settings } = useAudioSettings()
  useKeyboardShortcuts()

  const [liked, setLiked] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [sleepTimer, setSleepTimer] = useState(null)
  const [sleepTimeLeft, setSleepTimeLeft] = useState(0)
  const sleepRef = useRef(null)

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
        />
      )}

      {/* Floating panels (desktop) */}
      {!expanded && showLyrics && <LyricsPanel song={currentSong} currentTime={currentTime} onClose={() => setShowLyrics(false)} />}
      {!expanded && showQueue && <QueuePanel queue={queue} queueIndex={queueIndex} onClose={() => setShowQueue(false)} onPlay={play} />}
      {!expanded && showSleepTimer && <SleepTimerPanel onClose={() => setShowSleepTimer(false)} onSetTimer={startSleepTimer} currentTimer={sleepTimer} timeLeft={sleepTimeLeft} />}

      {/* Up-next toast */}
      {showNextUp && nextSong && (
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
          {/* Seek bar strip — thick and always visible */}
          <div className="px-0">
            <input type="range" min={0} max={1} step={0.001} value={progress}
              onChange={e => seek(parseFloat(e.target.value))}
              className="w-full seek-bar cursor-pointer"
              style={{ '--progress': `${progress * 100}%`, height: '3px', display: 'block' }} />
          </div>
          {/* Mobile controls row */}
          <div className="flex items-center gap-2 px-3 py-2">
            <button onClick={() => setExpanded(true)} className="relative shrink-0 touch-target">
              <img src={currentSong.coverUrl} alt={currentSong.title}
                className={`w-10 h-10 rounded-lg object-cover ${isPlaying ? 'ring-2 ring-brand/60' : ''}`} />
              {isPlaying && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand rounded-full border-2 border-black animate-pulse" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
            </div>
            <button onClick={handleLike} className={`touch-target shrink-0 ${liked ? 'text-brand' : 'text-gray-500'}`}>
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button onClick={previous} className="touch-target text-gray-300">
              <SkipBack size={18} fill="currentColor" />
            </button>
            <button onClick={togglePlay} disabled={isLoading}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black active:scale-95 transition-transform disabled:opacity-50 shadow-md touch-target">
              {isLoading
                ? <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={next} className="touch-target text-gray-300">
              <SkipForward size={18} fill="currentColor" />
            </button>
            <button onClick={() => { setShowQueue(q => !q); setShowLyrics(false) }}
              className={`touch-target ${showQueue ? 'text-brand' : 'text-gray-400'}`}>
              <ListMusic size={16} />
            </button>
          </div>
        </div>

        {/* Desktop layout: full 3-column bar */}
        <div className="hidden sm:flex items-center gap-3 px-4 py-2 h-[72px]">
          {/* Left: song info */}
          <div className="flex items-center gap-3 min-w-0 w-56 lg:w-64 shrink-0">
            <button onClick={() => setExpanded(true)} className="relative group shrink-0 touch-target" title="Open full player">
              <img src={currentSong.coverUrl} alt={currentSong.title}
                className={`w-12 h-12 rounded-lg object-cover transition-all group-hover:scale-105 ${isPlaying ? 'ring-2 ring-brand/60' : ''}`} />
              <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 size={14} className="text-white" />
              </div>
              {isPlaying && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand rounded-full border-2 border-black animate-pulse" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate leading-tight">{currentSong.title}</p>
              <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
              {currentSong.source === 'itunes' && <span className="text-xs text-purple-400">{engine === 'youtube' ? 'Full track' : '30s preview'}</span>}
              {currentSong.source === 'jamendo' && <span className="text-xs text-brand">Full track</span>}
            </div>
            <button onClick={handleLike} className={`touch-target shrink-0 transition-all active:scale-125 ${liked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}>
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
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
            {/* Seek bar — always visible */}
            <div className="flex items-center gap-2 w-full">
              <span className="text-xs text-gray-500 tabular-nums shrink-0 w-9 text-right">{formatTime(currentTime)}</span>
              <input type="range" min={0} max={1} step={0.001} value={progress}
                onChange={e => seek(parseFloat(e.target.value))}
                className="flex-1 seek-bar unified-seek-bar cursor-pointer"
                style={{ '--progress': `${progress * 100}%` }} />
              <span className="text-xs text-gray-500 tabular-nums shrink-0 w-9">{formatTime(duration)}</span>
            </div>
            {error && <p className="text-xs text-orange-400 truncate">{error}</p>}
          </div>

          {/* Right: volume + extras */}
          <div className="flex items-center gap-1.5 shrink-0 w-36 lg:w-44 justify-end">
            <AudioBars isPlaying={isPlaying} />
            <button onClick={() => { setShowLyrics(l => !l); setShowQueue(false); setShowSleepTimer(false) }}
              className={`touch-target transition-colors hidden lg:flex ${showLyrics ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
              <Mic2 size={17} />
            </button>
            <button onClick={() => { setShowQueue(q => !q); setShowLyrics(false); setShowSleepTimer(false) }}
              className={`touch-target transition-colors ${showQueue ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
              <ListMusic size={17} />
            </button>
            <button onClick={() => { setShowSleepTimer(s => !s); setShowLyrics(false); setShowQueue(false) }}
              className={`touch-target relative transition-colors hidden lg:flex ${showSleepTimer || sleepTimer ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
              <Timer size={17} />
              {sleepTimer && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand rounded-full animate-pulse" />}
            </button>
            <button onClick={toggleMute} className="touch-target text-gray-400 hover:text-white transition-colors">
              <VolumeIcon size={17} />
            </button>
            <div className="w-16 lg:w-20">
              <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-full seek-bar unified-volume-bar cursor-pointer"
                style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
