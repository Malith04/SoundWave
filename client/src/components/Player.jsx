import { usePlayer } from '../context/PlayerContext'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, ListMusic, X, Music, Mic2
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { toggleFavorite, isFavorite } from '../services/userService'

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Parse LRC format into [{time, text}] ─────────────────────
function parseLRC(lrc) {
  if (!lrc) return []
  return lrc.split('\n')
    .map(line => {
      const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/)
      if (!m) return null
      return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() }
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
}

// ── Lyrics Panel ──────────────────────────────────────────────
function LyricsPanel({ song, currentTime, onClose }) {
  const [lines, setLines] = useState([])       // synced LRC lines
  const [plainLyrics, setPlainLyrics] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [synced, setSynced] = useState(false)
  const activeRef = useRef(null)

  useEffect(() => {
    if (!song) return
    setLoading(true); setError(false); setLines([]); setPlainLyrics('')

    // Try lrclib first (synced LRC)
    fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(song.title)}&artist_name=${encodeURIComponent(song.artist)}`)
      .then(r => r.json())
      .then(results => {
        const hit = results?.[0]
        if (hit?.syncedLyrics) {
          setLines(parseLRC(hit.syncedLyrics))
          setSynced(true)
        } else if (hit?.plainLyrics) {
          setPlainLyrics(hit.plainLyrics)
          setSynced(false)
        } else {
          // Fallback to lyrics.ovh
          return fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(song.artist)}/${encodeURIComponent(song.title)}`)
            .then(r => r.json())
            .then(d => {
              if (d.lyrics) { setPlainLyrics(d.lyrics); setSynced(false) }
              else setError(true)
            })
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [song?.id])

  // Find active line index
  const activeIdx = synced
    ? lines.reduce((acc, line, i) => line.time <= currentTime ? i : acc, -1)
    : -1

  // Auto-scroll active line into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeIdx])

  return (
    <div className="fixed right-4 bottom-24 w-96 h-[70vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <div className="min-w-0">
          <p className="font-bold text-sm truncate">{song?.title}</p>
          <p className="text-xs text-gray-400 truncate">{song?.artist}</p>
          {synced && <span className="text-xs text-brand mt-0.5 block">● Live synced</span>}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white ml-3 shrink-0 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Mic2 size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Lyrics not found</p>
          </div>
        ) : synced ? (
          <div className="space-y-4 py-8">
            {lines.map((line, i) => {
              const isActive = i === activeIdx
              const isPast = i < activeIdx
              return (
                <p
                  key={i}
                  ref={isActive ? activeRef : null}
                  className={`text-lg font-semibold leading-snug transition-all duration-300 ${
                    isActive
                      ? 'text-white scale-105 origin-left'
                      : isPast
                        ? 'text-gray-600'
                        : 'text-gray-500'
                  }`}
                >
                  {line.text || '♪'}
                </p>
              )
            })}
          </div>
        ) : (
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-7">{plainLyrics}</pre>
        )}
      </div>
    </div>
  )
}

// ── Queue Panel ───────────────────────────────────────────────
function QueuePanel({ queue, currentSong, queueIndex, onClose, onPlay }) {
  const activeRef = useRef(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [queueIndex])

  return (
    <div className="fixed right-4 bottom-24 w-96 h-[70vh] bg-[#121212] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
        <div>
          <h3 className="font-bold text-sm">Queue</h3>
          <p className="text-xs text-gray-400">{queue.length} songs</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 py-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <ListMusic size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Queue is empty</p>
          </div>
        ) : (
          queue.map((song, i) => (
            <div
              key={`${song.id}-${i}`}
              ref={i === queueIndex ? activeRef : null}
              onClick={() => onPlay(song, queue, i)}
              className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                i === queueIndex ? 'bg-brand/10' : 'hover:bg-white/5'
              }`}
            >
              <img
                src={song.coverUrl || 'https://via.placeholder.com/40'}
                alt=""
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${i === queueIndex ? 'text-brand' : ''}`}>
                  {song.title}
                </p>
                <p className="text-xs text-gray-500 truncate">{song.artist}</p>
              </div>
              {i === queueIndex && (
                <div className="flex gap-0.5 items-end h-4 shrink-0">
                  {[1, 2, 3].map(b => (
                    <div key={b} className="w-1 bg-brand rounded-full animate-pulse" style={{ height: `${b * 4}px` }} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Main Player ───────────────────────────────────────────────
export default function Player() {
  const {
    currentSong, queue, queueIndex, isPlaying, progress,
    currentTime, duration, volume, isMuted, isShuffled,
    repeatMode, isLoading, error, engine,
    play, togglePlay, seek, next, previous,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
  } = usePlayer()

  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)

  useEffect(() => {
    if (user && currentSong) isFavorite(user.uid, currentSong.id).then(setLiked)
  }, [currentSong, user])

  const handleLike = async () => {
    if (!user || !currentSong) return
    const result = await toggleFavorite(user.uid, currentSong.id)
    setLiked(result)
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  if (!currentSong) {
    return (
      <div className="h-20 bg-surface-2 border-t border-white/5 flex items-center justify-center shrink-0">
        <div className="flex items-center gap-2 text-gray-600">
          <Music size={18} />
          <span className="text-sm">Search for a song to start listening</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Floating panels — outside player bar so they don't clip */}
      {showLyrics && (
        <LyricsPanel
          song={currentSong}
          currentTime={currentTime}
          onClose={() => setShowLyrics(false)}
        />
      )}
      {showQueue && (
        <QueuePanel
          queue={queue}
          currentSong={currentSong}
          queueIndex={queueIndex}
          onClose={() => setShowQueue(false)}
          onPlay={play}
        />
      )}

      <div className="h-20 bg-surface-2 border-t border-white/5 px-4 flex items-center gap-4 shrink-0 relative z-30">

        {/* Song info */}
        <div className="flex items-center gap-3 w-64 shrink-0">
          <img
            src={currentSong.coverUrl || 'https://via.placeholder.com/56'}
            alt={currentSong.title}
            className="w-14 h-14 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{currentSong.title}</p>
            <p className="text-xs text-gray-400 truncate">{currentSong.artist}</p>
            {currentSong.source === 'itunes' && (
              <span className="text-xs text-purple-400">{engine === 'youtube' ? 'Full track' : '30s preview'}</span>
            )}
            {currentSong.source === 'jamendo' && (
              <span className="text-xs text-brand">Full track</span>
            )}
          </div>
          <button
            onClick={handleLike}
            className={`shrink-0 transition-colors ${liked ? 'text-brand' : 'text-gray-500 hover:text-white'}`}
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Controls + seek */}
        <div className="flex-1 flex flex-col items-center gap-1.5 max-w-xl mx-auto">
          <div className="flex items-center gap-5">
            <button onClick={toggleShuffle} className={`transition-colors ${isShuffled ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
              <Shuffle size={16} />
            </button>
            <button onClick={previous} className="text-gray-300 hover:text-white transition-colors">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              onClick={togglePlay}
              disabled={isLoading}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform disabled:opacity-50"
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                : isPlaying
                  ? <Pause size={18} fill="currentColor" />
                  : <Play size={18} fill="currentColor" className="ml-0.5" />
              }
            </button>
            <button onClick={next} className="text-gray-300 hover:text-white transition-colors">
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button onClick={cycleRepeat} className={`transition-colors ${repeatMode !== 'none' ? 'text-brand' : 'text-gray-400 hover:text-white'}`}>
              <RepeatIcon size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-gray-500 w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
            <input
              type="range" min={0} max={1} step={0.001}
              value={progress}
              onChange={e => seek(parseFloat(e.target.value))}
              className="flex-1 h-1 seek-bar rounded-full cursor-pointer"
              style={{ '--progress': `${progress * 100}%` }}
            />
            <span className="text-xs text-gray-500 w-8 tabular-nums">{formatTime(duration)}</span>
          </div>
          {error && <p className="text-xs text-orange-400">{error}</p>}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 w-52 shrink-0 justify-end">
          <button
            onClick={() => { setShowLyrics(l => !l); setShowQueue(false) }}
            className={`transition-colors ${showLyrics ? 'text-brand' : 'text-gray-400 hover:text-white'}`}
            title="Lyrics"
          >
            <Mic2 size={18} />
          </button>

          <button
            onClick={() => { setShowQueue(q => !q); setShowLyrics(false) }}
            className={`transition-colors ${showQueue ? 'text-brand' : 'text-gray-400 hover:text-white'}`}
            title="Queue"
          >
            <ListMusic size={18} />
          </button>

          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition-colors">
            <VolumeIcon size={18} />
          </button>
          <input
            type="range" min={0} max={100} step={1}
            value={isMuted ? 0 : volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 seek-bar rounded-full cursor-pointer"
            style={{ '--progress': `${isMuted ? 0 : volume}%` }}
          />
        </div>
      </div>
    </>
  )
}
