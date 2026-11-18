# Hustly — Your Campus. Your Hustle.

A verified same-university student services marketplace. Next.js 14 + TypeScript + Tailwind, Supabase, Vercel, Groq (optional).

**Production URL:** https://hustlyapp.vercel.app (slug locked by David)
**Design:** white backgrounds + light bright emerald only (#10B981 / #34D399 accents). No sky blue, no navy UI, no deep green, no gradients, no glassmorphism. The official logo combo (icon + "Hustly" wordmark + tagline) is used exactly as supplied in `public/logo.jpg` — never redrawn or cropped.

## What it is

Students verify by email (custom OTP) and as a student (ID card + selfie, human admin review), then list and find services only within their own university. Jobs go requested → accepted → in progress → delivered → completion pending → completed, with mutual completion confirmations before reviews open. Chat has a pinned safety banner and contact details are revealed only after the user presses "I understand".

## Non-negotiables (from the spec)

- **No payments, escrow, wallet, checkout or payouts anywhere.** Hustly never holds money. The 50/50 rule (no more than 50% upfront, balance after delivery) is a safety guideline, not a payment feature.
- **No phone OTP.** Email OTP only, 6 digits, 10-minute expiry, single-use, hash-only storage, resend cooldown, max 5 attempts.
- **No NIN.** Student verification is ID card + selfie only. No facial-recognition claim anywhere.
- **Verification is decided by a HUMAN admin (David) in /admin**, comparing the ID photo and selfie himself. No always-logged-in admin bot, no auto-approval, no face-matching. Groq triage is text-only (typed-field consistency + a short summary for the admin) and never receives images, never compares faces, never approves or rejects.
- **Verification evidence is retained privately** (private Supabase Storage bucket `hustly-verification` + `hustly_student_verifications` row + `hustly_admin_audit_logs` entry) for safety/audit. Never public, never in listings/profiles/chat.
- **University isolation** is enforced in database queries/RLS, never UI-only.
- **Groq is optional.** Every core flow works when the key is missing or Groq fails. The key is read only from `process.env.GROQ_API_KEY` in server routes.

## Run locally

```bash
cp .env.example .env.local   # fill in placeholders — never commit real secrets
npm install
npm run dev
```

## Environment variables (placeholders only — see .env.example)

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | https://hustlyapp.vercel.app |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Never in the browser |
| `GROQ_API_KEY` | server only | Set in Vercel dashboard; never in code |
| `SMTP_HOST` / `SMTP_PORT` | server only | smtp.gmail.com / 587 |
| `SMTP_USER` | server only | techdavid211@gmail.com (dedicated sender) |
| `SMTP_PASS` | server only | Gmail app password — secure entry only, never in chat/code |
| `SMTP_FROM` | server only | techdavid211@gmail.com |

## Database

Migrations — APPLIED 18 Nov 2026 to the SHARED Supabase project (ref vtappsupjgsuzhemypkq, https://vtappsupjgsuzhemypkq.supabase.co), after dedicated creation and the Spark AI resume were both blocked by Supabase's 2-free-project limit. All tables are `hustly_*` namespaced so they stay separate from the other apps on the shared project. Do NOT touch other tables (drx_*, mh_*, aep_*, tmj_*, etc.).

- `supabase/migrations/001_hustly_schema.sql` — all 20 `hustly_*` tables, UUID PKs, FKs, indexes. Verified live: 20/20 tables exist.
- `supabase/migrations/002_hustly_rls.sql` — RLS deny-by-default on every table (verified enabled on 20/20) + explicit Data API grants (incl. select to anon; full access to authenticated/service_role).
- `supabase/seed/seed.sql` — 9 categories + 10 Nigerian universities (incl. University of Ilorin). Verified live: 9 categories, 10 universities.

Private storage bucket `hustly-verification` (public: false) created 18 Nov 2026. Admin review uses short-lived signed URLs only.

## Admin bootstrap

Do NOT hard-code an admin password. Create the first admin account by signing up normally, then insert the user id into `admin_roles` from the Supabase SQL editor (owner-controlled), e.g.:

```sql
insert into public.hustly_admin_roles (user_id, role) values ('<admin-user-uuid>', 'admin');
```

## Screens

Landing, Safety Tips, sign up / sign in / email OTP verify / password reset, student verification, marketplace (search + category filter + saved), listing detail + create listing, public profile + edit profile, saved listings, job detail (full lifecycle + review form), inbox, chat (pinned safety banner + contact-reveal "I understand" modal + block/report), notifications, /admin (overview, verification queue, reports, users, listings, settings, audit log).

## Still blocked (needs David / live setup)

1. **Supabase** — DONE: shared project, migrations + seed applied and verified 18 Nov 2026. Still to do: set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` for the shared project in the Vercel dashboard (names only here — never paste values into chat or code).
2. **Gmail app password** for techdavid211@gmail.com (SMTP_PASS) — without it, OTP sending returns a clear "email not configured" state instead of crashing.
3. **Deploy** to https://hustlyapp.vercel.app (GitHub auto-deploy; no deploy has been run from this scaffold).
4. **Phone acceptance** — David's phone check of every flow, especially marketplace, chat safety banner and admin queue.

## Test checklist (spec §17)

- Register → OTP → sign in → password reset; no phone OTP anywhere.
- OTP expiry / reuse / brute-force / resend cooldown / duplicate email.
- Unverified student cannot publish; University A cannot see University B data by URL or API.
- Verification images unreachable without a signed URL; normal student cannot reach /admin data or actions.
- Contact details hidden until "I understand" is recorded; safety banner pinned in every chat.
- Reviews locked until mutual completion; duplicate and self-reviews rejected.
- Groq outage does not break core flows; no key in browser bundles.
- All flows at phone width: no overlap, clipping, or crowded cards.
