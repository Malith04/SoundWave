import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Howler } from 'howler'
import { useAuth } from './AuthContext'

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

export const EQ_PRESETS = {
  flat:       { 32:0,  64:0,  125:0, 250:0,  500:0,  1000:0,  2000:0, 4000:0, 8000:0,  16000:0  },
  bass:       { 32:9,  64:8,  125:6, 250:3,  500:0,  1000:0,  2000:0, 4000:0, 8000:0,  16000:0  },
  treble:     { 32:0,  64:0,  125:0, 250:0,  500:0,  1000:3,  2000:5, 4000:7, 8000:9,  16000:10 },
  vocal:      { 32:-3, 64:-2, 125:0, 250:3,  500:6,  1000:6,  2000:4, 4000:2, 8000:0,  16000:0  },
  electronic: { 32:7,  64:6,  125:2, 250:-2, 500:0,  1000:3,  2000:5, 4000:6, 8000:7,  16000:7  },
  rock:       { 32:6,  64:5,  125:3, 250:0,  500:-1, 1000:1,  2000:3, 4000:5, 8000:5,  16000:4  },
  jazz:       { 32:4,  64:3,  125:2, 250:2,  500:-1, 1000:-1, 2000:1, 4000:3, 8000:4,  16000:3  },
  classical:  { 32:1,  64:1,  125:1, 250:0,  500:0,  1000:0,  2000:1, 4000:1, 8000:-2, 16000:-3 },
  podcast:    { 32:-6, 64:-4, 125:0, 250:3,  500:6,  1000:6,  2000:4, 4000:1, 8000:-2, 16000:-3 },
}

export const DEFAULT = {
  eq: { 32:0, 64:0, 125:0, 250:0, 500:0, 1000:0, 2000:0, 4000:0, 8000:0, 16000:0 },
  eqEnabled: true,
  eqPreset: 'flat',
  spatialEnabled: false,
  spatialWidth: 1.45,
  bassBoost: 0,
  normalize: false,
  mono: false,
  crossfade: 0,
  speed: 1.0,
  gapless: true,
  autoplay: true,
  smartShuffle: false,
  streamQuality: 'auto',
  audioEngine: 'studio', // 'studio' | 'auto' | 'youtube'
  loudVolume: false,
  rememberQueue: true,
  showRecent: true,
  theme: 'dark',
  accent: '#1DB954',
  animatedArt: true,
  particles: true,
  seekBarWave: true,
  showCredits: false,
  canvas: false,
  autoLyrics: false,
  showMixes: true,
  showNew: true,
  privateSession: false,
  shareActivity: false,
  analytics: true,
}

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

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { ...DEFAULT }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT,
      ...parsed,
      eqEnabled: parsed.eqEnabled !== undefined ? parsed.eqEnabled : true,
      audioEngine: parsed.audioEngine || 'studio'
    }
  } catch {
    return { ...DEFAULT }
  }
}

function darkenHex(hex, amount) {
  try {
    const n = parseInt(hex.replace('#',''), 16)
    const r = Math.max(0, (n >> 16) - amount)
    const g = Math.max(0, ((n >> 8) & 0xff) - amount)
    const b = Math.max(0, (n & 0xff) - amount)
    return `#${((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')}`
  } catch { return hex }
}

const AudioSettingsContext = createContext(null)

export function AudioSettingsProvider({ children }) {
  const auth = useAuth()
  const settingsKey = auth?.user?.uid ? `sw_audio_settings_${auth.user.uid}` : 'sw_audio_settings_guest'

  const [settings, setSettings] = useState(() => load(settingsKey))
  const settingsRef = useRef(settings)

  // Web Audio Hardware-Accelerated DSP Nodes Graph
  const nodes = useRef({
    built: false,
    bass: null,
    eq: {},
    compressor: null,
    loudGain: null,
    splitter: null,
    merger: null,
    directL: null,
    crossL: null,
    directR: null,
    crossR: null,
    crossDelayL: null,
    crossDelayR: null,
    limiter: null
  })

  // Sync settings when switching user account
  useEffect(() => {
    setSettings(load(settingsKey))
  }, [settingsKey])

  // Keep settingsRef in sync
  useEffect(() => { settingsRef.current = settings }, [settings])

  // ── Persist ───────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(settingsKey, JSON.stringify(settings))
    } catch (_) {}
  }, [settings, settingsKey])

  // ── Theme ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  // ── Accent colour ─────────────────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', settings.accent)
    document.documentElement.style.setProperty('--brand-dark', darkenHex(settings.accent, 20))
  }, [settings.accent])

  // ── Build & Apply the Universal Web Audio DSP Chain ────────
  const applyAudioChain = useCallback((s) => {
    if (typeof window === 'undefined') return
    const activeSettings = s || settingsRef.current
    if (!activeSettings) return

    // Ensure Howler has an AudioContext instantiated
    let ctx = Howler.ctx
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        Howler.ctx = new AudioCtx()
        ctx = Howler.ctx
        if (!Howler.masterGain) {
          Howler.masterGain = ctx.createGain()
          Howler.masterGain.connect(ctx.destination)
        }
      }
    }

    if (!ctx) return

    // Auto-resume audio context if browser suspended it
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const n = nodes.current

    // Build DSP graph if not built or if AudioContext was re-created
    if (!n.built || !n.bass || !Howler.masterGain) {
      try {
        console.log('⚡ Wiring Universal SoundWave Web Audio DSP graph...')

        // 1. Bass boost filter (lowshelf 80Hz)
        n.bass = ctx.createBiquadFilter()
        n.bass.type = 'lowshelf'
        n.bass.frequency.value = 80
        n.bass.gain.value = 0

        // 2. 10-Band Equalizer (32Hz to 16kHz)
        EQ_BANDS.forEach((freq, i) => {
          const f = ctx.createBiquadFilter()
          f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking'
          f.frequency.value = freq
          f.Q.value = 1.4
          f.gain.value = 0
          n.eq[freq] = f
        })

        // 3. Audio Normalization (Studio Dynamics Compressor)
        n.compressor = ctx.createDynamicsCompressor()
        n.compressor.threshold.value = 0
        n.compressor.knee.value = 25
        n.compressor.ratio.value = 1
        n.compressor.attack.value = 0.003
        n.compressor.release.value = 0.25

        // 4. Loud Volume Headroom Gain Stage
        n.loudGain = ctx.createGain()
        n.loudGain.gain.value = 1.0

        // 5. Stereo Matrix for 3D Spatial Audio & Mono Downmix with Haas Interaural Delay
        n.splitter = ctx.createChannelSplitter(2)
        n.merger = ctx.createChannelMerger(2)

        n.directL = ctx.createGain()
        n.crossL = ctx.createGain()
        n.directR = ctx.createGain()
        n.crossR = ctx.createGain()

        n.crossDelayL = ctx.createDelay()
        n.crossDelayR = ctx.createDelay()
        n.crossDelayL.delayTime.value = 0.0
        n.crossDelayR.delayTime.value = 0.0

        n.directL.gain.value = 1.0
        n.crossL.gain.value = 0.0
        n.directR.gain.value = 1.0
        n.crossR.gain.value = 0.0

        // 6. Master Studio Soft Limiter (Zero Digital Distortion / Clipping)
        n.limiter = ctx.createDynamicsCompressor()
        n.limiter.threshold.value = -0.5
        n.limiter.knee.value = 0.0
        n.limiter.ratio.value = 20.0
        n.limiter.attack.value = 0.001
        n.limiter.release.value = 0.05

        // Wire nodes: Howler.masterGain -> bass -> 10-band EQ -> compressor -> loudGain -> splitter
        try { Howler.masterGain.disconnect() } catch (_) {}

        let prev = Howler.masterGain
        prev.connect(n.bass)
        prev = n.bass

        EQ_BANDS.forEach(freq => {
          prev.connect(n.eq[freq])
          prev = n.eq[freq]
        })

        prev.connect(n.compressor)
        n.compressor.connect(n.loudGain)
        n.loudGain.connect(n.splitter)

        // Splitter ch 0 (Left) feeds directL and crossDelayL -> crossL
        n.splitter.connect(n.directL, 0)
        n.splitter.connect(n.crossDelayL, 0)
        n.crossDelayL.connect(n.crossL)

        // Splitter ch 1 (Right) feeds directR and crossDelayR -> crossR
        n.splitter.connect(n.directR, 1)
        n.splitter.connect(n.crossDelayR, 1)
        n.crossDelayR.connect(n.crossR)

        // DirectL & crossR sum into Merger ch 0 (Left out)
        n.directL.connect(n.merger, 0, 0)
        n.crossR.connect(n.merger, 0, 0)

        // DirectR & crossL sum into Merger ch 1 (Right out)
        n.directR.connect(n.merger, 0, 1)
        n.crossL.connect(n.merger, 0, 1)

        // Merger connects to Studio Limiter -> Destination
        n.merger.connect(n.limiter)
        n.limiter.connect(ctx.destination)

        n.built = true
        console.log('✅ Universal Audio DSP Graph connected to Howler.masterGain with 0ms latency!')
      } catch (e) {
        console.warn('Audio DSP graph build notice:', e)
        return
      }
    }

    // ── Apply values in real-time with sample-accurate scheduling ──
    const now = ctx.currentTime

    // 1. Bass boost (lowshelf 80Hz)
    if (n.bass) {
      const bassVal = Math.max(0, Math.min(12, Number(activeSettings.bassBoost) || 0))
      try {
        n.bass.gain.cancelScheduledValues(now)
        n.bass.gain.setValueAtTime(bassVal, now)
      } catch (_) {
        n.bass.gain.value = bassVal
      }
    }

    // 2. 10-Band Equalizer (Active with zero latency)
    const isEqOn = activeSettings.eqEnabled !== false
    EQ_BANDS.forEach(freq => {
      if (n.eq[freq]) {
        const raw = activeSettings.eq?.[freq] ?? activeSettings.eq?.[String(freq)] ?? 0
        const gain = isEqOn ? Math.max(-12, Math.min(12, Number(raw) || 0)) : 0
        try {
          n.eq[freq].gain.cancelScheduledValues(now)
          n.eq[freq].gain.setValueAtTime(gain, now)
        } catch (_) {
          n.eq[freq].gain.value = gain
        }
      }
    })

    // 3. Audio Normalization (Studio Dynamics Compressor)
    if (n.compressor) {
      const thresh = activeSettings.normalize ? -24 : 0
      const ratio = activeSettings.normalize ? 10 : 1
      try {
        n.compressor.threshold.cancelScheduledValues(now)
        n.compressor.threshold.setValueAtTime(thresh, now)
        n.compressor.ratio.cancelScheduledValues(now)
        n.compressor.ratio.setValueAtTime(ratio, now)
      } catch (_) {
        n.compressor.threshold.value = thresh
        n.compressor.ratio.value = ratio
      }
    }

    // 4. Loud Volume Headroom Boost
    if (n.loudGain) {
      const loudMultiplier = activeSettings.loudVolume ? 1.4 : 1.0
      try {
        n.loudGain.gain.cancelScheduledValues(now)
        n.loudGain.gain.setValueAtTime(loudMultiplier, now)
      } catch (_) {
        n.loudGain.gain.value = loudMultiplier
      }
    }

    // 5. Stereo Matrix (3D Spatial Audio & Mono Downmix)
    if (n.directL && n.crossL && n.directR && n.crossR) {
      let d = 1.0
      let c = 0.0
      let delay = 0.0

      if (activeSettings.mono) {
        d = 0.5
        c = 0.5
        delay = 0.0
      } else if (activeSettings.spatialEnabled) {
        const w = activeSettings.spatialWidth !== undefined && activeSettings.spatialWidth !== null && activeSettings.spatialWidth !== 1.0 
          ? Number(activeSettings.spatialWidth) 
          : 1.45
        d = (1 + w) / 2
        c = (1 - w) / 2
        delay = 0.00035 // 0.35ms Haas ITD delay for genuine acoustic 3D soundstage widening
      }

      try {
        n.directL.gain.cancelScheduledValues(now)
        n.directL.gain.setValueAtTime(d, now)
        n.directR.gain.cancelScheduledValues(now)
        n.directR.gain.setValueAtTime(d, now)
        n.crossL.gain.cancelScheduledValues(now)
        n.crossL.gain.setValueAtTime(c, now)
        n.crossR.gain.cancelScheduledValues(now)
        n.crossR.gain.setValueAtTime(c, now)

        if (n.crossDelayL && n.crossDelayR) {
          n.crossDelayL.delayTime.cancelScheduledValues(now)
          n.crossDelayL.delayTime.setValueAtTime(delay, now)
          n.crossDelayR.delayTime.cancelScheduledValues(now)
          n.crossDelayR.delayTime.setValueAtTime(delay, now)
        }
      } catch (_) {
        n.directL.gain.value = d
        n.directR.gain.value = d
        n.crossL.gain.value = c
        n.crossR.gain.value = c
      }
    }
  }, [])

  // Expose globally for instant bridge access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__soundwave_applyAudioChain = applyAudioChain
      window.__soundwave_nodes = nodes
    }
  }, [applyAudioChain])

  // Re-apply chain whenever relevant audio settings change
  useEffect(() => {
    applyAudioChain(settings)
  }, [
    settings.eqEnabled, settings.eq,
    settings.bassBoost,
    settings.mono,
    settings.spatialEnabled, settings.spatialWidth,
    settings.normalize,
    settings.loudVolume,
    settings.speed,
    applyAudioChain
  ])

  // Auto unlock audio context on first user click or keypress
  useEffect(() => {
    const unlock = () => {
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => {})
      }
      applyAudioChain(settingsRef.current)
      window.removeEventListener('click', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('click', unlock, { passive: true })
    window.addEventListener('keydown', unlock, { passive: true })
    window.addEventListener('touchstart', unlock, { passive: true })
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
  }, [applyAudioChain])

  // ── State updaters ────────────────────────────────────────
  const update = useCallback((key, value) => {
    setSettings(s => {
      const next = { ...s, [key]: value }
      applyAudioChain(next)
      return next
    })
  }, [applyAudioChain])

  const applyPreset = useCallback((name) => {
    const preset = EQ_PRESETS[name]
    if (!preset) return
    setSettings(s => {
      const next = { ...s, eq: { ...preset }, eqPreset: name, eqEnabled: true }
      applyAudioChain(next)
      return next
    })
  }, [applyAudioChain])

  const setEqBand = useCallback((freq, gain) => {
    setSettings(s => {
      const next = { ...s, eq: { ...s.eq, [freq]: gain }, eqPreset: 'custom', eqEnabled: true }
      applyAudioChain(next)
      return next
    })
  }, [applyAudioChain])

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT })
    nodes.current = {
      built: false, bass: null, eq: {}, compressor: null, loudGain: null,
      splitter: null, merger: null, directL: null, crossL: null, directR: null, crossR: null,
      crossDelayL: null, crossDelayR: null, limiter: null
    }
    applyAudioChain({ ...DEFAULT })
  }, [applyAudioChain])

  return (
    <AudioSettingsContext.Provider value={{ settings, update, applyPreset, setEqBand, reset, applyAudioChain }}>
      {children}
    </AudioSettingsContext.Provider>
  )
}

export const useAudioSettings = () => useContext(AudioSettingsContext)
