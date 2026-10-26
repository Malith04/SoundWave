// Native Google Identity Services (GIS) Client
// Direct in-page Google OAuth without opening extra tabs or external proxy windows

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '856096802639-fga3jl6vg8cec62lm7dqe94a094mj23g.apps.googleusercontent.com'

export function isGISConfigured() {
  return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10
}

/**
 * Safely parses the Google JWT credential returned by Google Identity Services if needed.
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
export function waitForGIS(timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      return resolve(window.google.accounts.oauth2)
    }

    const start = Date.now()
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(interval)
        resolve(window.google.accounts.oauth2)
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Google Identity Services SDK failed to load. Please check your network.'))
      }
    }, 50)
  })
}

/**
 * Requests the Google user profile using Google Identity Services OAuth2 token client.
 * 
 * Key Features:
 * - prompt: 'select_account' forces Google to show the Account Chooser dialog with ALL accounts.
 * - Works directly in the current browser session/overlay (no orphaned tabs or popups getting blocked).
 * - Uses Authorized JavaScript Origins only; NEVER sends a redirect_uri to Google.
 * - Completely immune to Error 400: redirect_uri_mismatch.
 */
export function requestGoogleProfile() {
  return new Promise(async (resolve, reject) => {
    try {
      await waitForGIS()
    } catch (loadErr) {
      return reject(new Error('Google Identity Services is still loading. Please check your connection and try again.'))
    }

    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services OAuth2 client is unavailable.'))
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
                emailVerified: !!profile.email_verified
              })
            } catch (fetchErr) {
              reject(fetchErr)
            }
          } else {
            reject(new Error('No access token received from Google.'))
          }
        },
      })

      // Prompt account selection dialog
      client.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      reject(err)
    }
  })
}
