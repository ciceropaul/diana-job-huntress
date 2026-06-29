# Claude Code Work Summary — Migration to Cicero Teams

> Prepared for Paul Bennett (paul@cicerolearning.com) when moving from a personal
> Max plan to a Cicero Teams Premium seat. Paste this into the new Team account so
> the context, skills, and memory travel with you. Because this lives in the
> `ciceropaul/diana-job-huntress` Git repo, it survives independently of any Claude
> account — deleting the personal account will not remove it.

---

## 0. TL;DR — what to do before deleting the personal account

1. **Export your client-side skills and memory** (they are NOT in any repo or in
   the cloud — see §4 for exact paths and commands). This is the only thing that is
   genuinely *lost* on account deletion.
2. **Nothing else is at risk.** All real work product is the Diana app, which lives
   in GitHub (`ciceropaul/diana-job-huntress`) and Supabase (project
   `lknbvpodteqbjheamxek`), both independent of your Claude account.
3. **Re-add API keys / secrets in the Team environment** (§3). Keys are never stored
   in Claude; they live in Vercel/Supabase/`.env.local`.
4. Paste §1–§2 of this doc into a Team project's `CLAUDE.md` so the new seat starts
   with full context.

---

## 1. The body of work: "Diana" — an AI job-hunting agent

**Repo:** `ciceropaul/diana-job-huntress` · **~4,200 LOC** of app code across
**8 feature commits** (2026-06-07 → 2026-06-29), all authored via Claude Code.

Diana is a single-tenant (now multi-profile) web app that automatically hunts for
jobs matching a candidate's profile, scores each find with Claude, writes tailored
cover letters, emails a digest, and tracks applications through a kanban pipeline.

### Stack
- **Next.js 16** (App Router, route groups `(app)` / `(auth)`, server components,
  `after()` for background work), **React 18**, **TypeScript**.
- **Supabase** — Postgres + Auth (Google OAuth) + Row-Level Security on every table.
- **Anthropic SDK** (`@anthropic-ai/sdk`) — scoring, cover letters, scan reasoning,
  using **`claude-sonnet-4-6`** (with `claude-opus-4-8` noted as an optional
  quality upgrade for the scoring pass).
- **Resend** — email digests. **Vercel** — hosting + Cron. **Tailwind + Radix UI +
  dnd-kit** — UI / drag-and-drop kanban.

### Architecture map
```
app/
  (auth)/login            Google OAuth login
  auth/callback           OAuth code exchange (surfaces real errors)
  (app)/dashboard         Greeting, scan button (bg + poll), clickable finds
  (app)/jobs, jobs/[id]   Listings + detail, cover-letter gen, re-analyze, flag-fit
  (app)/companies         Target-company CRUD with tag input
  (app)/profile           Candidate profile (skills, green flags, deal-breakers)
  (app)/tracker           Kanban application tracker (dnd-kit)
  (app)/settings          Scan cadence, exemplar tuning, digest opt-in
  api/scan                Core scan engine (manual + cron, runs in background)
  api/score               Re-score a single job
  api/cover-letter        Generate a tailored cover letter
  api/digest/test         Send a test digest email
  api/profile[/active]    Multi-profile CRUD + active-profile switch
lib/
  scoring.ts              buildCandidateContext() + scoreJob() — the AI scoring core
  ats.ts                  detectAts() — classifies job URLs by ATS platform
  email/digest.ts         Resend digest builder/sender
  profile.ts              Active-profile resolution
  supabase/*              SSR client, server client, middleware, generated types
```

### How the AI scoring works (`lib/scoring.ts`)
- `buildCandidateContext()` assembles a profile summary (positioning, skills, green
  flags, deal-breakers) **plus "ideal-fit exemplars"** — roles the candidate
  confirmed are great fits, used as the gold standard.
- `scoreJob()` prompts Claude for strict-JSON output: `overall` (1–10),
  per-dimension scores, third-person `reasoning`, **second-person `fit_summary`**
  (addressed directly to the candidate as "you/your"), `matched_skills`, and `gaps`.
  Robust to parse failures (regex-extracts the JSON block, returns `null` on error).

### The scan engine (`app/api/scan/route.ts`)
- `POST /api/scan` returns **202 immediately** and runs the heavy scan in the
  background via Next's `after()` — this fixed a mobile "Load failed" timeout.
- Two modes: **manual** (authenticated, scans the active profile) and **cron**
  (`Bearer CRON_SECRET`, scans every profile across all users).
- `GET /api/scan?id=` polls scan status from `scan_logs`.
- `maxDuration = 300`; cron uses a service-role client (no user session).

### ATS / auto-apply roadmap (`lib/ats.ts` + `docs/auto-apply-plan.md`)
- `detectAts()` classifies a job's `source_url` into Greenhouse / Lever / Ashby /
  Workday / Rippling / SmartRecruiters / iCIMS / Workable / LinkedIn / aggregator,
  with `automatability` (high/medium/low/manual) and `hasPublicApi` flags.
- The plan defines **three honest tiers**: (A) structured ATS → full auto-fill +
  human review, (B) proprietary-but-standard → adapter per platform, (C)
  enterprise/login-walled → assist only. Concludes auto-fill needs a real browser
  (Playwright/Chromium), so it **can't run on Vercel** — needs a separate worker.
  This is the main "next phase" still to be built.

### Data model (Supabase, 9 tables, RLS on all)
`profiles`, `target_companies`, `job_listings`, `job_scores`, `cover_letters`,
`applications`, `scan_logs`, `settings`, `exemplars`. A `SECURITY DEFINER` trigger
on `auth.users` auto-seeds a new candidate's profile, settings, and 28 target
companies on first Google sign-in. `get_advisors(security)` returns zero warnings.

### Feature history (commits)
1. `0a11a63` Scaffold full app — auth, all pages, scan engine, kanban
2. `59792e6` Surface real OAuth errors in callback + login
3. `1629ee2` Dashboard scan button, time-based greeting, green flags, company CRUD,
   exemplar tuning, mobile nav, `TagInput`
4. `7b84cfc` Run scan in background + poll (fixes mobile "Load failed")
5. `8623e48` Fix jobs-page crash (nested anchor); clickable dashboard finds
6. `85c3972` Resend email digest + second-person fit summaries + re-analyze button
7. `94e49b6` ATS platform detection + auto-apply plan (Phase 0)
8. `12438d6` Multi-profile support with profile switcher

---

## 2. Carry-over context for the new Team seat (paste into `CLAUDE.md`)

- **Model IDs:** use `claude-sonnet-4-6` (scoring/scan/cover letters) and
  `claude-opus-4-8` (optional max-quality scoring). The PRD's
  `claude-sonnet-4-20250514` is outdated — do not use it.
- **Web search** is enabled via the Messages API `tools` param
  (`{"type":"web_search_20250305","name":"web_search"}`); verify the current tool
  version in the docs when wiring it.
- **Conventions in this repo:** route groups `(app)`/`(auth)`; server components by
  default; long work goes through `after()` + a `scan_logs` poll, never a blocking
  request; AI calls return strict JSON and must degrade gracefully on parse failure;
  `fit_summary` is always written in the **second person** to the candidate.
- **Security model:** RLS is owner-only by `user_id`; child tables gate through their
  parent; service-role key is server-side only (`/api/scan` cron). Never expose it
  to the client.
- **Known next steps:** the auto-apply agent (Tiers A–C in
  `docs/auto-apply-plan.md`) needs a browser worker off Vercel — biggest open item.

---

## 3. Secrets & external services (re-provision in Team env — none are in Claude)

| Var | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Supabase dashboard | Public; in `.env.local.example` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Server-side only** |
| `ANTHROPIC_API_KEY` | console.anthropic.com | — |
| `RESEND_API_KEY` | resend.com | Digest email |
| `CRON_SECRET` | self-generated | Same value in Vercel cron |
| `EMAIL_FROM` | Resend | Verify a domain to send beyond your own inbox |
| `NEXT_PUBLIC_APP_URL` | — | OAuth callback allow-list |

External accounts that hold the real state (independent of Claude): **GitHub**
(`ciceropaul/diana-job-huntress`), **Supabase** (`lknbvpodteqbjheamxek`, us-east-1),
**Vercel**, **Resend**, **Google Cloud** (OAuth client). Google OAuth requires
manual console steps (redirect URI
`https://lknbvpodteqbjheamxek.supabase.co/auth/v1/callback`) — see `DIANA_SETUP.md`.

---

## 4. Skills & memory — what actually exists, and how to take it with you

**Important:** Skills and personal memory in Claude Code are stored **client-side on
your machine**, not in the cloud and not in this repo. This web/remote session runs
in a throwaway container with a freshly cloned repo, so it can only see what's
committed — it cannot see the skills/memory on your personal Max laptop. From *this*
environment I found:

- **User-created skills:** none. (The one skill present, `session-start-hook`, is a
  Claude Code **built-in/bundled** skill, not authored by you.)
- **Global memory** (`~/.claude/CLAUDE.md`): none.
- **Project memory** (`./CLAUDE.md`): none.
- **Project settings / custom MCP / allowed-tools:** none configured in the repo.

### To preserve anything you DID create on your personal Max machine
Run these **on the computer where you use the Max plan**, before deleting the
account, and bring the output into the Team seat:

```bash
# 1. Personal/global skills, memory, and settings (the client-side stuff):
ls -la  ~/.claude/skills/          # any folder here = a skill you can copy over
cat     ~/.claude/CLAUDE.md        # global memory / preferences
cat     ~/.claude/settings.json    # hooks, permissions, env, MCP servers

# 2. Bundle them up to move to the new seat:
tar czf claude-personal-backup.tgz \
  ~/.claude/skills ~/.claude/CLAUDE.md ~/.claude/settings.json 2>/dev/null

# 3. Per-project memory lives next to each repo:
find ~ -name CLAUDE.md -not -path '*/node_modules/*' 2>/dev/null
```

Then in the Team seat: copy each skill folder back into `~/.claude/skills/`,
re-create `~/.claude/CLAUDE.md` from your backup (or paste §2 above), and re-add
hooks/permissions/MCP servers into the new `~/.claude/settings.json`. None of this
transfers automatically — accounts don't carry client-side files.

---

*Generated 2026-06-29. Everything above is reconstructed from the repo, its Git
history, `DIANA_SETUP.md`, `docs/auto-apply-plan.md`, and the live source.*
