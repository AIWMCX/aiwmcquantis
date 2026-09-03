-- P0 security hardening, sixth wave -- continuation of the 2026-09-03
-- post-charter security sweep (20260903004424, 20260903005820). Covers 7
-- more of the 77 originally-flagged functions, each individually read via
-- pg_get_functiondef and confirmed to have zero legitimate caller
-- anywhere in src/, supabase/functions/, or cron.job before being touched.
--
-- 1. REAL GAP: get_user_plan_tier(uuid) takes an arbitrary target uuid
--    with NO authorization check at all -- unlike every sibling
--    self/admin-scoped getter this session verified
--    (get_subscription_summary, get_user_activation_score,
--    get_user_engagement_stats, all correctly gated via an
--    IS DISTINCT FROM auth.uid() check). Any authenticated user could
--    call get_user_plan_tier(<any uuid>) and learn whether that account
--    is on free/plus/pro. Confirmed zero direct application caller
--    (grepped src/ and supabase/functions/, only auto-generated
--    types.ts matches) -- its three real callers
--    (increment_idea_generation_usage, get_idea_generation_status,
--    consume_idea_gen_quota) all invoke it via internal SQL under
--    SECURITY DEFINER, which doesn't need the direct grant. Same shape
--    as _quote_gen_plan_tier, already fixed 2026-08-27.
--
-- 2. DORMANT, closed for defense-in-depth rather than an observed leak:
--    get_analysis_case_grid(text) references 11 tables
--    (analysis_edge_cases, analysis_unit_economics, analysis_monte_carlo,
--    analysis_tam_sam_som, analysis_break_even, analysis_scenario,
--    analysis_cash_flow, analysis_dcf, analysis_dscr_credit,
--    analysis_burn_runway, analysis_pre_mortem) -- confirmed via
--    information_schema.tables that NONE of them currently exist.
--    charge_free_analysis(text, boolean) and the usage_counters table it
--    reads/writes have zero reader or writer anywhere in src/ or
--    supabase/functions/ -- confirmed dead, unlike its sibling
--    consume_analysis_quota(uuid,integer) which was live and got fixed
--    in the third wave (20260827090500) for the same
--    caller-supplied-identity spoofing shape. Both are currently inert
--    (any call errors or writes to a table nothing reads), not live
--    exploits, but revoked now rather than left as a footgun for
--    whenever that schema gets wired up without a re-audit.
--
-- 3. ORPHANED MAINTENANCE JOBS: cleanup_old_analysis_jobs(),
--    cleanup_old_anonymous_usage(), cleanup_old_rate_limits(),
--    cleanup_old_security_logs() -- confirmed via cron.job that no
--    pg_cron schedule calls any of the four, and confirmed via grep that
--    no application code calls them either. All four are currently
--    directly callable by anon to trigger a bulk DELETE.
--    cleanup_old_security_logs() being anon-callable is the most
--    material of the four: repeated anonymous calls could accelerate
--    purging of the security audit trail faster than any retention
--    policy intends, which would hamper a future incident
--    investigation -- the exact kind of "log review" limitation already
--    documented as a residual gap in the 2026-08-27 P0 ten-table
--    closure doc's item 1.15.
--
-- Additive and idempotent: REVOKE is a no-op if the privilege isn't
-- held. No table or row is touched, no function body changes.

DO $$
BEGIN
  RAISE NOTICE 'PRECONDITION -- authenticated can execute get_user_plan_tier(uuid): %',
    has_function_privilege('authenticated', 'public.get_user_plan_tier(uuid)', 'EXECUTE');
  RAISE NOTICE 'PRECONDITION -- anon can execute get_analysis_case_grid(text): %',
    has_function_privilege('anon', 'public.get_analysis_case_grid(text)', 'EXECUTE');
  RAISE NOTICE 'PRECONDITION -- anon can execute charge_free_analysis(text,boolean): %',
    has_function_privilege('anon', 'public.charge_free_analysis(text,boolean)', 'EXECUTE');
  RAISE NOTICE 'PRECONDITION -- anon can execute cleanup_old_security_logs(): %',
    has_function_privilege('anon', 'public.cleanup_old_security_logs()', 'EXECUTE');
END $$;

REVOKE EXECUTE ON FUNCTION public.get_user_plan_tier(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_analysis_case_grid(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_free_analysis(text, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_analysis_jobs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_anonymous_usage() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_security_logs() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.get_user_plan_tier(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated can still execute get_user_plan_tier(uuid)';
  END IF;
  IF has_function_privilege('anon', 'public.get_analysis_case_grid(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still execute get_analysis_case_grid(text)';
  END IF;
  IF has_function_privilege('anon', 'public.charge_free_analysis(text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still execute charge_free_analysis(text,boolean)';
  END IF;
  IF has_function_privilege('anon', 'public.cleanup_old_security_logs()', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still execute cleanup_old_security_logs()';
  END IF;

  -- Legitimate internal callers must be unaffected: all three real
  -- callers of get_user_plan_tier invoke it via internal SQL under
  -- SECURITY DEFINER, which executes under the definer's own
  -- privileges regardless of the caller's grant.
  IF NOT has_function_privilege('authenticated', 'public.get_idea_generation_status()', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated lost EXECUTE on get_idea_generation_status() -- unrelated grant, should be untouched';
  END IF;

  RAISE NOTICE 'POSTCONDITION PASSED: cross-user plan-tier leak closed; dormant/orphaned functions no longer publicly callable';
END $$;
