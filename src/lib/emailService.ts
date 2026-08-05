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
  fullName: string
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
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        // Create the auth user on first verification; profile rows are written
        // once the code is confirmed.
        shouldCreateUser: true,
        data: fullName ? { full_name: fullName.trim() } : undefined
      }
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
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
    const { error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token,
      type: 'email'
    });

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
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
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      return { success: false, message: toFriendlyAuthError(error).message };
    }

    return {
      success: true,
      message: `Password reset OTP code sent to ${cleanEmail}. Check your inbox.`
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
