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

import { audioEngine, EQ_BANDS } from '../services/audioEngine'

export { EQ_BANDS }

const AudioSettingsContext = createContext(null)

export function AudioSettingsProvider({ children }) {
  const auth = useAuth()
  const settingsKey = auth?.user?.uid ? `sw_audio_settings_${auth.user.uid}` : 'sw_audio_settings_guest'

  const [settings, setSettings] = useState(() => load(settingsKey))
  const settingsRef = useRef(settings)

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
    audioEngine.applySettings(s)
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
    settings.speed,
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
    setTimeout(() => applyAudioChain({ ...DEFAULT }), 0)
  }, [applyAudioChain])

  return (
    <AudioSettingsContext.Provider value={{ settings, update, applyPreset, setEqBand, reset, applyAudioChain }}>
      {children}
    </AudioSettingsContext.Provider>
  )
}

export const useAudioSettings = () => useContext(AudioSettingsContext)
