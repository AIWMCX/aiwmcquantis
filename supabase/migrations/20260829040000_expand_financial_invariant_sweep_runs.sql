-- Expand financial_invariant_sweep_runs — Phase 5 re-validation (charter
-- 5.2/5.3/5.4, docs/execution/2026-08-27-phase5-revalidation.md).
--
-- The original schema (20260827100000) only had:
--   id, run_at, mode, scanned_count, violation_count, malformed_count,
--   applied_count, violation_ids, created_at
--
-- Missing per charter 5.2: engine/version SHA, environment, a
-- started/finished timestamp pair (only run_at existed), an explicit
-- status field, and a sanitized failure-summary text field. Missing per
-- 5.4: a breakdown by which invariant category was violated (only a raw
-- ID array existed, with no code-level aggregation to render a category
-- breakdown from). All additive and nullable/defaulted — no existing row
-- or reader of the old columns breaks.

ALTER TABLE public.financial_invariant_sweep_runs
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS engine_version text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'failed', 'interrupted')),
  ADD COLUMN IF NOT EXISTS failure_summary text,
  ADD COLUMN IF NOT EXISTS violation_categories jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.financial_invariant_sweep_runs.run_at IS
  'When this run started. finished_at (added 2026-08-29) is when it completed or was interrupted.';
COMMENT ON COLUMN public.financial_invariant_sweep_runs.status IS
  'completed: the sweep finished its scan (regardless of whether violations were found).
   failed: recordSweepRun''s own INSERT succeeded, but something else about the run failed (kept for forward compatibility -- the sweep script itself always writes ''completed'' or ''interrupted'' today).
   interrupted: the sweep crashed before finishing its scan (e.g. the initial query threw) -- this status is what closes charter 5.3''s gap, where an interrupted run previously produced zero rows at all.';
COMMENT ON COLUMN public.financial_invariant_sweep_runs.violation_categories IS
  'Map of invariant violation code -> count of analyses with at least one occurrence in this run, e.g. {"OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT": 5}. Powers the admin dashboard''s category breakdown (charter 5.4).';
