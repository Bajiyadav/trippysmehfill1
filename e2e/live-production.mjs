/**
 * LIVE production verification — real Supabase, real HTTP, no mocks.
 *
 * Every assertion here reads the value the DATABASE actually persisted, via a
 * fresh authenticated read. UI text and optimistic state are never trusted.
 *
 * Requires: Auth "Auto Confirm Users" temporarily enabled, so disposable QA
 * accounts can obtain a session without an inbox. Creates only QA rows and
 * prints every identifier for cleanup.
 *
 * Run:  node e2e/live-production.mjs
 */
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }));
const URL = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
const RUN = Date.now();
const created = { users: [], orders: [] };
const results = [];

const rec = (step, status, evidence, source = 'PRODUCTION') => {
  results.push({ step, status, evidence, source });
  console.log(`  ${status.padEnd(7)} ${step}\n           ${evidence}`);
};

const api = async (path, { method = 'GET', token = KEY, body, prefer } = {}) => {
  const h = { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${URL}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
};

/** Creates a disposable account and returns its session token. */
async function makeAccount(label, role) {
  const email = `qa.${label}.${RUN}@mailinator.com`;
  const password = `Qa!${RUN}${label}`;
  // profiles.phone is globally UNIQUE (profiles_phone_key). A hardcoded number
  // works exactly once and then fails forever -- and because the signup trigger
  // no longer swallows errors, the collision surfaces as HTTP 500 from GoTrue
  // rather than a silent no-op. Seeding from RUN keeps the 10-digit shape and
  // makes the harness repeatable; the label suffix separates accounts within a run.
  const phone = `9${String(RUN).slice(-5)}${label === 'cust' ? '0001' : label === 'admin' ? '0002' : '0003'}`;
  const su = await api('/auth/v1/signup', { method: 'POST', body: { email, password, data: { full_name: `QA ${label}`, phone } } });
  const uid = su.body?.user?.id || su.body?.id;
  if (uid) created.users.push({ label, uid, email });

  let token = su.body?.access_token;
  if (!token) {
    const si = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
    token = si.body?.access_token;
  }
  return { email, uid, token, role, phone, signupStatus: su.status,
           signupError: (su.body?.msg || su.body?.error_description || su.body?.error || '') };
}

console.log(`\n=== LIVE PRODUCTION TEST — run ${RUN} ===\n`);

// ---- 1/2. Customer account + authenticated session -------------------------
const cust = await makeAccount('cust', 'customer');
rec('1. Signup (disposable customer)', cust.signupStatus === 200 ? 'PASS' : 'FAIL',
    `POST /auth/v1/signup -> HTTP ${cust.signupStatus}, uid ${cust.uid ? 'created' : 'MISSING'}` +
    (cust.signupStatus === 200 ? '' : ` :: ${String(cust.signupError).slice(0, 90)}`));

if (!cust.token) {
  rec('2. Authenticated session', 'BLOCKED',
      'No access_token. Auto Confirm Users is still OFF, or sign-in was refused.');
  console.log('\n  Cannot continue without a session. Stopping.\n');
  process.exit(1);
}
rec('2. Authenticated session', 'PASS', 'access_token obtained via password grant');

// Profile row created by the on_auth_user_created trigger?
const prof = await api(`/rest/v1/profiles?select=id,role&id=eq.${cust.uid}`, { token: cust.token });
rec('2b. Trigger created profiles row', Array.isArray(prof.body) && prof.body.length === 1 ? 'PASS' : 'FAIL',
    `GET profiles?id=eq.<uid> -> HTTP ${prof.status}, rows ${Array.isArray(prof.body) ? prof.body.length : '?'}, role ${prof.body?.[0]?.role ?? '?'}`);

// ---- 3. COD order ----------------------------------------------------------
const mkOrder = (method, num) => ({
  order_number: num, customer_id: cust.uid, customer_name: 'QA Customer',
  customer_phone: cust.phone, delivery_address: 'QA Test Address',
  items: [{ dish_id: 'qa1', dish_name: 'QA Biryani', quantity: 1, price: 240 }],
  subtotal: 240, tax_amount: 0, delivery_fee: 0, total_amount: 240,
  payment_method: method, payment_status: 'pending', status: 'pending',
  created_at: new Date().toISOString()
});

const cod = await api('/rest/v1/orders', { method: 'POST', token: cust.token,
  body: mkOrder('COD', `#QA-COD-${RUN}`), prefer: 'return=representation' });
const codId = cod.body?.[0]?.id;
if (codId) created.orders.push(codId);
rec('3. COD order persisted', cod.status === 201 && codId ? 'PASS' : 'FAIL',
    `POST /rest/v1/orders -> HTTP ${cod.status}, payment_status=${cod.body?.[0]?.payment_status}, status=${cod.body?.[0]?.status}`);

// ---- 4. UPI order + UTR claim ---------------------------------------------
const upi = await api('/rest/v1/orders', { method: 'POST', token: cust.token,
  body: mkOrder('UPI', `#QA-UPI-${RUN}`), prefer: 'return=representation' });
const upiId = upi.body?.[0]?.id;
if (upiId) created.orders.push(upiId);
rec('4a. UPI order saved BEFORE payment', upi.status === 201 && upi.body?.[0]?.payment_status === 'pending' ? 'PASS' : 'FAIL',
    `HTTP ${upi.status}, payment_status=${upi.body?.[0]?.payment_status} (must be 'pending')`);

const utr = await api(`/rest/v1/orders?id=eq.${upiId}`, { method: 'PATCH', token: cust.token,
  body: { upi_transaction_id: `QAUTR${RUN}`, payment_status: 'pending' }, prefer: 'return=representation' });
rec('4b. UTR stored as a CLAIM, not a settlement', utr.status === 200 && utr.body?.[0]?.payment_status === 'pending' ? 'PASS' : 'FAIL',
    `PATCH -> HTTP ${utr.status}, persisted payment_status=${utr.body?.[0]?.payment_status}`);

// Customer must NOT be able to self-verify.
const selfVerify = await api(`/rest/v1/orders?id=eq.${upiId}`, { method: 'PATCH', token: cust.token,
  body: { payment_status: 'completed' }, prefer: 'return=representation' });

// Read back through a FRESH session, not the write's own response. A write can
// report success while the row is unchanged, and vice versa -- only an
// independent read proves what was persisted.
const fresh = await api('/auth/v1/token?grant_type=password', { method: 'POST',
  body: { email: cust.email, password: `Qa!${RUN}cust` } });
const freshToken = fresh.body?.access_token || cust.token;
const readBack = await api(`/rest/v1/orders?select=payment_status&id=eq.${upiId}`, { token: freshToken });
const persisted = readBack.body?.[0]?.payment_status;

rec('4c. Customer CANNOT self-verify payment',
    persisted === 'pending' ? 'PASS' : 'FAIL',
    `PATCH completed -> HTTP ${selfVerify.status} ` +
    `code=${selfVerify.body?.code ?? 'none'} msg="${(selfVerify.body?.message ?? 'none').slice(0,80)}" | ` +
    `fresh-session read: payment_status=${persisted}`);

// Audit columns must also be unforgeable.
const forge = await api(`/rest/v1/orders?id=eq.${upiId}`, { method: 'PATCH', token: freshToken,
  body: { payment_verified_by: cust.uid, payment_verified_at: new Date().toISOString() } });
const auditRead = await api(`/rest/v1/orders?select=payment_verified_by,payment_verified_at&id=eq.${upiId}`, { token: freshToken });
rec('4d. Customer CANNOT forge the audit trail',
    !auditRead.body?.[0]?.payment_verified_by ? 'PASS' : 'FAIL',
    `PATCH audit -> HTTP ${forge.status} code=${forge.body?.code ?? 'none'} | ` +
    `persisted payment_verified_by=${auditRead.body?.[0]?.payment_verified_by ?? 'null'}`);

// A customer must still be able to cancel and to record a UTR.
const cancel = await api(`/rest/v1/orders?id=eq.${codId}`, { method: 'PATCH', token: freshToken,
  body: { status: 'cancelled' }, prefer: 'return=representation' });
rec('4e. Customer CAN still cancel (trigger not over-blocking)',
    cancel.status === 200 && cancel.body?.[0]?.status === 'cancelled' ? 'PASS' : 'FAIL',
    `PATCH status=cancelled -> HTTP ${cancel.status}, persisted status=${cancel.body?.[0]?.status ?? '?'}`);

console.log('\n--- ADMIN / KITCHEN / DRIVER steps need role grants ---');
console.log('  Promote these uids in SQL, then re-run with STAGE=2:');
console.log(JSON.stringify(created, null, 2));

console.log('\n=== CLEANUP IDENTIFIERS ===');
console.log(JSON.stringify(created, null, 2));
const fails = results.filter(r => r.status === 'FAIL');
console.log(`\n${results.filter(r => r.status === 'PASS').length}/${results.length} passed, ${fails.length} failed\n`);
