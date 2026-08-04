export interface SendOtpResult {
  success: boolean;
  message: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
}

const GENERIC_SEND_FAILURE =
  'We could not send the verification code right now. Please check your connection and try again.';
const GENERIC_VERIFY_FAILURE =
  'We could not verify the code right now. Please check your connection and try again.';

/**
 * Asks the server to generate and email a 6-digit verification code.
 *
 * The code itself is generated and stored server-side and is deliberately never
 * returned here -- the browser must not be able to see the value it is meant to
 * be proving knowledge of.
 */
export async function sendEmailVerificationOTP(
  email: string,
  fullName: string
): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const response = await fetch('/api/send-verification-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, fullName })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        message: data?.error || GENERIC_SEND_FAILURE
      };
    }

    return {
      success: true,
      message: data.message || `Verification code sent to ${cleanEmail}. Check your inbox.`
    };
  } catch (err) {
    console.error('Failed to request verification OTP:', err);
    return { success: false, message: GENERIC_SEND_FAILURE };
  }
}

/**
 * Submits the user's entered code to the server, which is the only party that
 * knows the expected value.
 */
export async function verifyEmailOTPCode(
  email: string,
  enteredOtp: string
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanEntered = enteredOtp.trim();

  if (!cleanEntered) {
    return { success: false, message: 'Please enter the 6-digit code sent to your email.' };
  }

  try {
    const response = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanEntered })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return {
        success: false,
        message: data?.error || 'Invalid 6-digit OTP code. Please check the code sent to your email.'
      };
    }

    return {
      success: true,
      message: data.message || 'Email address verified successfully!'
    };
  } catch (err) {
    console.error('Failed to verify OTP:', err);
    return { success: false, message: GENERIC_VERIFY_FAILURE };
  }
}
