import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { Howler } from 'howler'
import { useAuth } from './AuthContext'

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
  audioEngine: 'auto', // 'auto' | 'studio' | 'youtube'
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

function load(key) {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(key)) } } catch { return { ...DEFAULT } }
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

export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

const AudioSettingsContext = createContext(null)

export function AudioSettingsProvider({ children }) {
  const auth = useAuth()
  const settingsKey = auth?.user?.uid ? `sw_audio_settings_${auth.user.uid}` : 'sw_audio_settings_guest'

  const [settings, setSettings] = useState(() => load(settingsKey))
  const settingsRef = useRef(settings)

  // Web Audio DSP nodes graph
  const nodes = useRef({
    built: false,
    bass: null,
    eq: {},
    compressor: null,
    splitter: null,
    merger: null,
    directL: null,
    crossL: null,
    directR: null,
    crossR: null,
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

  // ── Build & Apply the Web Audio chain ───────────────────────
  const applyAudioChain = useCallback((s) => {
    const ctx = Howler.ctx
    if (!ctx) return

    // Auto-resume audio context if browser suspended it
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const n = nodes.current

    // Build DSP graph if not built or if AudioContext was re-created
    if (!n.built || !n.bass) {
      try {
        console.log('Building high-fidelity audio DSP graph...')

        // 1. Bass boost (lowshelf 100Hz)
        n.bass = ctx.createBiquadFilter()
        n.bass.type = 'lowshelf'
        n.bass.frequency.value = 100
        n.bass.gain.value = 0

        // 2. 10-band Equalizer
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
        n.compressor.knee.value = 30
        n.compressor.ratio.value = 1
        n.compressor.attack.value = 0.003
        n.compressor.release.value = 0.25

        // 4. Stereo Matrix for True Mono & 3D Spatial Audio Widening
        n.splitter = ctx.createChannelSplitter(2)
        n.merger = ctx.createChannelMerger(2)

        n.directL = ctx.createGain()
        n.crossL = ctx.createGain()
        n.directR = ctx.createGain()
        n.crossR = ctx.createGain()

        n.directL.gain.value = 1
        n.crossL.gain.value = 0
        n.directR.gain.value = 1
        n.crossR.gain.value = 0

        // Wire nodes: Howler.masterGain -> bass -> 10-band EQ -> compressor -> splitter
        Howler.masterGain.disconnect()

        let prev = Howler.masterGain
        prev.connect(n.bass)
        prev = n.bass

        EQ_BANDS.forEach(freq => {
          prev.connect(n.eq[freq])
          prev = n.eq[freq]
        })

        prev.connect(n.compressor)
        n.compressor.connect(n.splitter)

        // Splitter ch 0 (Left) feeds directL and crossL
        n.splitter.connect(n.directL, 0)
        n.splitter.connect(n.crossL, 0)

        // Splitter ch 1 (Right) feeds directR and crossR
        n.splitter.connect(n.directR, 1)
        n.splitter.connect(n.crossR, 1)

        // DirectL & crossR sum into Merger ch 0 (Left out)
        n.directL.connect(n.merger, 0, 0)
        n.crossR.connect(n.merger, 0, 0)

        // DirectR & crossL sum into Merger ch 1 (Right out)
        n.directR.connect(n.merger, 0, 1)
        n.crossL.connect(n.merger, 0, 1)

        // Merger connects to final speakers/headphones output
        n.merger.connect(ctx.destination)
        n.built = true
        console.log('Audio DSP graph successfully wired!')
      } catch (e) {
        console.warn('Audio DSP graph build failed:', e)
        return
      }
    }

    // ── Apply values in real-time ──
    const now = ctx.currentTime

    // 1. Bass boost
    if (n.bass) {
      const bassVal = Math.max(0, Math.min(12, s.bassBoost ?? 0))
      n.bass.gain.setValueAtTime(bassVal, now)
    }

    // 2. 10-band Equalizer
    EQ_BANDS.forEach(freq => {
      if (n.eq[freq]) {
        const gain = s.eqEnabled ? (s.eq[freq] ?? 0) : 0
        n.eq[freq].gain.setValueAtTime(Math.max(-12, Math.min(12, gain)), now)
      }
    })

    // 3. Audio Normalization
    if (n.compressor) {
      if (s.normalize) {
        n.compressor.threshold.setValueAtTime(-24, now)
        n.compressor.ratio.setValueAtTime(12, now)
      } else {
        n.compressor.threshold.setValueAtTime(0, now)
        n.compressor.ratio.setValueAtTime(1, now)
      }
    }

    // 4. Stereo Matrix (Spatial 3D Audio & Mono)
    if (n.directL && n.crossL && n.directR && n.crossR) {
      let d = 1.0
      let c = 0.0

      if (s.mono) {
        // True 50/50 Mono downmix
        d = 0.5
        c = 0.5
      } else if (s.spatialEnabled) {
        // 3D Spatial Audio widening
        const w = s.spatialWidth ?? 1.0
        d = (1 + w) / 2
        c = (1 - w) / 2
      }

      n.directL.gain.setValueAtTime(d, now)
      n.directR.gain.setValueAtTime(d, now)
      n.crossL.gain.setValueAtTime(c, now)
      n.crossR.gain.setValueAtTime(c, now)
    }
  }, [])

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
    applyAudioChain
  ])

  // ── State updaters ────────────────────────────────────────
  const update = useCallback((key, value) => {
    setSettings(s => {
      const next = { ...s, [key]: value }
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
    nodes.current = {
      built: false, bass: null, eq: {}, compressor: null,
      splitter: null, merger: null, directL: null, crossL: null, directR: null, crossR: null
    }
    setTimeout(() => applyAudioChain({ ...DEFAULT }), 0)
  }, [applyAudioChain])

  return (
    <AudioSettingsContext.Provider value={{ settings, update, applyPreset, setEqBand, reset, applyAudioChain }}>
      {children}
    </AudioSettingsContext.Provider>
  )
}

export const useAudioSettings = () => useContext(AudioSettingsContext)
