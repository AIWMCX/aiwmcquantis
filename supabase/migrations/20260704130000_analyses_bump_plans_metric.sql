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
