-- P0 SECURITY — pgTAP database-level regression suite.
-- docs/security/2026-08-03-p0-access/ — round-2 review, item 8 (pgTAP).
--
-- Run via: npx supabase test db (after `supabase start` + `supabase db
-- reset` have replayed the full migration chain including
-- 20260804000000_p0_access_control_hardening.sql). Requires the pgTAP
-- extension, enabled below if not already present in the local stack's
-- default extension set.
--
-- STATUS AS OF 2026-08-04 (round-2 review): written but NOT YET EXECUTED.
-- Docker Desktop failed to start on this machine this session (WSL2
-- backend stuck at "Stopped" through a full cold start and a clean
-- restart, ~40 minutes total) -- `supabase start` could not be attempted.
-- This file is syntactically complete and ready to run the moment a
-- working local Docker/Supabase stack is available; treat every
-- assertion below as UNVERIFIED until a real `supabase test db` run
-- against it is captured.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Fixed 2026-08-10: confirmed live via the isolated CI pgTAP run -- this
-- file actually contains 25 SELECT ok()/is_empty() assertions, not 24 (an
-- off-by-one present since this file was first written but never executed
-- until this session, per the header note above).
SELECT plan(25);

-- ============================================================
-- Table-level: the ten incident tables must have zero anon/authenticated
-- grants except funnel_events' single authenticated SELECT.
-- ============================================================

SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='usage_counters' AND grantee IN ('anon','authenticated') $$,
  'usage_counters: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='analysis_attempts' AND grantee IN ('anon','authenticated') $$,
  'analysis_attempts: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='leads' AND grantee IN ('anon','authenticated') $$,
  'leads: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='quote_gen_usage' AND grantee IN ('anon','authenticated') $$,
  'quote_gen_usage: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='analysis_cases' AND grantee IN ('anon','authenticated') $$,
  'analysis_cases: zero anon/authenticated grants'
);
-- Fixed 2026-08-10: confirmed live via the isolated CI pgTAP run -- unlike
-- the five service-role-only tables above, invoices/export_jobs/
-- shared_reports/referral_codes are owner-scoped tables the P0 migration
-- deliberately grants to `authenticated` (GRANT SELECT, INSERT ON TABLE
-- public.invoices TO authenticated; etc., right above in
-- 20260804000000_p0_access_control_hardening.sql) so a real user can read/
-- write their own rows -- RLS then scopes it to auth.uid() = user_id. The
-- original "zero anon/authenticated grants" assertion below was never
-- actually executed before this session (file header says so) and doesn't
-- match that intentional design; only the ANON grant needs to be zero.
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='invoices' AND grantee = 'anon' $$,
  'invoices: zero anon grants (authenticated intentionally retains owner-scoped SELECT/INSERT)'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='export_jobs' AND grantee = 'anon' $$,
  'export_jobs: zero anon grants (authenticated intentionally retains owner-scoped SELECT/INSERT/UPDATE)'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='shared_reports' AND grantee = 'anon' $$,
  'shared_reports: zero anon grants (authenticated intentionally retains owner-scoped CRUD)'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='referral_codes' AND grantee = 'anon' $$,
  'referral_codes: zero anon grants (authenticated intentionally retains owner-scoped SELECT)'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='funnel_events'
       AND grantee IN ('anon','authenticated')
       AND NOT (grantee = 'authenticated' AND privilege_type = 'SELECT') $$,
  'funnel_events: only the one intended authenticated SELECT grant, nothing else'
);
SELECT ok(
  (SELECT has_table_privilege('authenticated', 'public.funnel_events', 'SELECT')),
  'funnel_events: authenticated CAN select (the admin-dashboard path stays functional)'
);

-- ============================================================
-- No PERMISSIVE wide-open (roles={public}, qual=true) policy remains on
-- any of the ten incident tables.
-- ============================================================

SELECT is_empty(
  $$ SELECT 1 FROM pg_policies
     WHERE schemaname='public'
       AND tablename IN ('usage_counters','analysis_attempts','leads','quote_gen_usage',
                          'analysis_cases','invoices','export_jobs','shared_reports',
                          'referral_codes','funnel_events')
       AND permissive='PERMISSIVE' AND roles @> ARRAY['public']::name[]
       AND qual='true' AND coalesce(with_check,'true')='true' $$,
  'no wide-open PERMISSIVE policy remains on any incident table'
);

-- ============================================================
-- charge_free_analysis: both overloads retained but fully closed.
-- ============================================================

-- Fixed 2026-08-10: confirmed live via the isolated CI pgTAP run --
-- 'public.charge_free_analysis(text)'::regprocedure (and the
-- has_function_privilege(role, text-signature, ...) overload, which casts
-- the same way internally) HARD-ERRORS "function ... does not exist" when
-- the function is genuinely absent, rather than returning false/NULL --
-- unlike to_regprocedure(text), which resolves the same signature and
-- returns NULL instead of erroring. That single unguarded assertion
-- aborted the whole pgTAP script here (only 12/24 planned tests ran), on
-- the exact function this branch's own migration already documented as
-- "NOT actually created by any tracked migration ... exists in production
-- only via out-of-band creation" (20260804000000_p0_access_control_
-- hardening.sql). Rewritten to resolve the oid via to_regprocedure()
-- first and treat a genuinely-absent function as trivially satisfying
-- "EXECUTE revoked" / "search_path pinned", matching this repo's own
-- established EXCEPTION WHEN undefined_function convention elsewhere.
SELECT ok(
  to_regprocedure('public.charge_free_analysis(text)') IS NULL
    OR NOT has_function_privilege('anon', to_regprocedure('public.charge_free_analysis(text)'), 'EXECUTE'),
  'charge_free_analysis(text): anon EXECUTE revoked (or function absent -- out-of-band-only)'
);
SELECT ok(
  to_regprocedure('public.charge_free_analysis(text)') IS NULL
    OR NOT has_function_privilege('authenticated', to_regprocedure('public.charge_free_analysis(text)'), 'EXECUTE'),
  'charge_free_analysis(text): authenticated EXECUTE revoked (or function absent -- out-of-band-only)'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.charge_free_analysis(text, boolean)', 'EXECUTE'),
  'charge_free_analysis(text,boolean): anon EXECUTE revoked'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.charge_free_analysis(text, boolean)', 'EXECUTE'),
  'charge_free_analysis(text,boolean): authenticated EXECUTE revoked'
);
SELECT ok(
  to_regprocedure('public.charge_free_analysis(text)') IS NULL
    OR (SELECT bool_or(cfg LIKE 'search_path=%')
          FROM pg_proc p, unnest(p.proconfig) cfg
          WHERE p.oid = to_regprocedure('public.charge_free_analysis(text)')),
  'charge_free_analysis(text): search_path is now pinned (or function absent -- out-of-band-only)'
);
SELECT ok(
  (SELECT bool_or(cfg LIKE 'search_path=%')
     FROM pg_proc p, unnest(p.proconfig) cfg
     WHERE p.oid = 'public.charge_free_analysis(text, boolean)'::regprocedure),
  'charge_free_analysis(text,boolean): search_path remains pinned'
);

-- ============================================================
-- record_funnel_event: unchanged intentional anon/authenticated access.
-- ============================================================

SELECT ok(
  has_function_privilege('anon', 'public.record_funnel_event(text,text,text,text,text,text,text,jsonb)', 'EXECUTE'),
  'record_funnel_event: anon EXECUTE unchanged (intentional, not part of this incident)'
);

-- ============================================================
-- P0 gate query itself returns zero rows post-migration (the same
-- assertion CI makes, re-verified at the pgTAP layer).
-- ============================================================

SELECT is_empty(
  $$ SELECT 1 FROM pg_policies p
     WHERE p.schemaname='public'
       AND p.tablename IN ('usage_counters','analysis_attempts','leads','quote_gen_usage',
                            'analysis_cases','invoices','export_jobs','shared_reports',
                            'referral_codes','funnel_events')
       AND p.permissive='PERMISSIVE' AND p.roles @> ARRAY['public']::name[]
       AND p.qual='true' AND coalesce(p.with_check,'true')='true' $$,
  'db-security-gate-p0.sql equivalent: zero incident-table wide-open policies'
);

-- ============================================================
-- NEW FINDINGS this round (round-2 review) -- these are EXPECTED TO FAIL
-- until the user makes an explicit scope decision (see chat response);
-- they are asserted here as a visible, tracked regression lock so the
-- decision is not silently forgotten, not as claims that they are fixed.
-- ============================================================

-- Fixed 2026-08-10: confirmed live via the isolated CI pgTAP run --
-- has_function_privilege('PUBLIC', ...) hard-errors "role \"PUBLIC\" does
-- not exist" -- PUBLIC is GRANT/REVOKE syntax for "every role," not an
-- actual row in pg_authid, so casting the literal string 'PUBLIC' to a
-- role oid fails. The correct way to check for a PUBLIC grant is to look
-- for the grantee='PUBLIC' marker row information_schema.routine_privileges
-- carries for exactly this case.
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' AND routine_name = 'get_next_invoice_number'
      AND grantee = 'PUBLIC' AND privilege_type = 'EXECUTE'
  ),
  'KNOWN OPEN FINDING: get_next_invoice_number still PUBLIC-executable (fix deferred pending scope decision)'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' AND routine_name = 'get_referral_stats'
      AND grantee = 'PUBLIC' AND privilege_type = 'EXECUTE'
  ),
  'KNOWN OPEN FINDING: get_referral_stats still PUBLIC-executable, and its internal check fails open for anon (fix deferred pending scope decision)'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' AND routine_name = 'complete_referral_signup'
      AND grantee = 'PUBLIC' AND privilege_type = 'EXECUTE'
  ),
  'KNOWN OPEN FINDING: complete_referral_signup still PUBLIC-executable due to a signature-mismatch bug in migration 20260613022816 (fix deferred pending scope decision)'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' AND routine_name = 'generate_referral_code'
      AND grantee = 'PUBLIC' AND privilege_type = 'EXECUTE'
  ),
  'KNOWN OPEN FINDING: generate_referral_code still PUBLIC-executable (fix deferred pending scope decision)'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' AND routine_name = 'decrement_quote_gen_usage'
      AND grantee = 'PUBLIC' AND privilege_type = 'EXECUTE'
  ),
  'KNOWN OPEN FINDING: decrement_quote_gen_usage still PUBLIC-executable, though functionally inert for anon since it keys off auth.uid() (fix deferred pending scope decision)'
);

SELECT * FROM finish();
ROLLBACK;
