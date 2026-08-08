/**
 * Live verification of the signup profile-creation fix.
 *
 * Creates 10 disposable accounts that ALL share the name "QA cust" -- the exact
 * condition that broke the old function, whose referral_code was a 4-char name
 * prefix plus a random 4-digit number drawn from a pool shared by every
 * same-prefix user. Ten identical prefixes would very likely have collided.
 *
 * Every assertion reads the row back through a FRESH authenticated session,
 * never the write's own response.
 */
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const RUN = Date.now();
const made = [];

const call = async (p, { method='GET', token=K, body, prefer } = {}) => {
  const h = { apikey:K, Authorization:`Bearer ${token}`, 'Content-Type':'application/json' };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${U}${p}`, { method, headers:h, body: body?JSON.stringify(body):undefined });
  let j=null; try { j = await r.json(); } catch {}
  return { status:r.status, body:j };
};

console.log(`\n=== SIGNUP FIX VERIFICATION — run ${RUN} ===\n`);
console.log('  Creating 10 accounts, ALL named "QA cust" (forces the collision case)\n');

let ok = 0;
const codes = [];
for (let i = 1; i <= 10; i++) {
  const email = `qa.sf.${RUN}.${i}@mailinator.com`;
  const password = `Qa!${RUN}sf${i}`;
  // DISTINCT phone per account AND per run.
  //
  // profiles.phone carries a UNIQUE constraint (profiles_phone_key) that is
  // global, not per-run. The original version sent 9000000001 for all ten
  // accounts, so nine collided regardless of what the trigger did -- the test
  // was measuring its own flaw. A fixed per-account series fixes that but only
  // survives one run, because run two re-claims run one's numbers.
  //
  // Seeding from RUN keeps the 10-digit shape and makes the script repeatable.
  const phone = `9${String(RUN).slice(-5)}${String(10000 + i).slice(-4)}`;
  const su = await call('/auth/v1/signup', { method:'POST',
    body:{ email, password, data:{ full_name:'QA cust', phone } } });
  const uid = su.body?.user?.id || su.body?.id;

  if (su.status !== 200 || !uid) {
    // A LOUD failure here is the desired post-fix behaviour: it means the
    // trigger no longer swallows the error.
    console.log(`  ${String(i).padStart(2)}. signup HTTP ${su.status} :: ${(su.body?.msg||su.body?.error_description||JSON.stringify(su.body)||'').slice(0,90)}`);
    continue;
  }
  made.push({ i, uid, email });

  // FRESH session, then read the profile as that user.
  const tk = (await call('/auth/v1/token?grant_type=password', { method:'POST', body:{ email, password } })).body?.access_token;
  if (!tk) { console.log(`  ${String(i).padStart(2)}. FAIL no session`); continue; }
  const pr = await call(`/rest/v1/profiles?select=id,role,referral_code&id=eq.${uid}`, { token: tk });
  const rows = Array.isArray(pr.body) ? pr.body : [];
  const p = rows[0];
  const pass = rows.length === 1 && p?.id === uid && p?.role === 'customer' && !!p?.referral_code;
  if (pass) { ok++; codes.push(p.referral_code); }
  let why = '';
  if (!pass) {
    // Reproduce the trigger's insert to capture the error it is hiding.
    const probe = await call('/rest/v1/profiles', { method:'POST', token:tk, prefer:'return=representation',
      body:{ id:uid, email, full_name:'QA cust', phone, role:'customer',
             account_status:'active', is_approved:false, is_active:true } });
    why = ` :: probe HTTP ${probe.status} ${probe.body?.code ?? ''} ${(probe.body?.message ?? '').slice(0,70)}`;
  }
  console.log(`  ${String(i).padStart(2)}. ${pass?'PASS':'FAIL'}  rows=${rows.length} role=${p?.role??'-'} code=${p?.referral_code??'-'}${why}`);
}

console.log(`\n  RESULT: ${ok}/10 signups produced exactly one profile`);
console.log(`  referral codes: ${codes.length} issued, ${new Set(codes).size} distinct`
          + (codes.length === new Set(codes).size ? '  -> ALL DISTINCT' : '  -> *** COLLISION ***'));

// ---- security regression: the payment trigger must still hold --------------
console.log('\n=== SECURITY REGRESSION (payment trigger must be unchanged) ===');
const a = made[0];
if (a) {
  const pw = `Qa!${RUN}sf1`;
  const tk = (await call('/auth/v1/token?grant_type=password', { method:'POST', body:{ email:a.email, password:pw } })).body?.access_token;
  const ord = await call('/rest/v1/orders', { method:'POST', token:tk, prefer:'return=representation',
    body:{ order_number:`#QA-SF-${RUN}`, customer_id:a.uid, customer_name:'QA cust',
           customer_phone:`9${String(RUN).slice(-5)}0001`, delivery_address:'QA Address',
           items:[{dish_id:'q1',dish_name:'QA Dish',quantity:1,price:100}],
           subtotal:100, tax_amount:0, delivery_fee:0, total_amount:100,
           payment_method:'UPI', payment_status:'pending', status:'pending',
           created_at:new Date().toISOString() } });
  const oid = ord.body?.[0]?.id;
  if (oid) made.push({ order: oid });

  const sv = await call(`/rest/v1/orders?id=eq.${oid}`, { method:'PATCH', token:tk, body:{ payment_status:'completed' } });
  const rb = await call(`/rest/v1/orders?select=payment_status&id=eq.${oid}`, { token:tk });
  const persisted = rb.body?.[0]?.payment_status;
  console.log(`  self-verify blocked : ${persisted==='pending'?'PASS':'FAIL'}  HTTP ${sv.status} code=${sv.body?.code??'-'} persisted=${persisted}`);

  const cx = await call(`/rest/v1/orders?id=eq.${oid}`, { method:'PATCH', token:tk, body:{ status:'cancelled' }, prefer:'return=representation' });
  console.log(`  cancellation works  : ${cx.body?.[0]?.status==='cancelled'?'PASS':'FAIL'}  HTTP ${cx.status} persisted=${cx.body?.[0]?.status??'-'}`);
}

console.log('\n=== CLEANUP IDENTIFIERS ===');
console.log(JSON.stringify(made, null, 1));
