import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { Howl } from 'howler'
import { useAuth } from './AuthContext'
import { addToRecentlyPlayed } from '../services/userService'
import { searchYouTube } from '../services/musicApi'
import { upsertSong, incrementPlayCount } from '../services/songService'

const PlayerContext = createContext(null)

const STORAGE_KEY = 'sw_player_state'

function saveState(song, queue, index, time) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ song, queue, index, time }))
  } catch (_) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_) { return null }
}

export function PlayerProvider({ children }) {
  const { user } = useAuth()
  const howlRef = useRef(null)
  const progressInterval = useRef(null)
  const ytPlayerRef = useRef(null)
  const ytReadyRef = useRef(false)
  const pendingYTRef = useRef(null)
  const wasPlayingRef = useRef(false)

  const [currentSong, setCurrentSong] = useState(null)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState('none')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [engine, setEngine] = useState('howler')

  const queueRef = useRef(queue)
  const queueIndexRef = useRef(queueIndex)
  const repeatRef = useRef(repeatMode)
  const shuffleRef = useRef(isShuffled)
  const volumeRef = useRef(volume)
  const mutedRef = useRef(isMuted)
  const engineRef = useRef(engine)
  const currentTimeRef = useRef(currentTime)
  const currentSongRef = useRef(currentSong)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { queueIndexRef.current = queueIndex }, [queueIndex])
  useEffect(() => { repeatRef.current = repeatMode }, [repeatMode])
  useEffect(() => { shuffleRef.current = isShuffled }, [isShuffled])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { mutedRef.current = isMuted }, [isMuted])
  useEffect(() => { engineRef.current = engine }, [engine])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { currentSongRef.current = currentSong }, [currentSong])

  // ── Persist state every 5s ────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (currentSongRef.current) {
        saveState(currentSongRef.current, queueRef.current, queueIndexRef.current, currentTimeRef.current)
      }
    }, 5000)
    return () => clearInterval(t)
  }, [])



  useEffect(() => () => {
    howlRef.current?.unload()
    clearInterval(progressInterval.current)
  }, [])

  // ── YouTube IFrame API ────────────────────────────────────
  const initYTPlayer = useCallback((divId) => {
    const create = () => {
      ytPlayerRef.current = new window.YT.Player(divId, {
        height: '0', width: '0',
        playerVars: { autoplay: 1, controls: 0, playsinline: 1 },
        events: {
          onReady: () => {
            ytReadyRef.current = true
            ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
            if (pendingYTRef.current) {
              ytPlayerRef.current.loadVideoById(pendingYTRef.current)
              pendingYTRef.current = null
            }
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState
            if (e.data === S.PLAYING) { setIsPlaying(true); setIsLoading(false); startYTProgress() }
            else if (e.data === S.PAUSED) { setIsPlaying(false); clearInterval(progressInterval.current) }
            else if (e.data === S.ENDED) { clearInterval(progressInterval.current); handleEnd() }
            else if (e.data === S.BUFFERING) { setIsLoading(true) }
          },
          onError: () => {
            setIsLoading(false)
            setError('YouTube failed — playing 30s preview')
            const song = queueRef.current[queueIndexRef.current]
            if (song?.audioUrl) playWithHowler(song, song.audioUrl)
          },
        },
      })
    }
    if (window.YT && window.YT.Player) { create() }
    else {
      window.onYouTubeIframeAPIReady = create
      if (!document.getElementById('yt-iframe-api')) {
        const s = document.createElement('script')
        s.id = 'yt-iframe-api'
        s.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(s)
      }
    }
  }, [])

  const startYTProgress = useCallback(() => {
    clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      const p = ytPlayerRef.current
      if (!p || typeof p.getCurrentTime !== 'function') return
      try {
        const cur = p.getCurrentTime() || 0
        const dur = p.getDuration() || 1
        setCurrentTime(cur); setDuration(dur); setProgress(cur / dur)
      } catch (_) {}
    }, 500)
  }, [])

  const startProgressTracking = useCallback(() => {
    clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      const h = howlRef.current
      if (!h || !h.playing()) return
      const s = h.seek() || 0
      const d = h.duration() || 1
      setCurrentTime(s); setDuration(d); setProgress(s / d)
    }, 500)
  }, [])

  const handleEnd = useCallback(() => {
    clearInterval(progressInterval.current)
    setProgress(1)
    const q = queueRef.current
    const idx = queueIndexRef.current
    const repeat = repeatRef.current
    const shuffle = shuffleRef.current
    if (repeat === 'one') {
      if (engineRef.current === 'youtube') { ytPlayerRef.current?.seekTo(0); ytPlayerRef.current?.playVideo() }
      else { howlRef.current?.seek(0); howlRef.current?.play() }
      return
    }
    const nextIdx = shuffle ? Math.floor(Math.random() * q.length) : idx + 1
    if (nextIdx < q.length) loadAndPlay(q[nextIdx], q, nextIdx)
    else if (repeat === 'all' && q.length > 0) loadAndPlay(q[0], q, 0)
    else setIsPlaying(false)
  }, [])

  const playWithHowler = useCallback((song, audioUrl, startAt = 0) => {
    howlRef.current?.unload()
    clearInterval(progressInterval.current)
    ytPlayerRef.current?.stopVideo?.()
    setEngine('howler')
    setProgress(0); setCurrentTime(0); setDuration(0)

    const howl = new Howl({
      src: [audioUrl],
      html5: true,
      volume: mutedRef.current ? 0 : volumeRef.current / 100,
      format: ['mp3', 'ogg', 'aac', 'm4a'],
      onplay: () => {
        if (startAt > 0) { howl.seek(startAt) }
        setIsPlaying(true); setIsLoading(false); startProgressTracking()
      },
      onpause: () => { setIsPlaying(false); clearInterval(progressInterval.current) },
      onstop: () => { setIsPlaying(false); clearInterval(progressInterval.current) },
      onend: handleEnd,
      onloaderror: () => { setIsLoading(false); setError('Could not load audio.'); setIsPlaying(false) },
      onplayerror: () => { setIsLoading(false); setError('Playback error.'); setIsPlaying(false) },
    })
    howlRef.current = howl
    howl.play()
  }, [startProgressTracking, handleEnd])

  const playWithYouTube = useCallback(async (song, startAt = 0) => {
    howlRef.current?.unload()
    clearInterval(progressInterval.current)
    setEngine('youtube')
    setProgress(0); setCurrentTime(0); setDuration(0)
    setIsLoading(true); setError(null)

    const videoId = await searchYouTube(`${song.title} ${song.artist}`)
    if (!videoId) {
      setError('No YouTube key — playing 30s preview')
      if (song.audioUrl) playWithHowler(song, song.audioUrl, startAt)
      else { setIsLoading(false); setError('No audio available') }
      return
    }
    if (ytReadyRef.current && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
      ytPlayerRef.current.loadVideoById({ videoId, startSeconds: startAt })
    } else {
      pendingYTRef.current = videoId
    }
  }, [playWithHowler])

  const loadAndPlay = useCallback((song, songQueue = [], index = 0, startAt = 0) => {
    setError(null); setIsLoading(true)
    setCurrentSong(song); setQueue(songQueue); setQueueIndex(index)
    upsertSong(song).then(() => incrementPlayCount(song.id)).catch(() => {})
    if (user) addToRecentlyPlayed(user.uid, song.id).catch(() => {})

    if (song.source === 'jamendo' && song.audioUrl) playWithHowler(song, song.audioUrl, startAt)
    else if (song.source === 'itunes') playWithYouTube(song, startAt)
    else if (song.audioUrl) playWithHowler(song, song.audioUrl, startAt)
    else { setIsLoading(false); setError('No audio available') }
  }, [user, playWithHowler, playWithYouTube])

  // ── Restore last session on mount ─────────────────────────
  useEffect(() => {
    const saved = loadState()
    if (saved?.song) {
      // Restore state but don't auto-play — just set the song info
      setCurrentSong(saved.song)
      setQueue(saved.queue || [saved.song])
      setQueueIndex(saved.index || 0)
      setCurrentTime(saved.time || 0)
      setProgress(saved.time && saved.song.duration ? saved.time / (saved.song.duration / 1000) : 0)
      setDuration(saved.song.duration ? saved.song.duration / 1000 : 0)
    }
  }, [])

  const togglePlay = useCallback(() => {
    if (engine === 'youtube') {
      const p = ytPlayerRef.current
      if (!p) return
      p.getPlayerState?.() === 1 ? p.pauseVideo() : p.playVideo()
    } else {
      const h = howlRef.current
      if (!h) {
        // Howl not loaded yet — reload from saved position
        const song = currentSongRef.current
        if (song) loadAndPlay(song, queueRef.current, queueIndexRef.current, currentTimeRef.current)
        return
      }
      h.playing() ? h.pause() : h.play()
    }
  }, [engine, loadAndPlay])

  const seek = useCallback(fraction => {
    if (engine === 'youtube') {
      const p = ytPlayerRef.current
      if (!p) return
      const dur = p.getDuration?.() || 0
      p.seekTo(fraction * dur, true)
      setProgress(fraction); setCurrentTime(fraction * dur)
    } else {
      const h = howlRef.current
      if (!h) return
      const dur = h.duration()
      if (!dur) return
      h.seek(fraction * dur)
      setProgress(fraction); setCurrentTime(fraction * dur)
    }
  }, [engine])

  const next = useCallback(() => {
    const q = queueRef.current
    const idx = queueIndexRef.current
    const nextIdx = shuffleRef.current ? Math.floor(Math.random() * q.length) : idx + 1
    if (nextIdx < q.length) loadAndPlay(q[nextIdx], q, nextIdx)
  }, [loadAndPlay])

  const previous = useCallback(() => {
    if (currentTimeRef.current > 3) {
      if (engine === 'youtube') { ytPlayerRef.current?.seekTo(0, true); setProgress(0); setCurrentTime(0) }
      else { howlRef.current?.seek(0); setProgress(0); setCurrentTime(0) }
      return
    }
    const idx = queueIndexRef.current
    const q = queueRef.current
    if (idx > 0) loadAndPlay(q[idx - 1], q, idx - 1)
  }, [engine, loadAndPlay])

  const setVolume = useCallback(v => {
    setVolumeState(v)
    howlRef.current?.volume(v / 100)
    ytPlayerRef.current?.setVolume?.(v)
    if (v > 0) setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const muted = !prev
      howlRef.current?.volume(muted ? 0 : volumeRef.current / 100)
      muted ? ytPlayerRef.current?.mute?.() : ytPlayerRef.current?.unMute?.()
      return muted
    })
  }, [])

  return (
    <PlayerContext.Provider value={{
      currentSong, queue, queueIndex, isPlaying, progress,
      currentTime, duration, volume, isMuted, isShuffled,
      repeatMode, isLoading, error, engine,
      play: loadAndPlay, togglePlay, seek, next, previous,
      setVolume, toggleMute,
      toggleShuffle: () => setIsShuffled(s => !s),
      cycleRepeat: () => setRepeatMode(m => m === 'none' ? 'all' : m === 'all' ? 'one' : 'none'),
      initYTPlayer,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
