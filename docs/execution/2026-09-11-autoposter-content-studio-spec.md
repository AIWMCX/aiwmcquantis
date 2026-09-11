# Autoposter + Content Studio — Unification & Daily Engine Spec
2026-09-11, AIWMC Quantis

## 0. Why this doc exists

Founder asked to (1) archive the current 42-post plan, (2) seed Content Studio with
content already posted live on LinkedIn (Bogdan personal + AIWMC page) over the
last 3+ days, marked as already-published so nothing gets duplicated, (3) add a
real image-generation API for daily cinematic/commercial product images, (4)
combine Content Studio + Autoposter into one admin surface, and (5) run a daily
engine that generates, dedupes, and schedules content without the founder
re-entering the day of posting each time.

This is a plan, not yet executed against the database. Nothing below has been
run. Every current-state claim was verified against production schema before
writing this (see table below) — not assumed from the pasted request.

## 1. Verified current state

| Thing | Verified fact |
|---|---|
| `autoposter_posts` | 42 rows, columns: week_number, day_number, post_date, hook, content_brief, post_type, visual_type, cta, hashtags[], expected_reach, status (default `'draft'`), notes. **No link to content_studio_generations.** |
| `autoposter_post_platforms` | Per-platform publish record: post_id → autoposter_posts, platform, content, scheduled_at, published_at, platform_post_id, status. 6 rows exist. |
| `autoposter_credentials` | 0 rows — no LinkedIn (or any) OAuth credential connected yet. Schema already supports two separate identities via `page_id`/`account_id` (one row for Bogdan personal, one for the AIWMC company page) — no schema change needed for that distinction. |
| `content_studio_generations` | 30 rows: topic, angle, tone, audience, cta, platforms[], length, model, variants (jsonb), meta (jsonb). **Not referenced by any autoposter table.** |
| `content-studio-generate` edge function | Generates caption text and an `image_prompt` string only. **No call to any image-generation API exists anywhere in the repo.** |
| `publish-due-posts` edge function | Reads `autoposter_post_platforms` rows that are due, publishes to `linkedin`/`facebook`/`instagram`. Real, working code — just has nothing to publish yet (no credentials, and current posts are drafts). |
| Admin pages | `src/pages/admin/Autoposter.tsx` (63 lines — thin/stub) and `src/pages/admin/ContentStudio.tsx` (368 lines — the real generation UI). Two separate pages today. |

## 2. Target data model

Add one migration, additive only (no data loss):

```sql
-- Link Content Studio output to the Autoposter pipeline
alter table public.autoposter_posts
  add column source text not null default 'manual'
    check (source in ('manual', 'content_studio', 'external_seed')),
  add column content_studio_generation_id uuid references public.content_studio_generations(id),
  add column dedup_hash text,                          -- normalized-content hash, for same-day/same-topic collision checks
  add column archived_at timestamptz,
  add column archived_reason text;

create index autoposter_posts_dedup_hash_idx on public.autoposter_posts (dedup_hash) where archived_at is null;

-- Extend status vocabulary (currently just uses free text with default 'draft')
-- New values used going forward: 'draft' | 'scheduled' | 'published' | 'archived' | 'outdated'
```

`dedup_hash` = normalized lowercase hook+first-120-chars-of-brief, hashed. Before
any new Content Studio generation is turned into an `autoposter_posts` row, the
daily engine checks this hash (and platform) against the last 90 days of
non-archived rows. A collision blocks auto-scheduling and surfaces in the admin
UI for manual review — it never silently skips or silently duplicates.

## 3. Step-by-step execution order

### Step A — Archive the current 42 posts (safe, reversible, no data loss)
```sql
update public.autoposter_posts
set status = 'archived', archived_at = now(), archived_reason = 'superseded by 13-week plan, 2026-09-11'
where archived_at is null;
```
Nothing is deleted. `publish-due-posts` already only looks for rows with
pending/scheduled status in `autoposter_post_platforms`, so archived posts stop
being eligible without needing a code change there.

### Step B — Seed already-posted content (blocked on founder input)
**Waiting on the founder to paste the actual 3+ days of content that already
went live on LinkedIn (Bogdan personal + AIWMC page).** Once received, each
post becomes:
- one `autoposter_posts` row: `source='external_seed'`, `status='published'`
- one `autoposter_post_platforms` row per identity it was posted to
  (`platform='linkedin'`, distinguished by which `autoposter_credentials.account_id`
  it corresponds to once that's connected — until then, `notes` records
  "posted to: Bogdan personal" / "posted to: AIWMC page"), with
  `published_at` set to the **real historical date**, not today.

This is what makes de-dup possible going forward — the engine can't avoid
repeating content it doesn't know already went out.

### Step C — Image generation (needs a founder decision + a new API key)
Recommendation: **Gemini** (`gemini-2.5-flash-image`, aka "Nano Banana") for
day-to-day generation — meaningfully cheaper than OpenAI's `gpt-image-1` at
comparable commercial-photo quality for product/lifestyle-style stills, and
Google's own pricing puts it well below DALL-E-class pricing per image.
OpenAI's `gpt-image-1` is the better fallback specifically when a shot needs
sharper text-in-image rendering (e.g. a stat callout baked into the image),
which Gemini is weaker at. Practical plan: **wire both**, default to Gemini,
let the admin UI pick OpenAI per-post when a shot specifically needs in-image
text.

Needs from founder: a Gemini API key (aistudio.google.com/apikey) and,
optionally, an OpenAI API key — added as Supabase Edge Function secrets
(`GEMINI_API_KEY`, `OPENAI_API_KEY`), same place as today's `RESEND_API_KEY`.
I cannot generate these myself.

New shared module: `supabase/functions/_shared/image-gen.ts` — one function,
two providers, given a prompt + aspect ratio, returns an image URL/blob
uploaded to a new `content-assets` storage bucket. `content-studio-generate`
calls this immediately after generating `image_prompt`, instead of leaving it
as inert text.

### Step D — Daily engine
A new scheduled function, `autoposter-daily-engine` (same `pg_cron` + Vault
pattern used for `reconcile-stripe-subscriptions` today):
1. Looks ahead N days (configurable, default 3) for `autoposter_posts` rows
   with `status='draft'` and a `post_date` in that window that have no
   `content_studio_generation_id` yet.
2. For each, calls `content-studio-generate` with that post's brief, gets
   caption + image.
3. Runs the dedup-hash check against the last 90 days.
4. On a clean pass: creates the `autoposter_post_platforms` rows with
   `scheduled_at` = the post's own `post_date` (the founder's pre-set posting
   day is never overridden), status `scheduled`.
5. On a dedup collision: leaves the post in `draft`, writes a note, and it
   shows up in the admin UI as "needs review" — never silently posted, never
   silently dropped.
6. `publish-due-posts` (existing, unchanged) picks up anything with
   `status='scheduled'` and `scheduled_at` due, same as it does today.

### Step E — Admin UI consolidation
Merge `Autoposter.tsx` and `ContentStudio.tsx` into one page with two tabs
under a single route (`/admin/content`): **Calendar** (the 13-week schedule,
status per post, dedup warnings, manual override) and **Studio** (the existing
generation form, now also showing a live image preview from Step C). Both tabs
read/write the same `autoposter_posts` table, so there's one source of truth
instead of two.

## 4. What ships in which pass

1. **Migration (Step A + B schema)** — additive, safe, one PR.
2. **Archive the 42 posts** — one SQL statement, run after the migration lands.
3. **Seed script for the pasted content** — written once the founder's actual
   posts arrive; cannot be built generically in advance without guessing the
   real content/dates.
4. **Image-gen module + wiring** — one PR, gated on the founder adding at
   least one of the two API keys.
5. **Daily engine + cron scheduling** — one PR, same Vault-secret pattern
   already proven working today for the Stripe reconciliation job.
6. **Admin UI merge** — one PR, last, since it's the least urgent (an ugly
   two-page admin doesn't block anything functional).

Each ships as its own small, CI-verified PR — not one giant change — matching
how every other piece of today's work was done.

## 5. Open decision for the founder

- Confirm Gemini-primary / OpenAI-fallback for images (or pick one only).
- Add `GEMINI_API_KEY` and/or `OPENAI_API_KEY` to Supabase Edge Function
  secrets when ready.
- Paste the actual 3+ days of already-posted LinkedIn content (Bogdan
  personal + AIWMC page) so Step B can run for real instead of staying a
  placeholder.
