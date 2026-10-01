import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'soundwave_jwt_secret_key_2026_production'

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded // { id, email, is_admin }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      req.user = decoded
    } catch (_) {
      // Ignore invalid token in optional auth
    }
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Admin access required.' })
  }
  next()
}

export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      is_admin: user.is_admin || false 
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )
}
