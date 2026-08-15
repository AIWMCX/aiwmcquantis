-- P0 SECURITY — Track A — 2026-08-14
-- Scope: the 3 findings deferred out of PR #26 (security/p0-effective-access-control),
-- split into an independently mergeable migration per founder direction -- these are
-- pure REVOKE/GRANT + one NULL-safety fix, verifiable by reading source, and do not
-- depend on PR #26's Docker-blocked cross-identity matrix / CI gate to be correct.
--
-- Source of the three findings: PR #26's own round-3 writeup
-- (docs/security/2026-08-03-p0-access/00_EXECUTIVE_SUMMARY.md), independently
-- re-verified against live migration source before writing this file:
--
--   1. get_referral_stats(uuid) -- CONFIRMED (read 20260206003246, line 274):
--      `IF auth.uid() != p_user_id AND NOT is_service_role() THEN RAISE EXCEPTION`.
--      For an anonymous caller, auth.uid() IS NULL. `NULL != p_user_id` evaluates to
--      NULL, and plpgsql's IF treats a NULL condition as false -- the exception never
--      fires. Combined with a still-live PUBLIC EXECUTE grant, this lets an
--      unauthenticated caller read ANY user's referral code, click/conversion counts,
--      and rewards earned, for any UUID they guess or enumerate. This is the fix.
--
--   2. complete_referral_signup(uuid,uuid) -- CONFIRMED signature-mismatch root cause
--      (read 20260613022816, line 91 vs. 20260206003246, line 229-232): the hardening
--      migration's REVOKE loop targets `complete_referral_signup(text,uuid)`, but the
--      function was always created as `(p_conversion_id UUID, p_referred_user_id
--      UUID)` = `(uuid,uuid)`. The mismatched-signature REVOKE hit `undefined_function`,
--      was silently swallowed by that loop's `EXCEPTION WHEN undefined_function THEN
--      RAISE NOTICE`, and the real (uuid,uuid) overload's default PUBLIC EXECUTE grant
--      (Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION unless
--      explicitly revoked) was never touched.
--
--   3. decrement_quote_gen_usage() / generate_referral_code(uuid) /
--      get_next_invoice_number(uuid) -- decrement_quote_gen_usage(uuid) at
--      20260613022816 line 110 has the same class of signature bug (real function is
--      zero-arg, created at 20260611120000 line 346); the other two have matching
--      signatures in that same loop, so the discrepancy for those two (if it exists
--      live) cannot be explained from source alone -- see the POSTCONDITION block
--      below, which asserts and fails loudly rather than assuming.
--
-- Least-privilege re-verified by grep, not assumed: all five names below are called
-- exclusively from src/ (src/hooks/useReferral.ts, src/hooks/useInvoices.ts,
-- src/services/serviceJob.ts, src/services/docs-engine.ts) under the caller's own
-- authenticated session -- every call site is user-id-guarded client-side
-- (`if (!user?.id) return`) before the RPC fires. Zero callers exist anywhere in
-- supabase/functions/ (grepped, no matches). No service_role EXECUTE grant is
-- genuinely required by any of the five; none is added here. If a service-role
-- caller is ever added, grant EXECUTE to service_role explicitly in a follow-up
-- migration naming that caller -- same rule PR #26 itself applies to
-- charge_free_analysis.
--
-- Additive and idempotent: REVOKE is a no-op if the privilege isn't held;
-- CREATE OR REPLACE FUNCTION preserves the function's existing grants (only the
-- REVOKE/GRANT statements below change access). No table or row is touched.
--
-- NOT YET APPLIED TO PRODUCTION. Requires founder approval before deployment.

-- ============================================================
-- PRECONDITION -- log current effective access before changing anything, for the
-- audit trail. Does not fail the migration; NOTICE only.
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'TRACK A PRECONDITION -- anon can execute get_referral_stats(uuid): %',
    has_function_privilege('anon', 'public.get_referral_stats(uuid)', 'EXECUTE');
  RAISE NOTICE 'TRACK A PRECONDITION -- anon can execute complete_referral_signup(uuid,uuid): %',
    has_function_privilege('anon', 'public.complete_referral_signup(uuid,uuid)', 'EXECUTE');
  RAISE NOTICE 'TRACK A PRECONDITION -- anon can execute generate_referral_code(uuid): %',
    has_function_privilege('anon', 'public.generate_referral_code(uuid)', 'EXECUTE');
  RAISE NOTICE 'TRACK A PRECONDITION -- anon can execute get_next_invoice_number(uuid): %',
    has_function_privilege('anon', 'public.get_next_invoice_number(uuid)', 'EXECUTE');
  RAISE NOTICE 'TRACK A PRECONDITION -- anon can execute decrement_quote_gen_usage(): %',
    has_function_privilege('anon', 'public.decrement_quote_gen_usage()', 'EXECUTE');
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'TRACK A PRECONDITION -- one or more target functions do not exist on this database yet';
END $$;

-- ============================================================
-- 1. get_referral_stats(uuid) -- NULL-safe authorization fix.
--    IS DISTINCT FROM never returns NULL: for an anonymous caller (auth.uid() IS
--    NULL) and any concrete p_user_id, `p_user_id IS DISTINCT FROM auth.uid()`
--    evaluates to TRUE, so the guard now correctly raises for anon. For the
--    legitimate owner (auth.uid() = p_user_id), it evaluates to FALSE and access
--    proceeds exactly as before. Body otherwise byte-for-byte identical to
--    20260206003246's definition.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Ensure user can only get their own stats. IS DISTINCT FROM is NULL-safe --
  -- unlike `!=`, it never itself evaluates to NULL, so an anonymous caller
  -- (auth.uid() IS NULL) cannot silently bypass this guard.
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT is_service_role() THEN
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

  -- If no code exists, return empty stats
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

REVOKE ALL ON FUNCTION public.get_referral_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_stats(uuid) TO authenticated;

-- ============================================================
-- 2. complete_referral_signup -- correct (uuid,uuid) signature this time.
--    Function body unchanged (no logic bug here, only the access-grant bug).
-- ============================================================
REVOKE ALL ON FUNCTION public.complete_referral_signup(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_referral_signup(uuid, uuid) TO authenticated;

-- ============================================================
-- 3. generate_referral_code(uuid) -- signature already matched in the prior
--    hardening pass; re-asserted here defensively rather than assumed closed,
--    since this session has no live-production read access to confirm which
--    migrations actually applied there (see docs/accuracy/QUANTIS_ACCURACY_STATE.md's
--    prior finding that tracked migration history and production state have
--    diverged before on this project).
-- ============================================================
REVOKE ALL ON FUNCTION public.generate_referral_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated;

-- ============================================================
-- 4. get_next_invoice_number(uuid) -- same defensive re-assertion as #3.
-- ============================================================
REVOKE ALL ON FUNCTION public.get_next_invoice_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) TO authenticated;

-- ============================================================
-- 5. decrement_quote_gen_usage() -- correct zero-arg signature this time
--    (20260613022816 targeted a nonexistent (uuid) overload). Origin migration
--    20260611120000 already revoked PUBLIC and granted authenticated directly, so
--    this is very likely already closed -- re-asserted for defense in depth and to
--    keep this function under the same explicit, re-verifiable statement as the
--    other four rather than relying on an unverified assumption that it's fine.
-- ============================================================
REVOKE ALL ON FUNCTION public.decrement_quote_gen_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_quote_gen_usage() TO authenticated;

-- ============================================================
-- POSTCONDITION -- hard assertions. Fails the migration loudly if any of the five
-- functions remains callable by anon or PUBLIC, rather than silently no-opping like
-- the bug this migration exists to close (see finding #2's root cause above).
-- has_function_privilege() checks EFFECTIVE privilege (direct grant OR via PUBLIC),
-- so this catches both failure modes, not just a literal PUBLIC grant row.
-- ============================================================
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_referral_stats(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: anon can still execute get_referral_stats(uuid)';
  END IF;
  IF has_function_privilege('anon', 'public.complete_referral_signup(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: anon can still execute complete_referral_signup(uuid,uuid)';
  END IF;
  IF has_function_privilege('anon', 'public.generate_referral_code(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: anon can still execute generate_referral_code(uuid)';
  END IF;
  IF has_function_privilege('anon', 'public.get_next_invoice_number(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: anon can still execute get_next_invoice_number(uuid)';
  END IF;
  IF has_function_privilege('anon', 'public.decrement_quote_gen_usage()', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: anon can still execute decrement_quote_gen_usage()';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_referral_stats(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: authenticated lost EXECUTE on get_referral_stats(uuid) -- would break src/hooks/useReferral.ts';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.complete_referral_signup(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: authenticated lost EXECUTE on complete_referral_signup(uuid,uuid) -- would break src/hooks/useReferral.ts';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.generate_referral_code(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: authenticated lost EXECUTE on generate_referral_code(uuid) -- would break src/hooks/useReferral.ts';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.get_next_invoice_number(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: authenticated lost EXECUTE on get_next_invoice_number(uuid) -- would break src/hooks/useInvoices.ts';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.decrement_quote_gen_usage()', 'EXECUTE') THEN
    RAISE EXCEPTION 'TRACK A POSTCONDITION FAILED: authenticated lost EXECUTE on decrement_quote_gen_usage() -- would break src/services/serviceJob.ts';
  END IF;

  RAISE NOTICE 'TRACK A POSTCONDITION PASSED: all 5 functions correctly authenticated-only, anon fully denied';
END $$;
