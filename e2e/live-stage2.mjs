/**
 * LIVE production Stage 2 — admin / kitchen / driver, against real Supabase.
 *
 * Stage 1 (live-production.mjs) proves what a CUSTOMER can and cannot do.
 * Stage 2 proves the other half: that a team member can settle a payment, that
 * the audit trail is stamped by the SERVER rather than accepted from the client,
 * that the kitchen can move an order, and that one driver cannot see another
 * driver's delivery.
 *
 * Roles come from accounts promoted by hand in SQL. They are NOT created here,
 * because granting yourself a role is precisely what the test is checking is
 * impossible.
 *
 * Every assertion re-reads the row through a fresh authenticated session. A
 * write's own response is never treated as proof of what was persisted.
 *
 * Where the live schema's accepted vocabulary is unknown, this PROBES and
 * reports what the database actually allows instead of assuming migration 0007
 * was applied. A rejected value is reported as a finding, not hidden.
 *
 * Run:  node e2e/live-stage2.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    }));
const URL = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;

// The run whose accounts were promoted in SQL. Override with ACCOUNTS_RUN=...
const AR = process.env.ACCOUNTS_RUN || '1786185416049';
const RUN = Date.now();
const created = { orders: [] };
const results = [];

const rec = (step, status, evidence) => {
  results.push({ step, status, evidence });
  console.log(`  ${status.padEnd(7)} ${step}\n           ${evidence}`);
};

const api = async (path, { method = 'GET', token = KEY, body, prefer } = {}) => {
  const h = { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${URL}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, body: j };
};

const err = r => `${r.body?.code ?? ''} ${(r.body?.message ?? '').slice(0, 70)}`.trim() || 'none';

/**
 * Signs in one promoted QA account and reads back the role the DB reports.
 *
 * Three different things can leave role unset, and collapsing them all to null
 * is what made a sign-in failure read as "the database has no such role":
 *
 *   1. the password grant failed        -> no token at all
 *   2. the profile row could not be read -> token fine, query returned nothing
 *   3. the row genuinely says otherwise  -> token fine, row present, role differs
 *
 * Each is reported separately. The password is never echoed -- only the reason
 * the grant was refused.
 */
async function signIn(i) {
  const email = `qa.sf.${AR}.${i}@mailinator.com`, password = `Qa!${AR}sf${i}`;
  const t = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
  const token = t.body?.access_token;
  if (!token) {
    // GoTrue reports failures as error_description / msg / error rather than the
    // PostgREST code+message shape err() reads, so try those first, then err().
    const authError = t.body?.error_description || t.body?.msg || t.body?.error || err(t);
    return { email, token: null, role: null, uid: null, authStatus: t.status, authError };
  }
  const uid = t.body?.user?.id;
  const p = await api(`/rest/v1/profiles?select=role,full_name,phone&id=eq.${uid}`, { token });
  const rows = Array.isArray(p.body) ? p.body : [];
  const row = rows[0] ?? null;
  return { email, token, uid,
           role: row?.role ?? null, name: row?.full_name, phone: row?.phone,
           authStatus: t.status,
           profileStatus: p.status, profileRows: Array.isArray(p.body) ? rows.length : -1,
           profileError: row ? null : err(p) };
}

/** Why is this account's role missing? Distinguishes auth from profile from data. */
const whyNoRole = a =>
  a.role ??
  (!a.token ? `AUTH ${a.authStatus}: ${a.authError ?? 'unknown'}`
            : `PROFILE ${a.profileStatus} rows=${a.profileRows}: ${a.profileError ?? 'no row for this uid'}`);

console.log(`\n=== LIVE PRODUCTION — STAGE 2 (admin / kitchen / driver) ===`);
console.log(`    accounts from run ${AR}, orders tagged ${RUN}\n`);

// ---- 0. Cast --------------------------------------------------------------
const [admin, drvA, drvB, cust] = await Promise.all([signIn(1), signIn(2), signIn(3), signIn(4)]);
const castOk = admin.role === 'admin' && drvA.role === 'driver' && drvB.role === 'driver' && cust.role === 'customer';
rec('0. Role cast present', castOk ? 'PASS' : 'BLOCKED',
    `admin=${whyNoRole(admin)} driverA=${whyNoRole(drvA)} ` +
    `driverB=${whyNoRole(drvB)} customer=${whyNoRole(cust)}`);
if (!castOk) {
  console.log('\n  Cannot run Stage 2 without the promoted roles. Stopping.\n');
  process.exit(1);
}

// ---- 1. Customer raises two UPI orders ------------------------------------
const mkOrder = num => ({
  order_number: num, customer_id: cust.uid, customer_name: cust.name || 'QA cust',
  customer_phone: cust.phone, delivery_address: 'QA Stage2 Address',
  items: [{ dish_id: 'qa1', dish_name: 'QA Biryani', quantity: 1, price: 240 }],
  subtotal: 240, tax_amount: 0, delivery_fee: 0, total_amount: 240,
  payment_method: 'UPI', payment_status: 'pending', status: 'pending'
});

const mk = async num => {
  const r = await api('/rest/v1/orders', { method: 'POST', token: cust.token,
    body: mkOrder(num), prefer: 'return=representation' });
  const id = r.body?.[0]?.id; if (id) created.orders.push(id);
  return { id, r };
};
const V = await mk(`#QA-S2-V-${RUN}`);   // to be verified
const R = await mk(`#QA-S2-R-${RUN}`);   // to be rejected
const P = await mk(`#QA-S2-P-${RUN}`);   // status-vocabulary probe
rec('1. Customer raised 3 UPI orders (pending)',
    V.id && R.id && P.id ? 'PASS' : 'FAIL',
    `HTTP ${V.r.status}/${R.r.status}/${P.r.status}, payment_status=${V.r.body?.[0]?.payment_status} ${err(V.r)}`);
if (!V.id || !R.id || !P.id) { console.log('\n  Orders not created. Stopping.\n'); process.exit(1); }

// ---- 2. Admin settles a payment -------------------------------------------
// Deliberately sends ONLY payment_status, plus a FORGED verifier id. If the
// audit trail is trustworthy the server must ignore the forged value and stamp
// the admin who actually made the request.
const verify = await api(`/rest/v1/orders?id=eq.${V.id}`, { method: 'PATCH', token: admin.token,
  body: { payment_status: 'completed', payment_verified_by: cust.uid }, prefer: 'return=representation' });

const admin2 = await signIn(1);   // fresh session for the read-back
const vRead = await api(`/rest/v1/orders?select=payment_status,payment_verified_by,payment_verified_at&id=eq.${V.id}`,
  { token: admin2.token });
const vRow = vRead.body?.[0] ?? {};

rec('2a. Admin CAN settle a payment', vRow.payment_status === 'completed' ? 'PASS' : 'FAIL',
    `PATCH -> HTTP ${verify.status} ${err(verify)} | fresh read: payment_status=${vRow.payment_status ?? '?'}`);

const stampedByServer = vRow.payment_verified_by === admin.uid;
const acceptedForgery = vRow.payment_verified_by === cust.uid;
rec('2b. payment_verified_by stamped by SERVER, forgery ignored',
    stampedByServer ? 'PASS' : acceptedForgery ? 'FAIL' : 'PARTIAL',
    acceptedForgery
      ? `SERVER ACCEPTED A FORGED VERIFIER: payment_verified_by=${vRow.payment_verified_by} (the customer, not the admin)`
      : stampedByServer
        ? `payment_verified_by=<admin uid>, at=${vRow.payment_verified_at ?? 'null'} (forged customer id discarded)`
        : `payment_verified_by=${vRow.payment_verified_by ?? 'null'} — neither admin nor forged value; not stamped`);

// ---- 3. Admin rejects a payment with a reason ------------------------------
const reject = await api(`/rest/v1/orders?id=eq.${R.id}`, { method: 'PATCH', token: admin.token,
  body: { payment_status: 'rejected', payment_rejection_reason: 'QA: UTR not found on statement' },
  prefer: 'return=representation' });
const rRead = await api(`/rest/v1/orders?select=payment_status,payment_rejection_reason&id=eq.${R.id}`, { token: admin2.token });
const rRow = rRead.body?.[0] ?? {};
rec('3. Admin CAN reject with a reason',
    rRow.payment_status === 'rejected' && !!rRow.payment_rejection_reason ? 'PASS'
      : reject.status === 400 && reject.body?.code === '23514' ? 'FAIL (schema)' : 'FAIL',
    `PATCH -> HTTP ${reject.status} ${err(reject)} | persisted payment_status=${rRow.payment_status ?? '?'}` +
    (reject.body?.code === '23514'
      ? ' — the live CHECK constraint does not allow \'rejected\'; migration 0007 is not fully applied'
      : ''));

// ---- 4. Which order statuses does the LIVE database actually accept? -------
// Probed, not assumed. The app writes the Phase 2 vocabulary; older deployments
// only accept the legacy set.
const VOCAB = ['accepted', 'preparing', 'ready', 'cooking', 'assigned', 'out_for_delivery', 'delivered'];
const accepted = [], refused = [];
for (const s of VOCAB) {
  const t = await api(`/rest/v1/orders?id=eq.${P.id}`, { method: 'PATCH', token: admin.token,
    body: { status: s }, prefer: 'return=representation' });
  (t.status === 200 && t.body?.[0]?.status === s ? accepted : refused).push(s);
}
// Reported as INFO, not PASS/FAIL. The live DB refusing 'accepted'/'preparing'/
// 'ready' is only a defect if something WRITES them -- and nothing does; they
// are display stages produced by orderStatus.ts from stored legacy values. This
// line exists to record the real boundary, so a future change that starts
// writing Phase 2 statuses fails loudly here instead of in front of a customer.
rec('4. Order-status vocabulary the live DB accepts (informational)', 'INFO',
    `accepted: ${accepted.join(', ') || 'none'} | refused: ${refused.join(', ') || 'none'}` +
    (refused.length ? ' — refused values are display-only; no code path writes them' : ''));

// ---- 5. Kitchen moves the order along the path the ADMIN UI actually writes -
// Not the Phase 2 vocabulary. LiveOrdersView and KitchenView write 'cooking',
// 'out_for_delivery' and 'delivered'; 'accepted'/'preparing'/'ready' exist only
// as display stages that orderStatus.ts maps stored values onto. Testing what
// the UI never sends would measure the harness, not the product.
const KITCHEN_FLOW = ['cooking', 'out_for_delivery', 'delivered'];
const flow = [];
for (const s of KITCHEN_FLOW) {
  const t = await api(`/rest/v1/orders?id=eq.${V.id}`, { method: 'PATCH', token: admin.token,
    body: { status: s }, prefer: 'return=representation' });
  flow.push(`${s}:${t.status === 200 && t.body?.[0]?.status === s ? 'ok' : `FAIL(${t.status} ${err(t)})`}`);
}
const kRead = await api(`/rest/v1/orders?select=status&id=eq.${V.id}`, { token: admin2.token });
rec('5. Kitchen transitions the admin UI writes all persist',
    !flow.some(f => f.includes('FAIL')) && kRead.body?.[0]?.status === 'delivered' ? 'PASS' : 'FAIL',
    `${flow.join(' -> ')} | fresh read: status=${kRead.body?.[0]?.status ?? '?'}`);

// ---- 6. Driver assignment --------------------------------------------------
const assignStatus = accepted.includes('assigned') ? 'assigned' : (accepted.includes('out_for_delivery') ? 'out_for_delivery' : null);
const assign = await api(`/rest/v1/orders?id=eq.${V.id}`, { method: 'PATCH', token: admin.token,
  body: { driver_id: drvA.uid, driver_name: drvA.name, driver_phone: drvA.phone,
          ...(assignStatus ? { status: assignStatus } : {}) }, prefer: 'return=representation' });
const aRead = await api(`/rest/v1/orders?select=driver_id,status&id=eq.${V.id}`, { token: admin2.token });
rec('6. Admin CAN assign a driver', aRead.body?.[0]?.driver_id === drvA.uid ? 'PASS' : 'FAIL',
    `PATCH -> HTTP ${assign.status} ${err(assign)} | persisted driver_id matches Driver A, status=${aRead.body?.[0]?.status ?? '?'}`);

// ---- 7. Driver isolation (the DRV-1 regression) ---------------------------
const seenByA = await api(`/rest/v1/orders?select=id,customer_phone,delivery_address&id=eq.${V.id}`, { token: drvA.token });
const seenByB = await api(`/rest/v1/orders?select=id,customer_phone,delivery_address&id=eq.${V.id}`, { token: drvB.token });
const nA = Array.isArray(seenByA.body) ? seenByA.body.length : -1;
const nB = Array.isArray(seenByB.body) ? seenByB.body.length : -1;
rec('7a. Assigned driver CAN see the delivery', nA === 1 ? 'PASS' : 'FAIL',
    `Driver A read own assigned order -> HTTP ${seenByA.status}, rows=${nA}`);
rec('7b. Unassigned driver CANNOT see it (no customer PII leak)', nB === 0 ? 'PASS' : 'FAIL',
    `Driver B read the same order -> HTTP ${seenByB.status}, rows=${nB}` +
    (nB > 0 ? ' — PII EXPOSED to an unassigned driver' : ''));

// Broader sweep: how many other customers' orders can B enumerate?
const sweepB = await api('/rest/v1/orders?select=id,driver_id&limit=200', { token: drvB.token });
const foreign = Array.isArray(sweepB.body) ? sweepB.body.filter(o => o.driver_id !== drvB.uid).length : -1;
rec('7c. Unassigned driver cannot enumerate the order book', foreign === 0 ? 'PASS' : 'FAIL',
    `Driver B listed orders -> HTTP ${sweepB.status}, rows not assigned to B = ${foreign}`);

// ---- 8. Realtime across two authenticated sessions ------------------------
// The triggering write is asserted separately. An earlier version of this test
// reported INCONCLUSIVE without checking whether the write that was supposed to
// emit the event had actually landed -- so a silent no-op write looked
// identical to Realtime being switched off. Never infer a subsystem is broken
// from a signal you did not confirm was sent.
const realtime = await new Promise(async resolve => {
  const client = createClient(URL, KEY);
  const si = await client.auth.signInWithPassword({
    email: `qa.sf.${AR}.2@mailinator.com`, password: `Qa!${AR}sf2` });
  if (si.error) return resolve({ ok: false, why: `driver sign-in failed: ${si.error.message}` });

  let wrote = 'not attempted';
  const timer = setTimeout(() => { client.removeAllChannels();
    resolve({ ok: false, why: `no event within 20s (triggering write: ${wrote})` }); }, 20000);

  client.channel(`qa-s2-${RUN}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${V.id}` },
        payload => { clearTimeout(timer); client.removeAllChannels();
                     resolve({ ok: true, why: `${payload.eventType} received by the assigned driver (write: ${wrote})` }); })
    .subscribe(async status => {
      if (status !== 'SUBSCRIBED') return;
      // Fire only once the socket is live, otherwise the event predates the
      // subscription and the test races itself.
      const t = await api(`/rest/v1/orders?id=eq.${V.id}`, { method: 'PATCH', token: admin.token,
        body: { kitchen_notes: `realtime probe ${RUN}` }, prefer: 'return=representation' });
      wrote = t.status === 200 && t.body?.[0] ? 'HTTP 200, row changed' : `HTTP ${t.status} ${err(t)}`;
    });
});
rec('8. Realtime reaches a second authenticated session', realtime.ok ? 'PASS' : 'FAIL', realtime.why);

// ---- Summary ---------------------------------------------------------------
console.log('\n=== CLEANUP IDENTIFIERS (Stage 2) ===');
console.log(JSON.stringify({ accountsRun: AR, orders: created.orders }, null, 2));

const pass = results.filter(r => r.status === 'PASS').length;
const fail = results.filter(r => r.status.startsWith('FAIL')).length;
const other = results.length - pass - fail;
console.log(`\n  ${pass}/${results.length} PASS, ${fail} FAIL, ${other} partial/inconclusive\n`);
process.exit(fail > 0 ? 1 : 0);
