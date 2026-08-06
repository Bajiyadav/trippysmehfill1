/**
 * Translates Supabase Auth / network failures into messages a customer can act on.
 *
 * Supabase returns terse, sometimes internal-sounding strings ("Token has expired
 * or is invalid"). Showing those raw is confusing, and echoing them verbatim can
 * leak whether an account exists, so every known case is mapped deliberately.
 */

export type AuthErrorKind =
  | 'invalid_email'
  | 'expired_otp'
  | 'invalid_otp'
  | 'rate_limited'
  | 'network'
  | 'not_configured'
  | 'email_not_confirmed'
  | 'user_not_found'
  | 'unknown';

export interface FriendlyAuthError {
  kind: AuthErrorKind;
  message: string;
}

export const NOT_CONFIGURED_MESSAGE =
  'Sign-in is temporarily unavailable because the authentication service is not configured. Please contact support.';

const NETWORK_MESSAGE =
  'We could not reach the authentication service. Check your internet connection and try again.';

/** Supabase surfaces rate limits with a retry hint; keep it if we can find one. */
function extractRetrySeconds(message: string): number | null {
  const match = message.match(/(\d+)\s*seconds?/i);
  return match ? Number(match[1]) : null;
}

export function toFriendlyAuthError(error: unknown): FriendlyAuthError {
  if (!error) return { kind: 'unknown', message: 'Something went wrong. Please try again.' };

  const raw =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.error_description || '';
  const text = String(raw).toLowerCase();
  const status = Number((error as any)?.status) || 0;

  // Fetch failures surface as TypeError before any HTTP status exists.
  if (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network request failed') ||
    text.includes('load failed')
  ) {
    return { kind: 'network', message: NETWORK_MESSAGE };
  }

  if (status === 429 || text.includes('rate limit') || text.includes('too many requests')) {
    const seconds = extractRetrySeconds(raw);
    return {
      kind: 'rate_limited',
      message: seconds
        ? `Too many attempts. Please wait ${seconds} seconds before requesting another code.`
        : 'Too many attempts. Please wait a minute before requesting another code.'
    };
  }

  if (text.includes('expired')) {
    return {
      kind: 'expired_otp',
      message: 'That code has expired. Please request a new one.'
    };
  }

  // Checked BEFORE the invalid-code branch: Supabase phrases this as
  // "Signups not allowed for otp", which would otherwise match on "otp" and
  // tell an unknown user their code was wrong.
  if (text.includes('user not found') || text.includes('signups not allowed')) {
    return {
      kind: 'user_not_found',
      message: 'No account found for that email address. Please create an account first.'
    };
  }

  if (text.includes('email not confirmed')) {
    return {
      kind: 'email_not_confirmed',
      message: 'Please verify your email address before signing in.'
    };
  }

  if (text.includes('email address') && text.includes('invalid')) {
    return { kind: 'invalid_email', message: 'Please enter a valid email address.' };
  }

  if (
    text.includes('invalid token') ||
    text.includes('token has expired or is invalid') ||
    text.includes('invalid otp') ||
    text.includes('otp_expired') ||
    text.includes('invalid code')
  ) {
    return {
      kind: 'invalid_otp',
      message: 'That code is incorrect. Please check the 6-digit code in your email and try again.'
    };
  }

  if (
    text.includes('invalid login credentials') ||
    text.includes('invalid_grant') ||
    text.includes('invalid password') ||
    text.includes('invalid credentials')
  ) {
    return { kind: 'invalid_otp', message: 'Invalid email or password. Please check your details or reset your password.' };
  }

  if (status >= 500) {
    return {
      kind: 'network',
      message: 'The authentication service is temporarily unavailable. Please try again shortly.'
    };
  }

  return {
    kind: 'unknown',
    message: 'We could not complete that request. Please try again.'
  };
}
