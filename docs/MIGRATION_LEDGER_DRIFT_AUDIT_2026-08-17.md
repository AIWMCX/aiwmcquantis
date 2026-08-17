# Migration Ledger Drift Audit — 2026-08-17

**Project:** AIWMCX/aiwmcquantis, Supabase project `dmlxrvfyqsakyjomsvdj`
**Trigger:** Fixing the broken CI migration pipeline (PR #38) surfaced that
`email_send_log` was marked "applied" in Supabase's tracked migration ledger
(`supabase_migrations.schema_migrations`) but never actually existed in
production. This audit answers the obvious next question: **how far does
that go?**

## Methodology (and a deviation from the original ask)

The original instruction was to spin up a clean local Supabase instance via
Docker, replay the full migration chain, and diff the resulting schema
against production. **Docker Desktop's daemon is not running in this
environment** (installed, service stopped — confirmed via `docker info` and
`Get-Service com.docker.service`). Starting it would require a GUI
interaction this session doesn't have queued up, with no guarantee of
success and real time/resource cost, for a result achievable another way.

Used instead — direct comparison, not a replay:

1. **Live schema inventory** — `list_tables` (Supabase management API) against
   project `dmlxrvfyqsakyjomsvdj`, all 90 tables currently in `public`.
2. **Expected-table inventory** — every `CREATE TABLE [IF NOT EXISTS]
   public.<name>` statement across all ~230 files in `supabase/migrations/`,
   extracted via regex, deduplicated.
3. **Diff** — expected minus live = tables whose creating migration exists in
   git and is (as shown below) marked applied in the ledger, but which do not
   exist in the real database.
4. **Precision filter** — the raw diff had noise (renamed/superseded tables,
   abandoned drafts nothing depends on). Filtered to tables with a genuine
   `.from('table_name')` call site in `supabase/functions/` or `src/` — i.e.
   tables real, currently-deployed code actually queries at runtime.
5. **Origin-migration mapping** — for each surviving table, found the exact
   migration file that creates it and confirmed its version is present in
   `supabase_migrations.schema_migrations` (i.e. the ledger believes it's
   applied).

This is not as rigorous as a true from-scratch replay (it can't catch a
migration that ran successfully but was later hand-reverted outside any
migration, for example), but it directly answers "what's broken right now
that real code depends on," which is the actionable question.

## Headline finding

**26 tables that live application code genuinely queries do not exist in
production**, despite their creating migrations all being marked "applied"
in the tracked ledger. Every one of these `.from()` calls has been failing
silently at runtime (Postgres `42P01: relation does not exist`), almost
certainly swallowed by the fire-and-forget try/catch pattern used throughout
this codebase's non-critical-path writes — which is exactly why this has
gone unnoticed instead of throwing visible errors.

**19 distinct origin migrations** are responsible for these 26 tables, and
**every single one of those 19 is marked "applied" in the ledger.** They
span **2026-01-29 through 2026-05-02** — roughly four months of migration
history. This is not a handful of isolated incidents; it's a systemic gap
across a specific, sizable window. The most likely explanation is a bulk
`supabase migration repair --status applied` (or equivalent ledger
manipulation) run at some point without the underlying DDL ever actually
executing against this database — the same class of problem, at larger
scale, as the `email_send_log` block that started this investigation. This
audit does not attempt to prove that root cause conclusively; it wasn't
necessary to produce the actionable list below.

Already fixed this session (for scale comparison — these are NOT in the
list below): `email_send_log`, `email_engagement`, `qoc_audit`,
`gsc_verification` (PR #38 and direct production fixes, all confirmed live).

## Confirmed missing, real code depends on them

| Table | Origin migration | Live call sites |
|---|---|---|
| `activation_events` | `20260426174842_...` | `src/lib/activationTracking.ts:107` |
| `analysis_edge_cases` | `20260502223444_...` | `src/services/analysis-case-grid.ts:43` |
| `analysis_logs` | `20260308084741_...` | `supabase/functions/aggregate-quality-metrics/index.ts` (5 sites), `supabase/functions/pdf-generator/index.ts:194`, `supabase/functions/_shared/analysis-event-logger.ts:47`, `src/pages/admin/QuantisHealth.tsx:262`, `src/services/quantis-logger.ts:134` |
| `benchmark_calibration` | `20260428211726_...` | `supabase/functions/analyze-business/benchmark-engine-v2.ts:344` |
| `benchmark_ingestion_runs` | `20260428211726_...` | `supabase/functions/ingest-data-sources/index.ts` (3 sites) |
| `benchmark_sources` | `20260309045112_...` | `supabase/functions/ingest-benchmark-data/index.ts` (2), `supabase/functions/ingest-data-sources/index.ts` (2), `src/pages/admin/DataSources.tsx:79` |
| `benchmark_store` | `20260308082851_...` | `src/services/benchmark-store.ts` (5 sites) |
| `benchmarks_v2_core` | `20260330143856_...` | `supabase/functions/ingest-data-sources/index.ts` (4 sites) |
| `doc_generation_jobs` | `20260308094534_...` | `supabase/functions/doc-queue-worker/index.ts` (4), `supabase/functions/pdf-generator/index.ts` (2), `supabase/functions/process-doc-job/index.ts` (3), `src/hooks/useDocQueue.ts:67`, `src/services/docs-engine.ts:345` |
| `email_sequence_log` | `20260130032834_...` | `supabase/functions/check-churn-signals/index.ts:175`, `supabase/functions/check-lifecycle-emails/index.ts:62`, `supabase/functions/send-lifecycle-email/index.ts:600` |
| `industry_distributions` | `20260307073830_...` | `supabase/functions/analyze-business/market-prior.ts` (2 sites) |
| `location_data` | `20260129085202_...` | `supabase/functions/analyze-business/benchmark-cache.ts:204`, `src/lib/queryCache.ts:83` |
| `newsletter_sends` | `20260130042602_...` | `supabase/functions/send-weekly-insights/index.ts` (2 sites) |
| `quality_metrics_daily` | `20260308084741_...` | `supabase/functions/aggregate-quality-metrics/index.ts:156`, `src/pages/admin/QuantisHealth.tsx` (2 sites) |
| `reconciliation_log` | `20260308083912_...` | `supabase/functions/aggregate-quality-metrics/index.ts:144`, `supabase/functions/_shared/analysis-event-logger.ts:72`, `src/pages/admin/QuantisHealth.tsx:241` |
| `referral_conversions` | `20260206003246_...` | `src/hooks/useReferral.ts:81` |
| `referral_rewards` | `20260206003246_...` | `src/hooks/useReferral.ts:100` — **also read inside `get_referral_stats()`, a live SECURITY DEFINER RPC fixed for access-control just three days ago in Track A (PR from 2026-08-14). That fix corrected who can call it; the function has apparently never been able to return real reward data because the table it reads doesn't exist.** |
| `report_outputs` | `20260308084233_...` | `supabase/functions/doc-queue-worker/index.ts:89`, `src/services/report-store.ts` (3 sites) |
| `safety_evaluations` | `20260309012700_...` | `src/pages/admin/AccuracyDashboard.tsx:37`, `src/services/quantis-safety-agent.ts` (2), `src/services/safety-evaluation-service.ts:27` |
| `template_improvement_suggestions` | `20260308102254_...` | `supabase/functions/template-optimizer/index.ts:197` |
| `template_performance_history` | `20260308102254_...` | `supabase/functions/template-optimizer/index.ts:110` |
| `training_cases` | `20260309045112_...` | `src/pages/admin/DataSources.tsx:108` |
| `user_engagement` | `20260130032834_...` | `supabase/functions/check-churn-signals/index.ts:145`, `supabase/functions/check-lifecycle-emails/index.ts` (2), `src/hooks/useEngagement.ts:81` |
| `user_notifications` | `20260130032834_...` | `supabase/functions/check-churn-signals/index.ts` (3), `supabase/functions/template-optimizer/index.ts:207`, `src/hooks/useNotifications.ts` (4 sites) |
| `user_realism_feedback` | `20260309013800_...` | `src/components/analysis/RealismFeedbackWidget.tsx:51` |
| `user_settings` | `20260308084233_...` | `supabase/functions/api-analyze/index.ts:63` |
| `user_validation_progress` | `20260308081438_...` | `src/components/analysis/ValidationJourney.tsx` (2 sites) |

## Notably NOT in this list (checked, not a concern)

- `benchmarks_v2_geo/invoice/risk/unit_econ` (siblings of `benchmarks_v2_core`,
  same migration) had no real `.from()` call sites found — likely dead
  alongside `benchmarks_v2_core`, or superseded entirely by
  `benchmark_master_*` (which IS live, seeded, and actively used — 19,500
  rows each). `benchmarks_v2_core` itself made this list only because
  `ingest-data-sources/index.ts` still references it; worth confirming that
  function is even still invoked (cron/manual only?) before prioritizing.
- ~20 other tables from the raw diff (`analysis_break_even`, `analysis_dcf`,
  `scenario_library`, `risk_factors`, etc.) had zero real query call sites —
  consistent with abandoned drafts or renamed designs, not live drift. Not
  included above; not a current risk.

## What this means right now, in production

Every feature listed above is silently broken or partially broken:
lifecycle email churn/engagement tracking, the doc-generation queue,
referral rewards display, the safety-evaluation admin dashboard, quality
metrics aggregation, benchmark ingestion tooling, activation-event tracking,
newsletter sends, and several admin diagnostic pages. None of these crash
user-facing requests (the fire-and-forget pattern protects the primary
path), which is precisely why none of them have been noticed.

## Recommended next steps (decide file-by-file, not in one pass)

For each table above:
1. Read its origin migration in full — confirm the DDL is still correct
   against whatever else has changed in the schema since (foreign keys to
   `analyses`/`auth.users`/etc. may have drifted too, as seen with
   `email_send_log`'s `leads` FK).
2. Check whether the *feature* is still wanted. Some of this (e.g.
   `benchmarks_v2_*` if truly superseded by `benchmark_master_*`) may be
   correctly abandoned — in which case the fix is removing the dead code
   that calls it, not resurrecting the table.
3. For genuinely wanted features: replay the CREATE TABLE (+ policies +
   indexes + triggers) idempotently, exactly as done this session for
   `email_send_log`/`gsc_verification`/`user_realism_feedback` — verify
   prerequisites first (some of these may cascade into further missing
   dependencies, as happened repeatedly this session), get explicit
   approval before each production mutation, verify live afterward.
4. Prioritize by real user impact. `referral_rewards` (paid feature,
   user-facing, already touched by a recent security fix) and
   `email_sequence_log`/`user_engagement`/`user_notifications` (lifecycle
   email system, revenue-adjacent) look like the highest-value first
   targets. Admin-only dashboards (`safety_evaluations`,
   `quality_metrics_daily`, `reconciliation_log`, `analysis_logs`) are lower
   urgency — broken observability, not broken product.

## Not done in this audit

- No production DDL was executed as part of this specific audit — this is
  the diagnostic only, per the explicit instruction to decide file-by-file
  before acting.
- Functions, triggers, and RLS policies were not exhaustively diffed the
  same way tables were (out of scope for this pass — table existence is the
  highest-signal, cheapest check, and is what actually breaks `.from()`
  calls). A follow-up could extend this same methodology
  (`grep` for `CREATE FUNCTION`/`CREATE POLICY` + live `pg_proc`/`pg_policies`
  introspection) if warranted.
- Root cause of *why* 19 migrations across 4 months got marked applied
  without running was not conclusively established (see Headline Finding).
