import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { Howl, Howler } from 'howler'
import { useAuth } from './AuthContext'
import { addToRecentlyPlayed } from '../services/userService'
import { searchYouTube, getCachedYouTubeId } from '../services/musicApi'
import { upsertSong, incrementPlayCount } from '../services/songService'
import { useAudioSettings } from './AudioSettingsContext'

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

  // ── Live-apply settings changes to current playback ──────
  // Playback speed - improved with force application
  useEffect(() => {
    console.log('Applying playback speed:', settings?.speed, 'Current Howl:', !!howlRef.current)
    
    if (!settings?.speed) {
      console.log('No speed setting, skipping')
      return
    }
    
    try { 
      if (howlRef.current) {
        console.log('Setting Howler rate from', howlRef.current.rate(), 'to', settings.speed)
        howlRef.current.rate(settings.speed)
        console.log('Howler speed set successfully to:', howlRef.current.rate())
      } else {
        console.log('No Howler instance available for speed change')
      }
    } catch (e) { 
      console.warn('Failed to set Howler speed:', e)
    }
    
    try { 
      if (ytPlayerRef.current?.setPlaybackRate) {
        console.log('Setting YouTube playback rate to:', settings.speed)
        ytPlayerRef.current.setPlaybackRate(settings.speed)
        console.log('YouTube speed set successfully')
      } else {
        console.log('No YouTube player available for speed change')
      }
    } catch (e) { 
      console.warn('Failed to set YouTube speed:', e)
    }
  }, [settings?.speed, currentSong]) // Added currentSong dependency to reapply on song change

  // Loud volume boost
  useEffect(() => {
    if (!howlRef.current) return
    const base = mutedRef.current ? 0 : volumeRef.current / 100
    const finalVolume = settings?.loudVolume ? Math.min(base * 1.5, 1) : base
    console.log('Applying loud volume:', settings?.loudVolume, 'Base volume:', base, 'Final volume:', finalVolume)
    try { 
      howlRef.current.volume(finalVolume)
      console.log('Volume applied successfully')
    } catch (e) { 
      console.warn('Failed to set volume:', e)
    }
  }, [settings?.loudVolume, volume, isMuted])

  // Normalization — re-apply volume cap
  useEffect(() => {
    if (!howlRef.current) return
    const base = mutedRef.current ? 0 : volumeRef.current / 100
    const vol = settings?.normalize ? Math.min(base, 0.85) : base
    console.log('Applying normalization:', settings?.normalize, 'Base volume:', base, 'Normalized volume:', vol)
    try { 
      howlRef.current.volume(vol)
      console.log('Normalization applied successfully')
    } catch (e) { 
      console.warn('Failed to set normalized volume:', e)
    }
  }, [settings?.normalize, volume, isMuted])

  // ── Crossfade: fade out near end, fade in on start ────────
  const crossfadeRef = useRef(null)
  useEffect(() => {
    clearInterval(crossfadeRef.current)
    const secs = settings?.crossfade ?? 0
    console.log('Setting up crossfade:', secs, 'seconds', 'Current song:', currentSong?.title, 'Is playing:', isPlaying)
    
    if (secs <= 0) {
      console.log('Crossfade disabled (0 seconds)')
      return
    }
    
    if (!howlRef.current) {
      console.log('No Howler instance for crossfade')
      return
    }
    
    if (!isPlaying) {
      console.log('Not playing, crossfade not needed')
      return
    }
    
    console.log('Starting crossfade interval check every 200ms')
    crossfadeRef.current = setInterval(() => {
      const h = howlRef.current
      if (!h || !h.playing()) {
        console.log('Howler not playing, skipping crossfade check')
        return
      }
      
      const currentPos = h.seek() || 0
      const totalDuration = h.duration() || 0
      const remaining = totalDuration - currentPos
      
      if (remaining > 0 && remaining <= secs) {
        const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
        const fadeVol = Math.max(0, (remaining / secs) * baseVol)
        console.log('🎵 CROSSFADE ACTIVE:', {
          remaining: remaining.toFixed(1) + 's',
          fadeVol: fadeVol.toFixed(2),
          baseVol: baseVol.toFixed(2),
          crossfadeDuration: secs + 's'
        })
        try { 
          h.volume(fadeVol)
        } catch (e) { 
          console.warn('Crossfade volume error:', e)
        }
      }
    }, 200)
    
    return () => {
      console.log('Cleaning up crossfade interval')
      clearInterval(crossfadeRef.current)
    }
  }, [settings?.crossfade, isPlaying, currentSong])
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
                console.log('YouTube player started playing - upgrade successful!')
                setIsPlaying(true); setIsLoading(false); startYTProgress() 
              }
              else if (e.data === S.PAUSED) {
                // If the document is hidden or minimized and the user did not trigger pause,
                // keep playing continuously in the background!
                if (document.hidden && isPlayingRef.current) {
                  console.log('Background tab pause intercepted - resuming YouTube playback')
                  try { ytPlayerRef.current?.playVideo() } catch (_) {}
                  return
                }
                setIsPlaying(false)
                clearInterval(progressInterval.current)
              }
              else if (e.data === S.ENDED) { clearInterval(progressInterval.current); handleEnd() }
              else if (e.data === S.BUFFERING) { setIsLoading(true) }
            },
            onError: (e) => {
              console.warn('YouTube player error:', e)
              setIsLoading(false)
              setError('YouTube failed — playing 30s preview')
              const song = queueRef.current[queueIndexRef.current]
              if (song?.audioUrl) playWithHowler(song, song.audioUrl)
            },
          },
        })
      } catch (error) {
        console.error('Failed to create YouTube player:', error)
        setError('YouTube player initialization failed')
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
          s.onerror = () => {
            console.error('Failed to load YouTube IFrame API')
            setError('YouTube API failed to load')
          }
          document.head.appendChild(s)
        }
      }
    } catch (error) {
      console.error('Error initializing YouTube API:', error)
      setError('YouTube initialization failed')
    }
  }, [settings?.speed])

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

  const loadAndPlayRef = useRef(null)

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
    if (nextIdx < q.length) loadAndPlayRef.current?.(q[nextIdx], q, nextIdx)
    else if (repeat === 'all' && q.length > 0) loadAndPlayRef.current?.(q[0], q, 0)
    else setIsPlaying(false)
  }, [])

  const playWithYouTubeIframe = useCallback((song, videoId, startAt = 0) => {
    console.log('playWithYouTubeIframe fallback called for:', videoId)
    setEngine('youtube')
    howlRef.current?.unload()
    clearInterval(progressInterval.current)
    setProgress(0); setCurrentTime(0); setDuration(0)
    setIsLoading(true); setError(null)

    if (ytReadyRef.current && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
      ytPlayerRef.current.loadVideoById({ videoId, startSeconds: startAt })
    } else {
      pendingYTRef.current = videoId
    }
  }, [])

  const playWithHowler = useCallback((song, audioUrl, startAt = 0, isStream = false) => {
    console.log('playWithHowler called:', {
      title: song.title,
      source: song.source,
      audioUrl: audioUrl?.substring(0, 50) + '...',
      startAt,
      isStream
    })
    
    try {
      howlRef.current?.unload()
      clearInterval(progressInterval.current)
      ytPlayerRef.current?.stopVideo?.()
      setEngine(isStream ? 'youtube' : 'howler')
      setProgress(0); setCurrentTime(0); setDuration(0)

      // Ensure AudioContext is ready and un-suspended
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {})
      }

      const speed = settings?.speed ?? 1.0
      const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
      const vol = settings?.loudVolume
        ? Math.min(baseVol * 1.5, 1)
        : settings?.normalize
          ? Math.min(baseVol, 0.85)
          : baseVol

      console.log('Creating Howl with Web Audio DSP chain:', { speed, vol, isStream })

      const howl = new Howl({
        src: [audioUrl],
        html5: isStream, // stream uses HTML5 audio element for instant byte-range buffering
        volume: vol,
        rate: speed,
        format: isStream ? ['mp4', 'm4a', 'aac', 'mp3'] : ['mp3', 'ogg', 'aac', 'm4a'],
        onload: () => {
          console.log('Howl loaded successfully, duration:', howl.duration())
          if (howl.duration() > 0) {
            setDuration(howl.duration())
          } else if (song.duration) {
            setDuration(song.duration > 1000 ? song.duration / 1000 : song.duration)
          }
        },
        onplay: () => {
          console.log('Howl started playing via Web Audio DSP pipeline')
          if (startAt > 0) { 
            howl.seek(startAt) 
          }
          
          if (settings?.speed && settings.speed !== 1) {
            try { howl.rate(settings.speed) } catch (_) {}
          }

          // If playing via HTML5 audio element (streaming mode), wire into Web Audio DSP graph
          if (isStream) {
            try {
              const node = howl._sounds?.[0]?._node
              if (node && !node._sourceNode && Howler.ctx) {
                node.crossOrigin = 'anonymous'
                const src = Howler.ctx.createMediaElementSource(node)
                src.connect(Howler.masterGain)
                node._sourceNode = src
                console.log('✅ HTML5 Audio Node successfully routed to 10-Band EQ & Spatial DSP!')
              }
            } catch (err) {
              console.warn('HTML5 MediaElementSource wiring note:', err)
            }
          }
          
          // AudioContext is live — apply all audio settings (10-band EQ, 3D Spatial Audio, Bass Boost, Normalization)
          try {
            applyAudioChain(settings)
          } catch (e) {
            console.warn('Failed to apply audio chain on play:', e)
          }

          setIsPlaying(true); setIsLoading(false); startProgressTracking()
        },
        onpause: () => { 
          setIsPlaying(false); clearInterval(progressInterval.current) 
        },
        onstop: () => { 
          setIsPlaying(false); clearInterval(progressInterval.current) 
        },
        onend: () => {
          handleEnd()
        },
        onloaderror: (id, error) => { 
          console.warn('Howler load error:', error)
          // Fallback to YouTube iframe if stream failed
          const query = `${song.artist} - ${song.title}`
          const vId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)
          if (isStream && vId) {
            console.log('Falling back to YouTube iframe player for:', vId)
            playWithYouTubeIframe(song, vId, startAt)
          } else if (song.audioUrl && audioUrl !== song.audioUrl) {
            // Fallback to original audioUrl
            playWithHowler(song, song.audioUrl, startAt, false)
          } else {
            setIsLoading(false); setError('Could not load audio file'); setIsPlaying(false)
          }
        },
        onplayerror: (id, error) => { 
          console.error('Howler play error:', error)
          const query = `${song.artist} - ${song.title}`
          const vId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)
          if (isStream && vId) {
            playWithYouTubeIframe(song, vId, startAt)
          } else {
            setIsLoading(false); setError('Playback error'); setIsPlaying(false)
          }
        },
      })
      howlRef.current = howl
      howl.play()
    } catch (error) {
      console.error('Error in playWithHowler:', error)
      setIsLoading(false)
      setError('Failed to initialize audio player')
      setIsPlaying(false)
    }
  }, [startProgressTracking, handleEnd, settings, applyAudioChain, playWithYouTubeIframe])

  const playWithYouTube = useCallback(async (song, startAt = 0) => {
    console.log('playWithYouTube called for:', song.title, 'by', song.artist)
    
    // Check instant cache first (0ms)
    const query = `${song.artist} - ${song.title}`
    const cachedVideoId = song.videoId || song.youtubeId || getCachedYouTubeId(song.id, query)

    // Helper: stream through Web Audio DSP so EQ, 3D Spatial Audio & Bass Boost are 100% active
    const streamThroughWebAudio = (videoId) => {
      const streamUrl = `/api/youtube/stream/${videoId}`
      console.log('⚡ Streaming YouTube track through Studio Web Audio DSP (Equalizer Active):', streamUrl)
      playWithHowler(song, streamUrl, startAt, true)
    }

    if (cachedVideoId) {
      console.log('⚡ Instant YouTube Stream (cached video ID):', cachedVideoId)
      streamThroughWebAudio(cachedVideoId)
      return
    }

    // Play preview while discovering full YouTube stream so user hears music with 0ms delay
    if (song.audioUrl) {
      console.log('Playing preview while searching YouTube stream...')
      playWithHowler(song, song.audioUrl, startAt, false)
    } else {
      setIsLoading(true)
    }

    try {
      const videoId = await searchYouTube(`${song.artist} - ${song.title} official audio`, song.id)
      
      if (!videoId) {
        console.log('No YouTube video found - continuing with direct audioUrl')
        return
      }
      
      console.log('Found YouTube video, streaming full track with Web Audio EQ:', videoId)
      streamThroughWebAudio(videoId)
    } catch (error) {
      console.error('YouTube upgrade failed:', error)
      // Stay with preview if already playing
    }
  }, [playWithHowler])

  const loadAndPlay = useCallback((song, songQueue = [], index = 0, startAt = 0) => {
    console.log('loadAndPlay called:', { song: song?.title, source: song?.source, hasAudioUrl: !!song?.audioUrl })
    
    // Defensive checks
    if (!song) {
      console.error('loadAndPlay: No song provided')
      setError('No song to play')
      return
    }
    
    if (!song.id) {
      console.error('loadAndPlay: Song missing ID', song)
      setError('Invalid song data')
      return
    }

    setError(null); setIsLoading(true)
    setCurrentSong(song); setQueue(songQueue); setQueueIndex(index)
    saveState(user?.uid, song, songQueue, index, startAt)
    
    // Save to database (non-blocking)
    upsertSong(song).then(() => incrementPlayCount(song.id)).catch(err => {
      console.warn('Failed to update song stats:', err)
    })
    
    // Add to recently played (non-blocking)
    if (user && !settings?.privateSession) {
      addToRecentlyPlayed(user.uid, song.id).catch(err => {
        console.warn('Failed to add to recently played:', err)
      })
    }

    // Play the song across all 3 engines with full Equalizer support
    try {
      console.log('Determining playback method for:', { 
        title: song.title,
        source: song.source, 
        engine: settings?.audioEngine || 'auto'
      })
      
      // Jamendo tracks: direct high-fidelity Web Audio (Full length + Full EQ)
      if (song.source === 'jamendo' && song.audioUrl) {
        console.log('✅ Playing Jamendo track with Howler Web Audio (FULL LENGTH + FULL EQ)')
        playWithHowler(song, song.audioUrl, startAt, false)
      } 
      // Preview-based tracks (iTunes, Deezer, etc.) or YouTube tracks:
      // Stream via YouTube backend through Web Audio DSP so 10-band EQ, 3D Spatial Audio & Bass Boost are 100% active!
      else if (song.source === 'itunes' || song.source === 'deezer' || settings?.audioEngine === 'youtube' || song.videoId || song.youtubeId) {
        console.log(`🎛️ Engine [${settings?.audioEngine || 'auto'}] streaming full track with Web Audio DSP Equalizer`)
        playWithYouTube(song, startAt)
      } 
      // Any other track with audioUrl: play with Howler Web Audio
      else if (song.audioUrl) {
        console.log('🎵 Playing track with Howler Web Audio (fallback) - source:', song.source)
        playWithHowler(song, song.audioUrl, startAt, false)
      } 
      // No audio source available
      else {
        console.error('❌ No audio source available for song:', song)
        setIsLoading(false)
        setError('No audio available for this track')
      }
    } catch (error) {
      console.error('Error in loadAndPlay:', error)
      setIsLoading(false)
      setError('Failed to play track')
    }
  }, [user, playWithHowler, playWithYouTube, settings])

  const switchEngine = useCallback((targetEngine) => {
    const song = currentSongRef.current
    if (!song) return
    const curTime = currentTimeRef.current

    if (targetEngine === 'studio') {
      if (song.source === 'jamendo' && song.audioUrl) {
        playWithHowler(song, song.audioUrl, curTime, false)
      } else {
        playWithYouTube(song, curTime)
      }
    } else if (targetEngine === 'youtube') {
      playWithYouTube(song, curTime)
    } else if (targetEngine === 'auto') {
      loadAndPlayRef.current?.(song, queueRef.current, queueIndexRef.current, curTime)
    }
  }, [playWithHowler, playWithYouTube])

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
      const h = howlRef.current
      if (!h) {
        // Howl not loaded yet — reload from saved position
        const song = currentSongRef.current
        if (song) {
          loadAndPlay(song, queueRef.current, queueIndexRef.current, currentTimeRef.current)
          return true
        }
        return null
      }
      if (h.playing()) {
        h.pause()
        setIsPlaying(false)
        return false
      } else {
        h.play()
        setIsPlaying(true)
        return true
      }
    }
  }, [loadAndPlay])

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

  // Force apply all audio settings - useful for debugging
  const forceApplySettings = useCallback(() => {
    console.log('🔧 FORCE APPLYING ALL AUDIO SETTINGS')
    
    // Apply speed
    if (howlRef.current && settings?.speed) {
      console.log('Force applying speed:', settings.speed)
      try {
        howlRef.current.rate(settings.speed)
        console.log('Speed applied:', howlRef.current.rate())
      } catch (e) {
        console.error('Failed to apply speed:', e)
      }
    }
    
    // Apply volume settings
    if (howlRef.current) {
      const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
      const finalVol = settings?.loudVolume 
        ? Math.min(baseVol * 1.5, 1) 
        : settings?.normalize 
          ? Math.min(baseVol, 0.85) 
          : baseVol
      console.log('Force applying volume:', finalVol)
      try {
        howlRef.current.volume(finalVol)
        console.log('Volume applied successfully')
      } catch (e) {
        console.error('Failed to apply volume:', e)
      }
    }
    
    // Apply audio chain
    try {
      console.log('Force applying audio chain...')
      applyAudioChain(settings)
      console.log('Audio chain applied successfully')
    } catch (e) {
      console.error('Failed to apply audio chain:', e)
    }
  }, [settings, applyAudioChain])

  // ── Background Audio Persistence (Keep playing when minimized or switching tabs) ──
  useEffect(() => {
    const keepAudioAlive = () => {
      if (isPlayingRef.current) {
        // 1. Resume Web Audio context if browser suspended it on tab blur
        if (Howler?.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume().catch(() => {})
        }
        // 2. Keep Howler playing if it got interrupted
        if (engineRef.current === 'howler' && howlRef.current && !howlRef.current.playing()) {
          try { howlRef.current.play() } catch (_) {}
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
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
