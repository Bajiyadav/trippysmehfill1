import { supabase, isSupabaseConfigured } from './supabase';
import { toFriendlyAuthError, NOT_CONFIGURED_MESSAGE } from './authErrors';
import { validateEmail } from './validation';

export interface SendOtpResult {
  success: boolean;
  message: string;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  userId?: string;
}

/**
 * Sends a 6-digit email verification code using Supabase Auth.
 *
 * Supabase generates, stores, expires and rate-limits the code, and delivers the
 * email. Nothing about the code is ever visible to this application, which is
 * what makes the check meaningful -- an earlier version generated the code in
 * the browser and compared it there, so it could be read and bypassed.
 */
export async function sendEmailVerificationOTP(
  email: string,
  fullName: string,
  password?: string
): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    // 1. Try signUp first so Supabase triggers "Confirm sign up" email template
    const { error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password || 'TrippysPass@123456!',
      options: {
        data: fullName ? { full_name: fullName.trim() } : undefined
      }
    });

    if (signUpErr) {
      const msg = String(signUpErr.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        const { error: resendErr } = await supabase.auth.resend({
          type: 'signup',
          email: cleanEmail
        });
        if (resendErr) {
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: { shouldCreateUser: true }
          });
          if (otpErr) {
            console.error('[Auth] sendEmailVerificationOTP fallback error:', otpErr);
            return { success: false, message: toFriendlyAuthError(otpErr).message };
          }
        }
      } else {
        // Fallback to signInWithOtp if signUp throws custom error
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: true,
            data: fullName ? { full_name: fullName.trim() } : undefined
          }
        });
        if (otpErr) {
          console.error('[Auth] sendEmailVerificationOTP error:', otpErr);
          return { success: false, message: toFriendlyAuthError(signUpErr).message };
        }
      }
    }

    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. Check your inbox (and spam folder).`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Sends a sign-in code to an EXISTING account only.
 *
 * `shouldCreateUser: false` means an unknown address is rejected rather than
 * silently registered.
 */
export async function sendSignInOTP(email: string): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false }
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return {
      success: true,
      message: `Sign-in code sent to ${cleanEmail}. Check your inbox.`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Verifies the code with Supabase. On success Supabase establishes a session,
 * which the auth context picks up via onAuthStateChange.
 */
export async function verifyEmailOTPCode(
  email: string,
  enteredOtp: string
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const token = enteredOtp.trim();

  if (!token) {
    return { success: false, message: 'Please enter the verification code sent to your email.' };
  }

  if (!/^\d{6,8}$/.test(token)) {
    return { success: false, message: 'Enter the verification code from your email.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    // 1. Try type: 'signup' first for Confirm Sign Up email verification
    const { error: signupError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'signup'
    });

    if (!signupError) {
      return { success: true, message: 'Email address verified successfully!' };
    }

    // 2. Fallback to type: 'email' if magic link / email OTP was sent
    const { error: emailError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'email'
    });

    if (emailError) {
      return { success: false, message: toFriendlyAuthError(signupError || emailError).message };
    }

    return { success: true, message: 'Email address verified successfully!' };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Sends a password reset OTP code to the user's registered email.
 */
export async function sendPasswordResetOTP(email: string): Promise<SendOtpResult> {
  const cleanEmail = email.trim().toLowerCase();

  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.valid) {
    return { success: false, message: emailCheck.message };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    // 1. Check if profile exists using SECURITY DEFINER RPC
    const { data: exists } = await supabase.rpc('check_profile_exists', { p_email: cleanEmail });

    // Anti-account enumeration: Return generic success message even if account does not exist
    if (exists === false) {
      return {
        success: true,
        message: `If an account with "${cleanEmail}" exists in our system, a password reset OTP code has been dispatched to your inbox.`
      };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: false }
    });

    if (error) {
      console.error('[Auth] sendPasswordResetOTP error:', error);
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return {
      success: true,
      message: `If an account with "${cleanEmail}" exists in our system, a password reset OTP code has been dispatched to your inbox.`
    };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}

/**
 * Verifies the password reset OTP code and updates the user's password.
 */
export async function resetPasswordWithOTP(
  email: string,
  enteredOtp: string,
  newPassword: string
): Promise<VerifyOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  const token = enteredOtp.trim();

  if (!token) {
    return { success: false, message: 'Please enter the verification code sent to your email.' };
  }

  if (!/^\d{6,8}$/.test(token)) {
    return { success: false, message: 'Enter the verification code from your email.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: NOT_CONFIGURED_MESSAGE };
  }

  try {
    // 1. Verify recovery OTP to establish session
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'recovery'
    });

    if (verifyError) {
      // Fallback try type 'email' if recovery token type is set as email
      const { error: emailVerifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: 'email'
      });
      if (emailVerifyError) {
        return { success: false, message: toFriendlyAuthError(verifyError).message };
      }
    }

    // 2. Update user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return { success: false, message: toFriendlyAuthError(updateError).message };
    }

    return { success: true, message: 'Your password has been updated successfully! You are now signed in.' };
  } catch (err) {
    return { success: false, message: toFriendlyAuthError(err).message };
  }
}
