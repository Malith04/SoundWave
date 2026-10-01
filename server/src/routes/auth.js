import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db/index.js'
import { authenticate, generateToken } from '../middleware/auth.js'

const router = Router()

// ── 1. Register ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, onboarding_completed)
       VALUES ($1, $2, $3, false)
       RETURNING id, email, display_name, profile_pic_url, bio, gender, birth_date, country, language, favorite_genres, listening_vibe, onboarding_completed, subscription_tier, is_admin, created_at`,
      [email.trim().toLowerCase(), passwordHash, name || '']
    )

    const user = result.rows[0]
    const token = generateToken(user)

    return res.status(201).json({
      token,
      isNewUser: true,
      user: {
        uid: user.id,
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        profilePicUrl: user.profile_pic_url,
        bio: user.bio,
        gender: user.gender,
        birthDate: user.birth_date,
        country: user.country,
        language: user.language,
        favoriteGenres: user.favorite_genres || [],
        listeningVibe: user.listening_vibe || '',
        onboardingCompleted: user.onboarding_completed || false,
        subscriptionTier: user.subscription_tier,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    })
  } catch (err) {
    console.error('Registration error:', err)
    return res.status(500).json({ error: 'Failed to create account.' })
  }
})

// ── 2. Login ────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const result = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = generateToken(user)

    return res.json({
      token,
      user: {
        uid: user.id,
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        profilePicUrl: user.profile_pic_url,
        bio: user.bio,
        gender: user.gender,
        birthDate: user.birth_date,
        country: user.country,
        language: user.language,
        favoriteGenres: user.favorite_genres || [],
        listeningVibe: user.listening_vibe || '',
        onboardingCompleted: user.onboarding_completed || false,
        subscriptionTier: user.subscription_tier,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Failed to log in.' })
  }
})

// ── 3. Google Sign-In / Up ──────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { email, name, photoURL } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' })
    }

    let result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()])
    let user
    let isNewUser = false

    if (result.rows.length === 0) {
      isNewUser = true
      // Create user with a random secure password
      const randomPassword = Math.random().toString(36).slice(-12) + Date.now().toString(36)
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(randomPassword, salt)

      const insertRes = await query(
        `INSERT INTO users (email, password_hash, display_name, profile_pic_url, onboarding_completed)
         VALUES ($1, $2, $3, $4, false)
         RETURNING *`,
        [email.trim().toLowerCase(), passwordHash, name || '', photoURL || '']
      )
      user = insertRes.rows[0]
    } else {
      user = result.rows[0]
      // Update profile pic if provided and user has none
      if (photoURL && !user.profile_pic_url) {
        await query('UPDATE users SET profile_pic_url = $1 WHERE id = $2', [photoURL, user.id])
        user.profile_pic_url = photoURL
      }
    }

    const token = generateToken(user)

    return res.json({
      token,
      isNewUser: isNewUser || !user.onboarding_completed,
      user: {
        uid: user.id,
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        profilePicUrl: user.profile_pic_url,
        bio: user.bio,
        gender: user.gender,
        birthDate: user.birth_date,
        country: user.country,
        language: user.language,
        favoriteGenres: user.favorite_genres || [],
        listeningVibe: user.listening_vibe || '',
        onboardingCompleted: user.onboarding_completed || false,
        subscriptionTier: user.subscription_tier,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    })
  } catch (err) {
    console.error('Google auth error:', err)
    return res.status(500).json({ error: 'Google authentication failed.' })
  }
})

// ── 4. Complete Onboarding ──────────────────────────────────
router.post('/onboarding', authenticate, async (req, res) => {
  try {
    const { displayName, birthDate, gender, favoriteGenres, listeningVibe } = req.body

    const result = await query(
      `UPDATE users
       SET display_name = COALESCE(NULLIF($1, ''), display_name),
           birth_date = COALESCE($2, birth_date),
           gender = COALESCE($3, gender),
           favorite_genres = COALESCE($4, favorite_genres),
           listening_vibe = COALESCE($5, listening_vibe),
           onboarding_completed = true,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        displayName ? displayName.trim() : null,
        birthDate || '',
        gender || '',
        Array.isArray(favoriteGenres) ? favoriteGenres : [],
        listeningVibe || '',
        req.user.id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    const user = result.rows[0]
    return res.json({
      message: 'Onboarding completed successfully!',
      user: {
        uid: user.id,
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        profilePicUrl: user.profile_pic_url,
        bio: user.bio,
        gender: user.gender,
        birthDate: user.birth_date,
        country: user.country,
        language: user.language,
        favoriteGenres: user.favorite_genres || [],
        listeningVibe: user.listening_vibe || '',
        onboardingCompleted: user.onboarding_completed,
        subscriptionTier: user.subscription_tier,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      }
    })
  } catch (err) {
    console.error('Onboarding error:', err)
    return res.status(500).json({ error: 'Failed to complete onboarding.' })
  }
})

// ── 5. Get Current User Profile ─────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, display_name, profile_pic_url, bio, gender, birth_date, country, language, favorite_genres, listening_vibe, onboarding_completed, subscription_tier, is_admin, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    const user = result.rows[0]

    // Fetch user's favorite song IDs
    const favResult = await query(
      `SELECT song_id FROM user_favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    )
    const favoriteSongs = favResult.rows.map(r => r.song_id)

    // Fetch user's recently played song IDs
    const recentResult = await query(
      `SELECT song_id FROM recently_played WHERE user_id = $1 ORDER BY played_at DESC LIMIT 30`,
      [user.id]
    )
    const recentlyPlayed = recentResult.rows.map(r => r.song_id)

    return res.json({
      uid: user.id,
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      profilePicUrl: user.profile_pic_url,
      bio: user.bio,
      gender: user.gender,
      birthDate: user.birth_date,
      country: user.country,
      language: user.language,
      favoriteGenres: user.favorite_genres || [],
      listeningVibe: user.listening_vibe || '',
      onboardingCompleted: user.onboarding_completed || false,
      subscriptionTier: user.subscription_tier,
      isAdmin: user.is_admin,
      favoriteSongs,
      recentlyPlayed,
      createdAt: user.created_at
    })
  } catch (err) {
    console.error('Get profile error:', err)
    return res.status(500).json({ error: 'Failed to fetch user profile.' })
  }
})

// ── 6. Update Profile ───────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { displayName, name, bio, gender, country, language, profilePicUrl } = req.body
    const finalName = displayName !== undefined ? displayName : name

    const result = await query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           gender = COALESCE($3, gender),
           country = COALESCE($4, country),
           language = COALESCE($5, language),
           profile_pic_url = COALESCE($6, profile_pic_url),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, display_name, profile_pic_url, bio, gender, country, language, subscription_tier, is_admin`,
      [finalName, bio, gender, country, language, profilePicUrl, req.user.id]
    )

    const user = result.rows[0]
    return res.json({
      uid: user.id,
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      profilePicUrl: user.profile_pic_url,
      bio: user.bio,
      gender: user.gender,
      country: user.country,
      language: user.language,
      subscriptionTier: user.subscription_tier
    })
  } catch (err) {
    console.error('Update profile error:', err)
    return res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// ── 6. Change Password ──────────────────────────────────────
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' })
    }

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    if (currentPassword) {
      const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash)
      if (!valid) {
        return res.status(400).json({ error: 'Current password is incorrect.' })
      }
    }

    const salt = await bcrypt.genSalt(10)
    const newHash = await bcrypt.hash(newPassword, salt)

    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id])

    return res.json({ message: 'Password updated successfully.' })
  } catch (err) {
    console.error('Change password error:', err)
    return res.status(500).json({ error: 'Failed to change password.' })
  }
})

// ── 7. Forgot Password ──────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required.' })

    const result = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()])
    // For privacy, always return success message even if email wasn't found
    return res.json({ message: 'Password reset link sent if account exists.' })
  } catch (err) {
    return res.status(500).json({ error: 'Failed to process password reset.' })
  }
})

// ── 8. Delete Account ───────────────────────────────────────
router.delete('/account', authenticate, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.user.id])
    return res.json({ message: 'Account deleted successfully.' })
  } catch (err) {
    console.error('Delete account error:', err)
    return res.status(500).json({ error: 'Failed to delete account.' })
  }
})

export default router
