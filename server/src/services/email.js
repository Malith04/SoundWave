import nodemailer from 'nodemailer'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config()
try {
  dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') })
} catch (_) {}

/**
 * Generate a cryptographically secure 8-digit OTP code (e.g., "74920153")
 */
export function generateOtpCode() {
  // Generates integer between 10000000 and 99999999
  const code = crypto.randomInt(10000000, 100000000).toString()
  return code
}

/**
 * Render clean, high-deliverability email content (both text and HTML)
 * Specifically formatted to bypass spam/phishing filters and land in the Primary Inbox.
 */
function renderOtpEmailContent({ otp, purpose, email }) {
  const isGoogle = purpose === 'google'
  const isSignup = purpose === 'signup'

  // Fresh high-reputation subject line to break similarity cache with previous flagged messages
  const subject = `SoundWave: ${otp} is your verification code`

  const textContent = [
    `SoundWave Security Verification`,
    ``,
    `Your 8-digit verification code is: ${otp}`,
    ``,
    `Enter this code to complete your ${isGoogle ? 'Google sign-in' : isSignup ? 'registration' : 'login'} on SoundWave.`,
    ``,
    `This code will expire in 10 minutes.`,
    ``,
    `If you did not request this, you can safely ignore this email.`,
    ``,
    `Best regards,`,
    `SoundWave Security Team`,
    `https://soundwave-official.netlify.app`
  ].join('\r\n')

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SoundWave Security Verification</title>
  <style>
    body, table, td, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #0e0e12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f3f4f6;">
  <!-- Outer Full-Width Table to force 100% centering and prevent mobile overflow -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" align="center" style="width: 100% !important; min-width: 100% !important; margin: 0 auto; padding: 16px 8px; background-color: #0e0e12;">
    <tr>
      <td align="center" valign="top" style="padding: 0; margin: 0;">
        
        <!-- Centered Card Container (Max 400px, 100% fluid on mobile screens) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="width: 100%; max-width: 400px; margin: 0 auto; background-color: #17171e; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 16px; overflow: hidden; box-sizing: border-box;">
          
          <!-- Header -->
          <tr>
            <td align="left" style="padding: 20px 20px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background-color: #17171e;">
              <span style="font-size: 19px; font-weight: 800; color: #1DB954; letter-spacing: -0.5px;">♫ SoundWave Security</span>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td align="left" style="padding: 20px 20px 22px; background-color: #17171e;">
              <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">Verification Code</h2>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #9ca3af;">
                Use the 8-digit code below to complete your ${isGoogle ? 'Google sign-in' : isSignup ? 'registration' : 'login'}:
              </p>

              <!-- Responsive OTP Box -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #20202a; border: 1px solid rgba(29, 185, 84, 0.35); border-radius: 12px; margin-bottom: 16px; box-sizing: border-box;">
                <tr>
                  <td align="center" style="padding: 16px 8px;">
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 28px; font-weight: 800; letter-spacing: 5px; color: #ffffff; line-height: 1.2;">
                      ${otp}
                    </div>
                    <div style="margin-top: 6px; font-size: 11px; color: #9ca3af;">
                      Valid for 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #6b7280;">
                If you did not request this code for <strong>${email}</strong>, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 14px 20px; background-color: #121217; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 11px; color: #6b7280; text-align: center;">
              Protected by SoundWave Security &amp; Privacy Policy
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  return { subject, textContent, htmlContent }
}

/**
 * Send email via official Google Gmail REST API (OAuth2 over HTTPS)
 * Sends multipart/alternative (plain text + clean HTML) with native Google DKIM signatures.
 */
async function sendViaGmailRestApi({ to, subject, textContent, htmlContent }) {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  const senderEmail = (process.env.GMAIL_SENDER_EMAIL || process.env.GMAIL_USER || 'malithrajamanthri@gmail.com').trim().toLowerCase()

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  try {
    // 1. Refresh access token from Google OAuth endpoint with 10s timeout
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        refresh_token: refreshToken.trim(),
        grant_type: 'refresh_token'
      }),
      signal: AbortSignal.timeout(10000)
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('[Email Service] Failed refreshing Google access token:', tokenData)
      return null
    }

    const accessToken = tokenData.access_token

    // 2. Build RFC 2046 multipart/alternative MIME message
    // Google's Gmail API automatically attaches authentic @mail.gmail.com Message-ID with full DKIM & SPF signatures.
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`
    const boundary = `----=_Part_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`

    const messageParts = [
      `From: SoundWave Security <${senderEmail}>`,
      `To: ${to.trim().toLowerCase()}`,
      `Date: ${new Date().toUTCString()}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Reply-To: SoundWave Security <${senderEmail}>`,
      'Auto-Submitted: auto-generated',
      'X-Auto-Response-Suppress: All',
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      textContent,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      htmlContent,
      '',
      `--${boundary}--`
    ]
    const rawMessage = messageParts.join('\r\n')
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // 3. Dispatch via Google Gmail REST API with 10s timeout
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedMessage }),
      signal: AbortSignal.timeout(10000)
    })

    const sendData = await sendRes.json()
    if (sendRes.ok && sendData.id) {
      console.log(`[Email Service] ✉️ Gmail REST API email dispatched to ${to}. Message ID:`, sendData.id)
      return { success: true, provider: 'gmail-rest-api', messageId: sendData.id }
    } else {
      console.error('[Email Service] Gmail REST API error:', sendData)
      return null
    }
  } catch (err) {
    console.error('[Email Service] Exception sending via Gmail REST API:', err.message)
    return null
  }
}

/**
 * Send OTP Email via Gmail REST API, Resend, Brevo, or Safe Dev Fallback
 * 
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.otp - 8-digit OTP string
 * @param {'signup' | 'login' | '2fa' | 'google'} params.purpose - Verification purpose
 * @returns {Promise<{ success: boolean, provider: string, message?: string }>}
 */
export async function sendOtpEmail({ email, otp, purpose = 'signup' }) {
  const { subject, textContent, htmlContent } = renderOtpEmailContent({ otp, purpose, email })
  const cleanRecipient = email.trim().toLowerCase()

  // 1. Google Gmail REST API (Priority #1: Official HTTPS OAuth2 - sends to ANY recipient in the world)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN) {
    const gmailRestResult = await sendViaGmailRestApi({ to: cleanRecipient, subject, textContent, htmlContent })
    if (gmailRestResult?.success) {
      return gmailRestResult
    }
  }

  // 2. Resend REST API (Fallback #1)
  const resendApiKey = process.env.RESEND_API_KEY
  if (resendApiKey && resendApiKey.startsWith('re_')) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'SoundWave Security <onboarding@resend.dev>'

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [cleanRecipient],
          subject,
          text: textContent,
          html: htmlContent
        }),
        signal: AbortSignal.timeout(8000)
      })

      const data = await response.json()
      if (response.ok && data.id) {
        console.log(`[Email Service] ✉️ Resend email dispatched to ${cleanRecipient}. ID:`, data.id)
        return { success: true, provider: 'resend', messageId: data.id }
      } else if (response.status === 403 && data.message && data.message.includes('only send testing emails to your own email address')) {
        console.warn(`[Email Service] ⚠️ Resend sandbox restriction for "${cleanRecipient}".`)
      } else {
        console.error('[Email Service] Resend API error response:', data)
      }
    } catch (resendErr) {
      console.error('[Email Service] Failed sending via Resend API:', resendErr.message)
    }
  }

  // 3. Brevo REST API (Fallback #2)
  const brevoApiKey = process.env.BREVO_API_KEY
  if (brevoApiKey) {
    try {
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_SENDER_EMAIL || 'malithrajamanthri@gmail.com'
      const senderName = process.env.BREVO_SENDER_NAME || 'SoundWave Security'
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey.trim(),
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: cleanRecipient }],
          subject,
          textContent,
          htmlContent
        }),
        signal: AbortSignal.timeout(8000)
      })
      const brevoData = await brevoRes.json()
      if (brevoRes.ok && brevoData.messageId) {
        console.log(`[Email Service] ✉️ Brevo email dispatched to ${cleanRecipient}. ID:`, brevoData.messageId)
        return { success: true, provider: 'brevo', messageId: brevoData.messageId }
      } else {
        console.warn('[Email Service] Brevo API response:', brevoData)
      }
    } catch (brevoErr) {
      console.error('[Email Service] Failed sending via Brevo API:', brevoErr.message)
    }
  }

  // 4. Gmail SMTP / Nodemailer (Fallback #3)
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000
      })

      const info = await transporter.sendMail({
        from: `"SoundWave Security" <${gmailUser}>`,
        to: email.trim().toLowerCase(),
        subject,
        text: textContent,
        html: htmlContent
      })

      console.log(`[Email Service] ✉️ Gmail SMTP dispatched to ${email}. MessageId:`, info.messageId)
      return { success: true, provider: 'gmail-smtp', messageId: info.messageId }
    } catch (smtpErr) {
      console.error('[Email Service] Failed sending via Gmail SMTP:', smtpErr.message)
    }
  }

  // 5. Dev / Sandbox Fallback (Logs clearly so testing never gets blocked)
  console.log('\n' + '='.repeat(68))
  console.log('🔐 [SOUNDWAVE SECURITY] ONE-TIME PASSCODE (DEV / CONSOLE FALLBACK)')
  console.log(`   To:       ${email}`)
  console.log(`   Purpose:  ${purpose.toUpperCase()}`)
  console.log(`   OTP CODE: [ ${otp} ] (8 DIGITS)`)
  console.log(`   Expires:  10 Minutes from now`)
  console.log('   Note:     Check GMAIL_REFRESH_TOKEN or RESEND_API_KEY for live delivery.')
  console.log('='.repeat(68) + '\n')

  return { success: true, provider: 'console-dev-fallback', otp }
}
