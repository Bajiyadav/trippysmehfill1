import crypto from 'crypto';

export type VerifyFailureReason = 'not_found' | 'expired' | 'too_many_attempts' | 'invalid';

export interface VerifyResult {
  ok: boolean;
  /** Why verification failed. Only present when `ok` is false. */
  reason?: VerifyFailureReason;
  /** Wrong guesses still allowed before the code is burned. Only present when `ok` is false. */
  remainingAttempts?: number;
}

export interface OtpStoreOptions {
  /** How long an issued code stays valid. Defaults to 10 minutes. */
  ttlMs?: number;
  /** Wrong guesses allowed before the code is burned. Defaults to 5. */
  maxAttempts?: number;
  /** Injectable clock, so tests can advance time without sleeping. */
  now?: () => number;
}

interface PendingOtp {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

const hashOtp = (otp: string) => crypto.createHash('sha256').update(otp).digest('hex');

/** Constant-time compare so a wrong code can't be recovered by timing the response. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Server-side store for pending email verification codes.
 *
 * The plaintext code is returned exactly once, from `issue()`, so the caller can
 * email it. After that it exists only as a SHA-256 hash -- it is never readable
 * again, and in particular is never sent to the browser.
 *
 * NOTE: in-memory, so single-process only. A multi-instance deployment needs a
 * shared store (Redis, or a Supabase table with a TTL).
 */
export function createOtpStore(options: OtpStoreOptions = {}) {
  const ttlMs = options.ttlMs ?? 10 * 60 * 1000;
  const maxAttempts = options.maxAttempts ?? 5;
  const now = options.now ?? (() => Date.now());

  const pending = new Map<string, PendingOtp>();

  function purgeExpired() {
    const t = now();
    for (const [email, entry] of pending) {
      if (entry.expiresAt <= t) pending.delete(email);
    }
  }

  return {
    /** Generates a cryptographically random 6-digit code and stores its hash. */
    issue(email: string): string {
      const otp = crypto.randomInt(100000, 1000000).toString();
      purgeExpired();
      pending.set(email, {
        codeHash: hashOtp(otp),
        expiresAt: now() + ttlMs,
        attempts: 0
      });
      return otp;
    },

    verify(email: string, otp: string): VerifyResult {
      const entry = pending.get(email);

      if (!entry) {
        return { ok: false, reason: 'not_found', remainingAttempts: 0 };
      }

      if (entry.expiresAt <= now()) {
        pending.delete(email);
        return { ok: false, reason: 'expired', remainingAttempts: 0 };
      }

      if (entry.attempts >= maxAttempts) {
        pending.delete(email);
        return { ok: false, reason: 'too_many_attempts', remainingAttempts: 0 };
      }

      if (!safeEqual(hashOtp(otp), entry.codeHash)) {
        entry.attempts += 1;
        const remainingAttempts = Math.max(0, maxAttempts - entry.attempts);
        if (remainingAttempts === 0) pending.delete(email);
        return { ok: false, reason: 'invalid', remainingAttempts };
      }

      // Single use: burn the code as soon as it succeeds.
      pending.delete(email);
      return { ok: true };
    },

    /** Drops a pending code, e.g. when the email it was issued for failed to send. */
    revoke(email: string): void {
      pending.delete(email);
    },

    /** Test/diagnostic helper: number of codes currently outstanding. */
    size(): number {
      purgeExpired();
      return pending.size;
    }
  };
}

export type OtpStore = ReturnType<typeof createOtpStore>;
