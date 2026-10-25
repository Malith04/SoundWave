// Native Google Identity Services (GIS) Client
// Direct in-page Google OAuth without opening extra tabs or external proxy windows

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '856096802639-fga3jl6vg8cec62lm7dqe94a094mj23g.apps.googleusercontent.com'

export function isGISConfigured() {
  return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10
}

/**
 * Safely parses the Google JWT credential returned by Google Identity Services.
 */
export function parseGoogleJwt(token) {
  try {
    if (!token || typeof token !== 'string') return null
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    return {
      email: payload.email,
      name: payload.name || payload.given_name || payload.email?.split('@')[0] || '',
      photoURL: payload.picture || '',
      sub: payload.sub,
      emailVerified: !!payload.email_verified
    }
  } catch (err) {
    console.error('[GoogleAuth] Failed to parse JWT token:', err)
    return null
  }
}

/**
 * Waits for the Google Identity Services SDK (<script src="https://accounts.google.com/gsi/client">)
 * to be loaded in the browser.
 */
export function waitForGIS(timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      return resolve(window.google.accounts.id)
    }

    const start = Date.now()
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval)
        resolve(window.google.accounts.id)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Google Identity Services SDK failed to load. Please check your network.'))
      }
    }, 50)
  })
}

/**
 * Initializes the In-Page Google Identity Services client.
 * Enforces in-tab redirect mode without popups, new tabs, or One Tap floating cards.
 */
export async function initInPageGoogleAuth({ context = 'signin' } = {}) {
  try {
    const gsi = await waitForGIS()

    const origin = window.location.origin
    const loginUri = `${origin}/api/auth/google/callback`

    gsi.initialize({
      client_id: GOOGLE_CLIENT_ID,
      ux_mode: 'redirect',
      login_uri: loginUri,
      auto_select: false,
      context,
      itp_support: true,
    })

    // NOTE: Google One Tap prompt (gsi.prompt) is PERMANENTLY REMOVED as requested.
    // No right-side floating card or dropdown will ever be displayed.

    return gsi
  } catch (err) {
    console.warn('[GIS] Failed to initialize in-page Google Auth:', err)
    return null
  }
}

/**
 * Renders Google's official In-Page Sign-In Button inside a given container.
 * When clicked, account selection navigates directly in the CURRENT browser tab.
 */
export function renderInPageGoogleButton(container, {
  theme = 'filled_black',
  size = 'large',
  text = 'continue_with',
  shape = 'pill',
  width,
} = {}) {
  if (!container || !window.google?.accounts?.id) return

  try {
    // Clear previous renders if any to avoid stacking
    container.innerHTML = ''

    const containerWidth = container.offsetWidth || 340
    const clampedWidth = Math.min(Math.max(width || containerWidth, 200), 400)

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme,
      size,
      text,
      shape,
      logo_alignment: 'left',
      width: clampedWidth,
    })
  } catch (err) {
    console.error('[GIS] Failed to render Google button:', err)
  }
}

/**
 * Fallback token client for direct profile retrieval if needed.
 */
export function requestGoogleProfile() {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services SDK is not loaded yet. Please try again.'))
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('[GIS Error Response]', tokenResponse)
            if (tokenResponse.error === 'access_denied') {
              return reject({ code: 'auth/popup-closed-by-user', message: 'Sign-in cancelled' })
            }
            return reject(new Error(tokenResponse.error_description || tokenResponse.error))
          }

          if (tokenResponse.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              })

              if (!res.ok) {
                throw new Error('Failed to fetch user profile from Google')
              }

              const profile = await res.json()
              resolve({
                email: profile.email,
                name: profile.name || profile.given_name || '',
                photoURL: profile.picture || '',
                sub: profile.sub,
              })
            } catch (fetchErr) {
              reject(fetchErr)
            }
          } else {
            reject(new Error('No access token received from Google.'))
          }
        },
      })

      client.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      reject(err)
    }
  })
}
