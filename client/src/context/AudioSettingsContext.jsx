import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Howler } from 'howler'

const STORAGE_KEY = 'sw_audio_settings'

export const DEFAULT = {
  eq: { 32:0, 64:0, 125:0, 250:0, 500:0, 1000:0, 2000:0, 4000:0, 8000:0, 16000:0 },
  eqEnabled: false,
  eqPreset: 'flat',
  spatialEnabled: false,
  spatialWidth: 1.0,
  bassBoost: 0,
  normalize: false,
  mono: false,
  crossfade: 0,
  speed: 1.0,
  gapless: true,
  autoplay: true,
  smartShuffle: false,
  streamQuality: 'auto',
  loudVolume: false,
  rememberQueue: true,
  showRecent: true,
  theme: 'dark',
  accent: '#1DB954',
  animatedArt: true,
  particles: true,
  showCredits: false,
  canvas: false,
  autoLyrics: false,
  showMixes: true,
  showNew: true,
  privateSession: false,
  shareActivity: false,
  analytics: true,
}

export const EQ_PRESETS = {
  flat:       { 32:0,  64:0,  125:0, 250:0,  500:0,  1000:0,  2000:0, 4000:0, 8000:0,  16000:0  },
  bass:       { 32:8,  64:6,  125:4, 250:2,  500:0,  1000:0,  2000:0, 4000:0, 8000:0,  16000:0  },
  treble:     { 32:0,  64:0,  125:0, 250:0,  500:0,  1000:2,  2000:4, 4000:6, 8000:8,  16000:8  },
  vocal:      { 32:-2, 64:-1, 125:0, 250:2,  500:4,  1000:4,  2000:3, 4000:1, 8000:0,  16000:0  },
  electronic: { 32:6,  64:4,  125:0, 250:-2, 500:0,  1000:2,  2000:4, 4000:4, 8000:6,  16000:6  },
  rock:       { 32:4,  64:3,  125:2, 250:0,  500:-1, 1000:0,  2000:2, 4000:4, 8000:4,  16000:3  },
  jazz:       { 32:3,  64:2,  125:1, 250:2,  500:-1, 1000:-1, 2000:0, 4000:2, 8000:3,  16000:2  },
  classical:  { 32:0,  64:0,  125:0, 250:0,  500:0,  1000:0,  2000:0, 4000:0, 8000:-2, 16000:-3 },
  podcast:    { 32:-4, 64:-2, 125:0, 250:2,  500:4,  1000:4,  2000:3, 4000:1, 8000:-1, 16000:-2 },
}

function load() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) } } catch { return { ...DEFAULT } }
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

const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

const AudioSettingsContext = createContext(null)

export function AudioSettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const settingsRef = useRef(settings)

  // Audio nodes
  const nodes = useRef({
    built: false,
    bass: null,
    eq: {},
    splitter: null,
    merger: null,
    widthL: null,
    widthR: null,
  })

  // Keep settingsRef in sync for use inside callbacks
  useEffect(() => { settingsRef.current = settings }, [settings])

  // ── Persist ───────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  // ── Theme ─────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  // ── Accent colour ─────────────────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', settings.accent)
    document.documentElement.style.setProperty('--brand-dark', darkenHex(settings.accent, 20))
  }, [settings.accent])

  // ── Build the Web Audio chain ─────────────────────────────
  // Called every time we need to apply audio settings.
  // Safe to call multiple times — rebuilds only if ctx changed.
  const applyAudioChain = useCallback((s) => {
    const ctx = Howler.ctx
    if (!ctx) return // AudioContext not ready yet — will be called again on next change

    const n = nodes.current

    // Build nodes if not built or if ctx changed
    if (!n.built || !n.bass) {
      // Bass boost (lowshelf 100Hz)
      n.bass = ctx.createBiquadFilter()
      n.bass.type = 'lowshelf'
      n.bass.frequency.value = 100

      // 10-band EQ
      EQ_BANDS.forEach((freq, i) => {
        const f = ctx.createBiquadFilter()
        f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking'
        f.frequency.value = freq
        f.Q.value = 1.4
        n.eq[freq] = f
      })

      // Stereo splitter/merger for spatial & mono
      n.splitter = ctx.createChannelSplitter(2)
      n.merger   = ctx.createChannelMerger(2)

      // Width gain nodes
      n.widthL = ctx.createGain()
      n.widthR = ctx.createGain()

      // Wire: masterGain → bass → eq chain → splitter → widthL/R → merger → destination
      try {
        Howler.masterGain.disconnect()
        let prev = Howler.masterGain
        prev.connect(n.bass)
        prev = n.bass
        EQ_BANDS.forEach(freq => {
          prev.connect(n.eq[freq])
          prev = n.eq[freq]
        })
        prev.connect(n.splitter)
        n.splitter.connect(n.widthL, 0)
        n.splitter.connect(n.widthR, 1)
        n.widthL.connect(n.merger, 0, 0)
        n.widthR.connect(n.merger, 0, 1)
        n.merger.connect(ctx.destination)
        n.built = true
      } catch(e) {
        console.warn('Audio chain build failed:', e)
        return
      }
    }

    // ── Apply all values ──────────────────────────────────
    // Bass boost
    n.bass.gain.value = s.bassBoost ?? 0

    // EQ
    EQ_BANDS.forEach(freq => {
      if (!n.eq[freq]) return
      n.eq[freq].gain.value = s.eqEnabled ? (s.eq[freq] ?? 0) : 0
    })

    // Mono: both channels from left
    try {
      n.splitter.disconnect()
      if (s.mono) {
        n.splitter.connect(n.widthL, 0)
        n.splitter.connect(n.widthR, 0) // both from left channel
      } else if (s.spatialEnabled) {
        const w = s.spatialWidth ?? 1.0
        n.widthL.gain.value = w
        n.widthR.gain.value = w
        n.splitter.connect(n.widthL, 0)
        n.splitter.connect(n.widthR, 1)
      } else {
        n.widthL.gain.value = 1
        n.widthR.gain.value = 1
        n.splitter.connect(n.widthL, 0)
        n.splitter.connect(n.widthR, 1)
      }
    } catch (_) {}

  }, [])

  // Re-apply chain whenever relevant audio settings change
  useEffect(() => {
    applyAudioChain(settings)
  }, [
    settings.eqEnabled, settings.eq,
    settings.bassBoost,
    settings.mono,
    settings.spatialEnabled, settings.spatialWidth,
    settings.loudVolume,
  ])

  // ── State updaters ────────────────────────────────────────
  const update = useCallback((key, value) => {
    setSettings(s => {
      const next = { ...s, [key]: value }
      // Apply audio chain immediately with new value
      setTimeout(() => applyAudioChain(next), 0)
      return next
    })
  }, [applyAudioChain])

  const applyPreset = useCallback((name) => {
    const preset = EQ_PRESETS[name]
    if (!preset) return
    setSettings(s => {
      const next = { ...s, eq: { ...preset }, eqPreset: name, eqEnabled: true }
      setTimeout(() => applyAudioChain(next), 0)
      return next
    })
  }, [applyAudioChain])

  const setEqBand = useCallback((freq, gain) => {
    setSettings(s => {
      const next = { ...s, eq: { ...s.eq, [freq]: gain }, eqPreset: 'custom', eqEnabled: true }
      setTimeout(() => applyAudioChain(next), 0)
      return next
    })
  }, [applyAudioChain])

  const reset = useCallback(() => {
    setSettings({ ...DEFAULT })
    nodes.current = { built: false, bass: null, eq: {}, splitter: null, merger: null, widthL: null, widthR: null }
    setTimeout(() => applyAudioChain({ ...DEFAULT }), 0)
  }, [applyAudioChain])

  // Expose applyAudioChain so PlayerContext can call it after a song starts
  return (
    <AudioSettingsContext.Provider value={{ settings, update, applyPreset, setEqBand, reset, applyAudioChain }}>
      {children}
    </AudioSettingsContext.Provider>
  )
}

export const useAudioSettings = () => useContext(AudioSettingsContext)
