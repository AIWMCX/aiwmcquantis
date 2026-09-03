-- P0 SECURITY — 2026-09-03 post-charter sweep — pgTAP regression suite.
-- Covers the three REAL vulnerabilities closed by migrations
-- 20260903004424, 20260903005820, and 20260903182832 (the "excess but not
-- exploitable" defense-in-depth items — admin_force_sync_subscription,
-- get_admin_metrics, and the four dormant/orphaned functions — are
-- deliberately not asserted here, since they were never live exploits;
-- see the canonical register's per-function disposition table for those).
--
-- Run via: npx supabase test db (after supabase start + supabase db reset
-- have replayed the full migration chain). Requires pgTAP.
--
-- Live-verified 2026-09-03: run inline against production inside a
-- ROLLBACK-wrapped transaction via the Supabase SQL execution tool before
-- this commit, same rigor precedent as p0_10table_exposure_regression.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(9);

-- ============================================================
-- 1. increment_quote_gen_usage() — anon denied, authenticated retains
--    (20260903004424 / migration 20260903090000 locally)
-- ============================================================
SELECT ok(
  NOT has_function_privilege('anon', 'public.increment_quote_gen_usage()', 'EXECUTE'),
  'increment_quote_gen_usage(): anon cannot execute'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.increment_quote_gen_usage()', 'EXECUTE'),
  'increment_quote_gen_usage(): authenticated retains execute (src/services/serviceJob.ts)'
);

-- ============================================================
-- 2. decrypt_pii(bytea) / encrypt_pii(text) — authenticated denied direct
--    RPC access, service_role retains (send-weekly-insights edge function)
--    (20260903005820)
-- ============================================================
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.decrypt_pii(bytea)', 'EXECUTE'),
  'decrypt_pii(bytea): authenticated cannot execute directly'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.encrypt_pii(text)', 'EXECUTE'),
  'encrypt_pii(text): authenticated cannot execute directly'
);
SELECT ok(
  has_function_privilege('service_role', 'public.decrypt_pii(bytea)', 'EXECUTE'),
  'decrypt_pii(bytea): service_role retains execute (send-weekly-insights)'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.get_lead_email(uuid)', 'EXECUTE'),
  'get_lead_email(uuid): unrelated grant left untouched, still authenticated-callable'
);

-- The real exploit this closes: before the fix, any authenticated user
-- could call decrypt_pii() directly on arbitrary ciphertext, bypassing
-- get_lead_email's admin-role + rate-limit gate entirely. Assert the
-- direct path itself now raises, not just that the grant is gone.
SELECT throws_ok(
  $q$SET LOCAL ROLE authenticated;
     SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
     SELECT public.decrypt_pii('\x00'::bytea);$q$,
  'permission denied for function decrypt_pii',
  'authenticated caller attempting decrypt_pii() directly is denied at the SQL level, not just the introspected grant'
);

-- ============================================================
-- 3. get_user_plan_tier(uuid) — cross-user plan-tier leak, fully revoked
--    from authenticated (20260903182832)
-- ============================================================
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.get_user_plan_tier(uuid)', 'EXECUTE'),
  'get_user_plan_tier(uuid): authenticated cannot execute directly'
);

-- The real exploit this closes: before the fix, any authenticated user
-- could call get_user_plan_tier(<any other user's uuid>) and learn
-- whether that account was on free/plus/pro, with zero ownership check.
DO $$
DECLARE
  v_victim_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (v_victim_id, 'sweep-victim-' || v_victim_id || '@test.invalid', 'x', now(), now(), now());
  PERFORM set_config('sweep.victim_id', v_victim_id::text, true);
END $$;

SELECT throws_ok(
  format(
    $q$SET LOCAL ROLE authenticated;
       SET LOCAL "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
       SELECT public.get_user_plan_tier(%L::uuid);$q$,
    current_setting('sweep.victim_id')
  ),
  'permission denied for function get_user_plan_tier',
  'authenticated user A calling get_user_plan_tier() for a different user B is denied, not silently returning B''s tier'
);

SELECT * FROM finish();
ROLLBACK;
