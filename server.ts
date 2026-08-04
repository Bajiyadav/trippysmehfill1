import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import { createOtpStore } from './otpStore';
import { validateEmail, validateFullName, escapeHtml } from './src/lib/validation';

// Load .env.local first (Vite convention), then .env as a fallback.
// dotenv never overwrites an already-set variable, so .env.local wins.
dotenv.config({ path: '.env.local' });
dotenv.config();

const OTP_MAX_ATTEMPTS = 5;

// 10 minute TTL matches the wording in the email body.
const otpStore = createOtpStore({ ttlMs: 10 * 60 * 1000, maxAttempts: OTP_MAX_ATTEMPTS });

const normalizeEmail = (email: unknown) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

function buildOtpEmailHtml(otp: string, fullName?: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #121212; color: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #333333;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #f97316; font-size: 24px; margin: 0;">Trippy's Mehfill ERP</h1>
        <p style="color: #9ca3af; font-size: 13px; margin-top: 4px;">Hyderabad Cloud Kitchen & Food ERP</p>
      </div>

      <div style="background-color: #181818; padding: 20px; border-radius: 12px; border: 1px solid #282828; text-align: center;">
        <h2 style="font-size: 16px; color: #e5e7eb; margin-top: 0;">Registration Verification OTP</h2>
        <p style="color: #9ca3af; font-size: 14px;">Hello ${escapeHtml(fullName || 'Valued Customer')},</p>
        <p style="color: #d1d5db; font-size: 14px; margin-bottom: 20px;">Use the following 6-digit Security OTP code to complete your registration:</p>

        <div style="background-color: #000000; display: inline-block; padding: 14px 28px; border-radius: 10px; border: 2px solid #f97316; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f97316; font-family: monospace;">
          ${otp}
        </div>

        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">This code will expire in 10 minutes. Please do not share this code with anyone.</p>
      </div>

      <div style="text-align: center; margin-top: 24px; color: #6b7280; font-size: 11px;">
        &copy; ${new Date().getFullYear()} Trippy's Mehfill Cloud Kitchen. All rights reserved.
      </div>
    </div>
  `;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Generates a verification OTP server-side and emails it via Resend.
  // The code is NEVER returned to the client -- that is what makes it a secret.
  app.post('/api/send-verification-otp', async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';

      // Server-side enforcement. The client runs the same rules for fast feedback,
      // but anyone can skip the UI, so this is the check that actually counts.
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        return res.status(400).json({ success: false, error: emailCheck.message });
      }

      if (fullName) {
        const nameCheck = validateFullName(fullName);
        if (!nameCheck.valid) {
          return res.status(400).json({ success: false, error: nameCheck.message });
        }
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error('[Email] RESEND_API_KEY is not configured; cannot send verification email.');
        return res.status(503).json({
          success: false,
          error: 'Email delivery is not configured on the server. Please contact support.'
        });
      }

      const otp = otpStore.issue(email);

      const resend = new Resend(resendApiKey);
      const emailResponse = await resend.emails.send({
        from: 'Trippys Mehfill ERP <onboarding@resend.dev>',
        to: [email],
        subject: `${otp} is your Registration Security Code - Trippy's Mehfill`,
        html: buildOtpEmailHtml(otp, fullName)
      });

      if (emailResponse.error) {
        // Nothing was delivered, so don't leave a code the user can never know.
        otpStore.revoke(email);
        console.error('[Resend] Send failed:', emailResponse.error.message);
        return res.status(502).json({
          success: false,
          error: 'We could not send the verification email. Please try again shortly.'
        });
      }

      console.log(`[Resend] OTP email sent to ${email} (id: ${emailResponse.data?.id})`);
      return res.json({
        success: true,
        message: `Verification code sent to ${email}. Check your inbox.`
      });
    } catch (err: any) {
      console.error('[Email API] Unexpected failure:', err?.message || err);
      return res.status(500).json({
        success: false,
        error: 'Something went wrong while sending your verification code.'
      });
    }
  });

  // Verifies a submitted OTP against the server-side store.
  app.post('/api/verify-otp', (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : '';

      if (!email || !otp) {
        return res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
      }

      const result = otpStore.verify(email, otp);

      if (result.ok) {
        return res.json({ success: true, message: 'Email address verified successfully!' });
      }

      switch (result.reason) {
        case 'not_found':
        case 'expired':
          return res.status(400).json({
            success: false,
            error: 'This code has expired. Please request a new one.'
          });
        case 'too_many_attempts':
          return res.status(429).json({
            success: false,
            error: 'Too many incorrect attempts. Please request a new code.'
          });
        default:
          return res.status(400).json({
            success: false,
            error: result.remainingAttempts > 0
              ? `Invalid code. ${result.remainingAttempts} attempt(s) remaining.`
              : 'Too many incorrect attempts. Please request a new code.'
          });
      }
    } catch (err: any) {
      console.error('[Verify API] Unexpected failure:', err?.message || err);
      return res.status(500).json({ success: false, error: 'Could not verify the code right now.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Express + Resend API running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
