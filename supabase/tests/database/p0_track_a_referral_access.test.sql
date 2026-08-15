-- P0 SECURITY — Track A — pgTAP regression suite.
-- docs/security/2026-08-14-track-a/ — independently mergeable subset of PR #26.
--
-- Run via: npx supabase test db (after `supabase start` + `supabase db reset`
-- have replayed the full migration chain including
-- 20260814120000_p0_track_a_referral_function_access.sql). Requires the
-- pgTAP extension.
--
-- Self-contained: does NOT depend on PR #26's
-- supabase/tests/database/p0_access_control.test.sql or its branch existing.
-- Uses has_function_privilege() throughout, not information_schema.routine_
-- privileges -- PR #26's own history (commit 6ad4182c) found the latter
-- misses implicit-default PUBLIC grants, which is exactly the class of bug
-- this suite exists to catch.
--
-- STATUS AS OF 2026-08-14: written but NOT YET EXECUTED. This session has no
-- working local Docker/Supabase stack (same infra gap PR #26 hit). Treat
-- every assertion below as UNVERIFIED until a real `supabase test db` run
-- against it is captured.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(13);

-- ============================================================
-- Part 1 -- effective-privilege assertions (anon must be denied, 5 functions)
-- ============================================================
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_referral_stats(uuid)', 'EXECUTE'),
  'get_referral_stats(uuid): anon cannot execute'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.complete_referral_signup(uuid,uuid)', 'EXECUTE'),
  'complete_referral_signup(uuid,uuid): anon cannot execute'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.generate_referral_code(uuid)', 'EXECUTE'),
  'generate_referral_code(uuid): anon cannot execute'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_next_invoice_number(uuid)', 'EXECUTE'),
  'get_next_invoice_number(uuid): anon cannot execute'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.decrement_quote_gen_usage()', 'EXECUTE'),
  'decrement_quote_gen_usage(): anon cannot execute'
);

-- ============================================================
-- Part 2 -- effective-privilege assertions (authenticated must still work,
-- so the fix does not silently break the 5 real client call sites)
-- ============================================================
SELECT ok(
  has_function_privilege('authenticated', 'public.get_referral_stats(uuid)', 'EXECUTE'),
  'get_referral_stats(uuid): authenticated retains execute'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.complete_referral_signup(uuid,uuid)', 'EXECUTE'),
  'complete_referral_signup(uuid,uuid): authenticated retains execute'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.generate_referral_code(uuid)', 'EXECUTE'),
  'generate_referral_code(uuid): authenticated retains execute'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.get_next_invoice_number(uuid)', 'EXECUTE'),
  'get_next_invoice_number(uuid): authenticated retains execute'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.decrement_quote_gen_usage()', 'EXECUTE'),
  'decrement_quote_gen_usage(): authenticated retains execute'
);

-- ============================================================
-- Part 3 -- the actual exploit, run for real as the anon role and expected
-- to raise. Uses a throwaway auth.users row created inside this transaction
-- (rolled back at COMMIT/ROLLBACK of the outer test transaction, per pgTAP's
-- own convention -- see PR #26's cross-identity matrix for the same pattern).
-- ============================================================
DO $$
DECLARE
  v_victim_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (v_victim_id, 'track-a-victim-' || v_victim_id || '@test.invalid', 'x', now(), now(), now());
  INSERT INTO public.referral_codes (user_id, code) VALUES (v_victim_id, 'TESTCODE');

  PERFORM set_config('track_a.victim_id', v_victim_id::text, true);
END $$;

SELECT throws_ok(
  format('SET LOCAL ROLE anon; SELECT public.get_referral_stats(%L::uuid);',
         current_setting('track_a.victim_id')),
  'Access denied',
  'anon calling get_referral_stats() against a real victim user id raises Access denied, not a silent 200'
);

-- ============================================================
-- Part 4 -- cross-user denial as a real *authenticated* (non-owner) caller
-- was never broken (this migration only fixes the anon/NULL case) --
-- asserted here as a non-regression check, not a new fix.
-- ============================================================
DO $$
DECLARE
  v_caller_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (v_caller_id, 'track-a-caller-' || v_caller_id || '@test.invalid', 'x', now(), now(), now());
  PERFORM set_config('track_a.caller_id', v_caller_id::text, true);
END $$;

SELECT throws_ok(
  format(
    $q$SET LOCAL ROLE authenticated;
       SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
       SELECT public.get_referral_stats(%L::uuid);$q$,
    current_setting('track_a.caller_id'),
    current_setting('track_a.victim_id')
  ),
  'Access denied',
  'authenticated user A calling get_referral_stats() for user B raises Access denied (pre-existing correct behavior, non-regression)'
);

-- ============================================================
-- Part 5 -- service_role must still bypass the guard (SECURITY DEFINER +
-- is_service_role() branch), otherwise any legitimate admin/service tooling
-- built on this RPC later would silently break.
-- ============================================================
SELECT lives_ok(
  format(
    $q$SET LOCAL ROLE service_role;
       SET LOCAL "request.jwt.claims" = '{"role":"service_role"}';
       SELECT public.get_referral_stats(%L::uuid);$q$,
    current_setting('track_a.victim_id')
  ),
  'service_role calling get_referral_stats() for any user id succeeds (is_service_role() branch intact)'
);

SELECT * FROM finish();
ROLLBACK;
