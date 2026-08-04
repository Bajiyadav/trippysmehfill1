import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOtpStore } from './otpStore';

const EMAIL = 'customer@example.com';

test('issues a 6-digit numeric code', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  assert.match(otp, /^\d{6}$/);
});

test('issued codes are not all identical (uses a real RNG)', () => {
  const store = createOtpStore();
  const codes = new Set(Array.from({ length: 50 }, () => store.issue(EMAIL)));
  assert.ok(codes.size > 1, 'expected varied codes across 50 issues');
});

test('accepts the correct code', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  assert.deepEqual(store.verify(EMAIL, otp), { ok: true });
});

test('rejects an incorrect code', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  const wrong = otp === '000000' ? '111111' : '000000';
  const result = store.verify(EMAIL, wrong);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, 'invalid');
});

test('a code is single use -- replaying it fails', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  assert.deepEqual(store.verify(EMAIL, otp), { ok: true });

  const replay = store.verify(EMAIL, otp);
  assert.equal(replay.ok, false);
  assert.equal(replay.ok === false && replay.reason, 'not_found');
});

test('a code issued for one email does not verify another', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  const result = store.verify('attacker@example.com', otp);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, 'not_found');
});

test('expires after the TTL', () => {
  let clock = 1_000_000;
  const store = createOtpStore({ ttlMs: 60_000, now: () => clock });
  const otp = store.issue(EMAIL);

  clock += 59_000;
  assert.equal(store.verify(EMAIL, otp).ok, true, 'should still be valid before TTL');

  const otp2 = store.issue(EMAIL);
  clock += 60_001;
  const result = store.verify(EMAIL, otp2);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, 'expired');
});

test('burns the code after max wrong attempts (brute force guard)', () => {
  const store = createOtpStore({ maxAttempts: 3 });
  const otp = store.issue(EMAIL);
  const wrong = otp === '000000' ? '111111' : '000000';

  for (let i = 0; i < 3; i++) {
    const r = store.verify(EMAIL, wrong);
    assert.equal(r.ok, false);
  }

  // Even the CORRECT code must now fail -- the entry is gone.
  const afterLockout = store.verify(EMAIL, otp);
  assert.equal(afterLockout.ok, false);
  assert.equal(afterLockout.ok === false && afterLockout.reason, 'not_found');
});

test('reports a decreasing remaining-attempts count', () => {
  const store = createOtpStore({ maxAttempts: 3 });
  store.issue(EMAIL);
  const remaining = [0, 1, 2].map(() => {
    const r = store.verify(EMAIL, '000000');
    return r.ok === false ? r.remainingAttempts : -1;
  });
  assert.deepEqual(remaining, [2, 1, 0]);
});

test('revoke drops a pending code', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  store.revoke(EMAIL);
  const result = store.verify(EMAIL, otp);
  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.reason, 'not_found');
});

test('expired entries are purged rather than accumulating', () => {
  let clock = 0;
  const store = createOtpStore({ ttlMs: 1_000, now: () => clock });
  store.issue('a@example.com');
  store.issue('b@example.com');
  assert.equal(store.size(), 2);

  clock += 1_001;
  assert.equal(store.size(), 0);
});

test('tolerates whitespace-free exact matching only', () => {
  const store = createOtpStore();
  const otp = store.issue(EMAIL);
  // Padded input must not match; the route layer is responsible for trimming.
  const result = store.verify(EMAIL, ` ${otp} `);
  assert.equal(result.ok, false);
});
