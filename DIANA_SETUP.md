# Diana — Backend Setup (Done) + Next Steps

This documents the Supabase backend I provisioned for Diana, and exactly what to do
next to build the Next.js app in the `ciceropaul/diana-job-huntress` repo.

---

## ✅ What's already live (Supabase)

**Project:** `diana-job-huntress`
- **Ref / Project ID:** `lknbvpodteqbjheamxek`
- **Region:** `us-east-1` (close to NYC — better than the existing EU project)
- **API URL:** `https://lknbvpodteqbjheamxek.supabase.co`
- **Status:** ACTIVE_HEALTHY
- **Cost:** $0/month (free tier)

**Applied migrations** (full SQL in `supabase/migrations/`):
1. `0001_initial_schema.sql` — all 8 tables (`profiles`, `target_companies`,
   `job_listings`, `job_scores`, `cover_letters`, `applications`, `scan_logs`,
   `settings`), indexes, and **Row Level Security on every table** (owner-only,
   scoped by `user_id`; child tables gated via their parent `job_listing`).
2. `0002_seed_on_signup.sql` — a trigger on `auth.users` that **auto-seeds the
   candidate's full profile, settings, and all 28 target companies the first time
   she signs in with Google.** This is the PRD's onboarding flow, done at the DB
   layer so it's bulletproof and repo-independent.

**Security:** `get_advisors(security)` returns **zero warnings**. The seed function
is `SECURITY DEFINER` but `EXECUTE` is revoked from API roles, so it can only fire
from the trigger (not via the public REST API).

> Tweaks I made vs. the PRD schema: added a `settings` table (the PRD's §5.8 had no
> table), added `tags` to `target_companies` (§5.4 asks for custom tags), made
> `source_url` unique **per user** rather than globally, added `ON DELETE CASCADE`
> from child tables, and added `CHECK` constraints on `applications.status`.

---

## 🔑 Environment variables

See `.env.local.example` — the Supabase URL and anon key are already filled in.
You still need to supply:

| Var | Where to get it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API → `service_role` secret. Used **server-side only** by `/api/scan` (cron runs with no user session). |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `RESEND_API_KEY` | resend.com |
| `CRON_SECRET` | Generate any random string; set the same value in Vercel. |

---

## ⚠️ Model IDs — update from the PRD

The PRD specifies `claude-sonnet-4-20250514`, which is outdated. Use current IDs:
- **`claude-sonnet-4-6`** — scoring + scan + cover letters (fast, cheap, strong).
- **`claude-opus-4-8`** — optional upgrade for the scoring pass if you want max quality.

The `web_search` tool is enabled via the standard Anthropic Messages API `tools`
param (`{"type": "web_search_20250305", "name": "web_search"}` — verify the current
tool version in the docs when wiring it).

---

## 🔐 Google OAuth — manual steps (can't be done via API)

1. **Google Cloud Console** → create OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI:
   `https://lknbvpodteqbjheamxek.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** → Authentication → Providers → Google → enable, paste the
   Client ID + Secret.
4. **Supabase Dashboard** → Authentication → URL Configuration → set Site URL +
   redirect allow-list to your app URL (localhost for dev, prod domain later).
5. (Single-user app) Optionally restrict signups so only the candidate's Google
   account can create a session — easiest is to leave open and rely on it being an
   unlisted URL, or add an allow-list check in `/auth/callback`.

---

## 🏗️ Building the app (in the diana-job-huntress repo)

This session is scoped to a different repo, so I couldn't push app code here. To build it:

1. Open a **new Claude Code on the web session pointed at `ciceropaul/diana-job-huntress`.**
2. Drop these files in at the start:
   - `lib/supabase/database.types.ts` (generated, typed against the live DB)
   - `.env.local.example`
   - `supabase/migrations/*` (for `supabase db reset` / local dev)
3. Hand that session the PRD + this doc and have it follow the PRD **Build Order
   (§11)**, starting at step 2 (auth) since step 1's DB work is already done.

Because the DB types are generated from the real schema, the app code will be fully
type-safe against what's already deployed.

---

## Build order reminder (PRD §11), with status

1. ~~Repo init + Supabase (schema, RLS, seed, auth tables)~~ ✅ **DB done here**
2. Auth flow — login page, protected layout, `/auth/callback`, middleware
3. Profile page — already seeded; build load/save UI
4. Target companies page — already seeded; build table UI
5. Core scan engine — `/api/scan` + Claude + web_search
6. Jobs listing page
7. Job detail + cover letter generator
8. Dashboard
9. Application tracker (kanban, dnd-kit)
10. Vercel Cron + Resend digest
11. Settings page (table already exists)
12. Polish (mobile, loading/empty states)
