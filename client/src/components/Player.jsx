import { usePlayer } from '../context/PlayerContext'
import { useAudioSettings } from '../context/AudioSettingsContext'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1, Heart, ListMusic, X, Music, Mic2, ChevronDown, Maximize2, Timer, Moon } from 'lucide-react'
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
          style={{ background: '#1DB954', height: isPlaying ? undefined : '4px', minHeight: '4px' }} />
      ))}
    </div>
  )
}

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="particle absolute w-1.5 h-1.5 rounded-full"
          style={{ background: '#1DB954', left: `${8 + i * 7.5}%`, bottom: `${10 + (i % 4) * 8}%`,
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

  return (
    <div className={expanded ? 'flex flex-col h-full overflow-hidden' : 'fixed right-4 bottom-24 w-[500px] h-[75vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40'}>
      {!expanded && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-base truncate">{song?.title}</p>
            <p className="text-sm text-gray-400 truncate">{song?.artist}</p>
            {synced && <span className="text-sm text-brand block mt-1">● Live synced</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-4 shrink-0"><X size={20} /></button>
        </div>
      )}
      {expanded && synced && <p className="text-sm text-brand mb-4 font-medium shrink-0">● Live synced</p>}
      <div className="overflow-y-auto flex-1 px-6 py-4">
        {loading ? <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
          : err ? <div className="flex flex-col items-center justify-center h-full text-gray-600"><Mic2 size={48} className="mb-3 opacity-30" /><p className="text-base">Lyrics not found</p></div>
          : synced ? (
            <div className="space-y-6 py-8">
              {lines.map((line, i) => (
                <p key={i} ref={i === activeIdx ? activeRef : null}
                  className={`font-bold leading-relaxed transition-all duration-300 select-none ${expanded ? 'text-3xl' : 'text-2xl'} ${
                    i === activeIdx ? 'text-white scale-105 origin-left' : i < activeIdx ? 'text-gray-600' : 'text-gray-500'
                  }`}>{line.text || '♪'}</p>
              ))}
            </div>
          ) : <pre className="text-lg text-gray-300 whitespace-pre-wrap font-sans leading-8">{plain}</pre>
        }
      </div>
    </div>
  )
}

function SleepTimerPanel({ onClose, onSetTimer, currentTimer, timeLeft }) {
  const [selectedTime, setSelectedTime] = useState(15)
  const presets = [5, 10, 15, 30, 45, 60, 90, 120]
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed right-4 bottom-24 w-80 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <p className="font-bold text-sm">Sleep Timer</p>
          <p className="text-xs text-gray-400">Auto-pause music after set time</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={18} />
        </button>
      </div>
      
      <div className="p-5">
        {currentTimer ? (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 relative">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle cx="48" cy="48" r="44" fill="none" stroke="#1DB954" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (timeLeft / (currentTimer * 60))}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-brand">{formatTime(timeLeft)}</span>
                <span className="text-xs text-gray-400">remaining</span>
              </div>
            </div>
            <button 
              onClick={() => onSetTimer(null)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Cancel Timer
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {presets.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedTime === time 
                      ? 'bg-brand text-black' 
                      : 'bg-surface-3 text-gray-300 hover:bg-surface-4'
                  }`}
                >
                  {time}m
                </button>
              ))}
            </div>
            <button 
              onClick={() => onSetTimer(selectedTime)}
              className="w-full bg-brand text-black font-bold py-3 rounded-lg hover:bg-brand-dark transition-colors"
            >
              Start {selectedTime} Min Timer
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
  return (
    <div className={expanded ? 'flex flex-col h-full overflow-hidden' : 'fixed right-4 bottom-24 w-96 h-[70vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40'}>
      {!expanded && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div><p className="font-bold text-sm">Queue</p><p className="text-xs text-gray-400">{queue.length} songs</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
      )}
      {expanded && <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider shrink-0">Up next · {queue.length} songs</p>}
      <div className="overflow-y-auto flex-1 py-1">
        {queue.map((song, i) => (
          <div key={`${song.id}-${i}`} ref={i === queueIndex ? activeRef : null} onClick={() => onPlay(song, queue, i)}
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
    </div>
  )
}

function ExpandedPlayer({ currentSong, isPlaying, progress, currentTime, duration, volume, isMuted, isShuffled, repeatMode, isLoading, error, engine, queue, queueIndex, liked, onLike, onClose, togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat, play, showParticles, showVinyl }) {
  const [panel, setPanel] = useState(null)
  const [viewMode, setViewMode] = useState('audio') // 'audio' or 'video'
  const [videoId, setVideoId] = useState(null)
  const [loadingVideo, setLoadingVideo] = useState(false)
  
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  // Search for video when switching to video mode
  useEffect(() => {
    if (viewMode === 'video' && !videoId && currentSong) {
      setLoadingVideo(true)
      import('../services/musicApi').then(({ searchYouTube }) => {
        const query = `${currentSong.title} ${currentSong.artist} official music video`
        searchYouTube(query).then(id => {
          setVideoId(id)
          setLoadingVideo(false)
        }).catch(() => {
          setLoadingVideo(false)
        })
      })
    }
  }, [viewMode, currentSong, videoId])

  return (
    <div className="fixed inset-0 z-[200] slide-up flex flex-col overflow-hidden">
      {/* Blurred bg */}
      <div className="absolute inset-0">
        <img src={currentSong.coverUrl || ''} alt="" className="w-full h-full object-cover scale-110"
          style={{ filter: 'blur(60px) brightness(0.3) saturate(2)' }} />
        <div className="absolute inset-0 bg-black/55" />
      </div>
      {isPlaying && showParticles && <Particles />}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <ChevronDown size={22} />
          </button>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Now Playing</p>
          
          {/* Audio/Video Toggle */}
          <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
            <button
              onClick={() => setViewMode('audio')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewMode === 'audio' 
                  ? 'bg-white text-black' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setViewMode('video')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                viewMode === 'video' 
                  ? 'bg-white text-black' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Video
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden px-6 pb-4 gap-8">

          {/* Left: album + controls */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 gap-5">
            
            {/* Album Art or Video */}
            <div className="relative shrink-0">
              {viewMode === 'audio' ? (
                <>
                  <div className="absolute -inset-4 rounded-2xl opacity-40 blur-2xl" style={{ background: '#1DB954' }} />
                  {/* Rectangular Album Art - No Animation */}
                  <div className="relative w-80 h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10">
                    <img src={currentSong.coverUrl || 'https://via.placeholder.com/320'} alt={currentSong.title} className="w-full h-full object-cover" />
                  </div>
                </>
              ) : (
                <div className="w-80 h-80 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10 bg-black">
                  {loadingVideo ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : videoId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                      title={`${currentSong.title} - ${currentSong.artist}`}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                      <Music size={48} className="mb-3 opacity-30" />
                      <p className="text-sm">No video available</p>
                      <p className="text-xs mt-1">Switch to Audio mode</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-center w-full max-w-md">
              <p className="text-2xl font-bold truncate">{currentSong.title}</p>
              <p className="text-gray-400 truncate mt-0.5">{currentSong.artist}</p>
              {currentSong.album && <p className="text-xs text-gray-600 truncate mt-0.5">{currentSong.album}</p>}
            </div>

            {/* Like + badge */}
            <div className="flex items-center gap-4">
              <button onClick={onLike} className={`transition-all active:scale-90 ${liked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}>
                <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
              </button>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${currentSong.source === 'jamendo' ? 'bg-brand/20 text-brand' : 'bg-purple-500/20 text-purple-400'}`}>
                {currentSong.source === 'jamendo' ? 'Full Track' : engine === 'youtube' ? 'Full Track' : '30s Preview'}
              </span>
              <AudioBars isPlaying={isPlaying} size="lg" />
            </div>

            {/* Seek */}
            <div className="w-full max-w-sm">
              <input type="range" min={0} max={1} step={0.001} value={progress}
                onChange={e => seek(parseFloat(e.target.value))}
                className="w-full seek-bar seek-bar-lg rounded-full cursor-pointer"
                style={{ '--progress': `${progress * 100}%` }} />
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-500 tabular-nums">{formatTime(currentTime)}</span>
                <span className="text-xs text-gray-500 tabular-nums">{formatTime(duration)}</span>
              </div>
              {error && <p className="text-xs text-orange-400 text-center mt-1">{error}</p>}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-7">
              <button onClick={toggleShuffle} className={`transition-colors hover:scale-110 ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><Shuffle size={20} /></button>
              <button onClick={previous} className="text-gray-300 hover:text-white hover:scale-110 transition-all"><SkipBack size={28} fill="currentColor" /></button>
              <button onClick={togglePlay} disabled={isLoading}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-all shadow-2xl disabled:opacity-50">
                {isLoading ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  : isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
              </button>
              <button onClick={next} className="text-gray-300 hover:text-white hover:scale-110 transition-all"><SkipForward size={28} fill="currentColor" /></button>
              <button onClick={cycleRepeat} className={`transition-colors hover:scale-110 ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><RepeatIcon size={20} /></button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full max-w-xs">
              <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors shrink-0"><VolumeIcon size={18} /></button>
              <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="flex-1 seek-bar rounded-full cursor-pointer"
                style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
            </div>
          </div>

          {/* Right: lyrics/queue panel */}
          {panel && (
            <div className="w-[500px] shrink-0 flex flex-col bg-black/30 rounded-2xl border border-white/10 overflow-hidden my-2">
              <div className="flex items-center border-b border-white/10 shrink-0">
                {['lyrics','queue'].map(t => (
                  <button key={t} onClick={() => setPanel(t)}
                    className={`flex-1 py-4 text-base font-semibold capitalize transition-colors ${panel === t ? 'text-white border-b-2 border-brand' : 'text-gray-500 hover:text-gray-300'}`}>
                    {t === 'lyrics' ? '🎤 Lyrics' : '🎵 Queue'}
                  </button>
                ))}
                <button onClick={() => setPanel(null)} className="px-5 text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                {panel === 'lyrics'
                  ? <LyricsPanel song={currentSong} currentTime={currentTime} expanded />
                  : <QueuePanel queue={queue} queueIndex={queueIndex} onPlay={play} expanded />}
              </div>
            </div>
          )}
        </div>

        {/* Bottom toggles */}
        <div className="flex justify-center gap-4 pb-5 shrink-0">
          <button onClick={() => setPanel(p => p === 'lyrics' ? null : 'lyrics')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${panel === 'lyrics' ? 'bg-brand text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
            <Mic2 size={15} /> Lyrics
          </button>
          <button onClick={() => setPanel(p => p === 'queue' ? null : 'queue')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${panel === 'queue' ? 'bg-brand text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
            <ListMusic size={15} /> Queue
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Player() {
  const { currentSong, queue, queueIndex, isPlaying, progress, currentTime, duration, volume, isMuted, isShuffled, repeatMode, isLoading, error, engine, play, togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat } = usePlayer()
  const { user } = useAuth()
  const { settings } = useAudioSettings()
  const { showShortcuts } = useKeyboardShortcuts()
  const [liked, setLiked] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [showSleepTimer, setShowSleepTimer] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [sleepTimer, setSleepTimer] = useState(null)
  const [sleepTimeLeft, setSleepTimeLeft] = useState(0)
  const sleepTimerRef = useRef(null)

  // Next-up preview when ≤15s remain (increased from 10s for better visibility)
  const nextSong = queue && queue.length > queueIndex + 1 ? queue[queueIndex + 1] : null
  const timeLeft = duration > 0 ? duration - currentTime : 999
  const showNextUp = isPlaying && timeLeft <= 15 && timeLeft > 0 && nextSong && duration > 30 // Show for 15 seconds instead of 10

  useEffect(() => {
    if (user && currentSong) isFavorite(user.uid, currentSong.id).then(setLiked)
  }, [currentSong, user])

  // Sleep timer logic
  useEffect(() => {
    if (sleepTimer && sleepTimeLeft > 0) {
      sleepTimerRef.current = setInterval(() => {
        setSleepTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up - pause music and clear timer
            if (isPlaying) {
              togglePlay()
              toast.success('💤 Sleep timer finished - music paused')
            }
            setSleepTimer(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(sleepTimerRef.current)
    }
    
    return () => clearInterval(sleepTimerRef.current)
  }, [sleepTimer, sleepTimeLeft, isPlaying, togglePlay])

  const startSleepTimer = (minutes) => {
    if (!minutes) {
      cancelSleepTimer()
      return
    }
    const seconds = minutes * 60
    setSleepTimer(minutes)
    setSleepTimeLeft(seconds)
    setShowSleepTimer(false)
    toast.success(`💤 Sleep timer set for ${minutes} minutes`)
  }

  const cancelSleepTimer = () => {
    setSleepTimer(null)
    setSleepTimeLeft(0)
    clearInterval(sleepTimerRef.current)
    toast.success('Sleep timer cancelled')
  }

  const handleLike = async () => {
    if (!user || !currentSong) return
    setLiked(await toggleFavorite(user.uid, currentSong.id))
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  if (!currentSong) {
    return (
      <div className="h-20 bg-surface-2 border-t border-white/5 flex items-center justify-center shrink-0">
        <div className="flex items-center gap-2 text-gray-600"><Music size={18} /><span className="text-sm">Search for a song to start listening</span></div>
      </div>
    )
  }

  return (
    <>
      {expanded && (
        <ExpandedPlayer
          currentSong={currentSong} isPlaying={isPlaying} progress={progress} currentTime={currentTime}
          duration={duration} volume={volume} isMuted={isMuted} isShuffled={isShuffled} repeatMode={repeatMode}
          isLoading={isLoading} error={error} engine={engine} queue={queue} queueIndex={queueIndex}
          liked={liked} onLike={handleLike} onClose={() => setExpanded(false)}
          togglePlay={togglePlay} seek={seek} next={next} previous={previous}
          setVolume={setVolume} toggleMute={toggleMute} toggleShuffle={toggleShuffle} cycleRepeat={cycleRepeat} play={play}
          showParticles={settings?.particles !== false}
          showVinyl={settings?.animatedArt !== false}
        />
      )}

      {!expanded && showLyrics && <LyricsPanel song={currentSong} currentTime={currentTime} onClose={() => setShowLyrics(false)} />}
      {!expanded && showQueue && <QueuePanel queue={queue} queueIndex={queueIndex} onClose={() => setShowQueue(false)} onPlay={play} />}
      {!expanded && showSleepTimer && <SleepTimerPanel onClose={() => setShowSleepTimer(false)} onSetTimer={startSleepTimer} currentTimer={sleepTimer} timeLeft={sleepTimeLeft} />}

      {/* Mini bar - Mobile optimized */}
      <div className="h-20 border-t border-white/5 px-3 lg:px-4 flex items-center gap-2 lg:gap-4 shrink-0 relative z-30 overflow-hidden">
        {/* Dynamic blurred bg */}
        <div className="absolute inset-0 -z-10">
          <img src={currentSong.coverUrl} alt="" className="w-full h-full object-cover scale-110"
            style={{ filter: 'blur(40px) brightness(0.22) saturate(2)' }} />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Album art — click to expand */}
        <div className="flex items-center gap-2 lg:gap-3 w-48 lg:w-64 shrink-0 relative">
          
          {/* Up next notification - positioned above album art */}
          {showNextUp && nextSong && (
            <div className="fixed bottom-24 left-4 z-[999] bg-[#121212]/98 backdrop-blur-md border-2 border-brand/30 rounded-xl p-4 shadow-2xl animate-slide-down animate-up-next-pulse min-w-[300px]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={nextSong.coverUrl || 'https://via.placeholder.com/32'} 
                    alt={nextSong.title}
                    className="w-12 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand rounded-full flex items-center justify-center">
                    <span className="text-xs text-black font-bold">⏭</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-brand rounded-full animate-pulse"></span>
                    Up next
                  </p>
                  <p className="text-sm font-semibold text-white truncate">{nextSong.title}</p>
                  <p className="text-xs text-gray-300 truncate">{nextSong.artist}</p>
                </div>
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className="w-10 h-10 relative">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
                      <circle cx="20" cy="20" r="18" fill="none" stroke="#1DB954" strokeWidth="3"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (timeLeft / 15)}`}
                        style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-brand">{Math.ceil(timeLeft)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => setExpanded(true)} className="relative group shrink-0" title="Open full player">
            <img src={currentSong.coverUrl || 'https://via.placeholder.com/56'} alt={currentSong.title}
              className={`w-12 h-12 lg:w-14 lg:h-14 rounded-lg object-cover transition-all duration-300 group-hover:scale-105 ${isPlaying ? 'ring-2 ring-brand/60' : ''}`} />
            <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={14} className="text-white lg:hidden" />
              <Maximize2 size={16} className="text-white hidden lg:block" />
            </div>
            {isPlaying && <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full border-2 border-black animate-pulse" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs lg:text-sm font-semibold truncate">{currentSong.title}</p>
            <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
            <div className="lg:block">
              {currentSong.source === 'itunes' && <span className="text-xs text-purple-400">{engine === 'youtube' ? 'Full track' : '30s preview'}</span>}
              {currentSong.source === 'jamendo' && <span className="text-xs text-brand">Full track</span>}
            </div>
          </div>
          <button onClick={handleLike} className={`shrink-0 transition-all active:scale-125 ${liked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}>
            <Heart size={14} className="lg:hidden" fill={liked ? 'currentColor' : 'none'} />
            <Heart size={16} className="hidden lg:block" fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Controls + seek */}
        <div className="flex-1 flex flex-col items-center gap-1 lg:gap-1.5 max-w-xl mx-auto">
          <div className="flex items-center gap-3 lg:gap-5">
            <button onClick={toggleShuffle} className={`transition-colors hidden lg:block ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><Shuffle size={16} /></button>
            <button onClick={previous} className="text-gray-300 hover:text-white transition-colors">
              <SkipBack size={18} className="lg:hidden" fill="currentColor" />
              <SkipBack size={20} className="hidden lg:block" fill="currentColor" />
            </button>
            <button onClick={togglePlay} disabled={isLoading}
              className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 shadow-lg">
              {isLoading ? (
                <div className="w-3 h-3 lg:w-4 lg:h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <>
                  <Pause size={16} className="lg:hidden" fill="currentColor" />
                  <Pause size={18} className="hidden lg:block" fill="currentColor" />
                </>
              ) : (
                <>
                  <Play size={16} className="ml-0.5 lg:hidden" fill="currentColor" />
                  <Play size={18} className="ml-0.5 hidden lg:block" fill="currentColor" />
                </>
              )}
            </button>
            <button onClick={next} className="text-gray-300 hover:text-white transition-colors">
              <SkipForward size={18} className="lg:hidden" fill="currentColor" />
              <SkipForward size={20} className="hidden lg:block" fill="currentColor" />
            </button>
            <button onClick={cycleRepeat} className={`transition-colors hidden lg:block ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><RepeatIcon size={16} /></button>
          </div>
          <div className="flex items-center gap-1 lg:gap-2 w-full">
            <span className="text-xs text-gray-500 w-6 lg:w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
            <input type="range" min={0} max={1} step={0.001} value={progress}
              onChange={e => seek(parseFloat(e.target.value))}
              className="flex-1 h-1 seek-bar rounded-full cursor-pointer"
              style={{ '--progress': `${progress * 100}%` }} />
            <span className="text-xs text-gray-500 w-6 lg:w-8 tabular-nums">{formatTime(duration)}</span>
          </div>
          {error && <p className="text-xs text-orange-400">{error}</p>}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 lg:gap-3 w-32 lg:w-52 shrink-0 justify-end">
          <AudioBars isPlaying={isPlaying} />
          <button onClick={() => { setShowLyrics(l => !l); setShowQueue(false); setShowSleepTimer(false) }}
            className={`transition-colors hidden lg:block ${showLyrics ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><Mic2 size={18} /></button>
          <button onClick={() => { setShowQueue(q => !q); setShowLyrics(false); setShowSleepTimer(false) }}
            className={`transition-colors ${showQueue ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
            <ListMusic size={16} className="lg:hidden" />
            <ListMusic size={18} className="hidden lg:block" />
          </button>
          <button onClick={() => { setShowSleepTimer(s => !s); setShowLyrics(false); setShowQueue(false) }}
            className={`relative transition-colors hidden lg:block ${showSleepTimer || sleepTimer ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
            <Timer size={18} />
            {sleepTimer && <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand rounded-full animate-pulse" />}
          </button>
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
            <VolumeIcon size={16} className="lg:hidden" />
            <VolumeIcon size={18} className="hidden lg:block" />
          </button>
          <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-16 lg:w-20 h-1 seek-bar rounded-full cursor-pointer"
            style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
        </div>
      </div>
    </>
  )
}
