import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/soundwave'

const isRemoteDb = connectionString.includes('supabase.co') || 
                     connectionString.includes('pooler.supabase.com') || 
                     connectionString.includes('sslmode=require') ||
                     (!connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'))

export const pool = new Pool({
  connectionString,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
})

// Query helper with logging
export const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (process.env.DEBUG_SQL) {
      console.log('Executed query', { text, duration, rows: res.rowCount })
    }
    return res
  } catch (error) {
    console.error('Database query error:', { text, error: error.message })
    throw error
  }
}

// Automatic schema initialization
export async function initDb() {
  try {
    console.log('🔌 Connecting to PostgreSQL...')
    const client = await pool.connect()
    console.log('✅ PostgreSQL connected successfully!')

    const schemaPath = path.join(__dirname, 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8')
      console.log('⚡ Initializing database schema...')
      await client.query(sql)
      console.log('✅ Database schema verified and up to date!')
    }
    client.release()
    return true
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message)
    console.warn('⚠️  Ensure your PostgreSQL server is running and DATABASE_URL is set in server/.env')
    return false
  }
}
