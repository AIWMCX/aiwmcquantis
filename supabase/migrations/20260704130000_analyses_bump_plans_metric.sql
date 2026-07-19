-- ============================================================================
-- SUPERSEDED — DO NOT APPLY (reconciled 2026-07-19).
--
-- This file was never applied to production (part of the Jul 4-14 migration
-- backlog discovered and reconciled on 2026-07-19). By the time that backlog
-- was cleared, 20260706170000_analyses_total_counter.sql had already shipped
-- a different mechanism for the same counter: an AFTER INSERT trigger on
-- funnel_events (analysis_complete) that bumps plans_stress_tested via
-- bump_plans_stress_tested_on_analysis_complete(), applied and verified live.
--
-- Applying this file now would install a SECOND trigger that bumps
-- plans_stress_tested directly on every public.analyses insert, double-
-- counting every real analysis against the funnel_events-driven trigger.
-- Left in place only for historical record. Kept out of the applied set
-- intentionally — do not run this migration.
-- ============================================================================
-- Auto-increment the public plans_stress_tested counter on every new
-- analyses row insert. Bypass-proof: works regardless of which edge
-- function creates the row, survives any TypeScript regeneration, and
-- cannot be silently dropped by a code refactor.
-- ============================================================================
-- Depends on 20260704120000_public_metrics_monotonic.sql (public_metrics
-- table + bump_public_metric() RPC + monotonic guard trigger).

CREATE OR REPLACE FUNCTION public.bump_plans_stress_tested_on_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire-and-forget increment: any failure here must NOT block the analysis
  -- insert. Wrap in exception handler so a public_metrics table outage never
  -- takes down the primary write path. The monotonic guard trigger on
  -- public_metrics itself remains the real integrity boundary.
  BEGIN
    PERFORM public.bump_public_metric('plans_stress_tested', 1);
  EXCEPTION WHEN OTHERS THEN
    -- Log to Postgres logs, don't propagate. The counter momentarily
    -- lagging real usage is fine; the counter causing analysis writes to
    -- fail is not.
    RAISE WARNING 'bump_plans_stress_tested_on_analysis: bump failed (%): %',
      SQLSTATE, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_analyses_bump_plans_metric ON public.analyses;
CREATE TRIGGER trg_analyses_bump_plans_metric
AFTER INSERT ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.bump_plans_stress_tested_on_analysis();

COMMENT ON FUNCTION public.bump_plans_stress_tested_on_analysis IS
  'AFTER INSERT trigger on analyses -- increments public_metrics.plans_stress_tested by 1 per real analysis. Fire-and-forget: bump failures cannot block the analysis insert.';
