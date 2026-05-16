
# AIWMC Autoposter — In-App v1

Scope: dashboard + Claude content generation inside Quantis. Publishing to LinkedIn / Facebook / Instagram is **deferred to v2** (n8n on your DigitalOcean instance will call `publish-post` once OAuth tokens exist). LinkedIn/Facebook/Instagram is locked in as the v2 target set.

## What ships in v1

### 1. Database (Supabase migration)
Six tables, all admin-only via RLS (only `beltovbogdan@gmail.com` can read/write; service role bypasses):

- `autoposter_posts` — master calendar row (week, day, date, hook, brief, post_type, visual_type, cta, hashtags[], expected_reach, status)
- `autoposter_post_platforms` — one row per (post × platform) with Claude-generated content, `best_time_mt`, `scheduled_at`, `published_at`, `platform_post_id`, `status`, `error_message`
- `autoposter_credentials` — encrypted platform tokens (LinkedIn / Facebook / Instagram). Empty in v1, populated in v2.
- `autoposter_publishing_logs` — audit trail
- `autoposter_analytics_weekly` — mirrors your Excel KPI sheet exactly (LI impressions, FB/IG reach, Reddit upvotes, signups, MRR, etc.)
- `autoposter_post_analytics` — per-post engagement (filled in v2)

All tables `ENABLE ROW LEVEL SECURITY` with `has_role(auth.uid(), 'admin')` policies. Service role full access for the edge function. Indexes on `(status, scheduled_at)`, `(post_id, platform)`, `(week_number)`.

### 2. Edge Function: `generate-content`
- Input: `{ postId, platforms: ['linkedin'|'facebook'|'instagram'][] }`
- Calls Anthropic `claude-haiku-4-5` with platform-specific system prompts (LinkedIn = 150–300 words founder-honest; Facebook = 200–400 word storytelling; Instagram = hook→gap→value→CTA, hashtags separated)
- Upserts into `autoposter_post_platforms` with `best_time_mt` defaults (LI 08:00, FB 13:00, IG 10:00 MT) and `status='pending'`
- Logs the call in `autoposter_publishing_logs`
- Requires `ANTHROPIC_API_KEY` secret (I will request it via the secrets tool before deploying — do not commit it)
- Admin gate: validates caller JWT belongs to admin user
- CORS enabled, registered in `supabase/config.toml` with `verify_jwt = false` (auth is checked in code)

### 3. xlsx Importer
You said "upload the .xlsx now" but I don't see `QUANTIS_SOCIAL_MEDIA_MASTERPLAN.xlsx` attached to this message. When you attach it I will:
- Parse it once with `document--parse_document`
- Generate a single `supabase--insert` call seeding `autoposter_posts` with all 84 rows (week, day, post_date, hook, content_brief, post_type, visual_type, cta, hashtags, expected_reach)
- No in-app uploader — one-shot seed

### 4. Admin route: `/admin/autoposter`
Mounted in `App.tsx` behind the existing `useAdmin()` gate (redirects non-admins). Three tabs inside `AppLayout`:

**Tab 1 — Content Queue** (`PostQueue.tsx`)
- Filterable list of `autoposter_posts` (this week / next week / all)
- Each row: date, post_type, hook preview, status badge, per-platform chips (LI/FB/IG)
- "✦ Generate" button per post → calls `generate-content` edge function with all 3 platforms → toast + auto-refresh
- "Edit & Approve" opens a side sheet showing the 3 generated variants, editable textareas, "Approve & schedule" sets `status='scheduled'` and `scheduled_at = post_date + best_time_mt`

**Tab 2 — 90-Day Calendar** (`PostCalendar.tsx`)
- Month grid (3 months visible). Each cell = one post with color-coded status dot (draft / pending / scheduled / published / failed)
- Click a cell → opens the same side sheet
- Legend + week-number column

**Tab 3 — KPI Tracker** (`KPITracker.tsx`)
- Reads `autoposter_analytics_weekly` for the last 12 weeks
- Cards: WoW deltas for LI impressions, FB/IG reach, signups, MRR
- Recharts line chart (already in your stack) per metric
- "Add weekly snapshot" form (admin manual entry until v2 auto-pull)

All UI uses your existing tokens (`--q-bg-base`, Cabinet Grotesk / DM Sans, `#8FFF2A` accent for status badges) — no new colors. Glass cards, no generic AI icons, no fabricated metrics.

## What is explicitly NOT in v1

- No publishing to any platform (no `publish-post` function, no OAuth, no token storage UX). The tables exist so v2 can drop in cleanly.
- No n8n workflows. No GitHub monorepo scaffolding.
- No Reddit / X / Threads.
- No automatic analytics pulls (KPI is manual entry).
- No changes to landing page, pricing, or any existing Quantis surface.
- No new dependencies beyond what's already installed (uses `recharts`, `@supabase/supabase-js`, `date-fns` already in your bundle).

## Technical details

```text
src/pages/admin/Autoposter.tsx              (route, tab shell)
src/components/autoposter/PostQueue.tsx
src/components/autoposter/PostCalendar.tsx
src/components/autoposter/KPITracker.tsx
src/components/autoposter/PostEditorSheet.tsx
src/hooks/useAutoposter.ts                  (react-query: posts, platforms, weekly stats)
src/lib/autoposter/generateContent.ts       (client wrapper for edge fn)
supabase/functions/generate-content/index.ts
supabase/config.toml                        (+ [functions.generate-content] verify_jwt=false)
supabase migration 20260516_autoposter.sql  (6 tables + RLS + indexes)
```

Route registered in `App.tsx`. Sidebar link added to `AppSidebar.tsx` under an "Admin" section (only rendered when `useAdmin().isAdmin === true`).

## Sequence after you approve

1. I request `ANTHROPIC_API_KEY` via the secrets tool.
2. I run the migration (6 tables + RLS).
3. I write the edge function, hook, page, components, sidebar link.
4. You attach `QUANTIS_SOCIAL_MEDIA_MASTERPLAN.xlsx` → I parse + seed `autoposter_posts` in one `supabase--insert` call.
5. You open `/admin/autoposter`, click "✦ Generate" on row 1 → verify all 3 platform variants come back from Claude.

v2 (separate sprint, not now): OAuth flows for LI/FB/IG, `publish-post` edge function, n8n scheduler workflow, auto-analytics.

Confirm and I'll start with the secret request + migration.
