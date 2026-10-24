// SoundWave Direct Main Color Themes & Utilities

export const ACCENT_COLORS = [
  { value: '#22c55e', name: 'Green',  label: '🟢 Green' },
  { value: '#ef4444', name: 'Red',    label: '🔴 Red' },
  { value: '#3b82f6', name: 'Blue',   label: '🔵 Blue' },
  { value: '#a855f7', name: 'Purple', label: '🟣 Purple' },
  { value: '#f97316', name: 'Orange', label: '🟠 Orange' },
  { value: '#eab308', name: 'Yellow', label: '🟡 Yellow' },
  { value: '#06b6d4', name: 'Cyan',   label: '🩵 Cyan' },
  { value: '#ec4899', name: 'Pink',   label: '🌸 Pink' },
]

export const DEFAULT_ACCENT = '#22c55e'

// Mapping old/whimsical theme names/values to direct main colors
export const LEGACY_COLOR_MAP = {
  '#1db954': '#22c55e', // Spotify Green -> Green
  '#ff6b6b': '#ef4444', // Coral Red -> Red
  '#1e90ff': '#3b82f6', // Electric Blue -> Blue
  '#f59e0b': '#f97316', // Amber -> Orange
  '#a855f7': '#a855f7', // Purple -> Purple
}

/**
 * Normalizes any accent color, converting legacy colors to direct main colors
 */
export function normalizeAccent(hex) {
  if (!hex) return DEFAULT_ACCENT
  const lower = hex.toLowerCase().trim()
  return LEGACY_COLOR_MAP[lower] || hex
}

/**
 * Converts a hex color string (#rgb or #rrggbb) to an { r, g, b } object
 */
export function hexToRgb(hex) {
  if (!hex) return { r: 34, g: 197, b: 94 }
  const clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return { r, g, b }
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16)
    const g = parseInt(clean.substring(2, 4), 16)
    const b = parseInt(clean.substring(4, 6), 16)
    return { r, g, b }
  }
  return { r: 34, g: 197, b: 94 }
}

/**
 * Darkens a hex color by a specified RGB delta
 */
export function darkenHex(hex, amount = 20) {
  try {
    const n = parseInt(hex.replace('#', ''), 16)
    const r = Math.max(0, (n >> 16) - amount)
    const g = Math.max(0, ((n >> 8) & 0xff) - amount)
    const b = Math.max(0, (n & 0xff) - amount)
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
  } catch {
    return hex
  }
}
