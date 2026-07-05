-- ============================================================================
-- Wire the monotonic plans_stress_tested counter to real analysis-complete
-- events, and close a security gap in how it can be incremented.
-- ============================================================================
-- 1) bump_public_metric() was granted EXECUTE to `authenticated` in the
--    original migration (20260704120000). That was a mistake: any signed-in
--    user could call it directly from devtools with an arbitrary p_delta
--    (e.g. supabase.rpc('bump_public_metric', { p_key: 'plans_stress_tested',
--    p_delta: 999999 })) and inflate a public-facing number at will. Revoke
--    that grant -- only service_role and trusted trigger functions (which
--    run with the privileges of their owner, not the calling client) may
--    call it now.
--
-- 2) Wire a real increment: an AFTER INSERT trigger on funnel_events fires
--    bump_public_metric('plans_stress_tested', 1) whenever a genuine
--    'analysis_complete' event lands. This is the same trust boundary the
--    funnel_events system already operates under (a client can call
--    record_funnel_event() with any allowed event_name already) -- not a
--    new attack surface, just riding the existing one. The counter now
--    grows only on real client-reported completions, once per event this
--    trigger fires, replacing its prior "static at 175" state.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.bump_public_metric(text, bigint) FROM authenticated;

CREATE OR REPLACE FUNCTION public.bump_plans_stress_tested_on_analysis_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_name = 'analysis_complete' THEN
    PERFORM public.bump_public_metric('plans_stress_tested', 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_plans_stress_tested ON public.funnel_events;
CREATE TRIGGER trg_bump_plans_stress_tested
AFTER INSERT ON public.funnel_events
FOR EACH ROW
EXECUTE FUNCTION public.bump_plans_stress_tested_on_analysis_complete();

COMMENT ON FUNCTION public.bump_plans_stress_tested_on_analysis_complete IS
  'Increments public_metrics.plans_stress_tested by 1 for every real analysis_complete funnel event. SECURITY DEFINER so it can call bump_public_metric without needing that function granted to authenticated.';
