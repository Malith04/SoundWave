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

  // ── YouTube IFrame API (Fallback for restricted content) ───
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
              if (settings?.speed && settings.speed !== 1) {
                try { ytPlayerRef.current.setPlaybackRate(settings.speed) } catch(_) {}
              }
              if (pendingYTRef.current) {
                const pending = pendingYTRef.current
                pendingYTRef.current = null
                if (typeof pending === 'object' && pending.videoId) {
                  ytPlayerRef.current.loadVideoById(pending)
                } else {
                  ytPlayerRef.current.loadVideoById(pending)
                }
              }
            },
            onStateChange: (e) => {
              const S = window.YT.PlayerState
              if (e.data === S.PLAYING) { 
                setIsPlaying(true)
                setIsLoading(false)
                if (progressInterval.current) clearInterval(progressInterval.current)
                progressInterval.current = setInterval(() => {
                  if (ytPlayerRef.current?.getCurrentTime) {
                    try {
                      const cur = ytPlayerRef.current.getCurrentTime() || 0
                      const dur = ytPlayerRef.current.getDuration() || 0
                      setCurrentTime(cur)
                      if (dur > 0) {
                        setDuration(dur)
                        setProgress(cur / dur)
                      }
                    } catch (_) {}
                  }
                }, 250)
              } else if (e.data === S.PAUSED) {
                if (progressInterval.current) clearInterval(progressInterval.current)
                if (document.hidden && isPlayingRef.current) {
                  try { ytPlayerRef.current?.playVideo() } catch (_) {}
                  return
                }
                setIsPlaying(false)
              } else if (e.data === S.ENDED) {
                if (progressInterval.current) clearInterval(progressInterval.current)
                handleEndRef.current?.()
              } else if (e.data === S.BUFFERING) {
                setIsLoading(true)
              }
            },
            onError: async (e) => {
              console.warn('YouTube player error code:', e?.data)
              if (progressInterval.current) clearInterval(progressInterval.current)
              setIsLoading(false)

              const song = currentSongRef.current
              if (!song) return

              // Error 150/101 = embed disabled by video owner (common for official VEVO/Universal tracks)
              if (e?.data === 150 || e?.data === 101 || e?.data === 100) {
                console.log('Embedding restricted on this video, searching for unblocked audio/lyrics version...')
                try {
                  const { searchYouTube } = await import('../services/musicApi')
                  const altId = await searchYouTube(`${song.artist} - ${song.title} lyrics`, `${song.id}_alt`)
                  if (altId && ytPlayerRef.current?.loadVideoById) {
                    ytPlayerRef.current.loadVideoById({ videoId: altId, startSeconds: currentTimeRef.current || 0 })
                    setError(null)
                    return
                  }
                } catch (_) {}
              }

              // Fallback to direct audioUrl so music never cuts out
              if (song.audioUrl) {
                console.log('Falling back to direct audio source...')
                try {
                  await audioEngine.play(song.audioUrl, currentTimeRef.current || 0)
                  setIsPlaying(true)
                  setError(null)
                  return
                } catch (_) {}
              }

              setError('Playback unavailable')
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
      handleEndRef.current?.()
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
  }, [])

  const playWithYouTubeIframe = useCallback((song, videoId, startAt = 0) => {
    console.log('🎬 YouTube Player playing FULL track:', song.title, videoId)
    setEngine('youtube')
    audioEngine.stop()
    setCurrentTime(startAt)
    if (song.duration) {
      setDuration(song.duration / 1000)
    }
    setIsLoading(true)
    setError(null)

    if (ytReadyRef.current && ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
      ytPlayerRef.current.loadVideoById({ videoId, startSeconds: startAt })
    } else {
      pendingYTRef.current = { videoId, startSeconds: startAt }
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
      if (ytPlayerRef.current?.stopVideo) {
        try { ytPlayerRef.current.stopVideo() } catch (_) {}
      }
      setIsPlaying(true)
      setIsLoading(false)
      return true
    } catch (err) {
      console.warn('Primary stream playback note:', err)
      // Fallback: If YouTube stream fails, try direct audioUrl ONLY if it's a full track (not an iTunes 30s preview)
      if (song.audioUrl && audioUrl !== song.audioUrl && song.source !== 'itunes') {
        console.log('Falling back to full direct audioUrl...')
        try {
          await audioEngine.play(song.audioUrl, startAt)
          if (ytPlayerRef.current?.stopVideo) {
            try { ytPlayerRef.current.stopVideo() } catch (_) {}
          }
          setIsPlaying(true)
          setIsLoading(false)
          return true
        } catch (e) {
          console.error('Fallback audioUrl error:', e)
        }
      }

      // Secondary fallback: YouTube IFrame player (Plays the FULL SONG!)
      const query = `${song.artist} - ${song.title}`
      const vId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)
      if (vId) {
        console.log('Fallback to YouTube player for FULL song...')
        playWithYouTubeIframe(song, vId, startAt)
      } else {
        try {
          const discoveredId = await searchYouTube(`${song.artist} - ${song.title} official audio`, song.id)
          if (discoveredId) {
            console.log('Discovered YouTube videoId, playing FULL song:', discoveredId)
            playWithYouTubeIframe(song, discoveredId, startAt)
            return false
          }
        } catch (_) {}

        // Last resort: preview audioUrl if available
        if (song.audioUrl) {
          try {
            await audioEngine.play(song.audioUrl, startAt)
            if (ytPlayerRef.current?.stopVideo) {
              try { ytPlayerRef.current.stopVideo() } catch (_) {}
            }
            setIsPlaying(true)
            setIsLoading(false)
            setError(null)
            return true
          } catch (_) {}
        }

        setIsLoading(false)
        setError('Playback error: could not load audio stream')
        setIsPlaying(false)
        return false
      }
    }
  }, [settings, playWithYouTubeIframe])

  const playWithYouTube = useCallback(async (song, startAt = 0, preferredQuality = null) => {
    const quality = preferredQuality || settings?.streamQuality || 'auto'
    const query = `${song.artist} - ${song.title}`
    const cachedVideoId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)

    if (cachedVideoId) {
      const streamUrl = `/api/youtube/stream/${cachedVideoId}?quality=${quality}`
      console.log('⚡ Checking YouTube Stream (Equalizer 100% Active):', streamUrl)
      try {
        const ok = await playTrackAudio(song, streamUrl, startAt, 'youtube')
        if (ok) return
      } catch (_) {}
      // Direct stream failed -> fallback to YouTube iframe
      playWithYouTubeIframe(song, cachedVideoId, startAt)
      return
    }

    // Play preview while discovering full YouTube stream so user hears music with 0ms delay
    if (song.audioUrl) {
      console.log('Playing preview while searching YouTube stream...')
      await playTrackAudio(song, song.audioUrl, startAt, 'preview')
    } else {
      setIsLoading(true)
    }

    try {
      const videoId = await searchYouTube(`${song.artist} - ${song.title} official audio`, song.id)
      if (videoId) {
        const curTime = audioEngine.getCurrentTime() || startAt
        const streamUrl = `/api/youtube/stream/${videoId}?quality=${quality}`
        console.log('⚡ YouTube Stream Discovered for FULL song:', streamUrl)
        try {
          const ok = await playTrackAudio(song, streamUrl, curTime, 'youtube')
          if (ok) return
        } catch (_) {}
        // Direct backend stream failed -> switch to YouTube player
        playWithYouTubeIframe(song, videoId, curTime)
      }
    } catch (error) {
      console.warn('YouTube search upgrade note:', error)
    }
  }, [settings?.streamQuality, playTrackAudio, playWithYouTubeIframe])

  // ── Gapless Pre-caching ───────────────────────────────────
  useEffect(() => {
    if (!settings?.gapless || !isPlaying || duration < 15) return
    const rem = duration - currentTime
    if (rem > 0 && rem <= 8) {
      const q = queueRef.current
      const idx = queueIndexRef.current
      const nextSong = q && q[idx + 1]
      if (nextSong) {
        const query = `${nextSong.artist} - ${nextSong.title}`
        const vId = nextSong.videoId || nextSong.youtubeId || getCachedYouTubeId(nextSong.id, query)
        if (vId) {
          fetch(`/api/youtube/stream/${vId}?quality=${settings?.streamQuality || 'auto'}`, { method: 'HEAD' }).catch(() => {})
        }
      }
    }
  }, [currentTime, duration, isPlaying, settings?.gapless, settings?.streamQuality])

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
    // 1. If currently playing, ALWAYS pause immediately
    if (isPlayingRef.current) {
      audioEngine.pause()
      if (ytPlayerRef.current?.pauseVideo) {
        try { ytPlayerRef.current.pauseVideo() } catch (_) {}
      }
      setIsPlaying(false)
      return false
    }

    // 2. If currently paused, resume playback:
    if (engineRef.current === 'youtube' && ytPlayerRef.current?.playVideo) {
      try {
        ytPlayerRef.current.playVideo()
        setIsPlaying(true)
        return true
      } catch (_) {}
    }

    if (audioEngine.audio?.src && audioEngine.audio.src !== '' && !audioEngine.audio.src.endsWith('/')) {
      audioEngine.resume()
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
    if (engineRef.current === 'youtube' && ytPlayerRef.current?.seekTo) {
      const p = ytPlayerRef.current
      const dur = p.getDuration?.() || duration || 0
      p.seekTo(fraction * dur, true)
      setProgress(fraction)
      setCurrentTime(fraction * dur)
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
    if (currentTimeRef.current > 3) {
      if (engineRef.current === 'youtube' && ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(0, true)
        setProgress(0)
        setCurrentTime(0)
      } else {
        audioEngine.seek(0)
        setProgress(0)
        setCurrentTime(0)
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
