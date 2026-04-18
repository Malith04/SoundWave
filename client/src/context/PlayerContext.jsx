import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react'
import { Howl } from 'howler'
import { useAuth } from './AuthContext'
import { addToRecentlyPlayed } from '../services/userService'
import { searchYouTube } from '../services/musicApi'
import { upsertSong, incrementPlayCount } from '../services/songService'
import { useAudioSettings } from './AudioSettingsContext'

const PlayerContext = createContext(null)
const YT_API_KEY = import.meta.env.VITE_YT_API_KEY || ''

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

  useEffect(() => { queueRef.current = queue }, [queue])
  useEffect(() => { queueIndexRef.current = queueIndex }, [queueIndex])
  useEffect(() => { repeatRef.current = repeatMode }, [repeatMode])
  useEffect(() => { shuffleRef.current = isShuffled }, [isShuffled])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { mutedRef.current = isMuted }, [isMuted])
  useEffect(() => { engineRef.current = engine }, [engine])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { currentSongRef.current = currentSong }, [currentSong])

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
              else if (e.data === S.PAUSED) { setIsPlaying(false); clearInterval(progressInterval.current) }
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

  const playWithHowler = useCallback((song, audioUrl, startAt = 0) => {
    console.log('playWithHowler called:', {
      title: song.title,
      source: song.source,
      audioUrl: audioUrl?.substring(0, 50) + '...',
      startAt
    })
    
    try {
      howlRef.current?.unload()
      clearInterval(progressInterval.current)
      ytPlayerRef.current?.stopVideo?.()
      setEngine('howler')
      setProgress(0); setCurrentTime(0); setDuration(0)

      const speed = settings?.speed ?? 1.0
      const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
      const vol = settings?.loudVolume
        ? Math.min(baseVol * 1.5, 1)
        : settings?.normalize
          ? Math.min(baseVol, 0.85)
          : baseVol

      console.log('Creating Howl with:', { speed, vol, audioUrl })

      const howl = new Howl({
        src: [audioUrl],
        html5: true,
        volume: vol,
        rate: speed,
        format: ['mp3', 'ogg', 'aac', 'm4a'],
        onload: () => {
          console.log('Howl loaded successfully, duration:', howl.duration())
        },
        onplay: () => {
          console.log('Howl started playing')
          if (startAt > 0) { 
            console.log('Seeking to:', startAt)
            howl.seek(startAt) 
          }
          
          // Apply playback speed immediately
          if (settings?.speed && settings.speed !== 1) {
            console.log('Applying playback speed on play:', settings.speed)
            try {
              howl.rate(settings.speed)
              console.log('Speed applied successfully:', howl.rate())
            } catch (e) {
              console.warn('Failed to apply speed on play:', e)
            }
          }
          
          // AudioContext is now live — apply all audio settings
          setTimeout(() => {
            try {
              console.log('Song started playing, applying audio chain...')
              applyAudioChain(settings)
              
              // Also re-apply volume settings that might have been overridden
              const baseVol = mutedRef.current ? 0 : volumeRef.current / 100
              const finalVol = settings?.loudVolume 
                ? Math.min(baseVol * 1.5, 1) 
                : settings?.normalize 
                  ? Math.min(baseVol, 0.85) 
                  : baseVol
              howl.volume(finalVol)
              console.log('Volume re-applied after audio chain:', finalVol)
            } catch (error) {
              console.warn('Failed to apply audio chain:', error)
            }
          }, 50)
          setIsPlaying(true); setIsLoading(false); startProgressTracking()
        },
        onpause: () => { 
          console.log('Howl paused')
          setIsPlaying(false); clearInterval(progressInterval.current) 
        },
        onstop:  () => { 
          console.log('Howl stopped')
          setIsPlaying(false); clearInterval(progressInterval.current) 
        },
        onend:   () => {
          console.log('Howl ended')
          handleEnd()
        },
        onloaderror: (id, error) => { 
          console.error('Howler load error:', error, 'URL:', audioUrl)
          setIsLoading(false); setError('Could not load audio file'); setIsPlaying(false) 
        },
        onplayerror: (id, error) => { 
          console.error('Howler play error:', error, 'URL:', audioUrl)
          setIsLoading(false); setError('Playback error'); setIsPlaying(false) 
        },
      })
      howlRef.current = howl
      console.log('Starting Howl playback...')
      howl.play()
    } catch (error) {
      console.error('Error in playWithHowler:', error)
      setIsLoading(false)
      setError('Failed to initialize audio player')
      setIsPlaying(false)
    }
  }, [startProgressTracking, handleEnd, settings, applyAudioChain])

  const playWithYouTube = useCallback(async (song, startAt = 0) => {
    console.log('playWithYouTube called for:', song.title, 'by', song.artist)
    
    // Always try the 30s preview first so there's immediate audio feedback
    if (song.audioUrl) {
      console.log('Playing 30s preview while searching for full track...')
      playWithHowler(song, song.audioUrl, startAt)
    }

    // Then try to upgrade to full YouTube track in background
    if (!YT_API_KEY) {
      console.warn('No YouTube API key configured - staying with preview')
      return
    }
    
    try {
      // Try multiple search variations for better results
      const searchQueries = [
        `${song.title} ${song.artist} official audio`,
        `${song.title} ${song.artist} official`,
        `${song.title} ${song.artist}`,
        `${song.artist} ${song.title}`
      ]
      
      let videoId = null
      for (const searchQuery of searchQueries) {
        console.log('Trying YouTube search:', searchQuery)
        videoId = await searchYouTube(searchQuery)
        if (videoId) {
          console.log('Found video with query:', searchQuery)
          break
        }
      }
      
      if (!videoId) {
        console.log('No YouTube video found after trying all search variations - staying with preview')
        return
      }
      
      console.log('Found YouTube video, switching to full track:', videoId)
      setEngine('youtube')
      
      if (ytReadyRef.current && ytPlayerRef.current) {
        console.log('YouTube player ready, loading video...')
        howlRef.current?.unload()
        clearInterval(progressInterval.current)
        setProgress(0); setCurrentTime(0); setDuration(0)
        setIsLoading(true); setError(null)
        ytPlayerRef.current.setVolume(mutedRef.current ? 0 : volumeRef.current)
        ytPlayerRef.current.loadVideoById({ videoId, startSeconds: startAt })
      } else {
        console.log('YouTube player not ready, queuing video:', videoId)
        pendingYTRef.current = videoId
      }
    } catch (error) {
      console.error('YouTube upgrade failed:', error)
      // Stay with preview - already playing
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

    // Play the song - prioritize full-length sources
    try {
      console.log('Determining playback method for:', { 
        title: song.title,
        source: song.source, 
        hasAudioUrl: !!song.audioUrl,
        audioUrl: song.audioUrl?.substring(0, 50) + '...'
      })
      
      // Always prefer Jamendo for full-length playback
      if (song.source === 'jamendo' && song.audioUrl) {
        console.log('✅ Playing Jamendo track with Howler (FULL LENGTH)')
        playWithHowler(song, song.audioUrl, startAt)
      } 
      // iTunes tracks: try YouTube upgrade but start with preview
      else if (song.source === 'itunes') {
        console.log('⏳ Playing iTunes track - will attempt YouTube upgrade for full length')
        playWithYouTube(song, startAt)
      } 
      // Any other track with audioUrl: play with Howler
      else if (song.audioUrl) {
        console.log('🎵 Playing track with Howler (fallback) - source:', song.source)
        playWithHowler(song, song.audioUrl, startAt)
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
  }, [user, playWithHowler, playWithYouTube, settings?.privateSession])

  // keep ref in sync so handleEnd can call it without stale closure
  useEffect(() => { loadAndPlayRef.current = loadAndPlay }, [loadAndPlay])
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
      forceApplySettings, // Add this for debugging
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)
