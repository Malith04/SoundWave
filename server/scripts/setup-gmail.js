import http from 'http'
import url from 'url'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')

const PORT = 5050
const REDIRECT_URI = `http://localhost:${PORT}`

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function run() {
  console.log('\n============================================================')
  console.log('   SoundWave - Google Gmail REST API Setup Wizard')
  console.log('============================================================')
  console.log('This will connect your Gmail account to SoundWave so you can')
  console.log('send verification codes to ANY email address for 100% FREE')
  console.log('(up to 500 emails per day) without needing a custom domain.\n')

  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  // Check for existing Client ID in .env
  const existingClientId = (envContent.match(/^GMAIL_CLIENT_ID=(.*)$/m) || [])[1] || ''
  const existingClientSecret = (envContent.match(/^GMAIL_CLIENT_SECRET=(.*)$/m) || [])[1] || ''

  let clientId = existingClientId
  let clientSecret = existingClientSecret

  if (!clientId || !clientSecret) {
    console.log('Step 1: Get your OAuth credentials from Google Cloud Console:')
    console.log('  1. Open: https://console.cloud.google.com/apis/credentials')
    console.log('  2. Click "+ CREATE CREDENTIALS" -> "OAuth client ID"')
    console.log('  3. Select "Desktop app" (or "Web application")')
    console.log(`  4. If Web app, set Authorized Redirect URI to: ${REDIRECT_URI}`)
    console.log('  5. Enable Gmail API at: https://console.cloud.google.com/apis/library/gmail.googleapis.com\n')

    if (!clientId) {
      clientId = (await ask('Enter your Google Client ID: ')).trim()
    }
    if (!clientSecret) {
      clientSecret = (await ask('Enter your Google Client Secret: ')).trim()
    }
  } else {
    console.log(`✅ Found Client ID in .env: ${clientId.substring(0, 20)}...`)
    console.log(`✅ Found Client Secret in .env: ******\n`)
  }

  if (!clientId || !clientSecret) {
    console.error('❌ Both Client ID and Client Secret are required. Exiting.')
    rl.close()
    process.exit(1)
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent'
  }).toString()

  console.log('\nStep 2: Authorize with your Google Account:')
  console.log('  Click or copy-paste this link into your browser:\n')
  console.log(`  👉 ${authUrl}\n`)
  console.log(`Waiting for authorization callback on ${REDIRECT_URI} ...\n`)

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true)
      const code = parsedUrl.query.code

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end('<h3>Missing authorization code. Please try again.</h3>')
        return
      }

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      })

      const tokenData = await tokenRes.json()

      if (!tokenRes.ok || !tokenData.refresh_token) {
        console.error('❌ Failed to get refresh token:', tokenData)
        res.writeHead(500, { 'Content-Type': 'text/html' })
        res.end(`<h3>Error: No refresh token returned.</h3><p>${JSON.stringify(tokenData)}</p>`)
        return
      }

      // Fetch user email
      let senderEmail = 'me'
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })
        const userData = await userRes.json()
        if (userData.email) senderEmail = userData.email
      } catch (e) {
        // Fallback
      }

      // Save to .env
      const refreshToken = tokenData.refresh_token
      let newEnv = envContent

      const setEnvVar = (key, val) => {
        const regex = new RegExp(`^#?\\s*${key}=.*$`, 'm')
        if (regex.test(newEnv)) {
          newEnv = newEnv.replace(regex, `${key}=${val}`)
        } else {
          newEnv += `\n${key}=${val}`
        }
      }

      setEnvVar('GMAIL_CLIENT_ID', clientId)
      setEnvVar('GMAIL_CLIENT_SECRET', clientSecret)
      setEnvVar('GMAIL_REFRESH_TOKEN', refreshToken)
      setEnvVar('GMAIL_SENDER_EMAIL', senderEmail)

      fs.writeFileSync(envPath, newEnv.trim() + '\n', 'utf8')

      console.log('============================================================')
      console.log(`✅ SUCCESS! Gmail account connected: ${senderEmail}`)
      console.log('✅ Updated server/.env with:')
      console.log(`   - GMAIL_CLIENT_ID=${clientId.substring(0, 15)}...`)
      console.log(`   - GMAIL_CLIENT_SECRET=******`)
      console.log(`   - GMAIL_REFRESH_TOKEN=${refreshToken.substring(0, 15)}...`)
      console.log(`   - GMAIL_SENDER_EMAIL=${senderEmail}`)
      console.log('============================================================\n')

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(`
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0b0b0f; color: #fff;">
          <h1 style="color: #1DB954;">🎉 SoundWave Gmail API Connected!</h1>
          <p>Authorized sender: <strong>${senderEmail}</strong></p>
          <p style="color: #9ca3af;">You can close this tab and return to your terminal.</p>
        </div>
      `)

      setTimeout(() => {
        server.close()
        rl.close()
        process.exit(0)
      }, 1000)

    } catch (err) {
      console.error('❌ Server error handling callback:', err)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('Internal server error: ' + err.message)
    }
  })

  server.listen(PORT, () => {
    // server listening
  })
}

run()
