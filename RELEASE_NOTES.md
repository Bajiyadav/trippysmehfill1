# Release Notes — RC1 (Phase 3)

| | |
|---|---|
| Release | **RC1** — Payment Verification |
| Commit | `8092424` — *feat: phase 3 payment verification* |
| Branch | `feat/supabase-auth-otp` (pushed to `origin`) |
| Date prepared | 2026-08-07 |
| Requires | **Migration 0007** — the release does not function without it |
| Status | Code complete and frozen. **Not yet released to production** — see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) |

---

## Summary

A UPI payment now stays at **Pending Verification** until a member of the
restaurant team confirms the money actually arrived, then flips to **Payment
Confirmed** or **Payment Rejected** on the customer's screen without a refresh.

Before this release there was no way to move an order out of Pending
Verification at all. UPI orders would have sat there indefinitely.

---

## Features

### Admin — Payment Verification

A new tab between Live Orders and Kitchen, showing every UPI order with:

Order ID · Customer · Phone · Amount · Payment Method · Transaction ID ·
Created Time · Payment Status

- **✅ Verify Payment** — sets `payment_status = completed`
- **❌ Reject Payment** — sets `payment_status = rejected`, with an optional reason

Cash orders are excluded: there is no transfer to check, so listing them would
only be noise for whoever works the queue.

- Search across order number, customer name, phone, transaction reference and amount
- Filters: Pending Verification (default) · Verified · Rejected · All UPI Orders
- Pagination, 10 per page, with the page index clamped so a live update cannot
  drop a reader onto a blank screen
- Pending count badge on the tab
- Rejection takes two deliberate steps — reason panel, then Confirm — because it
  is destructive from the customer's side
- Transaction reference is click-to-copy
- Created Time is **absolute**, not "5 minutes ago", so it can be matched against
  a bank statement
- Table at `lg`+, cards below; all buttons ≥48 px

### Customer — live payment status

| State | Label | Note |
|---|---|---|
| UPI, unsettled | Pending Verification | We are checking your transfer. |
| UPI, verified | **Payment Confirmed** | — |
| UPI, rejected | **Payment Rejected** | **Please contact the restaurant.** |
| COD, unsettled | Pay on delivery | — |
| COD, collected | Paid | — |

Shown on the checkout confirmation, the order tracker, and My Orders. All three
update over realtime with no refresh.

Toasts on settlement:

- **"Payment received and verified."** — Your order is confirmed.
- **"Payment rejected."** — Please contact the restaurant.

Nothing is announced while the payment is still pending: no decision has been
made, so there is no news.

### Order tracking

The tracker now leads with the four facts — **Order Status · Payment Status ·
Estimated Delivery · Order Timeline** — before the diagram, because someone
opening it wants to know where things stand.

**UPI**

```
Order Placed → Payment Pending → Payment Confirmed → Preparing → Out for Delivery → Delivered
```

**Cash on delivery**

```
Order Placed → Preparing → Out for Delivery → Delivered
```

Payment steps appear for UPI only. Showing a cash order "Payment Pending" would
invent a wait that does not exist.

A rejected payment marks its step red and renames it **Payment Rejected** — it
does not truncate the timeline. The order still exists and the kitchen steps are
still reachable once the customer sorts the payment out.

---

## Bug fixes

### The tracker was frozen on payment status

The live-tracking effect compared only `status`, so a verification arriving while
a customer had the tracker open changed nothing on screen. It now also compares
`payment_status`, `payment_rejection_reason` and `driver_name`, field by field
rather than by reference — `orders` is rebuilt on every refetch, so an identity
check would have reset state on each poll.

### The confirmation screen rendered a stale snapshot

`placedOrder` is what the insert returned and never changes. A customer sitting
on the confirmation screen while an admin verified their transfer would have
watched nothing happen. It now reads the live row, falling back to the snapshot
before the subscription has delivered anything.

### `orders` was never published to Realtime

`0002_rls_policies.sql` adds it. `phase2_schema.sql` / `phase2_rls.sql` — the
pair the deployed database was actually built from — never do. On that
deployment the client subscribes successfully and then receives nothing, which
looks **identical** to "no one has verified it yet". Migration 0007 adds the
table to the publication.

### Half of migration 0006's customer-cancel policy matched nothing

The policy reads `status IN ('pending','accepted')`, but `'accepted'` was not a
legal value in either base schema, so an order could never reach it. 0007 widens
`order_status` to the vocabulary the application already speaks.

### Three copies of the order row mapping

`fetchOrders`, `fetchCustomerOrders` and `fetchOrderById` each contained the same
row→`Order` mapping written out separately, so a column added to one silently
went missing from the others — which is exactly what would have happened to the
Phase 3 audit columns. Consolidated into one `mapOrderRow`.

### Three bugs caught by the migration harness

None were visible by reading the SQL. Recorded in full in
[DATABASE_MIGRATION_0007.md](DATABASE_MIGRATION_0007.md):

1. The rollback could not narrow the enum — a partial index predicate bound
   `'pending'` to the old type. Index drops now precede the type swap.
2. The rollback could not narrow `order_status` — a live policy referenced the
   column. The policy is now dropped up front and recreated at the end.
3. **The trigger's maintenance bypass was inverted.** It used
   `current_user NOT IN ('anon','authenticated')`, but inside a `SECURITY
   DEFINER` function `current_user` is the *function owner*, not the caller — so
   the condition was always true and **the "only an admin can verify" guard was
   disabled for everyone, including customers.** The harness caught it as
   *"FAIL a customer marked their own payment completed"*. It now keys off
   `request.jwt.claims`, which PostgREST sets per request and a direct database
   session never does.

---

## Breaking changes

### 1. `PaymentStatus` gains `'rejected'`

```ts
// before
type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
// after
type PaymentStatus = 'pending' | 'completed' | 'rejected' | 'failed' | 'refunded';
```

Any exhaustive `switch` over `PaymentStatus` outside this repository will now
fail to compile until it handles `'rejected'`. Within the repository, everything
is handled.

### 2. `OrderProgressTimeline` prop changed

```tsx
<OrderProgressTimeline status={order.status} />   // before
<OrderProgressTimeline order={order} />            // after
```

The component needs the payment method and status to decide whether payment
steps belong. Both call sites were updated.

### 3. Verified UPI orders now read "Payment Confirmed", not "Paid"

`paymentLabel()` returns **"Payment Confirmed"** for a settled UPI order and
keeps **"Paid"** for cash collected at the door. Cash handed over is *paid*; a
verified transfer is *confirmed*, which is the wording the customer was promised
while they were waiting. The Phase 2.5 test asserting `'Paid'` was updated.

**No database value changed meaning.** `'completed'` still means `'completed'`.

### 4. Nothing else

No API removed, no table dropped, no column renamed, no existing row rewritten.
The previous application build runs unchanged against a 0007-migrated database.

---

## Database changes — migration 0007

Files:

```
supabase/migrations/0007_payment_verification.sql          forward
supabase/migrations/0007_payment_verification_down.sql     rollback
supabase/verify/run_migration_checks.sh                    verification harness
```

### The repository carries two incompatible schemas

**This is the single most important fact about this migration.**

| | `migrations/0001_core_schema.sql` | `phase2_schema.sql` |
|---|---|---|
| `orders.id` | `text` | `uuid` |
| `payment_status` | `text` + CHECK | **ENUM** |
| `status` | `text` + CHECK | **ENUM** |
| `is_deleted` | absent | present |
| line items | `orders.items` jsonb | `order_items` table |

`src/services/supabase/orders.ts` queries `order_items` and filters on
`is_deleted`. **Your deployed database was built from `phase2_schema.sql`.**

Widening an enum and widening a CHECK constraint are entirely different
operations. A migration written for the numbered chain would have run without
error and changed nothing that matters. **0007 detects which shape it is running
against and takes the matching path.** It is correct and idempotent on both.

### What it does

1. Makes `'rejected'` a storable `payment_status` — enum `ADD VALUE` or widened CHECK
2. Widens `order_status` with `'accepted'`, `'preparing'`, `'ready'`
3. Adds three nullable audit columns, no backfill, no table rewrite:
   ```
   payment_verified_at       timestamptz
   payment_verified_by       uuid → profiles(id) ON DELETE SET NULL
   payment_rejection_reason  text
   ```
4. Adds `orders_payment_status_idx` and a partial `orders_payment_pending_idx`
   covering exactly the admin queue query
5. Publishes `public.orders` to `supabase_realtime` if it is not already
6. Replaces the `BEFORE UPDATE` trigger so it stamps the verifier from
   `auth.uid()` server-side and refuses settlement by a non-team member
7. Recreates 0006's `orders_customer_update_own` policy, so 0007 stands alone

**Migration 0006 is superseded** — 0007 recreates both its policy and its trigger
function. Running 0006 first is harmless but unnecessary.

`REPLICA IDENTITY` is deliberately left at default: the client refetches on any
event rather than diffing payloads, so `FULL` would add WAL volume for nothing.

### Verification — actually run, not asserted

`./supabase/verify/run_migration_checks.sh` builds each schema from scratch on a
real PostgreSQL, applies the full chain, asserts behaviour, rolls back, and
re-applies.

**Result on PostgreSQL 17.10 — 27/27 assertions, both schemas:**

```
== A.  enum schema (phase2_schema.sql)     apply · pre-existing row untouched · re-apply
== A2. 27 behavioural assertions           all PASS
== A3. rollback                            enum restored, audit columns dropped
== A4. re-apply after rollback             forward migration is repeatable
== B.  CHECK schema (0001–0006)            apply · re-apply · widen · roll back · narrow
RESULT: all migration checks passed
```

Assertions include: `'rejected'` storable · all four legacy values still insert ·
garbage still refused · enum label order preserved · audit column types and FK ·
pre-existing indexes intact · every index valid · the app's three query shapes
run · every status value storable · **customer cannot mark their own payment
completed** · **cannot set it to rejected** · **cannot forge the audit trail** ·
admin can verify · `payment_verified_by` stamped server-side · admin can reject
with a reason · RLS blocks a stranger · `orders` published to Realtime.

### Rollback is lossy

PostgreSQL cannot delete an enum value, so reversing means building a narrower
type and remapping rows first:

| Before | After rollback |
|---|---|
| `payment_status = 'rejected'` | `'failed'` |
| `status = 'accepted'` / `'preparing'` | `'cooking'` |
| `status = 'ready'` | `'out_for_delivery'` |
| audit columns | **dropped** |

Each remap prints an affected-row count **before** it runs. Full procedure in
[ROLLBACK_PLAN.md](ROLLBACK_PLAN.md).

---

## Security

The rule this release exists to enforce — **nothing marks a payment completed
except a person deciding it is** — holds in three independent places:

| Layer | Guarantee |
|---|---|
| Database trigger | A non-team member setting `payment_status` off `'pending'` raises `check_violation`. Client writes to the audit columns are refused. |
| RLS | UPDATE on `orders` restricted to team members and, narrowly, the owning customer. |
| Application | `'completed'` / `'rejected'` are written only by `verifyPayment` / `rejectPayment`, reachable only from the admin screen. |

`payment_verified_at` and `payment_verified_by` are **never sent by the client**.
The trigger stamps them from `auth.uid()`, so the audit trail records the actor
the database saw rather than one the browser claimed to be.

Both service methods also guard on `payment_status = 'pending'` **in the WHERE
clause**, so two admins pressing Verify simultaneously produces one settlement
and one *"already reviewed"* — not a double write.

**Verified clean:** no Brevo or SMTP credential appears anywhere in `src/`
(SMTP is dashboard-only, as it must be — a `VITE_*` key would be inlined into
the client bundle). `DEV_TEST_CREDENTIALS` in `otpService.ts` is dead code, is
never accepted by any auth path, and is **tree-shaken out of the production
bundle** — confirmed by grepping `dist/`. *However*, if "Test Phone Numbers" are
configured in the Supabase Auth dashboard, those static codes would work in
production; that is a dashboard setting to check, listed in the release checklist.

---

## Deployment notes

### Order of operations

```
1. Merge to main
2. Take a database backup          ← record the timestamp
3. Apply migration 0007
4. Verify the migration            ← postflight SQL
5. Enable Realtime in the dashboard
6. Deploy the application
7. Smoke test, then the two-browser realtime test
```

**Migration before application.** The reverse leaves the admin screen writing a
value the database cannot store.

### Expected migration output

```
NOTICE:  0007: payment_status enum extended with 'rejected'
NOTICE:  0007: order_status enum extended with accepted/preparing/ready
NOTICE:  0007: public.orders added to the supabase_realtime publication
NOTICE:  0007: created fallback public.is_team_member()
```

`already exists, skipping` notices are expected — the file is idempotent.

### Environment

Two variables, both in [src/lib/supabase.ts](src/lib/supabase.ts):

```
VITE_SUPABASE_URL          https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY     eyJhbGci...   (JWT anon key, NOT sb_publishable_...)
```

**`VITE_*` values are inlined at build time.** Changing them in the hosting
dashboard does nothing until you **redeploy**. The app detects missing values,
placeholders, and a publishable-key-instead-of-JWT, and names the exact problem
on screen rather than failing opaquely.

### Hosting

Both `vercel.json` and `netlify.toml` are present — confirm which is
authoritative. Both configure the SPA rewrite, without which a hard refresh on
any route 404s. Netlify pins Node 20; Vercel pins nothing. Built and tested here
on Node 24.11.1.

### Realtime

Migration 0007 adds `orders` to the publication, but **the Realtime service
itself is a project setting** and cannot be enabled from SQL:
Dashboard → Database → Replication.

### Known pre-existing risk — verify before go-live

`email_exists` and `lookup_login_email` are defined **only** in
`migrations/0004_anon_lookup_rpcs.sql`, which is not part of `phase2_schema.sql`.
Same for the signup trigger (0003 / 0005). If they are absent on your database:

- sign-in by phone or username always answers *"No account found"*
- password reset fails the same way
- new signups get an auth user with **no profile row and no role**

Email sign-in still works. **Pre-existing, not caused by this release** — but the
preflight SQL in [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) §3 reports it
in one query.

### Build output

| Asset | Raw | gzip |
|---|---|---|
| `index-*.js` | 1,282.11 kB | **342.31 kB** |
| `jspdf.es.min-*.js` | 390.77 kB | 128.82 kB |
| `html2canvas.esm-*.js` | 202.38 kB | 48.04 kB |
| `index.es-*.js` | 159.76 kB | 53.56 kB |
| `index-*.css` | 82.15 kB | 13.05 kB |

Vite warns above 500 kB raw. Not a blocker — the three heaviest dependencies are
already code-split and load only when a receipt is generated.

---

## Test results

```
tsc --noEmit          clean
node:test             128 / 128 pass, 0 fail     (2.7s)
npm run build         ✓ built in 8.98s
migration harness     27 / 27 assertions, both schemas, incl. rollback
```

| Suite | Tests |
|---|---|
| `orderStatus.test.ts` | 23 *(+13 for Phase 3)* |
| `validation.test.ts` | 21 |
| `checkout.test.ts` | 14 |
| `otpService.test.ts` | 5 |
| others | `authErrors`, `exportUtils`, `geoUtils`, `initialData`, `sound` |

**Automated tests cover pure logic only.** There is no component or E2E harness
in this project. The 41-case [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) has **not
been executed** and is a release gate.

---

## Files

**Added**

```
src/components/admin/PaymentVerificationView.tsx
supabase/migrations/0007_payment_verification.sql
supabase/migrations/0007_payment_verification_down.sql
supabase/verify/{run_migration_checks.sh,00_supabase_stub.sql,verify_phase2.sql}
DATABASE_MIGRATION_0007.md   PHASE3_PAYMENT_VERIFICATION.md
DEPLOYMENT_CHECKLIST.md      GO_LIVE_CHECKLIST.md
MANUAL_TEST_PLAN.md          ROLLBACK_PLAN.md
```

**Modified**

```
src/types/index.ts                                  src/App.tsx
src/lib/orderStatus.ts                              src/components/admin/AdminHeaderNav.tsx
src/services/supabase/orders.ts                     src/components/customer/CheckoutView.tsx
src/components/customer/OrderProgressTimeline.tsx   src/components/customer/MyOrdersView.tsx
src/components/customer/OrderTrackerModal.tsx       orderStatus.test.ts
```

**Untouched, by instruction:** Kitchen, Reports, Analytics, Driver.

---

## Carried forward — not fixed in this release

1. **Two incompatible schema files** in `supabase/`. Every migration must be
   written twice until they are reconciled, as this one was.
2. **`initialOrders` seeds four example orders** with invented customer names as
   a pre-Supabase fallback. Flagged since Phase 1.
3. **Order numbers can collide under concurrency.** `nextOrderNumber` reads the
   client's list; two simultaneous checkouts can both compute `#1008`. Needs a
   database sequence. Flagged in Phase 2.
4. **Nothing writes `'accepted'` / `'preparing'` / `'ready'` yet.** The database
   now accepts them and the timeline renders them, but Kitchen — off-limits by
   instruction — still emits the legacy vocabulary. The mapping handles both, so
   no regression.
5. **A rejected payment does not cancel the order.** Deliberate: the customer may
   still pay another way, and cancelling is a separate decision. If you would
   rather rejection auto-cancelled, that is a one-line change to
   `rejectPayment`.
6. **Nobody is reminded to work the queue.** An unreviewed UPI order leaves a
   paying customer at *Pending Verification* indefinitely. There is a monitoring
   query in [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) step 10, but no alert.
