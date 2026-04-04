import { usePlayer } from '../context/PlayerContext'
import { useAudioSettings } from '../context/AudioSettingsContext'
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1, Heart, ListMusic, X, Music, Mic2, ChevronDown, Maximize2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite, isFavorite } from '../services/userService'

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
    <div className={expanded ? 'flex flex-col h-full overflow-hidden' : 'fixed right-4 bottom-24 w-96 h-[70vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40'}>
      {!expanded && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{song?.title}</p>
            <p className="text-xs text-gray-400 truncate">{song?.artist}</p>
            {synced && <span className="text-xs text-brand block mt-0.5">● Live synced</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-3 shrink-0"><X size={18} /></button>
        </div>
      )}
      {expanded && synced && <p className="text-xs text-brand mb-3 font-medium shrink-0">● Live synced</p>}
      <div className="overflow-y-auto flex-1 px-4 py-3">
        {loading ? <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
          : err ? <div className="flex flex-col items-center justify-center h-full text-gray-600"><Mic2 size={36} className="mb-2 opacity-30" /><p className="text-sm">Lyrics not found</p></div>
          : synced ? (
            <div className="space-y-4 py-6">
              {lines.map((line, i) => (
                <p key={i} ref={i === activeIdx ? activeRef : null}
                  className={`font-bold leading-snug transition-all duration-300 select-none ${expanded ? 'text-xl' : 'text-lg'} ${
                    i === activeIdx ? 'text-white scale-105 origin-left' : i < activeIdx ? 'text-gray-600' : 'text-gray-500'
                  }`}>{line.text || '♪'}</p>
              ))}
            </div>
          ) : <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-7">{plain}</pre>
        }
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

function ExpandedPlayer({ currentSong, isPlaying, progress, currentTime, duration, volume, isMuted, isShuffled, repeatMode, isLoading, error, engine, queue, queueIndex, liked, onLike, onClose, togglePlay, seek, next, previous, setVolume, toggleMute, toggleShuffle, cycleRepeat, play }) {
  const [panel, setPanel] = useState(null)
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  return (
    <div className="fixed inset-0 z-[200] slide-up flex flex-col overflow-hidden">
      {/* Blurred bg */}
      <div className="absolute inset-0">
        <img src={currentSong.coverUrl || ''} alt="" className="w-full h-full object-cover scale-110"
          style={{ filter: 'blur(60px) brightness(0.3) saturate(2)' }} />
        <div className="absolute inset-0 bg-black/55" />
      </div>
      {isPlaying && settings?.particles !== false && <Particles />}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 shrink-0">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <ChevronDown size={22} />
          </button>
          <p className="text-xs text-gray-400 uppercase tracking-widest">Now Playing</p>
          <div className="w-10" />
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden px-6 pb-4 gap-8">

          {/* Left: album + controls */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 gap-5">
            {/* Vinyl disc */}
            <div className="relative shrink-0">
              <div className="absolute -inset-4 rounded-full opacity-40 blur-2xl" style={{ background: '#1DB954' }} />
              <div className={`relative w-60 h-60 rounded-full overflow-hidden shadow-2xl border-4 border-white/10 ${settings?.animatedArt !== false && isPlaying ? 'vinyl-spin' : ''}`}>
                <img src={currentSong.coverUrl || 'https://via.placeholder.com/240'} alt={currentSong.title} className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-[#111] border-2 border-white/20 shadow-inner" />
              </div>
            </div>

            {/* Info */}
            <div className="text-center w-full max-w-xs">
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
            <div className="w-96 shrink-0 flex flex-col bg-black/30 rounded-2xl border border-white/10 overflow-hidden my-2">
              <div className="flex items-center border-b border-white/10 shrink-0">
                {['lyrics','queue'].map(t => (
                  <button key={t} onClick={() => setPanel(t)}
                    className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${panel === t ? 'text-white border-b-2 border-brand' : 'text-gray-500 hover:text-gray-300'}`}>
                    {t === 'lyrics' ? '🎤 Lyrics' : '🎵 Queue'}
                  </button>
                ))}
                <button onClick={() => setPanel(null)} className="px-4 text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-hidden p-3">
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
  const [liked, setLiked] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (user && currentSong) isFavorite(user.uid, currentSong.id).then(setLiked)
  }, [currentSong, user])

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
        />
      )}

      {!expanded && showLyrics && <LyricsPanel song={currentSong} currentTime={currentTime} onClose={() => setShowLyrics(false)} />}
      {!expanded && showQueue && <QueuePanel queue={queue} queueIndex={queueIndex} onClose={() => setShowQueue(false)} onPlay={play} />}

      {/* Mini bar */}
      <div className="h-20 border-t border-white/5 px-4 flex items-center gap-4 shrink-0 relative z-30 overflow-hidden">
        {/* Dynamic blurred bg */}
        <div className="absolute inset-0 -z-10">
          <img src={currentSong.coverUrl} alt="" className="w-full h-full object-cover scale-110"
            style={{ filter: 'blur(40px) brightness(0.22) saturate(2)' }} />
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Album art — click to expand */}
        <div className="flex items-center gap-3 w-64 shrink-0">
          <button onClick={() => setExpanded(true)} className="relative group shrink-0" title="Open full player">
            <img src={currentSong.coverUrl || 'https://via.placeholder.com/56'} alt={currentSong.title}
              className={`w-14 h-14 rounded-lg object-cover transition-all duration-300 group-hover:scale-105 ${isPlaying ? 'ring-2 ring-brand/60' : ''}`} />
            <div className="absolute inset-0 rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={16} className="text-white" />
            </div>
            {isPlaying && <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand rounded-full border-2 border-black animate-pulse" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{currentSong.title}</p>
            <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
            {currentSong.source === 'itunes' && <span className="text-xs text-purple-400">{engine === 'youtube' ? 'Full track' : '30s preview'}</span>}
            {currentSong.source === 'jamendo' && <span className="text-xs text-brand">Full track</span>}
          </div>
          <button onClick={handleLike} className={`shrink-0 transition-all active:scale-125 ${liked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}>
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Controls + seek */}
        <div className="flex-1 flex flex-col items-center gap-1.5 max-w-xl mx-auto">
          <div className="flex items-center gap-5">
            <button onClick={toggleShuffle} className={`transition-colors ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><Shuffle size={16} /></button>
            <button onClick={previous} className="text-gray-300 hover:text-white transition-colors"><SkipBack size={20} fill="currentColor" /></button>
            <button onClick={togglePlay} disabled={isLoading}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 shadow-lg">
              {isLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={next} className="text-gray-300 hover:text-white transition-colors"><SkipForward size={20} fill="currentColor" /></button>
            <button onClick={cycleRepeat} className={`transition-colors ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><RepeatIcon size={16} /></button>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
            <input type="range" min={0} max={1} step={0.001} value={progress}
              onChange={e => seek(parseFloat(e.target.value))}
              className="flex-1 h-1 seek-bar rounded-full cursor-pointer"
              style={{ '--progress': `${progress * 100}%` }} />
            <span className="text-xs text-gray-500 w-8 tabular-nums">{formatTime(duration)}</span>
          </div>
          {error && <p className="text-xs text-orange-400">{error}</p>}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 w-52 shrink-0 justify-end">
          <AudioBars isPlaying={isPlaying} />
          <button onClick={() => { setShowLyrics(l => !l); setShowQueue(false) }}
            className={`transition-colors ${showLyrics ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><Mic2 size={18} /></button>
          <button onClick={() => { setShowQueue(q => !q); setShowLyrics(false) }}
            className={`transition-colors ${showQueue ? 'text-brand' : 'text-gray-400 hover:text-white'}`}><ListMusic size={18} /></button>
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors"><VolumeIcon size={18} /></button>
          <input type="range" min={0} max={100} step={1} value={isMuted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 seek-bar rounded-full cursor-pointer"
            style={{ '--progress': `${isMuted ? 0 : volume}%` }} />
        </div>
      </div>
    </>
  )
}
