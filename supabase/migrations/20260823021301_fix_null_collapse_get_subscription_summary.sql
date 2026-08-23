-- Found while building the Semgrep custom rule for item 8 (.semgrep/quantis-
-- rules.yml, sql-raw-auth-uid-null-collapse) -- a repo-wide grep for the exact
-- QNT-DEFECT-001 bug-class pattern surfaced a function never audited this
-- session: get_subscription_summary(p_user_id), originally created in
-- migration 20260205051029 and never redefined/fixed since.
--
-- Guard was: an IF combining a raw SQL "not equal" comparison between
-- auth.uid() and p_user_id with `NOT public.has_role(auth.uid(), 'admin')`,
-- raising an exception if both were true. For an anonymous caller,
-- auth.uid() IS NULL, so comparing NULL against p_user_id yields SQL NULL;
-- `has_role(NULL, 'admin')` returns false
-- (no matching rows) so `NOT false` = true; `NULL AND true` = NULL, and
-- PL/pgSQL's IF treats a NULL condition as false -- the guard silently
-- no-ops. Confirmed EXECUTE is granted to anon and confirmed live-exploitable
-- via direct curl (HTTP 200, real subscription plan_id/status/period for an
-- arbitrary user_id, zero authentication) -- re-verified fixed after this
-- migration (HTTP 400 Access denied). See docs/OPEN_DEFECTS.json
-- QNT-DEFECT-015 for the full writeup.
--
-- Fix: `p_user_id IS DISTINCT FROM auth.uid()` (NULL-safe) plus
-- COALESCE(has_role(...), false) for defense in depth on the has_role() call
-- too (has_role's own NULL-return behavior with a NULL uid was not
-- independently verified, so COALESCE is precautionary here, matching the
-- pattern already established for is_service_role()). Also applied the same
-- COALESCE wrap to the second has_role() check (aggregate/admin-only branch)
-- for consistency, though that branch has no NULL-collapse risk on its own
-- (no `!=` comparison there) -- purely defense in depth.

CREATE OR REPLACE FUNCTION public.get_subscription_summary(p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- If user_id provided, they can only see their own data
  IF p_user_id IS NOT NULL THEN
    -- User can only query their own subscription
    IF p_user_id IS DISTINCT FROM auth.uid() AND NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
      RAISE EXCEPTION 'Access denied: Cannot view other users subscriptions';
    END IF;

    SELECT jsonb_build_object(
      'plan_id', plan_id,
      'status', status,
      'current_period_start', current_period_start,
      'current_period_end', current_period_end
    )
    INTO v_result
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_result, jsonb_build_object('plan_id', 'free', 'status', 'none'));
  END IF;

  -- Aggregate stats - admin only
  IF NOT COALESCE(public.has_role(auth.uid(), 'admin'), false) THEN
    RAISE EXCEPTION 'Access denied: Admin role required for aggregate subscription data';
  END IF;

  SELECT jsonb_build_object(
    'total_subscriptions', COUNT(*),
    'active_plus', COUNT(*) FILTER (WHERE plan_id = 'plus' AND status = 'active'),
    'active_free', COUNT(*) FILTER (WHERE plan_id = 'free' AND status = 'active'),
    'trialing', COUNT(*) FILTER (WHERE status = 'trialing')
  )
  INTO v_result
  FROM public.subscriptions;

  RETURN v_result;
END;
$function$;
