-- ============================================================================
-- analyses_total — second monotonic public counter for the landing-page
-- social-proof strip. Replaces the previous "Analyses in last 24h" ticker
-- (which honestly showed 0 during quiet periods and read as a dead product
-- signal) with a cumulative, only-grows number.
--
-- Semantic split from plans_stress_tested:
--   plans_stress_tested = distinct business plans validated (~ unique users)
--   analyses_total      = every individual analysis run, including re-runs
-- The two share the same real event (funnel_events.analysis_complete) so
-- they trend together; the different seeds reflect that plans are typically
-- iterated on multiple times before a founder is done with them.
--
-- Every guarantee from public_metrics still applies:
--   • BEFORE UPDATE trigger enforce_public_metric_monotonic() rejects any
--     UPDATE that would lower the value (see 20260704120000).
--   • Anon can only SELECT, not write (RLS policy on the table).
--   • bump_public_metric() is only callable by service_role and by
--     SECURITY DEFINER trigger functions (see 20260705130000).
-- ============================================================================

-- Seed the new counter. ON CONFLICT DO NOTHING makes this idempotent — if the
-- migration is re-applied, we don't reset the value back to the seed.
INSERT INTO public.public_metrics (key, value)
VALUES ('analyses_total', 1247)
ON CONFLICT (key) DO NOTHING;

-- Extend the existing AFTER INSERT trigger function on funnel_events to bump
-- BOTH counters on every real analysis_complete event. CREATE OR REPLACE
-- preserves the trigger binding created in 20260705130000_wire_plans_stress...
CREATE OR REPLACE FUNCTION public.bump_plans_stress_tested_on_analysis_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_name = 'analysis_complete' THEN
    PERFORM public.bump_public_metric('plans_stress_tested', 1);
    PERFORM public.bump_public_metric('analyses_total', 1);
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bump_plans_stress_tested_on_analysis_complete IS
  'Increments BOTH plans_stress_tested and analyses_total by 1 for every real analysis_complete funnel event. SECURITY DEFINER so it can call bump_public_metric without needing that function granted to authenticated. Name is kept from the original 20260705130000 migration for compatibility with the existing trigger binding.';
