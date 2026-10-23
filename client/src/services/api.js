// SoundWave Centralized API Client for PostgreSQL Backend & Redis Session Management

export const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'sw_auth_token'
const CACHED_USER_KEY = 'sw_cached_user'
const LAST_ACTIVE_KEY = 'sw_last_active'
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      touchLastActive()
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch (_) {}
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setCachedUser(user) {
  try {
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user))
      touchLastActive()
    } else {
      localStorage.removeItem(CACHED_USER_KEY)
    }
  } catch (_) {}
}

export function getLastActive() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVE_KEY)
    return raw ? Number(raw) : 0
  } catch {
    return 0
  }
}

export function touchLastActive() {
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
  } catch (_) {}
}

export function isSessionExpired14D() {
  const token = getAuthToken()
  if (!token) return false
  const lastActive = getLastActive()
  if (!lastActive) return false
  return Date.now() - lastActive > FOURTEEN_DAYS_MS
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CACHED_USER_KEY)
    localStorage.removeItem(LAST_ACTIVE_KEY)
  } catch (_) {}
}

async function request(endpoint, options = {}) {
  // Check 14-day client inactivity threshold
  if (isSessionExpired14D()) {
    console.warn('[SoundWave Session] 14 days of inactivity elapsed. Automatically signing out.')
    clearSession()
    const error = new Error('You have been signed out due to 14 days of inactivity. Please sign in again.')
    error.status = 401
    error.code = 'SESSION_INACTIVE_14D'
    throw error
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`
  const token = getAuthToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const controller = new AbortController()
  const timeoutMs = options.timeout || 15000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const config = {
    ...options,
    headers,
    signal: options.signal || controller.signal,
  }

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body)
  }

  let response
  try {
    response = await fetch(url, config)
  } finally {
    clearTimeout(timeoutId)
  }

  // Handle transparent 7-day token refresh from response headers
  const refreshedToken = response.headers.get('x-refreshed-token')
  if (refreshedToken) {
    setAuthToken(refreshedToken)
  }

  // If response is 304 Not Modified, return null or empty body
  if (response.status === 304) {
    return null
  }

  let data
  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : `Request failed with status ${response.status}`)
    const error = new Error(errorMsg)
    error.status = response.status
    error.data = data
    error.code = data?.code

    // If explicit 401 with session expired / invalid from server, clear storage
    if (response.status === 401 && (data?.code === 'SESSION_INACTIVE_14D' || data?.code === 'TOKEN_INVALID' || data?.code === 'ACCOUNT_INVALID')) {
      clearSession()
    }

    throw error
  }

  // Activity registered on successful authenticated request
  if (token) {
    touchLastActive()
  }

  return data
}

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
}

export default api
