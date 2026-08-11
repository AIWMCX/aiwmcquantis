# Production Schema Diff — E5.5

**Status: BLOCKED.** This document cannot be filled in with real diff results this session — both `execute_sql` and `list_tables` (Supabase MCP, project `dmlxrvfyqsakyjomsvdj`) returned permission-denied on every attempt, including a trivial `SELECT 1`. What follows is the **exact comparison to run** once access exists, pre-built so it can be executed in one pass rather than re-derived later.

## How to run this once access exists

For each table/function/policy named below, run the query in the "Query" column against production and paste the result into the matching "Result" line. Then compare against the "Expected under feature branch" column. Anywhere they disagree, flag it back into `MIGRATION_CLASSIFICATION.json`'s corresponding finding and update its classification if needed.

## Priority 1 — the four critical findings (Section 3 of MIGRATION_LINEAGE_AUDIT.md)

### `is_service_role()` (finding #2)
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'is_service_role' AND pronamespace = 'public'::regnamespace;
```
**Expected under feature branch**: body reads only `(current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'`.
**Red flag if found**: body still contains `current_setting('role', true) = 'service_role'` as an OR branch — confirms the exploit is live.
**Result**: _(pending)_

### `subscriptions` unique constraint + `admin_fix_subscription` (finding #9)
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'public.subscriptions'::regclass AND contype = 'u';
SELECT proname FROM pg_proc WHERE proname = 'admin_fix_subscription' AND pronamespace = 'public'::regnamespace;
```
**Expected under feature branch**: the unique constraint from `20260608000002`'s step 1 exists; `admin_fix_subscription` exists.
**Red flag if found**: either query returns nothing — confirms the whole migration file rolled back in production.
**Result**: _(pending)_

### Scenario ledger tables (finding #16)
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='scenarios' ORDER BY ordinal_position;
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('scenario_sets','scenario_versions','scenario_runs');
```
**Expected under feature branch**: `scenarios` has `scenario_set_id`, `version_number` (ledger design); `scenario_sets`/`scenario_versions`/`scenario_runs` all exist.
**Red flag if found**: `scenarios` has `params`, `output`, `monte_carlo_result`, `confidence_score`, `scenario_type` (old flat design) and the other three tables don't exist — confirms Phase D never actually applied to production.
**Result**: _(pending — this is the single highest-confidence-of-a-real-defect finding in the audit; treat as presumptively true until disproven, per `src/integrations/supabase/types.ts` already showing the old shape)_

### `benchmark_master_geo` row count (finding #8)
```sql
SELECT count(*) FROM public.benchmark_master_geo;
```
**Expected under feature branch**: 11 rows (the seed batch).
**Red flag if found**: 0 rows — confirms the seed never applied.
**Result**: _(pending)_

## Priority 2 — the four `ALREADY_PRODUCTION_APPLIED_DIFFERENTLY` reconstructions (findings #5, #10, #13, #14)

For each of `analysis_run_logs`, `rvce_cache`, `analysis_self_learning`, `quantis_learning_config`, `analysis_attempts`:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name = '<table>'
ORDER BY ordinal_position;
```
Compare against each reconstruction's `CREATE TABLE IF NOT EXISTS` in the corresponding migration file. Flag any column present in production but missing from the reconstruction (the reconstruction was built from `src/integrations/supabase/types.ts`, which only reflects columns the generator surfaced — it may be incomplete).

`analysis_attempts` specifically also needs its cited evidence file restored or its claim independently re-confirmed — see finding #14 in `MIGRATION_CLASSIFICATION.json`.

## Priority 3 — the five `REPLAY_COMPATIBILITY_ONLY` findings with residual uncertainty (findings #1, #4, #7, #15, #17, #18)

Lower urgency (my working confidence is that production already has the correct state for these), but each names a specific confirming query in `MIGRATION_CLASSIFICATION.json`. Worth running as a batch once access exists, mainly to convert "INFERRED" evidence into "PROD_VERIFIED" and formally close those entries.

## What this diff will NOT cover

Even once every query above returns a result, this remains a **targeted** diff against the specific objects the 18 modified migrations touch — not a full schema-wide comparison of every table/function/policy in production against every migration file. A full comparison (Phase D of the execution prompt: converge Path 1 and Path 2 on the *same intended schema*, across tables/columns/constraints/indexes/functions/grants/RLS/policies/triggers) is a larger undertaking than this targeted pass and should be scoped separately once the four Priority-1 findings are resolved.
