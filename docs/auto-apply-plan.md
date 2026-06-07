# Auto-Apply Agent — Analysis & Plan

> Goal (from Paul): *"In an ideal world the app can open the application, fill it
> out, save, and show the user for review/approval."* This document analyzes what
> that takes, using the real jobs Diana has already found, and proposes a phased,
> shippable plan.

---

## 1. What the real data tells us

From the first scan's 18 listings (across Fora, Glossier, Runway, Industrious,
Peloton, Rippling, Warby Parker), the application platforms break down as:

| Platform | Where we saw it | Public API? | Auto-fill difficulty |
|---|---|---|---|
| **Greenhouse** | Fora (`gh_jid=`), Glossier (`job-boards.greenhouse.io`), Runway | ✅ Job board API | **Low (easy)** |
| **Ashby** | Industrious, Runway (`jobs.ashbyhq.com`) | ✅ Posting API | **Low (easy)** |
| **Rippling ATS** | Rippling (`ats.rippling.com`) | ❌ | Medium |
| **Custom / enterprise** | Peloton (`careers.onepeloton.com`) | ❌ | High |
| **Aggregator (redirect)** | Industrious (builtinnyc), Warby Parker (wearecapable.org) | ❌ | Resolve first |

**Key insight:** the long tail is real, but it's *concentrated*. Greenhouse +
Ashby + Lever cover a large share of startup/tech roles — exactly Diana's target
market. Nailing those three gets us most of the value. Everything else degrades
gracefully to "assisted manual."

This classification now ships in code: `lib/ats.ts` (`detectAts()`), surfaced on
the job detail page as **"Apply on {platform}"**.

---

## 2. The three honest tiers of "applying for you"

There is no single mechanism. Plan for three:

### Tier A — Structured ATS (Greenhouse, Lever, Ashby) → **full auto-fill + review**
These have predictable DOMs and/or APIs. We can reliably:
1. Read the application form (fields, required-ness, custom questions).
2. Map fields → the candidate's reusable "application packet" + LLM-generated
   answers for free-text/custom questions.
3. Fill the form, attach résumé, **stop before submit**, screenshot it.
4. Show the user the filled form for review → submit on approval.

### Tier B — Proprietary but standard (Rippling, SmartRecruiters, Workable)
Same flow as Tier A but each needs a small custom adapter / more LLM-driven
field mapping. Reliable enough with human review.

### Tier C — Enterprise & login-walled (Workday, iCIMS, LinkedIn Easy Apply)
Multi-step wizards, mandatory account creation, aggressive anti-bot/CAPTCHA, and
ToS that often prohibit automation. Here we **assist** rather than automate:
generate the answer packet + tailored responses, deep-link the user in, and let
them paste/submit. Optionally human-in-the-loop CAPTCHA solving later.

---

## 3. Why this can't just run on Vercel

Auto-fill needs a real browser (Playwright/Chromium) driving a live page, often
for 30–90s per application, sometimes headful for anti-bot. That doesn't fit
Vercel's serverless model well. Options:

- **Browserbase / Browserless** (hosted headless Chrome with stealth) — recommended;
  offload the browser, call it from a Vercel route or a worker.
- **A small long-running worker** (Render/Railway/Fly) running Playwright, invoked
  via a queue.
- `@sparticuz/chromium` on Vercel functions — only viable for very short, simple
  fills; fragile for multi-step.

**Recommendation:** Browserbase driven by a job queue, with the result (filled
state + screenshots) written back to Supabase for the review UI.

---

## 4. Data model additions (proposed)

```
application_packet            -- reusable, per-PROFILE answers (one row per profile)
  profile_id
  resume_url                  -- file in Supabase Storage
  phone, linkedin_url, portfolio_url, website
  work_authorization          -- e.g. "US citizen + EU citizen"
  needs_sponsorship boolean
  pronouns, gender, race, veteran_status, disability   -- optional EEO
  default_answers jsonb       -- {question_pattern: answer} learned over time

application_attempt           -- one per (job, attempt)
  job_listing_id, profile_id
  platform                    -- from detectAts()
  status                      -- 'draft' | 'filled' | 'needs_review' | 'submitted' | 'failed' | 'manual'
  filled_fields jsonb         -- what we put where
  generated_answers jsonb     -- LLM answers to custom questions (editable)
  screenshots text[]          -- Supabase Storage URLs of the filled form
  review_url                  -- Browserbase live/session link if available
  error, created_at, submitted_at
```

The existing `applications` table (kanban status) stays as the user-facing
pipeline; `application_attempt` is the machinery behind the "Apply" action and
feeds a card into `applications` once submitted.

---

## 5. The apply flow (Tier A)

```
User clicks "Apply for me" on a job
        │
        ▼
/api/apply  →  create application_attempt(status='draft')
        │       enqueue browser job (Browserbase)
        ▼
Worker: open source_url → detect form → map fields
        │   • packet fields (name/email/résumé/links/work-auth)
        │   • LLM answers for custom/free-text Qs, grounded in profile + job + cover letter
        ▼
Fill everything EXCEPT submit → screenshot each step
        │   write filled_fields + generated_answers + screenshots → status='needs_review'
        ▼
App notifies user (in-app + optional email)
        ▼
Review screen: see screenshots + every answer, edit any answer inline
        │
        ├─ Approve → worker resumes session, submits → status='submitted'
        │             → create applications row (status='applied')
        └─ Reject/Edit → re-fill with edits → back to review
```

Human review before submit is the product requirement *and* the safety valve for
reliability/ToS.

---

## 6. Hard problems & how we handle them

- **CAPTCHAs / anti-bot:** can't reliably auto-solve. Detect → pause → hand the
  live session to the user (Browserbase supports interactive takeover) or fall
  back to assisted-manual.
- **Account creation (Workday et al.):** store per-employer credentials in the
  packet (encrypted) or treat as Tier C.
- **Résumé/cover-letter files:** generate a PDF from the cover-letter feature +
  store the master résumé in Supabase Storage; attach during fill.
- **ToS / ethics:** some ATS prohibit automated submission. Keep a per-platform
  allow/deny policy in `lib/ats.ts`; default to assisted-manual where prohibited;
  always require explicit user approval before any submit.
- **Custom questions** ("Why do you want to work here?"): LLM-generated from
  profile + job + exemplars + cover letter, always user-editable. Learn good
  answers into `application_packet.default_answers` over time.

---

## 7. Phased plan (shippable increments)

- **Phase 0 — Detect & assist (SHIPPED in this commit).**
  `detectAts()` + "Apply on {platform}" link. Foundation for everything else.

- **Phase 1 — Application packet + answer generator (no browser).**
  Build `application_packet` + an editor (résumé upload, links, work-auth, EEO).
  Add "Prepare application" → LLM generates answers to that platform's typical
  questions + a tailored cover letter; user copies into the real form. ~80% of
  the time savings, ~5% of the risk. **Recommended next build.**

- **Phase 2 — Auto-fill + review for Greenhouse/Ashby/Lever.**
  Browserbase worker fills the form, screenshots, stops before submit; review
  screen with inline editing; submit on approval. The headline feature, scoped
  to the highest-success platforms.

- **Phase 3 — Expand adapters (Rippling, SmartRecruiters, Workable) + résumé PDF.**

- **Phase 4 — Tier C assist + interactive CAPTCHA takeover; learn default answers.**

---

## 8. Recommended MVP

**Phase 1 now, Phase 2 for Greenhouse + Ashby next** (those two alone covered
Fora, Glossier, Runway, and Industrious in our first scan). Everything else
degrades to the assisted packet, so the user is never blocked — they just get
more or less automation depending on the platform.

---

## 9. Open questions for Paul

1. Comfort level with **fully automated submit after approval**, vs. always
   "fill + you click submit yourself in the live session"?
2. Provide a **master résumé** (PDF) to attach, or generate one from the profile?
3. OK to add a **Browserbase** dependency (small monthly cost) for Phase 2?
4. EEO/demographic questions — fill from a saved packet, or always leave blank?
