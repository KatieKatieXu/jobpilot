# JobPilot — Launch & Monetization Plan

> Drafted 2026-06-15. Sequenced roadmap to get JobPilot launched on a real domain and
> actually taking money. Grounded in the current code, not a generic checklist.
> Work top-to-bottom: **Phase 1 closes the paid loop** (the thing that makes monetization
> real), **Phase 2 clears production blockers**, **Phase 3 is polish/derisking.**
>
> Verify every change against the running dev server (`npm run dev`, port 3001) before
> moving on. Preserve the dual-mode storage pattern and RLS rules from CLAUDE.md.

---

## Current state (verified in code)

The monetization loop is **fully open** — paying currently grants the user nothing:

| Link in the chain | File | State |
|---|---|---|
| Checkout creates session | `app/api/checkout/route.ts` | ⚠️ Stores only `tier` in metadata — **no Supabase user_id**, so a payment can't be mapped to an account. |
| Webhook activates the tier | `app/api/webhook/route.ts` | ❌ All DB writes are commented-out `// await db.users.update(...)`. It only `console.log`s — **`profiles.tier` is never updated.** |
| AI routes enforce the tier | `app/api/*/route.ts` (4 routes) | ⚠️ Use `rateLimitResponse` from `rate-limit.ts`, which reads tier from a `jobpilot_tier` **cookie** + an **in-memory** store. Nothing sets that cookie; in-memory resets every serverless invocation on Vercel. |
| Correct tier source exists but unused | `app/lib/db.ts` | ✅ `getUserTier(supabase)` and `getTodayUsageCount(supabase)` read from `profiles.tier` / `ai_usage` — the right source of truth, **not wired into the routes.** |

Already in place (don't rebuild): Stripe checkout scaffold, `checkout/success/page.tsx`, the
`ai_usage` table + `profiles.tier` column, RLS policies, dual-mode db.ts, auth flow.

---

## Phase 0 — Data isolation (LAUNCH-CRITICAL, do first)

> **Goal (stated by Kate):** when any user lands on their account the first time they must see
> *nothing* from another user's data; once they enter data, the product remembers *their own*.
> This is a privacy/trust blocker, not polish — a multi-user app that shows one user another's
> data cannot launch. Reported symptom: signing in with a new Google account still showed a
> previous browser user's ("Shannon") Market analysis.

**The rule that guarantees it:** *localStorage is scratch space for anonymous (signed-out) users
only. The moment a user is authenticated, Supabase (RLS-scoped to `auth.uid()`) is the ONLY
source of truth, and localStorage is wiped.*

**Root causes in current code:**
- **Pages read `localStorage` directly instead of via the dual-mode `db.ts` layer.** Audit
  (2026-06-15): `market` uses Supabase 0× / localStorage 6× (fully broken); `applications`(7),
  `stories`(8), `jobs`(4), `resume`(4), `settings`(4), `profile`(2) all make direct localStorage
  calls; only `dashboard` is clean. Every direct call is a potential cross-user leak.
- **`migrate-local-data.ts` has no ownership guard.** It migrates whatever is in localStorage
  into a newly-signed-in account, gated only by "account has no `work_experience`" (line 20).
  A stranger's anonymous data therefore lands in a fresh account. It also never clears
  localStorage afterward, and steps 3/5/6 use `.insert` (not upsert) → re-running duplicates rows.

**Fixes (verify each against the running app + live Supabase):**
1. **Route all page data access through `db.ts` dual-mode functions** — no component should call
   `localStorage.*` directly for user data. Start with `market/page.tsx` (`getMarketReport` /
   `saveMarketReport`), then sweep the other pages above. (See Market schema note below.)
2. **Ownership-safe, one-shot migration:** only migrate into a genuinely empty account; stamp
   localStorage with the claiming `userId`; refuse migration if claimed by a different user; and
   **clear all `jobpilot_*` keys immediately after a successful migration** (also fixes the
   duplicate-insert bug). Switch the `.insert` calls to upsert or dedupe.
3. **Session hygiene in `AuthProvider`:** on `SIGNED_OUT` clear all `jobpilot_*` keys; on
   `SIGNED_IN` as a different user than last claimant, clear before first read.

**Verify:** with a previous user's data in localStorage, sign in as a fresh account → every tab
shows its empty state (not the prior user's data). Enter data → sign out → sign back in → your
own data returns. Sign out → next anonymous user sees a clean slate.

---

## Phase 1 — Close the paid loop (the actual "monetize")

**Goal:** a user pays → their `profiles.tier` flips to `pro`/`premium` → AI routes immediately
grant the higher limit → cancellation reverts them to `free`.

### 1.1 — Pass the Supabase user into checkout
- In `app/api/checkout/route.ts`, read the authenticated Supabase user (server client) and
  set `client_reference_id: user.id` on the checkout session. Also pass `customer_email`
  so Stripe links the customer, and `subscription_data.metadata.user_id` so the id survives
  onto the subscription object (needed for cancellation events).
- Reject the request with 401 if there's no authenticated user (you can only sell to
  signed-in accounts — anonymous/localStorage users must sign in first).

### 1.2 — Add Stripe linkage columns to `profiles`
- New migration in `supabase/migrations/`: add `stripe_customer_id text` and
  `stripe_subscription_id text` to `profiles` (keep existing RLS).
- These let the webhook reverse-look-up the user on `subscription.updated/deleted`
  events (which carry the subscription id, not the user id, unless you stored metadata).

### 1.3 — Make the webhook actually write the tier
- In `app/api/webhook/route.ts`, use the **service-role admin client** (`app/lib/supabase/admin.ts`)
  — RLS would otherwise block a server-side cross-user write.
- `checkout.session.completed` → read `client_reference_id` (user id) + `metadata.tier`,
  then `update profiles set tier=<tier>, stripe_customer_id, stripe_subscription_id where id = user_id`.
- `customer.subscription.updated` with status `canceled`/`unpaid` → set tier back to `free`.
- `customer.subscription.deleted` → set tier back to `free` (look up by `stripe_subscription_id`
  or `subscription.metadata.user_id`).
- Delete the misleading cookie-based comments in the file header once done.

### 1.4 — Switch AI routes to Supabase-backed, auth-aware gating
- In each of the 4 AI routes (`analyze-resume`, `analyze-market`, `answer-questions`,
  `parse-resume`): if the request is authenticated, gate on `getUserTier(supabase)` +
  `getTodayUsageCount(supabase)` against the tier's daily limit, and `recordUsage` on success.
- Keep the IP-based `rateLimitResponse` **only** as the fallback for anonymous (free) users.
- Move the tier→limit numbers (free 3 / pro 30 / premium unlimited) to one shared constant
  so `rate-limit.ts` and the Supabase path can't drift apart.

### 1.5 — Verify the loop end-to-end (Stripe test mode)
- `stripe listen --forward-to localhost:3001/api/webhook` to get a local webhook secret.
- Sign in → upgrade → pay with test card `4242…` → confirm `profiles.tier` flips in Supabase
  → confirm an AI route now allows >3 actions → cancel in Stripe → confirm it reverts to `free`.

---

## Phase 2 — Production launch blockers

These don't block local dev but **will** break the live site.

### 2.1 — Real service-role key
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` is currently a copy of the anon key. Get the
  real one from Supabase → Settings → API. The webhook's admin writes (1.3) depend on it.

### 2.2 — Vercel environment variables
- Add all of: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`,
  `STRIPE_WEBHOOK_SECRET` to the Vercel project (Production + Preview).

### 2.3 — Production OAuth config (Google sign-in will fail without this)
- Supabase → Auth → URL Configuration: set Site URL to `https://jobpilot.katexu.com` and add
  redirect URLs for prod + Vercel preview domains. The `/auth/callback` exchange fails otherwise.

### 2.4 — Register the live Stripe webhook
- Create a webhook endpoint in the Stripe dashboard pointing at
  `https://jobpilot.katexu.com/api/webhook`, subscribed to `checkout.session.completed`,
  `customer.subscription.updated`, `customer.subscription.deleted`. Put its signing secret
  in `STRIPE_WEBHOOK_SECRET` (Vercel). Confirm `STRIPE_PRO_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID`
  point at real live-mode prices.

### 2.5 — Branded auth emails
- Update Supabase email templates with JobPilot branding (confirmation + magic link) so
  signup emails don't look broken/spammy. Confirm Resend SMTP is sending in production.

---

## Phase 3 — Derisk & polish (before/just after launch)

### 🐞 KNOWN BUG (reported 2026-06-15): Market tab shows a previous user's data

> **Now tracked as part of Phase 0 (Data isolation) above** — this is the concrete first symptom
> of that workstream. Details + the schema gotcha are kept here; do the broader sweep per Phase 0.

**Symptom:** After signing in with a new Google account, the Market tab still shows the
*previous* browser user's analysis (e.g. "Shannon").

**Two compounding causes:**

1. **`app/market/page.tsx` is localStorage-only — never converted to dual-mode.**
   On mount (lines ~62–63) it does `localStorage.getItem('jobpilot_market_report')` and
   never calls `useSupabase()` or the dual-mode `getMarketReport`/`saveMarketReport` that
   **already exist** in `app/lib/db.ts` (lines 198 / 216). So it reads the same localStorage
   key regardless of who is signed in. (It's the only tab missing the CLAUDE.md rule-#2 pattern.)
   - Fix: load via `getMarketReport(supabase)` on mount, save via `saveMarketReport(supabase, …)`
     in `persist()`/`runAnalysis()`/`setAdviceStatus()`, and make `clearReport()` clear the
     right store. Anonymous users still fall through to localStorage.
   - ⚠️ **Schema mismatch to decide:** the page's `MarketReport` wraps `{ analysis, answers,
     savedAt, profileHash }`, but db.ts's `MarketReport` is the *flattened* analysis shape and
     does **not** persist `savedAt` or `profileHash`. Either add `saved_at` / `profile_hash`
     columns to `market_reports` (preserves the "Last analyzed" stamp + profile-changed banner
     for signed-in users) or accept losing them server-side. Pick deliberately.

2. **Migration has no per-user guard (the general data-bleed risk below).** Shannon's
   localStorage report may have already been copied into the new user's Supabase
   `market_reports` row on first sign-in — so even after fixing the page, the account's row
   may still contain her data until cleared/overwritten.

**Verify the fix:** with Shannon's data in localStorage, sign in as a fresh user → Market tab
should show *empty state*, not Shannon's report. Sign out → anonymous localStorage still works.

- **Migration data-bleed fix:** → moved up to **Phase 0.2** (launch-critical). Left here as a
  pointer so nothing falls through the cracks.
- **Rate-limit durability:** the in-memory store in `rate-limit.ts` is per-serverless-instance,
  so anonymous free-tier limits are effectively unenforced at scale. Fine for launch; plan a
  Redis/Upstash swap (or rely on the Supabase `ai_usage` path for signed-in users) as traffic grows.
- **Billing management:** add a Stripe customer-portal link on `settings/page.tsx` so paying
  users can manage/cancel without emailing you.
- **Pre-launch smoke test:** run `npm run build` + `npm run lint` clean, then walk the full
  signed-in journey on the deployed URL: parse resume → market → Q&A → track a job → upgrade → pay.

---

## Suggested order of attack

1. Phase 1 (1.1 → 1.5) — makes payment real. Highest leverage.
2. Phase 2 (2.1 → 2.5) — flips the live site on correctly.
3. Phase 3 — derisk and reduce support load.

> Tip: keep this file updated as you complete items (check them off) so the launch state is
> always visible at a glance.
