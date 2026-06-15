# Jobpilot — AI-Powered Job Search Platform

@AGENTS.md

## Project Overview

Jobpilot (jobpilot.katexu.com) is a freemium AI job search tool that helps users manage their job hunt end-to-end: resume parsing & analysis, market research, interview Q&A prep, job tracking, and application management. It uses a dual-mode storage architecture so anonymous users get a full experience via localStorage, while signed-in users persist everything to Supabase.

## Tech Stack

- **Framework:** Next.js 16.2.0 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4
- **Database & Auth:** Supabase (Postgres + Auth + RLS)
- **Auth method:** Google OAuth + email confirmation (via Resend SMTP)
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Payments:** Stripe (checkout + webhooks)
- **Email:** Resend (transactional auth emails through Supabase custom SMTP)
- **Deployment:** Vercel (Hobby tier), custom domain via Vercel DNS
- **Dev port:** 3001

## Architecture: Dual-Mode Storage

The core architectural pattern: every data function accepts `SupabaseClient | null`. If a Supabase client is passed, data goes to Postgres. If null, it falls back to localStorage.

**Critical rule:** In every save function, after a successful Supabase write, use `return;` immediately — never fall through to the localStorage path. This prevents data leakage between modes.

```
// Pattern in app/lib/db.ts
export async function saveProfile(supabase: SupabaseClient | null, data: Profile) {
  if (supabase) {
    await supabase.from('profiles').upsert({ ... });
    return; // ← CRITICAL: early return prevents localStorage write
  }
  localStorage.setItem('profile', JSON.stringify(data));
}
```

**How components get the client:** `useSupabase()` hook returns the Supabase client if the user is authenticated, or `null` if anonymous. Components pass this directly to db.ts functions.

**Migration on first sign-in:** `AuthProvider.tsx` listens for `SIGNED_IN` events and triggers `migrateLocalStorageToSupabase()` once (guarded by a ref) to copy anonymous data into the user's Supabase account.

## Key File Structure

```
app/
├── api/                    # Route handlers (AI endpoints, Stripe, resume export)
│   ├── analyze-market/     # Market research AI endpoint
│   ├── analyze-resume/     # Resume analysis AI endpoint
│   ├── answer-questions/   # Interview Q&A AI endpoint
│   ├── checkout/           # Stripe checkout session creation
│   ├── export-resume/      # PDF resume export
│   ├── parse-resume/       # Resume PDF parsing
│   └── webhook/            # Stripe webhook handler
├── auth/
│   ├── callback/route.ts   # OAuth callback handler
│   └── page.tsx            # Auth UI page
├── applications/page.tsx   # Kanban board for tracking applications
├── dashboard/page.tsx      # Overview with dynamic stats
├── jobs/page.tsx           # Job listings with inline add form
├── market/page.tsx         # Market research results
├── profile/page.tsx        # User profile (starts empty, not pre-filled)
├── resume/page.tsx         # Resume upload & analysis
├── settings/page.tsx       # Account settings
├── stories/page.tsx        # Experience/story bank for interviews
├── components/
│   └── AuthProvider.tsx    # Auth context + migration trigger
├── hooks/
│   └── useSupabase.ts     # Returns SupabaseClient | null
├── lib/
│   ├── db.ts              # ALL data access (dual-mode functions)
│   ├── migrate-local-data.ts  # localStorage → Supabase migration
│   ├── rate-limit.ts      # AI usage rate limiting
│   └── supabase/
│       ├── admin.ts       # Service-role client (server-side only)
│       ├── client.ts      # Browser client (createBrowserClient)
│       └── server.ts      # Server client (createServerClient with cookies)
├── layout.tsx
├── page.tsx               # Landing page
└── globals.css

components/                 # Shared components (top-level)
├── AppLayout.tsx
├── ExperienceBank.tsx
├── ResumeUpload.tsx
└── Sidebar.tsx

supabase/
└── migrations/            # SQL migration files
```

## Database Schema (Supabase)

Tables use `user_id` (UUID, references auth.users) and enforce RLS so users only access their own data. Key tables:

- `profiles` — name, email, target roles, skills, location
- `resume_reports` — AI analysis results from resume parsing
- `experience_entries` — STAR-format experience stories
- `market_reports` — AI market research results
- `qa_answers` — Interview Q&A generated content
- `jobs` — Job listings (UUID primary key, title, company, url, status, notes)
- `applications` — Application tracking with status (applied, interview, offer, rejected)
- `ai_usage` — Rate limiting: tracks daily AI call count per user

All tables have RLS policies: `SELECT/INSERT/UPDATE/DELETE WHERE auth.uid() = user_id`.

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=       # Service role key (server-side only)

# AI
ANTHROPIC_API_KEY=               # Claude API key for AI features

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_PRO_PRICE_ID=
STRIPE_PREMIUM_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
```

## Auth Flow

1. User clicks "Sign in with Google" → Supabase Auth initiates OAuth
2. Google redirects → `/auth/callback` exchanges code for session
3. `AuthProvider` detects `SIGNED_IN` → runs migration once
4. `useSupabase()` now returns a live client → all db.ts calls hit Postgres
5. Email confirmation uses Resend SMTP (configured in Supabase dashboard)

## Development Commands

```bash
npm run dev      # Start dev server on port 3001 (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
```

## Deployment

- **Hosting:** Vercel (auto-deploys from `main` branch)
- **Domain:** jobpilot.katexu.com (CNAME → cname.vercel-dns.com)
- **DNS:** Managed via Vercel nameservers (ns1.vercel-dns.com)
- **Resend DNS records:** DKIM on `resend._domainkey.jobpilot`, SPF+MX on `send.jobpilot`

## Key Conventions

1. **No hardcoded seed data** — Pages start empty; all data comes from db.ts functions
2. **UUID for all IDs** — Use `crypto.randomUUID()` for new records (Supabase uses UUID primary keys)
3. **Type-safe** — All data shapes have TypeScript interfaces in db.ts
4. **AI endpoints are rate-limited** — Check `getTodayUsageCount` + `getUserTier` before calling Claude
5. **Stripe tiers:** Free (limited AI calls/day), Pro, Premium
6. **No middleware.ts in source** — Auth state is managed client-side via AuthProvider

## Known Issues / TODOs

- `SUPABASE_SERVICE_ROLE_KEY` in .env.local is currently identical to the anon key (needs real service role key)
- Supabase env vars need to be added to Vercel for production
- Supabase URL Configuration (Site URL + redirect URLs) needs setup for production OAuth
- Email templates in Supabase need Jobpilot branding
- API routes should be updated for auth-aware rate limiting
- Stripe checkout/webhook should tie to Supabase user IDs
- Migration utility doesn't check if localStorage data belongs to a different user

## Rules for AI Agents

1. **Read Next.js docs first** — This is Next.js 16.2 with breaking changes. Check `node_modules/next/dist/docs/` before writing new pages or API routes.
2. **Preserve the dual-mode pattern** — Every new data function must accept `SupabaseClient | null` and handle both paths.
3. **Early return after Supabase writes** — Never let Supabase-mode execution fall through to localStorage.
4. **Don't pre-fill user data** — Pages should render empty states, not placeholder/demo content.
5. **Keep RLS policies** — Every new table needs `WHERE auth.uid() = user_id` policies.
6. **Don't expose service role key client-side** — Only use it in server-side code (API routes, server components).
