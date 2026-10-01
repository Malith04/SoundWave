import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ikwchzuwlmzakmzwytgq.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'SoundWave File Bucket'

let supabase = null

if (SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    })
    console.log('✅ Supabase Storage client initialized for bucket:', BUCKET_NAME)
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err.message)
  }
} else {
  console.log('ℹ️ Supabase Storage key not set in server/.env; using local static storage fallback until SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is provided.')
}

/**
 * Uploads an image buffer to Supabase Storage (S3-compatible bucket).
 * Gracefully falls back to server local uploads/avatars directory if Supabase credentials are not configured yet.
 * 
 * @param {Object} params
 * @param {Buffer} params.buffer - Image file buffer
 * @param {string} params.originalName - Original filename
 * @param {string} params.mimeType - Mime type (e.g. image/jpeg, image/png)
 * @param {string} params.userId - Current user ID
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadProfileImage({ buffer, originalName, mimeType, userId }) {
  const ext = path.extname(originalName || '') || '.jpg'
  const cleanExt = ext.startsWith('.') ? ext : `.${ext}`
  const fileName = `user-${userId || 'anon'}-${Date.now()}${cleanExt}`
  const storagePath = `avatars/${fileName}`

  // 1. Try Supabase Storage (S3)
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: mimeType || 'image/jpeg',
          upsert: true
        })

      if (error) {
        console.error('Supabase Storage upload error:', error)
        throw error
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

      if (publicData?.publicUrl) {
        console.log('✅ Successfully uploaded image to Supabase S3 bucket:', publicData.publicUrl)
        return publicData.publicUrl
      }
    } catch (err) {
      console.warn('⚠️ Supabase Storage upload failed, falling back to local storage:', err.message)
    }
  }

  // 2. Fallback: Save to local uploads/avatars directory
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  const localFilePath = path.join(uploadsDir, fileName)
  fs.writeFileSync(localFilePath, buffer)

  const port = process.env.PORT || 5000
  const localUrl = `http://localhost:${port}/uploads/avatars/${fileName}`
  console.log('📁 Saved image to local server uploads:', localUrl)
  return localUrl
}

export { supabase, BUCKET_NAME }
