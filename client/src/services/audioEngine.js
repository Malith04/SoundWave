/**
 * SoundWave Universal High-Fidelity Audio Bridge
 * 
 * Bridges audio engine controls directly into Howler and the Universal Web Audio DSP pipeline.
 */

import { Howler } from 'howler'
import { EQ_BANDS, EQ_PRESETS } from '../context/AudioSettingsContext'

export { EQ_BANDS, EQ_PRESETS }

class SoundWaveAudioBridge {
  constructor() {
    this.listeners = {
      timeupdate: new Set(),
      play: new Set(),
      pause: new Set(),
      ended: new Set(),
      error: new Set(),
      loading: new Set(),
      durationchange: new Set()
    }
  }

  get ctx() {
    return Howler?.ctx || null
  }

  applySettings(settings) {
    if (typeof window !== 'undefined' && window.__soundwave_applyAudioChain) {
      window.__soundwave_applyAudioChain(settings)
    }
  }

  setPlaybackRate(speed) {
    const s = Math.max(0.25, Math.min(4.0, Number(speed) || 1.0))
    if (typeof window !== 'undefined' && Howler?._howls) {
      Howler._howls.forEach(h => {
        try { h.rate(s) } catch (_) {}
      })
    }
  }

  setVolume(volume, isMuted = false) {
    const vol = isMuted ? 0 : Math.max(0, Math.min(1.0, Number(volume) || 0))
    if (typeof window !== 'undefined' && Howler) {
      Howler.volume(vol)
      if (isMuted) Howler.mute(true)
      else Howler.mute(false)
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback)
    }
    return () => this.off(event, callback)
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback)
    }
  }

  emit(event, data) {
    const set = this.listeners[event]
    if (set) {
      set.forEach(cb => {
        try { cb(data) } catch (err) { console.error('Audio bridge error:', err) }
      })
    }
  }
}

export const audioEngine = new SoundWaveAudioBridge()
