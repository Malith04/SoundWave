/**
 * SoundWave Video Sync Service
 * 
 * Synchronizes audio playback with YouTube music video timelines.
 * Uses SponsorBlock crowdsourced music_offtopic API to automatically
 * detect and skip non-music intro dialogue, skits, and cinematic intros.
 */

const introCache = new Map()
const nudgeCache = new Map()

/**
 * Fetch non-music intro offset in seconds for a YouTube music video.
 * @param {string} videoId 
 * @returns {Promise<number>} offset in seconds (e.g. 18.5)
 */
export async function getVideoIntroOffset(videoId) {
  if (!videoId || typeof videoId !== 'string') return 0

  // 1. Check in-memory cache
  if (introCache.has(videoId)) {
    return introCache.get(videoId)
  }

  // 2. Check sessionStorage
  try {
    const stored = sessionStorage.getItem(`sw_intro_${videoId}`)
    if (stored !== null) {
      const val = parseFloat(stored) || 0
      introCache.set(videoId, val)
      return val
    }
  } catch (_) {}

  // 3. Query SponsorBlock music_offtopic segment API
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3500)

    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${encodeURIComponent(videoId)}&categories=%5B%22music_offtopic%22%5D`
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)

    if (res.ok) {
      const segments = await res.json()
      if (Array.isArray(segments) && segments.length > 0) {
        // Look for intro segment starting at or near the beginning (<= 4s)
        const introSegment = segments.find(s => s.category === 'music_offtopic' && s.segment && s.segment[0] <= 4)
        if (introSegment && introSegment.segment[1] > 0) {
          const introDuration = Math.round(introSegment.segment[1] * 10) / 10
          console.log(`🎬 [VideoSync] Detected non-music intro for ${videoId}: ${introDuration}s`)
          introCache.set(videoId, introDuration)
          try { sessionStorage.setItem(`sw_intro_${videoId}`, introDuration.toString()) } catch (_) {}
          return introDuration
        }
      }
    }
  } catch (err) {
    console.debug(`[VideoSync] Intro offset lookup note for ${videoId}:`, err.message)
  }

  introCache.set(videoId, 0)
  try { sessionStorage.setItem(`sw_intro_${videoId}`, '0') } catch (_) {}
  return 0
}

/**
 * Get manual user sync nudge in seconds (e.g. +1s, -1s)
 */
export function getStoredNudge(videoId) {
  if (!videoId) return 0
  if (nudgeCache.has(videoId)) return nudgeCache.get(videoId)
  try {
    const stored = sessionStorage.getItem(`sw_nudge_${videoId}`)
    if (stored !== null) {
      const val = parseFloat(stored) || 0
      nudgeCache.set(videoId, val)
      return val
    }
  } catch (_) {}
  return 0
}

/**
 * Set manual user sync nudge in seconds
 */
export function setStoredNudge(videoId, nudgeSeconds) {
  if (!videoId) return
  const rounded = Math.round(nudgeSeconds * 2) / 2 // round to 0.5s increments
  nudgeCache.set(videoId, rounded)
  try { sessionStorage.setItem(`sw_nudge_${videoId}`, rounded.toString()) } catch (_) {}
  return rounded
}

/**
 * Calculate target video timeline position from audio current time
 */
export function calculateVideoTime(audioCurrentTime, introOffset = 0, nudge = 0) {
  const result = (audioCurrentTime || 0) + (introOffset || 0) + (nudge || 0)
  return Math.max(0, Math.round(result * 10) / 10)
}

/**
 * Calculate target audio timeline position from video current time
 */
export function calculateAudioTime(videoCurrentTime, introOffset = 0, nudge = 0) {
  const result = (videoCurrentTime || 0) - (introOffset || 0) - (nudge || 0)
  return Math.max(0, Math.round(result * 10) / 10)
}
