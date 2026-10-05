import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { Howl, Howler } from 'howler'
import { useAuth } from './AuthContext'
import { addToRecentlyPlayed } from '../services/userService'
import { searchYouTube, getCachedYouTubeId } from '../services/musicApi'
import { upsertSong, incrementPlayCount } from '../services/songService'
import { useAudioSettings } from './AudioSettingsContext'
import { audioEngine } from '../services/audioEngine'

// Prevent browsers from suspending audio when switching tabs or minimizing
// and configure HTML5 audio elements to allow Web Audio API DSP processing (10-band EQ, 3D Spatial Audio, Bass Boost)
if (typeof window !== 'undefined' && Howler) {
  Howler.autoSuspend = false
  Howler.autoUnlock = true

  if (Howler._obtainHtml5Audio) {
    const origObtain = Howler._obtainHtml5Audio
    Howler._obtainHtml5Audio = function() {
      const audio = origObtain.call(this)
      if (audio) {
        audio.crossOrigin = 'anonymous'
        audio.preload = 'auto'
      }
      return audio
    }
  }
  if (Array.isArray(Howler._html5AudioPool)) {
    Howler._html5AudioPool.forEach(node => {
      if (node) node.crossOrigin = 'anonymous'
    })
  }
}

const PlayerContext = createContext(null)
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY || ''

function getStorageKey(userId) {
  return userId ? `sw_player_state_${userId}` : 'sw_player_state_guest'
}

function saveState(userId, song, queue, index, time) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify({ song, queue, index, time }))
  } catch (_) {}
}

function loadState(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch (_) { return null }
}

export function PlayerProvider({ children }) {
  const { user } = useAuth()
  const { settings, applyAudioChain } = useAudioSettings()
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
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { queueIndexRef.current = queueIndex }, [queueIndex])
  useEffect(() => { repeatRef.current = repeatMode }, [repeatMode])
  useEffect(() => { shuffleRef.current = isShuffled }, [isShuffled])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { mutedRef.current = isMuted }, [isMuted])
  useEffect(() => { engineRef.current = engine }, [engine])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { currentSongRef.current = currentSong }, [currentSong])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  // ── Real-Time Audio Engine Synchronization ────────────────
  useEffect(() => {
    audioEngine.applySettings(settings)
    if (settings?.speed) {
      audioEngine.setPlaybackRate(settings.speed)
    }
  }, [settings])

  useEffect(() => {
    audioEngine.setVolume(isMuted ? 0 : volume / 100, isMuted)
  }, [volume, isMuted])

  // ── Crossfade: Smooth fade-out near track end ──────────────
  useEffect(() => {
    const secs = settings?.crossfade ?? 0
    if (secs <= 0 || !isPlaying) return

    const interval = setInterval(() => {
      const cur = audioEngine.getCurrentTime()
      const dur = audioEngine.getDuration()
      const rem = dur - cur
      if (dur > 10 && rem > 0 && rem <= secs) {
        const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
        const fadeVol = Math.max(0, (rem / secs) * baseVol)
        audioEngine.setVolume(fadeVol, mutedRef.current)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [settings?.crossfade, isPlaying])

  // ── Session persistence timer ──────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (currentSongRef.current) {
        saveState(user?.uid, currentSongRef.current, queueRef.current, queueIndexRef.current, currentTimeRef.current)
      }
    }, 5000)
    return () => clearInterval(t)
  }, [user?.uid])

  // ── YouTube IFrame API (Fallback for restricted content) ───
  const initYTPlayer = useCallback((divId) => {
    const create = () => {
      try {
        ytPlayerRef.current = new window.YT.Player(divId, {
          height: '0', width: '0',
          playerVars: { autoplay: 1, controls: 0, playsinline: 1 },
          events: {
            onReady: () => {
              ytReadyRef.current = true
              ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
              if (settings?.speed && settings.speed !== 1) {
                try { ytPlayerRef.current.setPlaybackRate(settings.speed) } catch(_) {}
              }
              if (pendingYTRef.current) {
                ytPlayerRef.current.loadVideoById(pendingYTRef.current)
                pendingYTRef.current = null
              }
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING) { 
                setIsPlaying(true); setIsLoading(false)
              } else if (e.data === S.PAUSED) {
                if (document.hidden && isPlayingRef.current) {
                  try { ytPlayerRef.current?.playVideo() } catch (_) {}
                  return
                }
                setIsPlaying(false)
              } else if (e.data === S.ENDED) {
                handleEnd()
              } else if (e.data === S.BUFFERING) {
                setIsLoading(true)
              }
            },
            onError: (e) => {
              console.warn('YouTube player error:', e)
              setIsLoading(false)
              setError('Playback error')
            },
          },
        })
      } catch (error) {
        console.error('Failed to create YouTube player:', error)
      }
    }
    
    try {
      if (window.YT && window.YT.Player) { 
        create() 
      } else {
        window.onYouTubeIframeAPIReady = create
        if (!document.getElementById('yt-iframe-api')) {
          const s = document.createElement('script')
          s.id = 'yt-iframe-api'
          s.src = 'https://www.youtube.com/iframe_api'
          document.head.appendChild(s)
        }
      }
    } catch (_) {}
  }, [settings?.speed])

  const loadAndPlayRef = useRef(null)

  // ── Queue End & Autoplay Transition ────────────────────────
  const handleEnd = useCallback(async () => {
    setProgress(1)
    const q = queueRef.current
    const idx = queueIndexRef.current
    const repeat = repeatRef.current
    const shuffle = shuffleRef.current

    if (repeat === 'one') {
      audioEngine.seek(0)
      audioEngine.resume()
      return
    }

    const nextIdx = shuffle ? Math.floor(Math.random() * q.length) : idx + 1
    if (nextIdx < q.length) {
      loadAndPlayRef.current?.(q[nextIdx], q, nextIdx)
    } else if (repeat === 'all' && q.length > 0) {
      loadAndPlayRef.current?.(q[0], q, 0)
    } else if (settings?.autoplay && q.length > 0) {
      // Autoplay: fetch recommended similar song
      try {
        const lastSong = q[q.length - 1]
        console.log('Autoplay: fetching next track similar to', lastSong.title)
        const { recommendationEngine } = await import('../services/recommendationService')
        const recs = await recommendationEngine.getMoodRecommendations('happy', 5)
        if (recs && recs.length > 0) {
          const nextSong = recs.find(s => s.id !== lastSong.id) || recs[0]
          loadAndPlayRef.current?.(nextSong, [...q, nextSong], q.length)
          return
        }
      } catch (err) {
        console.warn('Autoplay error:', err)
      }
      setIsPlaying(false)
    } else {
      setIsPlaying(false)
    }
  }, [settings?.autoplay])

  // ── Universal Audio Engine Event Listeners ─────────────────
  useEffect(() => {
    const unsubTime = audioEngine.on('timeupdate', ({ currentTime, duration, progress }) => {
      setCurrentTime(currentTime)
      if (duration > 0) {
        setDuration(duration)
        setProgress(progress)
      }
    })

    const unsubDur = audioEngine.on('durationchange', dur => {
      if (dur > 0) setDuration(dur)
    })

    const unsubPlay = audioEngine.on('play', () => {
      setIsPlaying(true)
      setIsLoading(false)
    })

    const unsubPause = audioEngine.on('pause', () => {
      setIsPlaying(false)
    })

    const unsubEnd = audioEngine.on('ended', () => {
      handleEnd()
    })

    const unsubLoading = audioEngine.on('loading', loading => {
      setIsLoading(loading)
    })

    const unsubError = audioEngine.on('error', err => {
      console.warn('AudioEngine error received:', err)
    })

    return () => {
      unsubTime()
      unsubDur()
      unsubPlay()
      unsubPause()
      unsubEnd()
      unsubLoading()
      unsubError()
    }
  }, [handleEnd])

  const playWithYouTubeIframe = useCallback((song, videoId, startAt = 0) => {
    console.log('playWithYouTubeIframe fallback called for:', videoId)
    setEngine('youtube')
    audioEngine.stop()
    setProgress(0); setCurrentTime(0); setDuration(0)
    setIsLoading(true); setError(null)

    if (ytReadyRef.current && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
      ytPlayerRef.current.loadVideoById({ videoId, startSeconds: startAt })
    } else {
      pendingYTRef.current = videoId
    }
  }, [])

  // ── Universal Track Player Core (Equalizer 100% Active) ────
  const playTrackAudio = useCallback(async (song, audioUrl, startAt = 0, engineType = 'auto') => {
    console.log(`🎛️ Universal AudioEngine playing [${engineType}]:`, song.title, audioUrl)
    setEngine(engineType)
    setError(null)
    setIsLoading(true)

    try {
      // Ensure all DSP nodes have active settings applied
      audioEngine.applySettings(settings)
      audioEngine.setPlaybackRate(settings?.speed ?? 1.0)
      audioEngine.setVolume(mutedRef.current ? 0 : volumeRef.current / 100, mutedRef.current)

      await audioEngine.play(audioUrl, startAt)
      setIsPlaying(true)
      setIsLoading(false)
    } catch (err) {
      console.warn('Primary stream playback note:', err)
      // Fallback: If YouTube stream fails, try direct audioUrl
      if (song.audioUrl && audioUrl !== song.audioUrl) {
        console.log('Falling back to direct audioUrl...')
        try {
          await audioEngine.play(song.audioUrl, startAt)
          setIsPlaying(true)
          setIsLoading(false)
          return
        } catch (e) {
          console.error('Fallback audioUrl error:', e)
        }
      }

      // Secondary fallback: YouTube IFrame
      const query = `${song.artist} - ${song.title}`
      const vId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)
      if (vId) {
        console.log('Fallback to YouTube IFrame player...')
        playWithYouTubeIframe(song, vId, startAt)
      } else {
        setIsLoading(false)
        setError('Playback error: could not load audio stream')
        setIsPlaying(false)
      }
    }
  }, [settings, playWithYouTubeIframe])

  const playWithYouTube = useCallback(async (song, startAt = 0, preferredQuality = null) => {
    const quality = preferredQuality || settings?.streamQuality || 'auto'
    const query = `${song.artist} - ${song.title}`
    const cachedVideoId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)

    if (cachedVideoId) {
      const streamUrl = `/api/youtube/stream/${cachedVideoId}?quality=${quality}`
      console.log('⚡ Instant YouTube Stream (Equalizer 100% Active):', streamUrl)
      await playTrackAudio(song, streamUrl, startAt, 'youtube')
      return
    }

    // Play preview while discovering full YouTube stream so user hears music with 0ms delay
    if (song.audioUrl) {
      console.log('Playing preview while searching YouTube stream...')
      await playTrackAudio(song, song.audioUrl, startAt, 'youtube')
    } else {
      setIsLoading(true)
    }

    try {
      const videoId = await searchYouTube(`${song.artist} - ${song.title} official audio`, song.id)
      if (videoId) {
        const streamUrl = `/api/youtube/stream/${videoId}?quality=${quality}`
        console.log('⚡ YouTube Stream Discovered (Equalizer 100% Active):', streamUrl)
        const curTime = audioEngine.getCurrentTime() || startAt
        await playTrackAudio(song, streamUrl, curTime, 'youtube')
      }
    } catch (error) {
      console.warn('YouTube search upgrade note:', error)
    }
  }, [settings?.streamQuality, playTrackAudio])

  const loadAndPlay = useCallback((song, songQueue = [], index = 0, startAt = 0) => {
    if (!song || !song.id) {
      setError('Invalid song data')
      return
    }

    setError(null)
    setIsLoading(true)
    setCurrentSong(song)
    setQueue(songQueue)
    setQueueIndex(index)
    saveState(user?.uid, song, songQueue, index, startAt)

    // Save to database (non-blocking)
    upsertSong(song).then(() => incrementPlayCount(song.id)).catch(() => {})
    if (user && !settings?.privateSession) {
      addToRecentlyPlayed(user.uid, song.id).catch(() => {})
    }

    const currentEngine = settings?.audioEngine || 'auto'
    console.log(`🎵 Engine selected: [${currentEngine}] for track:`, song.title)

    if (currentEngine === 'studio') {
      // 🎧 Studio Audio Engine: Pure studio sound with uncompressed EQ & Spatial Audio
      if (song.source === 'jamendo' && song.audioUrl) {
        playTrackAudio(song, song.audioUrl, startAt, 'studio')
      } else {
        playWithYouTube(song, startAt, 'very_high')
      }
    } else if (currentEngine === 'youtube') {
      // 🎬 YouTube Stream Engine: Full track with 10-Band EQ & Spatial Audio
      playWithYouTube(song, startAt, settings?.streamQuality || 'normal')
    } else {
      // ✨ Smart Auto Engine: Chooses best stream with 10-Band EQ & Spatial Audio
      if (song.source === 'jamendo' && song.audioUrl) {
        playTrackAudio(song, song.audioUrl, startAt, 'auto')
      } else {
        playWithYouTube(song, startAt, settings?.streamQuality || 'auto')
      }
    }
  }, [user, settings, playTrackAudio, playWithYouTube])

  const switchEngine = useCallback((targetEngine) => {
    const song = currentSongRef.current
    if (!song) return
    const curTime = audioEngine.getCurrentTime() || currentTimeRef.current

    if (targetEngine === 'studio') {
      if (song.source === 'jamendo' && song.audioUrl) {
        playTrackAudio(song, song.audioUrl, curTime, 'studio')
      } else {
        playWithYouTube(song, curTime, 'very_high')
      }
    } else if (targetEngine === 'youtube') {
      playWithYouTube(song, curTime, settings?.streamQuality || 'normal')
    } else {
      loadAndPlayRef.current?.(song, queueRef.current, queueIndexRef.current, curTime)
    }
  }, [playTrackAudio, playWithYouTube, settings?.streamQuality])

  // keep ref in sync so handleEnd can call it without stale closure
  useEffect(() => { loadAndPlayRef.current = loadAndPlay }, [loadAndPlay])
  // ── Restore last session on mount / user switch ─────────────────────────
  const prevUserRef = useRef(user?.uid)

  useEffect(() => {
    // If user changed (e.g. login, logout, switch account):
    if (prevUserRef.current !== user?.uid) {
      prevUserRef.current = user?.uid
      // Stop current playback
      if (howlRef.current) {
        howlRef.current.stop()
        howlRef.current.unload()
        howlRef.current = null
      }
      if (ytPlayerRef.current?.stopVideo) {
        try { ytPlayerRef.current.stopVideo() } catch (_) {}
      }
      setIsPlaying(false)
      clearInterval(progressInterval.current)

      // Restore the new user's saved state
      const saved = loadState(user?.uid)
      if (saved?.song) {
        setCurrentSong(saved.song)
        setQueue(saved.queue || [saved.song])
        setQueueIndex(saved.index || 0)
        setCurrentTime(saved.time || 0)
        setProgress(saved.time && saved.song.duration ? saved.time / (saved.song.duration / 1000) : 0)
        setDuration(saved.song.duration ? saved.song.duration / 1000 : 0)
      } else {
        setCurrentSong(null)
        setQueue([])
        setQueueIndex(0)
        setCurrentTime(0)
        setProgress(0)
        setDuration(0)
      }
      return
    }

    const saved = loadState(user?.uid)
    if (saved?.song) {
      // Restore state but don't auto-play — just set the song info
      setCurrentSong(saved.song)
      setQueue(saved.queue || [saved.song])
      setQueueIndex(saved.index || 0)
      setCurrentTime(saved.time || 0)
      setProgress(saved.time && saved.song.duration ? saved.time / (saved.song.duration / 1000) : 0)
      setDuration(saved.song.duration ? saved.song.duration / 1000 : 0)
    }
  }, [user?.uid])

  const togglePlay = useCallback(() => {
    if (engineRef.current === 'youtube') {
      const p = ytPlayerRef.current
      if (!p) return null
      const isCurrentlyPlaying = p.getPlayerState ? p.getPlayerState() === 1 : isPlayingRef.current
      if (isCurrentlyPlaying) {
        p.pauseVideo()
        setIsPlaying(false)
        return false
      } else {
        p.playVideo()
        setIsPlaying(true)
        return true
      }
    } else {
      if (audioEngine.isPlaying()) {
        audioEngine.pause()
        setIsPlaying(false)
        return false
      } else {
        const song = currentSongRef.current
        if (!song) return null
        if (!audioEngine.audio?.src || audioEngine.audio.src === '') {
          loadAndPlay(song, queueRef.current, queueIndexRef.current, currentTimeRef.current)
          return true
        }
        audioEngine.resume()
        setIsPlaying(true)
        return true
      }
    }
  }, [loadAndPlay])

  const seek = useCallback(fraction => {
    if (engineRef.current === 'youtube' && ytPlayerRef.current?.getPlayerState) {
      const p = ytPlayerRef.current
      const dur = p.getDuration?.() || duration || 0
      p.seekTo(fraction * dur, true)
      setProgress(fraction); setCurrentTime(fraction * dur)
    } else {
      const dur = audioEngine.getDuration() || duration || 0
      if (dur > 0) {
        const target = fraction * dur
        audioEngine.seek(target)
        setProgress(fraction)
        setCurrentTime(target)
      }
    }
  }, [duration])

  const next = useCallback(() => {
    const q = queueRef.current
    const idx = queueIndexRef.current
    const nextIdx = shuffleRef.current ? Math.floor(Math.random() * q.length) : idx + 1
    if (nextIdx < q.length) loadAndPlay(q[nextIdx], q, nextIdx)
  }, [loadAndPlay])

  const previous = useCallback(() => {
    if (currentTimeRef.current > 3) {
      if (engineRef.current === 'youtube' && ytPlayerRef.current?.getPlayerState) {
        ytPlayerRef.current.seekTo(0, true)
        setProgress(0); setCurrentTime(0)
      } else {
        audioEngine.seek(0)
        setProgress(0); setCurrentTime(0)
      }
      return
    }
    const idx = queueIndexRef.current
    const q = queueRef.current
    if (idx > 0) loadAndPlay(q[idx - 1], q, idx - 1)
  }, [loadAndPlay])

  const setVolume = useCallback(v => {
    setVolumeState(v)
    audioEngine.setVolume(v / 100, false)
    ytPlayerRef.current?.setVolume?.(v)
    if (v > 0) setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const muted = !prev
      audioEngine.setVolume(volumeRef.current / 100, muted)
      muted ? ytPlayerRef.current?.mute?.() : ytPlayerRef.current?.unMute?.()
      return muted
    })
  }, [])

  const reorderQueue = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    setQueue(prevQueue => {
      if (fromIndex >= prevQueue.length || toIndex >= prevQueue.length) return prevQueue
      const updated = [...prevQueue]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)

      setQueueIndex(prevIdx => {
        let newIdx = prevIdx
        if (prevIdx === fromIndex) {
          newIdx = toIndex
        } else if (fromIndex < prevIdx && toIndex >= prevIdx) {
          newIdx = prevIdx - 1
        } else if (fromIndex > prevIdx && toIndex <= prevIdx) {
          newIdx = prevIdx + 1
        }
        queueIndexRef.current = newIdx
        return newIdx
      })

      queueRef.current = updated
      saveState(user?.uid, currentSongRef.current, updated, queueIndexRef.current, currentTimeRef.current)
      return updated
    })
  }, [user?.uid])

  const removeFromQueue = useCallback((index) => {
    setQueue(prevQueue => {
      if (index < 0 || index >= prevQueue.length) return prevQueue
      const updated = prevQueue.filter((_, i) => i !== index)
      setQueueIndex(prevIdx => {
        let newIdx = prevIdx
        if (index < prevIdx) {
          newIdx = prevIdx - 1
        } else if (index === prevIdx && newIdx >= updated.length) {
          newIdx = Math.max(0, updated.length - 1)
        }
        queueIndexRef.current = newIdx
        return newIdx
      })
      queueRef.current = updated
      saveState(user?.uid, currentSongRef.current, updated, queueIndexRef.current, currentTimeRef.current)
      return updated
    })
  }, [user?.uid])

  // Force apply all audio settings - useful for debugging
  const forceApplySettings = useCallback(() => {
    console.log('🔧 FORCE APPLYING ALL AUDIO SETTINGS')
    audioEngine.applySettings(settings)
    if (settings?.speed) {
      audioEngine.setPlaybackRate(settings.speed)
    }
    audioEngine.setVolume(mutedRef.current ? 0 : volumeRef.current / 100, mutedRef.current)
  }, [settings])

  // ── Background Audio Persistence (Keep playing when minimized or switching tabs) ──
  useEffect(() => {
    const keepAudioAlive = () => {
      if (isPlayingRef.current) {
        // 1. Resume Web Audio context if browser suspended it on tab blur
        if (audioEngine.ctx && audioEngine.ctx.state === 'suspended') {
          audioEngine.ctx.resume().catch(() => {})
        }
        // 2. Keep audioEngine playing if it got interrupted
        if (audioEngine.audio && audioEngine.audio.paused && isPlayingRef.current) {
          try { audioEngine.audio.play() } catch (_) {}
        }
        // 3. Keep YouTube playing if it got paused while tab is backgrounded
        if (engineRef.current === 'youtube' && ytPlayerRef.current?.getPlayerState) {
          const state = ytPlayerRef.current.getPlayerState()
          if (state === 2) { // 2 = PAUSED
            try { ytPlayerRef.current.playVideo() } catch (_) {}
          }
        }
      }
    }

    document.addEventListener('visibilitychange', keepAudioAlive)
    window.addEventListener('blur', keepAudioAlive)
    window.addEventListener('focus', keepAudioAlive)
    window.addEventListener('pagehide', keepAudioAlive)

    return () => {
      document.removeEventListener('visibilitychange', keepAudioAlive)
      document.removeEventListener('blur', keepAudioAlive)
      document.removeEventListener('focus', keepAudioAlive)
      document.removeEventListener('pagehide', keepAudioAlive)
    }
  }, [])

  // ── MediaSession API (OS Media Controls & Background Throttling Prevention) ──
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

    if (currentSong) {
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: currentSong.title || 'SoundWave Track',
          artist: currentSong.artist || 'Unknown Artist',
          album: currentSong.album || 'SoundWave',
          artwork: currentSong.coverUrl ? [
            { src: currentSong.coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: currentSong.coverUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: currentSong.coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' },
          ] : []
        })
      } catch (err) {
        console.warn('Failed to set mediaSession metadata:', err)
      }
    }

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    } catch (_) {}

    const handlers = [
      ['play', () => { if (!isPlayingRef.current) togglePlay() }],
      ['pause', () => { if (isPlayingRef.current) togglePlay() }],
      ['previoustrack', () => previous()],
      ['nexttrack', () => next()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined && duration > 0) {
          seek(details.seekTime / duration)
        }
      }]
    ]

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch (_) {}
    }
  }, [currentSong, isPlaying, duration, togglePlay, previous, next, seek])

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
      switchEngine,
      forceApplySettings, // Add this for debugging
      reorderQueue,
      removeFromQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
