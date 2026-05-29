## and make sure you need to not just seed the framework with updates, safely and professionally refresh everything and make sure you are not keeping something unfinished , must be professionally and geniously completely , 

## What you're asking for (three things)

1. **Full event trail for the embedded sample report** (view → CTA click → full sample open → PDF download) with conversion rates between each step.
2. **Persistent log of monthly analyses created** in AIWMC Quantis — saved, queryable, shown to admin.
3. **Expand value inside existing tiers** (Free / Plus / Pro) — no price changes, just more capabilities so each tier feels worth its price.

Below is exactly what I'll build.

---

## 1. Sample-report funnel tracking

### New table: `sample_report_events`

Columns: `id, event_type, session_id, user_id (nullable), variant, source, metadata (jsonb), created_at`.

`event_type` enum (string):

- `sample_view` — fired when `EmbeddedSampleReport` enters the viewport (IntersectionObserver, once per session)
- `sample_cta_click` — any CTA inside the sample frame
- `sample_full_open` — user clicks "See full report"
- `sample_pdf_download` — PDF download triggered

RLS: anon + authenticated can INSERT; only admin can SELECT.

### New edge function: `log-sample-event`

Anonymous-capable, validates payload with Zod, rate-limited by IP hash, writes a row.

### Frontend

- Add `trackSampleEvent()` helper in `src/lib/analytics.ts`.
- Wire it into `EmbeddedSampleReport.tsx` (IntersectionObserver + CTA handlers).
- Session ID reused from existing `anonymousTracking` so the funnel ties to signups later.

### Admin funnel view

- New RPC `get_sample_report_funnel(days int)` returns step counts + step-to-step conversion %.
- New widget in `src/pages/admin/Funnel.tsx` ("Sample Report Funnel" card): view → CTA (%) → full open (%) → PDF (%).

---

## 2. Monthly analyses tracking

We already write to `analyses` and `usage_tracking` but there's no clean monthly admin view.

- New RPC `get_monthly_analyses_stats(months int default 12)` returning per-month: `month, total_analyses, unique_users, free_count, plus_count, pro_count, anonymous_count`.
- New admin card on `AdminDashboard.tsx`: "Monthly Analyses" bar chart + table, last 12 months.
- Confirm `tg_log_analysis_run` trigger is firing (it is — `analysis_run_logs` already populated). No schema change needed for the underlying log.

---

## 3. Tier capability expansion (no price change)

Same prices, more value per tier. Concretely:

**Free** (today: 1 analysis/mo, Quick only)

- Raise `analysesPerMonth` 1 → **3/month**
- Add `sampleSharingEnabled` (can share read-only link of their analysis result)
- Add `basicEmailDigest` (weekly "your idea vs benchmarks" email)

**Plus** (today: unlimited Quick + Full, 36-month, Doc Studio)

- Unlock `tamSamSom` (currently Pro-only) at a **lite** level — single-source, no citations
- Unlock `pitchDeckLite` — basic 6-slide data export (Pro keeps full deck)
- Add `scenarioComparison` — compare up to 3 saved analyses side-by-side
- Add `monthlyBenchmarkRefresh` — auto-rerun saved analyses when benchmark data updates

**Pro** (today: everything + 60-month + white-label)

- Add `teamWorkspace` — shared analysis library across the 3 seats
- Add `priorityAiQueue` — Pro analyses jump the queue
- Add `apiWebhooks` — webhook fires on analysis-complete (the API endpoints already exist)
- Bump `teamSeats` 3 → **5**

All changes go in `src/config/tiers.ts` (single source of truth) and the mirrored server entitlements file. New feature flags get `UPGRADE_COPY` entries. No Stripe / pricing UI changes.

---

## Files I will create / change

```text
NEW  supabase/migrations/<ts>_sample_report_events.sql      -- table + RLS + grants + 2 RPCs
NEW  supabase/functions/log-sample-event/index.ts           -- event ingestion
EDIT src/components/landing/EmbeddedSampleReport.tsx        -- emit events
EDIT src/lib/analytics.ts                                   -- trackSampleEvent helper
EDIT src/pages/admin/Funnel.tsx                             -- funnel widget
EDIT src/pages/AdminDashboard.tsx                           -- monthly analyses widget
EDIT src/config/tiers.ts                                    -- new feature keys + limit bumps
EDIT supabase/functions/_shared/entitlements.ts             -- mirror server-side
EDIT src/components/FreeVsProMatrix.tsx                     -- surface new capabilities on pricing/landing
```

No price changes, no Stripe edits, no auth changes.

---

## Open question before I build

For the tier expansion, the list above is my recommendation. Two quick choices:

- **A. Ship exactly the list above** (Free → 3 analyses, Plus → TAM-lite + pitch-lite + compare + auto-refresh, Pro → team workspace + priority + webhooks + 5 seats).
- **B. Same list but keep TAM/SAM/SOM and Pitch Deck strictly Pro-only** (don't dilute Pro's headline differentiators). Plus instead gets `scenarioComparison` + `monthlyBenchmarkRefresh` + a new `customRiskAlerts` capability.

Reply **A** or **B** (or edit the list) and I'll execute the whole plan in one pass.