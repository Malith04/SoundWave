import jwt from 'jsonwebtoken'
import { query } from '../db/index.js'
import {
  saveSession,
  getSession,
  touchSession,
  destroySession,
  cacheClient
} from '../services/redis.js'

const JWT_SECRET = process.env.JWT_SECRET || 'soundwave_production_super_secret_jwt_key_2026'

// 14 days inactivity window in milliseconds
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000
// Throttle DB last_active_at updates to once per 15 minutes per user
const dbTouchMap = new Map()

/**
 * Generates a signed JWT with 7-day expiration and registers session in Redis cache
 */
export async function generateToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin || false
    },
    JWT_SECRET,
    { expiresIn: '7d' } // 7-day active session window
  )

  // Save session in Redis / cache with 14-day inactivity window
  try {
    await saveSession(token, user)
  } catch (err) {
    console.warn('[Session] Could not cache session in Redis:', err.message)
  }

  return token
}

/**
 * Authenticates request, enforces 14-day inactivity auto-signout,
 * and slides the session activity forward.
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. No token provided.',
      code: 'AUTH_REQUIRED'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    // 1. Verify token signature
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true })
    const now = Date.now()

    // 2. Check Redis / Cache session for 14-day inactivity rule
    const session = await getSession(token)

    if (session) {
      if (session.lastActive && (now - session.lastActive > FOURTEEN_DAYS_MS)) {
        await destroySession(token)
        return res.status(401).json({
          error: 'You have been signed out due to 14 days of inactivity. Please sign in again.',
          code: 'SESSION_INACTIVE_14D'
        })
      }
    } else {
      // Session not in cache (e.g. server restart / cache evicted): Check DB last_active_at
      try {
        const userRes = await query(
          'SELECT id, email, is_admin, last_active_at, deleted_at, is_banned FROM users WHERE id = $1',
          [decoded.id]
        )

        if (userRes.rows.length === 0 || userRes.rows[0].deleted_at || userRes.rows[0].is_banned) {
          return res.status(401).json({
            error: 'Account not found or no longer active.',
            code: 'ACCOUNT_INVALID'
          })
        }

        const userRow = userRes.rows[0]
        const lastActiveTime = userRow.last_active_at ? new Date(userRow.last_active_at).getTime() : now

        if (now - lastActiveTime > FOURTEEN_DAYS_MS) {
          return res.status(401).json({
            error: 'You have been signed out due to 14 days of inactivity. Please sign in again.',
            code: 'SESSION_INACTIVE_14D'
          })
        }

        // Re-seed session into Redis cache
        await saveSession(token, userRow)
      } catch (dbErr) {
        // If DB fails temporarily, proceed with decoded token if not expired
        console.warn('[Auth Middleware] DB check notice:', dbErr.message)
      }
    }

    // 3. Check JWT 7-day expiration
    const tokenExpMs = decoded.exp ? decoded.exp * 1000 : 0
    const isTokenExpired = tokenExpMs > 0 && now >= tokenExpMs

    // If token has expired or is nearing expiration (< 2 days left), issue refreshed 7-day token
    // provided the user has been active within 14 days
    if (isTokenExpired || (tokenExpMs - now < 2 * 24 * 60 * 60 * 1000)) {
      const refreshedToken = jwt.sign(
        { id: decoded.id, email: decoded.email, is_admin: decoded.is_admin },
        JWT_SECRET,
        { expiresIn: '7d' }
      )
      await saveSession(refreshedToken, { id: decoded.id, email: decoded.email, is_admin: decoded.is_admin })
      res.setHeader('X-Refreshed-Token', refreshedToken)
      res.setHeader('Access-Control-Expose-Headers', 'X-Refreshed-Token')
    }

    // 4. Slide session activity forward in Redis (fast & non-blocking)
    touchSession(token, decoded.id).catch(() => {})

    // 5. Throttled update of users.last_active_at in PostgreSQL (every 15 mins)
    const lastDbTouch = dbTouchMap.get(decoded.id) || 0
    if (now - lastDbTouch > 15 * 60 * 1000) {
      dbTouchMap.set(decoded.id, now)
      query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [decoded.id]).catch(() => {})
    }

    req.user = decoded
    req.token = token
    next()
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired session token. Please sign in again.',
      code: 'TOKEN_INVALID'
    })
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true })
      req.user = decoded
      req.token = token
      touchSession(token, decoded.id).catch(() => {})
    } catch (_) {}
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' })
  }
  next()
}

export async function revokeSession(token) {
  try {
    await destroySession(token)
  } catch {}
}
