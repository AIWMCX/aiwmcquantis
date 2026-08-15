-- TRACK A ROLLBACK -- 2026-08-14
-- Undoes 20260814120000_p0_track_a_referral_function_access.sql ONLY.
--
-- WARNING: rolling back get_referral_stats(uuid) restores the exact NULL-comparison
-- bug this migration exists to close (auth.uid() != p_user_id, which fails open for
-- anonymous callers). Only run this if the forward migration caused an unexpected
-- production break that needs to be undone faster than a forward fix can be shipped,
-- and treat the vulnerability as immediately re-live the moment this runs. Re-apply
-- the forward migration (or a corrected version of it) as soon as possible afterward.
--
-- Run manually via the Supabase SQL editor or psql -- this is NOT wired into the
-- migration chain as a down-migration (this repo's convention has no down-migration
-- runner; see the existing 05_ROLLBACK.sql precedent in
-- docs/security/2026-08-03-p0-access/ for the same pattern).

BEGIN;

-- 1. Restore get_referral_stats(uuid) to its pre-Track-A body (the NULL-unsafe guard).
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Ensure user can only get their own stats
  IF auth.uid() != p_user_id AND NOT is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'code', rc.code,
    'total_clicks', rc.total_clicks,
    'total_conversions', rc.total_conversions,
    'total_rewards_earned', rc.total_rewards_earned,
    'is_active', rc.is_active,
    'pending_rewards', (
      SELECT COUNT(*) FROM public.referral_rewards rr
      WHERE rr.user_id = p_user_id AND rr.status = 'pending'
    ),
    'share_url', 'https://aiwmcquantis.com?ref=' || rc.code
  )
  INTO v_result
  FROM public.referral_codes rc
  WHERE rc.user_id = p_user_id;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'code', NULL,
      'total_clicks', 0,
      'total_conversions', 0,
      'total_rewards_earned', 0,
      'is_active', false,
      'pending_rewards', 0,
      'share_url', NULL
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 2. Restore the grant state exactly as PR #26's round-3 audit found it live
--    (see docs/security/2026-08-03-p0-access/07_FUNCTION_ACCESS_MATRIX.csv).
--    These re-open PUBLIC/anon EXECUTE -- this is the vulnerable state, restored
--    only as an emergency escape hatch.
GRANT EXECUTE ON FUNCTION public.get_referral_stats(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_referral_signup(uuid, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_quote_gen_usage() TO PUBLIC;

COMMIT;

-- After rollback, verify the (bad) restored state matches what you expect:
--   SELECT has_function_privilege('anon', 'public.get_referral_stats(uuid)', 'EXECUTE');
--   -- expect true (this is the vulnerable state)
