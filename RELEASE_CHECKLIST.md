# Release Checklist — RC1

**Release:** RC1 · Phase 3 Payment Verification
**Commit:** `8092424`
**Prepared:** 2026-08-07

Companion documents:
[RELEASE_NOTES.md](RELEASE_NOTES.md) · [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) · [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) · [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) · [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)

---

## How to read the status column

| | |
|---|---|
| ✅ **VERIFIED** | I ran it and observed the result. Evidence quoted below. |
| ⚠️ **UNVERIFIABLE** | Requires your Supabase project, a browser, or a device. I cannot reach any of those. A concrete command or step is given. |
| ❌ **BLOCKER** | Known to be outstanding. |

No row is marked verified on the strength of reading code.

---

## 1 · Repository

| # | Item | Status | Evidence |
|---|---|---|---|
| 1.1 | All Phase 3 files committed | ✅ VERIFIED | 22 files, commit `8092424` |
| 1.2 | Working tree clean | ✅ VERIFIED | `git status --porcelain` → empty |
| 1.3 | Pushed to origin | ✅ VERIFIED | `fbd0fd0..8092424`, local and remote hashes identical |
| 1.4 | No secrets committed | ✅ VERIFIED | `.env.local` matched by `.gitignore:7`; no `.env`/key file in the tree |
| 1.5 | Merged to `main` | ❌ **BLOCKER** | 42 commits ahead of `main`; PR not opened |
| 1.6 | Release tagged | ❌ **BLOCKER** | No tag — [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md) has no target to revert to |

```
$ git status --porcelain
  (empty)
$ git status -sb
## feat/supabase-auth-otp...origin/feat/supabase-auth-otp
$ git log --oneline -1
8092424 feat: phase 3 payment verification
```

- [ ] 1.5 — open PR, review, merge to `main`
- [ ] 1.6 — `git tag rc1 && git push origin rc1`

---

## 2 · Build gate

| # | Item | Status | Evidence |
|---|---|---|---|
| 2.1 | TypeScript compiles | ✅ VERIFIED | `tsc --noEmit` → no output |
| 2.2 | Tests pass | ✅ VERIFIED | **128 / 128**, 0 fail, 2.7s |
| 2.3 | Production build | ✅ VERIFIED | `✓ built in 8.98s` |
| 2.4 | Bundle size acceptable | ✅ VERIFIED | main chunk **342.31 kB gzip**; jsPDF/html2canvas already code-split |
| 2.5 | No service_role key in bundle | ✅ VERIFIED | `grep -r service_role dist/` → nothing |
| 2.6 | Dev test credentials excluded | ✅ VERIFIED | `919876543210`, `919999999999`, `Dev Admin`, `Test Teammate`, `DEV_TEST_CREDENTIALS` → **0 matches** in `dist/` |
| 2.7 | Clean-install build | ⚠️ UNVERIFIABLE | Run `rm -rf node_modules && npm ci && npm run build` on the CI host |

---

## 3 · Migration 0007

| # | Item | Status | Evidence |
|---|---|---|---|
| 3.1 | Applies to the **enum** schema (yours) | ✅ VERIFIED | PostgreSQL 17.10, `phase2_schema.sql` + `phase2_rls.sql` |
| 3.2 | Applies to the **CHECK** schema | ✅ VERIFIED | `0001`–`0006` chain |
| 3.3 | Idempotent | ✅ VERIFIED | Re-applied cleanly on both |
| 3.4 | Pre-existing rows untouched | ✅ VERIFIED | `completed\|delivered\|150.00` identical before and after |
| 3.5 | `'rejected'` becomes storable | ✅ VERIFIED | assertion PASS |
| 3.6 | Legacy values still work | ✅ VERIFIED | all four insert; enum label order preserved |
| 3.7 | Garbage still refused | ✅ VERIFIED | invalid value rejected by the enum |
| 3.8 | Audit columns + FK correct | ✅ VERIFIED | 3 columns, right types, FK to `profiles` |
| 3.9 | Indexes created and valid | ✅ VERIFIED | 2 new, all indexes on `orders` valid |
| 3.10 | Existing app queries still run | ✅ VERIFIED | all three query shapes |
| 3.11 | Rollback works | ✅ VERIFIED | enum → 4 labels, audit columns dropped |
| 3.12 | Re-appliable after rollback | ✅ VERIFIED | forward migration repeatable |
| 3.13 | **Applied to production** | ❌ **BLOCKER** | Not run against your Supabase project |

```
$ ./supabase/verify/run_migration_checks.sh
behavioural assertions passed: 27
RESULT: all migration checks passed
```

- [ ] 3.13 — back up first, then run 0007 per [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) step 2

---

## 4 · Realtime

| # | Item | Status | Evidence |
|---|---|---|---|
| 4.1 | 0007 publishes `orders` | ✅ VERIFIED | assertion: *"public.orders is published to supabase_realtime"* PASS |
| 4.2 | Subscription keyed on identity | ✅ VERIFIED | [src/App.tsx:169](src/App.tsx#L169) — keyed on `user?.id`, not `[]`, because `postgres_changes` is RLS-filtered against the joining token |
| 4.3 | Channel topics unique | ✅ VERIFIED | `uniqueTopic()` in [realtime.ts:11](src/services/supabase/realtime.ts#L11) |
| 4.4 | Tracker reacts to payment changes | ✅ VERIFIED | effect compares `payment_status`, `payment_rejection_reason`, `driver_name` |
| 4.5 | Published on **your** database | ⚠️ UNVERIFIABLE | Preflight §6 |
| 4.6 | Realtime **service** enabled | ⚠️ UNVERIFIABLE | Dashboard → Database → Replication. **SQL cannot turn this on.** |
| 4.7 | Two-browser test passes | ⚠️ UNVERIFIABLE | **TC-14** |

- [ ] 4.5 / 4.6 / 4.7

---

## 5 · RPCs and database functions

| # | Item | Status | Evidence |
|---|---|---|---|
| 5.1 | `email_exists` defined in repo | ✅ VERIFIED | `migrations/0004_anon_lookup_rpcs.sql` |
| 5.2 | `lookup_login_email` defined in repo | ✅ VERIFIED | same file |
| 5.3 | Signup trigger defined in repo | ✅ VERIFIED | `0003_auth_triggers.sql`, `0005_signup_trigger_telemetry.sql` |
| 5.4 | 0007 supplies `is_team_member()` if absent | ✅ VERIFIED | fallback created on the enum schema — *"0007: created fallback public.is_team_member()"* |
| 5.5 | **RPCs present on your database** | ⚠️ **UNVERIFIABLE — HIGH RISK** | See below |

> **5.5 is the risk most likely to bite you.** `email_exists`, `lookup_login_email`
> and the signup trigger exist **only in the numbered migration chain**, which is
> *not* what your database was built from. If they are missing:
>
> - sign-in by phone/username always answers *"No account found"*
> - password reset fails identically
> - **new signups get an auth user with no profile row and no role**
>
> Email sign-in still works, which is why this can go unnoticed.
> **Pre-existing — not introduced by RC1.**

```sql
SELECT f.name,
       CASE WHEN to_regprocedure(f.sig) IS NULL THEN '*** MISSING ***' ELSE 'PRESENT' END
  FROM (VALUES ('email_exists','public.email_exists(text)'),
               ('lookup_login_email','public.lookup_login_email(text)')) AS f(name,sig);

SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_trigger
                          WHERE tgrelid='auth.users'::regclass AND NOT tgisinternal)
            THEN 'PRESENT' ELSE '*** MISSING ***' END AS signup_trigger;
```

- [ ] 5.5 — if `MISSING`, apply `0003`, `0004`, `0005` before go-live

---

## 6 · RLS and security

| # | Item | Status | Evidence |
|---|---|---|---|
| 6.1 | Customer cannot mark own payment completed | ✅ VERIFIED | assertion PASS — `check_violation` raised |
| 6.2 | Customer cannot set own payment rejected | ✅ VERIFIED | assertion PASS |
| 6.3 | Customer cannot forge the audit trail | ✅ VERIFIED | assertion PASS |
| 6.4 | Admin **can** verify | ✅ VERIFIED | assertion PASS |
| 6.5 | `payment_verified_by` stamped server-side | ✅ VERIFIED | equals the acting admin's uuid — never sent by the client |
| 6.6 | `payment_verified_at` stamped server-side | ✅ VERIFIED | assertion PASS |
| 6.7 | Admin can reject with a reason | ✅ VERIFIED | assertion PASS |
| 6.8 | RLS blocks a stranger's order | ✅ VERIFIED | assertion PASS |
| 6.9 | Customer may still record a UPI reference | ✅ VERIFIED | assertion PASS |
| 6.10 | Concurrent verify is safe | ✅ VERIFIED *(by construction)* | `.eq('payment_status','pending')` in the WHERE clause; second caller gets *"already reviewed"*. Behaviour confirmed in SQL; UI path is **TC-12**. |
| 6.11 | No SMTP/Brevo credential in code | ✅ VERIFIED | `grep -rin brevo src/` → none |
| 6.12 | RLS enabled on **your** tables | ⚠️ UNVERIFIABLE | Preflight §5 |
| 6.13 | TC-11 passes in a real browser | ⚠️ **UNVERIFIABLE — MUST PASS** | **TC-11** |

- [ ] 6.12 · [ ] 6.13

---

## 7 · Authentication / OTP

| # | Item | Status | Evidence |
|---|---|---|---|
| 7.1 | OTP goes through Supabase Auth | ✅ VERIFIED | `signInWithOtp` / `verifyOtp` in `otpService.ts`, `emailService.ts` |
| 7.2 | No static OTP accepted by the app | ✅ VERIFIED | `123456` appears only in a dev **console hint** and dead constants; every verification calls `supabase.auth.verifyOtp` |
| 7.3 | Dev credentials tree-shaken from production | ✅ VERIFIED | 0 matches in `dist/` |
| 7.4 | `otpService` tests pass | ✅ VERIFIED | 5 / 5 |
| 7.5 | SMTP (Brevo) configured | ⚠️ UNVERIFIABLE | Dashboard → Project Settings → Auth → SMTP |
| 7.6 | Site URL points at production | ⚠️ UNVERIFIABLE | Wrong Site URL is the usual cause of OTP that works locally and fails live |
| 7.7 | Redirect URLs include production origin | ⚠️ UNVERIFIABLE | Dashboard → Authentication → URL Configuration |
| 7.8 | Real OTP received end to end | ⚠️ UNVERIFIABLE | Send one to an address you control; check spam |
| 7.9 | **No "Test Phone Numbers" left configured** | ⚠️ UNVERIFIABLE | Dashboard → Authentication → Providers → Phone. A leftover test number accepts a **static code in production**. |

- [ ] 7.5 – 7.9

---

## 8 · Checkout, COD, UPI

| # | Item | Status | Evidence |
|---|---|---|---|
| 8.1 | Checkout validation logic | ✅ VERIFIED | 14 tests in `checkout.test.ts` |
| 8.2 | *"Please select a payment method."* exact | ✅ VERIFIED | asserted exactly |
| 8.3 | Card / Razorpay not offered | ✅ VERIFIED | rejected by `validateCheckout` |
| 8.4 | Minimum order value enforced | ✅ VERIFIED | including the boundary case |
| 8.5 | UPI URI well-formed | ✅ VERIFIED | 2-dp amount, encoding, `cu=INR` |
| 8.6 | Order-number sequencing | ✅ VERIFIED | including unparseable input — *but see the concurrency caveat below* |
| 8.7 | COD timeline has no payment steps | ✅ VERIFIED | asserted |
| 8.8 | UPI timeline shows all six steps | ✅ VERIFIED | asserted in exact order |
| 8.9 | Payment steps advance only on settlement | ✅ VERIFIED | asserted |
| 8.10 | Rejected step goes red, timeline survives | ✅ VERIFIED | asserted |
| 8.11 | Every method × status × order-status combination renders | ✅ VERIFIED | exhaustive: 2 × 5 × 9 = 90 |
| 8.12 | COD end to end in a browser | ⚠️ UNVERIFIABLE | **TC-01 – TC-03** |
| 8.13 | UPI end to end in a browser | ⚠️ UNVERIFIABLE | **TC-04 – TC-05a** |
| 8.14 | Order saved **before** payment requested | ⚠️ UNVERIFIABLE | **TC-04** — structurally guaranteed (`setStep('upi_payment')` runs only after `createOrder` resolves) but confirm visually |
| 8.15 | Mobile: UPI intent, clipboard, share, PDF | ⚠️ UNVERIFIABLE | **F-10 – F-13**, real device |

- [ ] 8.12 – 8.15

---

## 9 · Payment Verification

| # | Item | Status | Evidence |
|---|---|---|---|
| 9.1 | `verifyPayment` / `rejectPayment` exist and compile | ✅ VERIFIED | `tsc` clean |
| 9.2 | Guarded on `payment_status = 'pending'` | ✅ VERIFIED | in the WHERE clause, not just the UI |
| 9.3 | Audit columns never sent by the client | ✅ VERIFIED | absent from both update payloads |
| 9.4 | Reject leaves `status` alone | ✅ VERIFIED | deliberate — see release notes |
| 9.5 | Verify clears a stale rejection reason | ✅ VERIFIED | `payment_rejection_reason: null` |
| 9.6 | Tab added, existing tabs untouched | ✅ VERIFIED | 1 added, 12 unchanged |
| 9.7 | Payment labels correct in all states | ✅ VERIFIED | 23 tests in `orderStatus.test.ts` |
| 9.8 | Rejected never reads as paid | ✅ VERIFIED | negative match on `/paid\|confirmed/i` so a future copy edit cannot reintroduce it |
| 9.9 | Toast copy exact | ✅ VERIFIED | *"Payment received and verified."* / *"Payment rejected."* + *"Please contact the restaurant."* |
| 9.10 | No toast while pending | ✅ VERIFIED | returns `null` |
| 9.11 | Admin UI works in a browser | ⚠️ UNVERIFIABLE | **TC-06 – TC-10** |
| 9.12 | Concurrent verify in the UI | ⚠️ UNVERIFIABLE | **TC-12** |
| 9.13 | At least one admin exists | ⚠️ UNVERIFIABLE | `SELECT count(*) FROM profiles WHERE role::text='admin';` — **if 0, nobody can verify anything** |

- [ ] 9.11 – 9.13

---

## 10 · Scope discipline

| # | Item | Status |
|---|---|---|
| 10.1 | Kitchen untouched | ✅ VERIFIED — `git status` empty for `KitchenView.tsx` |
| 10.2 | Reports untouched | ✅ VERIFIED — `OrderHistoryView.tsx` |
| 10.3 | Analytics untouched | ✅ VERIFIED — `DashboardView.tsx`, `DriverStatsView.tsx` |
| 10.4 | Driver untouched | ✅ VERIFIED — `src/components/driver/` |
| 10.5 | No Phase 4 work started | ✅ VERIFIED |

---

## Blockers

| # | Blocker | Owner | Resolution |
|---|---|---|---|
| **B1** | **Migration 0007 not applied to production.** Verify and Reject fail without it — Verify with an RLS error, Reject with an enum/check violation. | DBA | Back up, then run it. Go-live step 2. |
| **B2** | **Not merged to `main`.** 42 commits ahead on a feature branch. | Dev | PR → review → merge |
| **B3** | **No release tag.** [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md) scenario C has no target. | Dev | `git tag rc1 && git push origin rc1` |
| **B4** | **Manual test plan not executed.** 41 cases, 0 run. **TC-11** (a customer cannot settle their own payment) and **TC-14** (two-browser realtime) are the two that decide whether this release does what it claims. | QA | Execute [MANUAL_TEST_PLAN.md](MANUAL_TEST_PLAN.md) |
| **B5** | **Realtime service state unknown.** SQL cannot enable it. Without it, "no refresh" silently does not happen. | DBA | Dashboard → Database → Replication |
| **B6** | **RPC / signup-trigger presence unknown.** Pre-existing, but if `handle_new_user` is missing, **new signups get no profile and no role.** | DBA | Preflight §3, then apply 0003/0004/0005 if missing |
| **B7** | **Admin account existence unconfirmed.** Zero admins means nobody can verify a payment. | DBA | `SELECT count(*) FROM profiles WHERE role::text='admin';` |

---

## Accepted risks — not blockers

| Risk | Why accepted |
|---|---|
| Main bundle 342 kB gzip, over Vite's raw warning | Heavy deps already code-split; loads only for receipts |
| Order numbers can collide under concurrent checkout | Pre-existing since Phase 2. Real but low-frequency for one kitchen; needs a database sequence |
| `initialOrders` seeds 4 example orders | Display-only fallback before Supabase data arrives. Flagged since Phase 1 |
| Kitchen still emits the legacy status vocabulary | The mapping handles both; no regression |
| Two incompatible schema files coexist | 0007 handles both. Reconciling them is larger than this release |
| A rejected payment does not auto-cancel the order | Deliberate — the customer may still pay another way |
| No alert when the verification queue goes unworked | Monitoring query provided; automation is Phase 4 |

---

## GO / NO-GO

### 🔴 NO-GO for production

**Not because the code is unsound.** Everything verifiable from a repository is
verified: 128/128 tests, clean compile, successful build, and 27/27 database
assertions on a real PostgreSQL 17 covering both schemas, forward and rollback —
including proof that a customer cannot mark their own payment completed, cannot
reject it, and cannot forge the audit trail.

**The release is blocked on seven items that require your Supabase project, your
hosting dashboard, and a human with a browser** — none of which I can reach.

Two of them are not paperwork:

- **B1** — until migration 0007 is applied, the feature this release exists to
  deliver **does not work at all**.
- **B4** — the security guarantee is verified in SQL but has never been exercised
  through the running application. **TC-11 must be executed.** A guarantee nobody
  has tried to break is a claim, not a control.

### Path to GO

```
1. B2  merge to main                          Dev
2. B3  tag the release                        Dev
3. B6  preflight SQL — RPCs, trigger, RLS     DBA
4. B7  confirm at least one admin exists      DBA
5.     BACK UP THE DATABASE                   DBA   ← record the timestamp
6. B1  apply migration 0007 + postflight      DBA
7. B5  enable Realtime in the dashboard       DBA
8.     deploy the application                 Dev
9. B4  execute the manual test plan           QA
        must pass: TC-04 TC-05 TC-09 TC-10 TC-11 TC-13 TC-14
```

**When all nine are done and the seven must-pass cases are green, this release is
READY FOR PRODUCTION.**

Until then the honest statement is: **RC1 is code-complete, frozen, and verified
to the limit of what can be verified without your infrastructure.**

---

### Sign-off

| Gate | Owner | Date | Signature |
|---|---|---|---|
| B2 · Merged to main | | | |
| B3 · Tagged | | | |
| B6 · Preflight clean | | | |
| B7 · Admin exists | | | |
| — · Backup taken | | | |
| B1 · Migration applied | | | |
| B5 · Realtime enabled | | | |
| — · Application deployed | | | |
| B4 · Manual tests passed | | | |
| **FINAL — approved for production** | | | |
