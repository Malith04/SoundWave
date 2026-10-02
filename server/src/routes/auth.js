import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { query } from '../db/index.js'
import { authenticate, generateToken } from '../middleware/auth.js'
import { uploadProfileImage } from '../services/storage.js'
import { generateOtpCode, sendOtpEmail } from '../services/email.js'

const router = Router()

// Multer in-memory storage for streaming directly to Supabase S3 / local storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed.'))
    }
  }
})

// ── 0. Send 8-Digit OTP ───────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose = 'signup' } = req.body

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }

    const cleanEmail = email.trim().toLowerCase()

    if (purpose === 'signup') {
      const existing = await query('SELECT id, deleted_at, deletion_scheduled_for FROM users WHERE LOWER(email) = $1', [cleanEmail])
      if (existing.rows.length > 0) {
        const existingUser = existing.rows[0]
        if (existingUser.deleted_at) {
          const scheduledFor = existingUser.deletion_scheduled_for
            ? new Date(existingUser.deletion_scheduled_for)
            : new Date(new Date(existingUser.deleted_at).getTime() + 14 * 24 * 60 * 60 * 1000)

          if (new Date() < scheduledFor) {
            return res.status(400).json({
              error: 'This account was scheduled for deletion. Please sign in with your password to restore your account within 14 days.'
            })
          }
        } else {
          return res.status(400).json({ error: 'An account with this email already exists. Please log in instead.' })
        }
      }
    } else if (purpose === 'login') {
      const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [cleanEmail])
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'No account found with this email address.' })
      }
    } else if (purpose === 'google') {
      // Google verification applies to both new and existing users
    }

    // Rate limiting: 60-second cooldown per email & purpose
    const recentOtp = await query(
      `SELECT created_at FROM email_verifications
       WHERE LOWER(email) = $1 AND purpose = $2 AND created_at > NOW() - INTERVAL '60 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, purpose]
    )
    if (recentOtp.rows.length > 0) {
      return res.status(429).json({
        error: 'A verification code was already sent recently. Please check your inbox or wait 60 seconds before requesting a new code.'
      })
    }

    const otp = generateOtpCode()

    await query(
      `INSERT INTO email_verifications (email, otp_code, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
      [cleanEmail, otp, purpose]
    )

    await sendOtpEmail({ email: cleanEmail, otp, purpose })

    return res.json({
      success: true,
      message: `An 8-digit verification code has been sent to ${cleanEmail}.`
    })
  } catch (err) {
    console.error('Send OTP error:', err)
    return res.status(500).json({ error: 'Failed to send verification code. Please try again.' })
  }
})

// ── 0.1 Verify 8-Digit OTP ────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, purpose = 'signup' } = req.body

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and 8-digit OTP code are required.' })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.toString().trim()

    if (cleanOtp.length !== 8) {
      return res.status(400).json({ error: 'The verification code must be exactly 8 digits.' })
    }

    const result = await query(
      `SELECT * FROM email_verifications
       WHERE LOWER(email) = $1 AND purpose = $2 AND verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail, purpose]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No active verification code found. Please request a new code.' })
    }

    const verification = result.rows[0]

    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' })
    }

    if (verification.attempts >= 5) {
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new verification code.' })
    }

    if (verification.otp_code !== cleanOtp) {
      await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1', [verification.id])
      const remaining = 4 - verification.attempts
      return res.status(400).json({
        error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new code.'}`
      })
    }

    await query('UPDATE email_verifications SET verified = true WHERE id = $1', [verification.id])

    return res.json({
      success: true,
      verified: true,
      message: 'Code verified successfully.'
    })
  } catch (err) {
    console.error('Verify OTP error:', err)
    return res.status(500).json({ error: 'Failed to verify code.' })
  }
})

// ── 1. Register ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, otp } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Enforce 8-digit OTP verification
    if (!otp) {
      return res.status(400).json({ error: '8-digit verification code is required. Please verify your email.' })
    }

    const cleanOtp = otp.toString().trim()
    if (cleanOtp.length !== 8) {
      return res.status(400).json({ error: 'The verification code must be exactly 8 digits.' })
    }

    const otpCheck = await query(
      `SELECT id, otp_code, expires_at, verified, attempts
       FROM email_verifications
       WHERE LOWER(email) = $1 AND purpose = 'signup'
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail]
    )

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({ error: 'No verification code found. Please request a code first.' })
    }

    const verification = otpCheck.rows[0]

    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' })
    }

    if (!verification.verified && verification.otp_code !== cleanOtp) {
      return res.status(400).json({ error: 'Invalid 8-digit verification code.' })
    }

    // Mark OTP verified
    await query('UPDATE email_verifications SET verified = true WHERE id = $1', [verification.id])

    // Check if email already exists
    const existing = await query('SELECT id, deleted_at, deletion_scheduled_for FROM users WHERE LOWER(email) = $1', [cleanEmail])
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0]
      if (existingUser.deleted_at) {
        const scheduledFor = existingUser.deletion_scheduled_for
          ? new Date(existingUser.deletion_scheduled_for)
          : new Date(new Date(existingUser.deleted_at).getTime() + 14 * 24 * 60 * 60 * 1000)

        if (new Date() >= scheduledFor) {
          // Hard-delete expired account so user can register fresh
          await query('DELETE FROM users WHERE id = $1', [existingUser.id])
        } else {
          return res.status(400).json({
            error: 'This account was scheduled for deletion. Please sign in with your password to restore your account within the 14-day recovery window.'
          })
        }
      } else {
        return res.status(400).json({ error: 'An account with this email already exists.' })
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Insert user with email_verified = true
    const result = await query(
      `INSERT INTO users (email, password_hash, display_name, onboarding_completed, email_verified)
       VALUES ($1, $2, $3, false, true)
       RETURNING id, email, display_name, profile_pic_url, bio, gender, birth_date, country, language, favorite_genres, listening_vibe, onboarding_completed, subscription_tier, is_admin, email_verified, created_at`,
      [cleanEmail, passwordHash, name || '']
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
        emailVerified: true,
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

// ── 2. Login (with 8-Digit OTP 2FA Security) ───────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, otp } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const cleanEmail = email.trim().toLowerCase()

    const result = await query(
      `SELECT * FROM users WHERE LOWER(email) = $1`,
      [cleanEmail]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const user = result.rows[0]

    // Check credentials first
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // Check if account was scheduled for deletion
    let restored = false
    if (user.deleted_at) {
      const scheduledFor = user.deletion_scheduled_for
        ? new Date(user.deletion_scheduled_for)
        : new Date(new Date(user.deleted_at).getTime() + 14 * 24 * 60 * 60 * 1000)

      if (new Date() >= scheduledFor) {
        await query('DELETE FROM users WHERE id = $1', [user.id])
        return res.status(401).json({
          error: 'This account was scheduled for deletion and the 14-day backup recovery period has expired. The account has been permanently removed.'
        })
      }
    }

    // ── 2FA Passcode Verification ──
    if (!otp) {
      // Send 8-digit OTP to user's email
      const recentOtp = await query(
        `SELECT created_at FROM email_verifications
         WHERE LOWER(email) = $1 AND purpose = 'login' AND created_at > NOW() - INTERVAL '30 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail]
      )

      let otpCode
      if (recentOtp.rows.length > 0) {
        const active = await query(
          `SELECT otp_code FROM email_verifications
           WHERE LOWER(email) = $1 AND purpose = 'login' AND expires_at > NOW() AND verified = false
           ORDER BY created_at DESC LIMIT 1`,
          [cleanEmail]
        )
        otpCode = active.rows[0]?.otp_code || generateOtpCode()
      } else {
        otpCode = generateOtpCode()
        await query(
          `INSERT INTO email_verifications (email, otp_code, purpose, expires_at)
           VALUES ($1, $2, 'login', NOW() + INTERVAL '10 minutes')`,
          [cleanEmail, otpCode]
        )
        await sendOtpEmail({ email: cleanEmail, otp: otpCode, purpose: 'login' })
      }

      return res.json({
        requiresOtp: true,
        email: user.email,
        message: 'Security verification: An 8-digit passcode has been sent to your email.'
      })
    }

    // OTP was supplied: Validate it!
    const cleanOtp = otp.toString().trim()
    if (cleanOtp.length !== 8) {
      return res.status(400).json({ error: 'The passcode must be exactly 8 digits.' })
    }

    const otpCheck = await query(
      `SELECT id, otp_code, expires_at, verified, attempts
       FROM email_verifications
       WHERE LOWER(email) = $1 AND purpose = 'login' AND verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail]
    )

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({ error: 'No active login passcode found. Please request a new code.' })
    }

    const verification = otpCheck.rows[0]

    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({ error: 'Passcode has expired. Please request a new code.' })
    }

    if (verification.attempts >= 5) {
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new passcode.' })
    }

    if (verification.otp_code !== cleanOtp) {
      await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1', [verification.id])
      const remaining = 4 - verification.attempts
      return res.status(400).json({
        error: `Invalid passcode. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new passcode.'}`
      })
    }

    // Mark OTP as verified
    await query('UPDATE email_verifications SET verified = true WHERE id = $1', [verification.id])

    // If account was soft-deleted, restore from backup now
    if (user.deleted_at) {
      await query(
        `UPDATE users
         SET deleted_at = NULL,
             deletion_scheduled_for = NULL,
             email_verified = true,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      )
      restored = true
      user.deleted_at = null
      user.deletion_scheduled_for = null
    } else if (!user.email_verified) {
      await query('UPDATE users SET email_verified = true WHERE id = $1', [user.id])
      user.email_verified = true
    }

    const token = generateToken(user)

    return res.json({
      token,
      restored,
      message: restored
        ? 'Your account has been restored from backup! All your music and playlists are intact.'
        : undefined,
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
        emailVerified: true,
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

// ── 3. Google Sign-In / Up (with Permanent 8-Digit OTP Email Verification) ──
router.post('/google', async (req, res) => {
  try {
    const { email, name, photoURL, otp } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Google email is required.' })
    }

    const cleanEmail = email.trim().toLowerCase()

    // ── 1. Require 8-Digit Email Verification Code ──
    if (!otp) {
      const recentOtp = await query(
        `SELECT created_at FROM email_verifications
         WHERE LOWER(email) = $1 AND purpose = 'google' AND created_at > NOW() - INTERVAL '30 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail]
      )

      let otpCode
      if (recentOtp.rows.length > 0) {
        const active = await query(
          `SELECT otp_code FROM email_verifications
           WHERE LOWER(email) = $1 AND purpose = 'google' AND expires_at > NOW() AND verified = false
           ORDER BY created_at DESC LIMIT 1`,
          [cleanEmail]
        )
        otpCode = active.rows[0]?.otp_code || generateOtpCode()
      } else {
        otpCode = generateOtpCode()
        await query(
          `INSERT INTO email_verifications (email, otp_code, purpose, expires_at)
           VALUES ($1, $2, 'google', NOW() + INTERVAL '10 minutes')`,
          [cleanEmail, otpCode]
        )
        await sendOtpEmail({ email: cleanEmail, otp: otpCode, purpose: 'google' })
      }

      return res.json({
        requiresOtp: true,
        email: cleanEmail,
        googleProfile: {
          email: cleanEmail,
          name: name || '',
          photoURL: photoURL || ''
        },
        message: 'Security verification: An 8-digit passcode has been sent to your Google email.'
      })
    }

    // ── 2. OTP Provided: Validate Code ──
    const cleanOtp = otp.toString().trim()
    if (cleanOtp.length !== 8) {
      return res.status(400).json({ error: 'The verification passcode must be exactly 8 digits.' })
    }

    const otpCheck = await query(
      `SELECT id, otp_code, expires_at, verified, attempts
       FROM email_verifications
       WHERE LOWER(email) = $1 AND purpose = 'google' AND verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [cleanEmail]
    )

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({ error: 'No active verification code found for this Google account. Please request a new code.' })
    }

    const verification = otpCheck.rows[0]

    if (new Date() > new Date(verification.expires_at)) {
      return res.status(400).json({ error: 'Verification passcode has expired. Please request a new code.' })
    }

    if (verification.attempts >= 5) {
      return res.status(400).json({ error: 'Too many incorrect attempts. Please request a new passcode.' })
    }

    if (verification.otp_code !== cleanOtp) {
      await query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1', [verification.id])
      const remaining = 4 - verification.attempts
      return res.status(400).json({
        error: `Invalid passcode. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new passcode.'}`
      })
    }

    // Mark OTP verified
    await query('UPDATE email_verifications SET verified = true WHERE id = $1', [verification.id])

    // ── 3. Find or Create User & Permanently Mark email_verified = true ──
    let result = await query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail])
    let user
    let isNewUser = false
    let restored = false

    if (result.rows.length === 0) {
      isNewUser = true
      const randomPassword = Math.random().toString(36).slice(-12) + Date.now().toString(36)
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(randomPassword, salt)

      const insertRes = await query(
        `INSERT INTO users (email, password_hash, display_name, profile_pic_url, onboarding_completed, email_verified)
         VALUES ($1, $2, $3, $4, false, true)
         RETURNING *`,
        [cleanEmail, passwordHash, name || '', photoURL || '']
      )
      user = insertRes.rows[0]
    } else {
      user = result.rows[0]

      // Check if account was scheduled for deletion
      if (user.deleted_at) {
        const scheduledFor = user.deletion_scheduled_for
          ? new Date(user.deletion_scheduled_for)
          : new Date(new Date(user.deleted_at).getTime() + 14 * 24 * 60 * 60 * 1000)

        if (new Date() >= scheduledFor) {
          // Hard delete expired account, re-create as new user
          await query('DELETE FROM users WHERE id = $1', [user.id])
          isNewUser = true
          const randomPassword = Math.random().toString(36).slice(-12) + Date.now().toString(36)
          const salt = await bcrypt.genSalt(10)
          const passwordHash = await bcrypt.hash(randomPassword, salt)
          const insertRes = await query(
            `INSERT INTO users (email, password_hash, display_name, profile_pic_url, onboarding_completed, email_verified)
             VALUES ($1, $2, $3, $4, false, true)
             RETURNING *`,
            [cleanEmail, passwordHash, name || '', photoURL || '']
          )
          user = insertRes.rows[0]
        } else {
          // Within 14 days: Restore account from backup & ensure email_verified = true
          await query(
            `UPDATE users
             SET deleted_at = NULL,
                 deletion_scheduled_for = NULL,
                 email_verified = true,
                 updated_at = NOW()
             WHERE id = $1`,
            [user.id]
          )
          restored = true
          user.deleted_at = null
          user.deletion_scheduled_for = null
          user.email_verified = true
        }
      } else {
        // Permanently ensure email_verified is true
        if (!user.email_verified) {
          await query('UPDATE users SET email_verified = true WHERE id = $1', [user.id])
          user.email_verified = true
        }
      }

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
      restored,
      message: restored
        ? 'Your account has been restored from backup! All your music and playlists are intact.'
        : undefined,
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
        emailVerified: true,
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

// ── 5b. Upload Profile Picture (to Supabase Storage S3) ─────
router.post('/profile-picture', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' })
    }

    const publicUrl = await uploadProfileImage({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      userId: req.user.id
    })

    // Update profile_pic_url in users table
    const result = await query(
      `UPDATE users
       SET profile_pic_url = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, display_name, profile_pic_url, bio, gender, birth_date, country, language`,
      [publicUrl, req.user.id]
    )

    const user = result.rows[0]
    return res.json({
      message: 'Profile picture uploaded and saved successfully!',
      profilePicUrl: publicUrl,
      user: {
        uid: user.id,
        id: user.id,
        profilePicUrl: user.profile_pic_url
      }
    })
  } catch (err) {
    console.error('Upload profile picture error:', err)
    return res.status(500).json({ error: err.message || 'Failed to upload profile picture.' })
  }
})

// ── 6. Update Profile ───────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { displayName, name, bio, gender, birthDate, country, language, profilePicUrl } = req.body
    const finalName = displayName !== undefined ? displayName : name

    const result = await query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           bio = COALESCE($2, bio),
           gender = COALESCE($3, gender),
           birth_date = COALESCE($4, birth_date),
           country = COALESCE($5, country),
           language = COALESCE($6, language),
           profile_pic_url = COALESCE($7, profile_pic_url),
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, email, display_name, profile_pic_url, bio, gender, birth_date, country, language, subscription_tier, is_admin`,
      [finalName, bio, gender, birthDate, country, language, profilePicUrl, req.user.id]
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
      birthDate: user.birth_date,
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

// ── 7. Change Email ─────────────────────────────────────────
router.put('/email', authenticate, async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Check if email already in use by another user
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [cleanEmail, req.user.id])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This email is already associated with another account.' })
    }

    await query('UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2', [cleanEmail, req.user.id])

    return res.json({ message: 'Email address updated successfully.', email: cleanEmail })
  } catch (err) {
    console.error('Update email error:', err)
    return res.status(500).json({ error: 'Failed to update email address.' })
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

// ── 8. Delete Account (14-day Soft Delete with Backup Retention) ────
router.delete('/account', authenticate, async (req, res) => {
  try {
    const result = await query(
      `UPDATE users
       SET deleted_at = NOW(),
           deletion_scheduled_for = NOW() + INTERVAL '14 days',
           updated_at = NOW()
       WHERE id = $1
       RETURNING deleted_at, deletion_scheduled_for`,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    const { deleted_at, deletion_scheduled_for } = result.rows[0]

    return res.json({
      message: 'Account scheduled for deletion. Your profile, playlists, and music are safely backed up for 14 days. If you change your mind, simply log in within 14 days to restore everything.',
      deletedAt: deleted_at,
      deletionScheduledFor: deletion_scheduled_for
    })
  } catch (err) {
    console.error('Delete account error:', err)
    return res.status(500).json({ error: 'Failed to delete account.' })
  }
})

/**
 * Permanently purge accounts whose 14-day backup window has expired.
 * Cascades to playlists, songs, favorites, and history automatically via PostgreSQL foreign keys.
 */
export async function purgeExpiredAccounts() {
  try {
    const res = await query(
      `DELETE FROM users
       WHERE deleted_at IS NOT NULL
         AND (
           deletion_scheduled_for <= NOW()
           OR (deletion_scheduled_for IS NULL AND deleted_at <= NOW() - INTERVAL '14 days')
         )
       RETURNING id, email`
    )
    if (res.rows.length > 0) {
      console.log(`🧹 Purged ${res.rows.length} permanently expired account(s):`, res.rows.map(r => r.email))
    }
  } catch (err) {
    console.error('Error purging expired accounts:', err)
  }
}

export default router

