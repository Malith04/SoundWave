import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { Howl, Howler } from 'howler'
import { useAuth } from './AuthContext'
import { addToRecentlyPlayed } from '../services/userService'
import { searchYouTube, getCachedYouTubeId, searchiTunes } from '../services/musicApi'
import { upsertSong, incrementPlayCount } from '../services/songService'
import { useAudioSettings } from './AudioSettingsContext'

// Prevent browsers from suspending audio when switching tabs or minimizing
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
  const loadAndPlayRef = useRef(null)
  const handleEndRef = useRef(null)

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
  const [engine, setEngine] = useState('studio')

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
  const settingsRef = useRef(settings)

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
  useEffect(() => { settingsRef.current = settings }, [settings])

  // ── Sync audio settings in real-time ───────────────────────
  useEffect(() => {
    applyAudioChain(settings)
    if (howlRef.current && settings?.speed) {
      try { howlRef.current.rate(settings.speed) } catch (_) {}
    }
  }, [settings, applyAudioChain])

  // ── Sync volume in real-time ───────────────────────────────
  useEffect(() => {
    const vol = isMuted ? 0 : volume / 100
    Howler.volume(vol)
    if (howlRef.current) {
      howlRef.current.volume(vol)
    }
    Howler.mute(isMuted)
  }, [volume, isMuted])

  // ── Progress tracking ──────────────────────────────────────
  const startProgressTracking = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      const h = howlRef.current
      if (!h || !h.playing()) return
      const s = h.seek() || 0
      const d = h.duration() || 0
      setCurrentTime(s)
      if (d > 0) {
        setDuration(d)
        setProgress(s / d)
      }
    }, 250)
  }, [])

  // ── Session persistence timer ──────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      if (currentSongRef.current) {
        saveState(user?.uid, currentSongRef.current, queueRef.current, queueIndexRef.current, currentTimeRef.current)
      }
    }, 5000)
    return () => clearInterval(t)
  }, [user?.uid])

  // ── Crossfade: Smooth fade-out near track end ──────────────
  useEffect(() => {
    const secs = settings?.crossfade ?? 0
    if (secs <= 0 || !isPlaying) return

    const interval = setInterval(() => {
      const h = howlRef.current
      if (!h || !h.playing()) return
      const cur = h.seek() || 0
      const dur = h.duration() || 0
      const rem = dur - cur
      if (dur > 10 && rem > 0 && rem <= secs) {
        const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
        const fadeVol = Math.max(0, (rem / secs) * baseVol)
        h.volume(fadeVol)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [settings?.crossfade, isPlaying])

  // ── Queue End & Autoplay Transition ────────────────────────
  const handleEnd = useCallback(async () => {
    setProgress(1)
    const q = queueRef.current
    const idx = queueIndexRef.current
    const repeat = repeatRef.current
    const shuffle = shuffleRef.current

    if (repeat === 'one') {
      if (howlRef.current) {
        howlRef.current.seek(0)
        howlRef.current.play()
      }
      return
    }

    let nextIdx = idx + 1
    if (shuffle) {
      if (settings?.smartShuffle && q.length > 2) {
        const unplayed = q.map((_, i) => i).filter(i => i !== idx)
        const current = q[idx]
        const matched = unplayed.filter(i => q[i].artist === current?.artist || q[i].genre === current?.genre)
        nextIdx = matched.length > 0
          ? matched[Math.floor(Math.random() * matched.length)]
          : unplayed[Math.floor(Math.random() * unplayed.length)]
      } else {
        nextIdx = Math.floor(Math.random() * q.length)
      }
    }

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
  }, [settings?.autoplay, settings?.smartShuffle])

  useEffect(() => {
    handleEndRef.current = handleEnd
  }, [handleEnd])

  // ── Universal Howler Web Audio Player (Equalizer, Bass Boost, 3D Spatial 100% Active) ──
  const playWithHowler = useCallback((song, audioUrl, startAt = 0, engineType = 'studio') => {
    console.log(`🎛️ Universal Web Audio DSP Playing [${engineType}]:`, song.title, audioUrl)
    setEngine(engineType)
    setError(null)
    setIsLoading(true)

    try {
      if (howlRef.current) {
        try {
          howlRef.current.stop()
          howlRef.current.unload()
        } catch (_) {}
        howlRef.current = null
      }
      if (progressInterval.current) clearInterval(progressInterval.current)
      if (ytPlayerRef.current?.stopVideo) {
        try { ytPlayerRef.current.stopVideo() } catch (_) {}
      }

      // Ensure AudioContext is un-suspended
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {})
      }

      // Ensure DSP graph has active settings applied immediately
      applyAudioChain(settingsRef.current)

      const speed = settingsRef.current?.speed ?? 1.0
      const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
      Howler.volume(baseVol)
      Howler.mute(mutedRef.current)

      // Primary: Web Audio API mode (html5: false) so Howler decodes buffer directly
      // into Howler.ctx and streams through Howler.masterGain -> DSP graph
      const howl = new Howl({
        src: [audioUrl],
        html5: false,
        volume: baseVol,
        rate: speed,
        format: ['mp3', 'aac', 'm4a', 'ogg', 'wav'],
        onload: () => {
          const dur = howl.duration() || (song.duration ? song.duration / 1000 : 0)
          if (dur > 0) setDuration(dur)
          setIsLoading(false)
        },
        onplay: () => {
          if (startAt > 0) {
            try { howl.seek(startAt) } catch (_) {}
          }
          if (settingsRef.current?.speed && settingsRef.current.speed !== 1) {
            try { howl.rate(settingsRef.current.speed) } catch (_) {}
          }
          // Apply DSP chain with active settings immediately
          try {
            applyAudioChain(settingsRef.current)
          } catch (e) {
            console.warn('DSP chain notice:', e)
          }

          setIsPlaying(true)
          setIsLoading(false)
          startProgressTracking()
        },
        onpause: () => {
          setIsPlaying(false)
          if (progressInterval.current) clearInterval(progressInterval.current)
        },
        onstop: () => {
          setIsPlaying(false)
          if (progressInterval.current) clearInterval(progressInterval.current)
        },
        onend: () => {
          handleEndRef.current?.()
        },
        onloaderror: (id, error) => {
          console.warn('Howler Web Audio buffer load note, falling back to HTML5 audio mode:', error)
          // Fallback to HTML5 audio element
          try {
            const fallbackHowl = new Howl({
              src: [audioUrl],
              html5: true,
              volume: baseVol,
              rate: speed,
              format: ['mp3', 'aac', 'm4a', 'ogg', 'wav'],
              onload: () => {
                const dur = fallbackHowl.duration() || (song.duration ? song.duration / 1000 : 0)
                if (dur > 0) setDuration(dur)
                setIsLoading(false)
              },
              onplay: () => {
                try {
                  const node = fallbackHowl._sounds?.[0]?._node
                  if (node && !node._sourceNode && Howler.ctx) {
                    node.crossOrigin = 'anonymous'
                    const src = Howler.ctx.createMediaElementSource(node)
                    src.connect(Howler.masterGain)
                    node._sourceNode = src
                    applyAudioChain(settingsRef.current)
                  }
                } catch (_) {}
                setIsPlaying(true)
                setIsLoading(false)
                startProgressTracking()
              },
              onpause: () => { setIsPlaying(false); clearInterval(progressInterval.current) },
              onstop: () => { setIsPlaying(false); clearInterval(progressInterval.current) },
              onend: () => handleEndRef.current?.(),
              onloaderror: () => { setIsLoading(false); setError('Could not load audio file'); setIsPlaying(false) },
              onplayerror: () => { setIsLoading(false); setError('Playback error'); setIsPlaying(false) },
            })
            howlRef.current = fallbackHowl
            fallbackHowl.play()
          } catch (e) {
            setIsLoading(false)
            setError('Could not load audio')
            setIsPlaying(false)
          }
        },
        onplayerror: (id, error) => {
          console.error('Howler play error:', error)
          setIsLoading(false)
          setError('Playback error')
          setIsPlaying(false)
        }
      })

      howlRef.current = howl
      howl.play()
    } catch (err) {
      console.error('Error in playWithHowler:', err)
      setIsLoading(false)
      setError('Failed to initialize audio player')
      setIsPlaying(false)
    }
  }, [applyAudioChain, startProgressTracking])

  // ── YouTube IFrame API Support (Video sync / fallback) ──────
  const initYTPlayer = useCallback((divId) => {
    const create = () => {
      try {
        ytPlayerRef.current = new window.YT.Player(divId, {
          height: '100%', width: '100%',
          playerVars: { autoplay: 1, controls: 0, playsinline: 1, disablekb: 1 },
          events: {
            onReady: () => {
              ytReadyRef.current = true
              ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
              if (pendingYTRef.current) {
                const pending = pendingYTRef.current
                pendingYTRef.current = null
                ytPlayerRef.current.loadVideoById(pending)
              }
            },
            onStateChange: () => {},
            onError: () => {}
          }
        })
      } catch (_) {}
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
  }, [])

  // ── Master Track Loader (Supports All 3 Engines: Auto, Studio, YouTube) ──
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

    const currentEngine = settings?.audioEngine || 'studio'
    console.log(`🎵 Engine active: [${currentEngine}] for track:`, song.title)

    // Play track across ALL 3 ENGINES with 10-Band EQ, Bass Boost, and 3D Spatial Audio!
    if (song.audioUrl) {
      playWithHowler(song, song.audioUrl, startAt, currentEngine)
    } else {
      setIsLoading(true)
      // Discover audioUrl via iTunes search in milliseconds
      searchiTunes(`${song.artist} ${song.title}`, 1)
        .then(results => {
          if (results && results[0]?.audioUrl) {
            song.audioUrl = results[0].audioUrl
            playWithHowler(song, results[0].audioUrl, startAt, currentEngine)
          } else {
            // Fallback: try YouTube stream endpoint through Howler
            const query = `${song.artist} - ${song.title}`
            const vId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)
            if (vId) {
              const streamUrl = `/api/youtube/stream/${vId}?quality=${settings?.streamQuality || 'auto'}`
              playWithHowler(song, streamUrl, startAt, currentEngine)
            } else {
              searchYouTube(`${song.artist} - ${song.title} official audio`, song.id)
                .then(discoveredId => {
                  if (discoveredId) {
                    const streamUrl = `/api/youtube/stream/${discoveredId}?quality=${settings?.streamQuality || 'auto'}`
                    playWithHowler(song, streamUrl, startAt, currentEngine)
                  } else {
                    setError('Playback unavailable for this track')
                    setIsLoading(false)
                  }
                })
                .catch(() => {
                  setError('Playback unavailable for this track')
                  setIsLoading(false)
                })
            }
          }
        })
        .catch(() => {
          setError('Playback unavailable for this track')
          setIsLoading(false)
        })
    }
  }, [user, settings, playWithHowler])

  const switchEngine = useCallback((targetEngine) => {
    setEngine(targetEngine)
    const song = currentSongRef.current
    if (!song) return
    const curTime = (howlRef.current ? howlRef.current.seek() : currentTimeRef.current) || 0
    if (song.audioUrl) {
      playWithHowler(song, song.audioUrl, curTime, targetEngine)
    }
  }, [playWithHowler])

  // Keep ref in sync so handleEnd can call it without stale closure
  useEffect(() => { loadAndPlayRef.current = loadAndPlay }, [loadAndPlay])

  // ── Restore last session on mount / user switch ────────────
  const prevUserRef = useRef(user?.uid)

  useEffect(() => {
    if (prevUserRef.current !== user?.uid) {
      prevUserRef.current = user?.uid
      if (howlRef.current) {
        try { howlRef.current.stop(); howlRef.current.unload() } catch (_) {}
        howlRef.current = null
      }
      setIsPlaying(false)
      clearInterval(progressInterval.current)

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
      setCurrentSong(saved.song)
      setQueue(saved.queue || [saved.song])
      setQueueIndex(saved.index || 0)
      setCurrentTime(saved.time || 0)
      setProgress(saved.time && saved.song.duration ? saved.time / (saved.song.duration / 1000) : 0)
      setDuration(saved.song.duration ? saved.song.duration / 1000 : 0)
    }
  }, [user?.uid])

  // ── Play / Pause Toggle ────────────────────────────────────
  const togglePlay = useCallback(() => {
    const h = howlRef.current
    if (isPlayingRef.current) {
      if (h) h.pause()
      setIsPlaying(false)
      return false
    }

    if (h) {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {})
      }
      h.play()
      setIsPlaying(true)
      return true
    }

    const song = currentSongRef.current
    if (song) {
      loadAndPlay(song, queueRef.current, queueIndexRef.current, currentTimeRef.current)
      return true
    }

    return null
  }, [loadAndPlay])

  const seek = useCallback(fraction => {
    const h = howlRef.current
    if (!h) return
    const dur = h.duration() || duration || 0
    if (dur > 0) {
      const target = fraction * dur
      h.seek(target)
      setProgress(fraction)
      setCurrentTime(target)
    }
  }, [duration])

  const next = useCallback(() => {
    const q = queueRef.current
    const idx = queueIndexRef.current
    let nextIdx = idx + 1
    if (shuffleRef.current) {
      if (settings?.smartShuffle && q.length > 2) {
        const unplayed = q.map((_, i) => i).filter(i => i !== idx)
        const current = q[idx]
        const matched = unplayed.filter(i => q[i].artist === current?.artist || q[i].genre === current?.genre)
        nextIdx = matched.length > 0
          ? matched[Math.floor(Math.random() * matched.length)]
          : unplayed[Math.floor(Math.random() * unplayed.length)]
      } else {
        nextIdx = Math.floor(Math.random() * q.length)
      }
    }
    if (nextIdx < q.length) loadAndPlay(q[nextIdx], q, nextIdx)
  }, [loadAndPlay, settings?.smartShuffle])

  const previous = useCallback(() => {
    const h = howlRef.current
    const curTime = h ? h.seek() : currentTimeRef.current
    if (curTime > 3) {
      if (h) h.seek(0)
      setProgress(0)
      setCurrentTime(0)
      return
    }
    const idx = queueIndexRef.current
    const q = queueRef.current
    if (idx > 0) loadAndPlay(q[idx - 1], q, idx - 1)
  }, [loadAndPlay])

  const setVolume = useCallback(v => {
    setVolumeState(v)
    const vol = v / 100
    Howler.volume(vol)
    if (howlRef.current) {
      howlRef.current.volume(vol)
    }
    if (v > 0) setIsMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const muted = !prev
      Howler.mute(muted)
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

  const forceApplySettings = useCallback(() => {
    applyAudioChain(settings)
  }, [applyAudioChain, settings])

  // ── Background Audio Persistence (Never pauses on tab blur/minimize) ──
  useEffect(() => {
    const keepAudioAlive = () => {
      if (isPlayingRef.current) {
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().catch(() => {})
        }
        if (howlRef.current && !howlRef.current.playing()) {
          try { howlRef.current.play() } catch (_) {}
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

  // ── MediaSession API ───────────────────────────────────────
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
      forceApplySettings,
      reorderQueue,
      removeFromQueue,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
