import nodemailer from 'nodemailer'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Generate a cryptographically secure 8-digit OTP code (e.g., "74920153")
 */
export function generateOtpCode() {
  // Generates integer between 10000000 and 99999999
  const code = crypto.randomInt(10000000, 100000000).toString()
  return code
}

/**
 * Render a beautiful, premium SoundWave HTML email template
 */
function renderOtpEmailTemplate({ otp, purpose, email }) {
  const isSignup = purpose === 'signup'
  const isGoogle = purpose === 'google'
  const title = isGoogle
    ? 'SoundWave Google Security Verification'
    : isSignup
    ? 'Verify Your SoundWave Account'
    : 'SoundWave Security Verification'
  const actionText = isGoogle
    ? 'We received a sign-in or registration attempt via Google for your SoundWave account. Please enter the following 8-digit one-time passcode (OTP) to complete verification:'
    : isSignup
    ? 'Thank you for joining SoundWave! Use the 8-digit verification code below to complete your registration:'
    : 'We received a sign-in attempt for your SoundWave account. Please enter the following 8-digit one-time passcode (OTP) to continue:'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0b0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0b0f; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #14141b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; background: linear-gradient(180deg, rgba(29, 185, 84, 0.15) 0%, rgba(20, 20, 27, 0) 100%);">
              <!-- SoundWave Logo Symbol -->
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 16px; background: linear-gradient(135deg, #1DB954 0%, #10b981 100%); text-align: center; box-shadow: 0 8px 24px rgba(29, 185, 84, 0.35);">
                <span style="font-size: 26px; color: #000000; font-weight: bold;">♫</span>
              </div>
              <h1 style="margin: 16px 0 6px; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">SoundWave</h1>
              <p style="margin: 0; font-size: 13px; color: #1DB954; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Security & Identity</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 10px 40px 30px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #f3f4f6;">${title}</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #9ca3af;">
                ${actionText}
              </p>

              <!-- 8-Digit OTP Code Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #1a1a24; border: 1px solid rgba(29, 185, 84, 0.3); border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #1DB954; margin-bottom: 8px;">
                      Your 8-Digit Verification Code
                    </div>
                    <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #ffffff; text-shadow: 0 0 20px rgba(29, 185, 84, 0.4); padding-left: 8px;">
                      ${otp}
                    </div>
                    <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">
                      ⏱ Expires in 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Warning -->
              <div style="background-color: rgba(255, 255, 255, 0.03); border-left: 3px solid #1DB954; border-radius: 4px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9ca3af;">
                  <strong>Never share this passcode.</strong> SoundWave support staff will never ask you for your verification code.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                If you did not make this request for <strong>${email}</strong>, you can safely ignore this email or review your account credentials.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #0e0e14; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} SoundWave Music Platform. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">
                Secured by Brevo & SoundWave Two-Factor Authentication Guard
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Send OTP Email via Brevo REST API, Gmail SMTP, or Safe Dev Fallback
 * 
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.otp - 8-digit OTP string
 * @param {'signup' | 'login' | '2fa'} params.purpose - Verification purpose
 * @returns {Promise<{ success: boolean, provider: string, message?: string }>}
 */
export async function sendOtpEmail({ email, otp, purpose = 'signup' }) {
  const isSignup = purpose === 'signup'
  const isGoogle = purpose === 'google'
  const subject = isGoogle
    ? `SoundWave - Google Sign-In Security Passcode: ${otp}`
    : isSignup
    ? `SoundWave - Your 8-Digit Verification Code: ${otp}`
    : `SoundWave - Login Security Passcode: ${otp}`
  const htmlContent = renderOtpEmailTemplate({ otp, purpose, email })

  // 1. Try Brevo REST API (api.brevo.com/v3/smtp/email)
  const brevoApiKey = process.env.BREVO_API_KEY
  if (brevoApiKey && brevoApiKey !== 'your_brevo_api_key_here') {
    try {
      const senderName = process.env.BREVO_SENDER_NAME || 'SoundWave'
      const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER || 'no-reply@soundwave.app'

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: email.trim().toLowerCase() }],
          subject,
          htmlContent
        })
      })

      const data = await response.json()
      if (response.ok) {
        console.log(`[Email Service] ✉️ Brevo email dispatched to ${email}. MessageId:`, data.messageId)
        return { success: true, provider: 'brevo', messageId: data.messageId }
      } else {
        console.error('[Email Service] Brevo API error response:', data)
      }
    } catch (brevoErr) {
      console.error('[Email Service] Failed sending via Brevo API:', brevoErr.message)
    }
  }

  // 2. Try Gmail SMTP / Nodemailer fallback
  const gmailUser = process.env.GMAIL_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      })

      const info = await transporter.sendMail({
        from: `"SoundWave Security" <${gmailUser}>`,
        to: email.trim().toLowerCase(),
        subject,
        html: htmlContent
      })

      console.log(`[Email Service] ✉️ Gmail SMTP dispatched to ${email}. MessageId:`, info.messageId)
      return { success: true, provider: 'gmail-smtp', messageId: info.messageId }
    } catch (smtpErr) {
      console.error('[Email Service] Failed sending via Gmail SMTP:', smtpErr.message)
    }
  }

  // 3. Dev / Sandbox Fallback (Logs clearly so testing never gets blocked)
  console.log('\n' + '='.repeat(68))
  console.log('🔐 [SOUNDWAVE SECURITY] ONE-TIME PASSCODE (DEV / CONSOLE FALLBACK)')
  console.log(`   To:       ${email}`)
  console.log(`   Purpose:  ${purpose.toUpperCase()}`)
  console.log(`   OTP CODE: [ ${otp} ] (8 DIGITS)`)
  console.log(`   Expires:  10 Minutes from now`)
  console.log('   Note:     Configure BREVO_API_KEY or GMAIL_APP_PASSWORD in server/.env for live delivery.')
  console.log('='.repeat(68) + '\n')

  return { success: true, provider: 'console-dev-fallback' }
}
