// Native Google Identity Services (GIS) Client
// Direct Google OAuth 2.0 without Firebase proxy domains

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '856096802639-fga3jl6vg8cec62lm7dqe94a094mj23g.apps.googleusercontent.com'

export function isGISConfigured() {
  return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 10
}

/**
 * Initiates native Google OAuth 2.0 flow using Google Identity Services (GIS)
 * Opens directly through accounts.google.com with the project's official consent screen.
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
            if (tokenResponse.error === 'access_denied') {
              return reject({ code: 'auth/popup-closed-by-user', message: 'Sign-in cancelled' })
            }
            return reject(new Error(tokenResponse.error_description || tokenResponse.error))
          }

          if (tokenResponse.access_token) {
            try {
              // Fetch profile directly from Google's official userinfo API
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

      // Always force account selection
      client.requestAccessToken({ prompt: 'select_account' })
    } catch (err) {
      reject(err)
    }
  })
}
