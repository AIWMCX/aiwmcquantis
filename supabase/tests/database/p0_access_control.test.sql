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

SELECT plan(24);

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
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='invoices' AND grantee IN ('anon','authenticated') $$,
  'invoices: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='export_jobs' AND grantee IN ('anon','authenticated') $$,
  'export_jobs: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='shared_reports' AND grantee IN ('anon','authenticated') $$,
  'shared_reports: zero anon/authenticated grants'
);
SELECT is_empty(
  $$ SELECT 1 FROM information_schema.role_table_grants
     WHERE table_schema='public' AND table_name='referral_codes' AND grantee IN ('anon','authenticated') $$,
  'referral_codes: zero anon/authenticated grants'
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

SELECT ok(
  NOT has_function_privilege('anon', 'public.charge_free_analysis(text)', 'EXECUTE'),
  'charge_free_analysis(text): anon EXECUTE revoked'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.charge_free_analysis(text)', 'EXECUTE'),
  'charge_free_analysis(text): authenticated EXECUTE revoked'
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
  (SELECT bool_or(cfg LIKE 'search_path=%')
     FROM pg_proc p, unnest(p.proconfig) cfg
     WHERE p.oid = 'public.charge_free_analysis(text)'::regprocedure),
  'charge_free_analysis(text): search_path is now pinned'
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

SELECT ok(
  has_function_privilege('PUBLIC', 'public.get_next_invoice_number(uuid)', 'EXECUTE'),
  'KNOWN OPEN FINDING: get_next_invoice_number still PUBLIC-executable (fix deferred pending scope decision)'
);
SELECT ok(
  has_function_privilege('PUBLIC', 'public.get_referral_stats(uuid)', 'EXECUTE'),
  'KNOWN OPEN FINDING: get_referral_stats still PUBLIC-executable, and its internal check fails open for anon (fix deferred pending scope decision)'
);
SELECT ok(
  has_function_privilege('PUBLIC', 'public.complete_referral_signup(uuid,uuid)', 'EXECUTE'),
  'KNOWN OPEN FINDING: complete_referral_signup still PUBLIC-executable due to a signature-mismatch bug in migration 20260613022816 (fix deferred pending scope decision)'
);
SELECT ok(
  has_function_privilege('PUBLIC', 'public.generate_referral_code(uuid)', 'EXECUTE'),
  'KNOWN OPEN FINDING: generate_referral_code still PUBLIC-executable (fix deferred pending scope decision)'
);
SELECT ok(
  has_function_privilege('PUBLIC', 'public.decrement_quote_gen_usage()', 'EXECUTE'),
  'KNOWN OPEN FINDING: decrement_quote_gen_usage still PUBLIC-executable, though functionally inert for anon since it keys off auth.uid() (fix deferred pending scope decision)'
);

SELECT * FROM finish();
ROLLBACK;
