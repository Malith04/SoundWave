import app from './app.js'
import dotenv from 'dotenv'
import { initDb } from './db/index.js'
import { purgeExpiredAccounts } from './routes/auth.js'

// Environment configuration & Google Gmail REST API integration
dotenv.config()

const PORT = process.env.PORT || 5000

// ── Start Local Server ──
async function start() {
  await initDb()

  // Run cleanup of any accounts whose 14-day recovery window expired
  await purgeExpiredAccounts()
  // Run periodic hourly check
  setInterval(purgeExpiredAccounts, 60 * 60 * 1000)

  app.listen(PORT, () => {
    console.log(`🚀 SoundWave Server running on http://localhost:${PORT}`)
    console.log(`📡 PostgreSQL API ready at http://localhost:${PORT}/api`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
})
