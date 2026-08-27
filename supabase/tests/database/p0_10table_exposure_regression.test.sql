-- P0 SECURITY — 10-table effective-access exposure — pgTAP regression suite.
-- docs/security/2026-08-03-p0-access/ (original finding) — closed by
-- migration 20260816010000_p0_10table_exposure_fix.sql (PR #32).
--
-- Ported from PR #26's supabase/tests/database/p0_access_control.test.sql
-- (never merged -- PR #26 is stale/superseded, see its closing comment).
-- Rewritten against the CURRENT schema/policy state rather than copied,
-- following the same has_table_privilege()-based approach as the sibling
-- p0_track_a_referral_access.test.sql (PR #26's own history found that
-- information_schema.role_table_privileges misses implicit-default PUBLIC
-- grants -- has_table_privilege() does not have that gap).
--
-- Run via: npx supabase test db (after `supabase start` + `supabase db
-- reset` have replayed the full migration chain). Requires pgTAP.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

-- Plan count: pgTAP counts one test per ROW a test predicate returns, not
-- one per SELECT statement -- `SELECT ok(...) FROM unnest(array_of_N)`
-- contributes N to the plan, not 1. Part 1 (10 tables) + Part 2 (3) +
-- Part 3 (2) + Part 4 (2) + Part 5 (10) + Part 6 (5) + Part 7 (2) +
-- Part 8 (1) = 35.
SELECT plan(35);

-- ============================================================
-- Part 1 — anon must have zero privilege on all 10 tables (the exact
-- vector proven live-exploitable via real PostgREST calls against
-- production on 2026-08-03/04).
-- ============================================================
SELECT ok(
  NOT (
    has_table_privilege('anon', 'public.'||t, 'SELECT') OR
    has_table_privilege('anon', 'public.'||t, 'INSERT') OR
    has_table_privilege('anon', 'public.'||t, 'UPDATE') OR
    has_table_privilege('anon', 'public.'||t, 'DELETE')
  ),
  t || ': anon has zero table privilege'
)
FROM unnest(ARRAY[
  'analysis_attempts','leads','analysis_cases','usage_counters',
  'quote_gen_usage','export_jobs','invoices','shared_reports',
  'referral_codes','funnel_events'
]) AS t;

-- ============================================================
-- Part 2 — the three fully internal tables must also deny authenticated
-- (no legitimate client caller exists for these; service-role only).
-- ============================================================
SELECT ok(
  NOT (
    has_table_privilege('authenticated', 'public.'||t, 'SELECT') OR
    has_table_privilege('authenticated', 'public.'||t, 'INSERT') OR
    has_table_privilege('authenticated', 'public.'||t, 'UPDATE') OR
    has_table_privilege('authenticated', 'public.'||t, 'DELETE')
  ),
  t || ': authenticated has zero table privilege (service-role only)'
)
FROM unnest(ARRAY['analysis_attempts', 'leads', 'analysis_cases']) AS t;

-- ============================================================
-- Part 3 — real anon-role exploit attempt, run for real (not just a
-- privilege lookup), for the two highest-value targets: invoices
-- (financial/PII) and usage_counters (quota data). Expected: a real
-- permission-denied error from Postgres, not a silent empty result.
-- ============================================================
SELECT throws_ok(
  'SET LOCAL ROLE anon; SELECT count(*) FROM public.invoices;',
  '42501',
  NULL,
  'anon SELECT against invoices raises permission_denied (42501), not an empty result'
);

SELECT throws_ok(
  'SET LOCAL ROLE anon; SELECT count(*) FROM public.usage_counters;',
  '42501',
  NULL,
  'anon SELECT against usage_counters raises permission_denied (42501), not an empty result'
);

-- ============================================================
-- Part 4 — owner-scoped tables: a real authenticated user must see only
-- their own rows, never another user's. Uses throwaway auth.users rows
-- created inside this transaction (rolled back at the end).
-- ============================================================
DO $$
DECLARE
  v_owner_id uuid := gen_random_uuid();
  v_other_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (v_owner_id, 'p0-owner-' || v_owner_id || '@test.invalid', 'x', now(), now(), now());
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (v_other_id, 'p0-other-' || v_other_id || '@test.invalid', 'x', now(), now(), now());

  PERFORM set_config('p0_test.owner_id', v_owner_id::text, true);
  PERFORM set_config('p0_test.other_id', v_other_id::text, true);
END $$;

INSERT INTO public.invoices (user_id, invoice_number, client_name, status)
SELECT current_setting('p0_test.owner_id')::uuid, 'P0-TEST-0001', 'P0 Test Client', 'paid';

SELECT lives_ok(
  format(
    $q$SET LOCAL ROLE authenticated;
       SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
       SELECT * FROM public.invoices WHERE user_id = '%s'::uuid;$q$,
    current_setting('p0_test.owner_id'), current_setting('p0_test.owner_id')
  ),
  'owner querying their own invoices succeeds (owner-scoped SELECT policy intact)'
);

-- NOTE: the JWT claim alone does not enforce RLS -- the connection's actual
-- Postgres ROLE does. Earlier draft of this test set the claim but never
-- switched role, so it silently ran as the (RLS-exempt) invoking role and
-- would have passed even if RLS were completely broken. Verified live
-- against production before this fix: the unswitched version returned 1
-- (leak) for every cross-user check; SET LOCAL ROLE authenticated first
-- correctly returns 0. Every cross-user check below brackets with
-- SET LOCAL ROLE / RESET ROLE for this reason.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('p0_test.other_id')), true);
SELECT is(
  (SELECT count(*)::int FROM public.invoices WHERE user_id = current_setting('p0_test.owner_id')::uuid),
  0,
  'a different authenticated user querying the owner''s invoices sees zero rows'
);
RESET ROLE;

-- ============================================================
-- Part 5 — service_role must retain full access (server-side paths --
-- stripe-webhook, analyze-business, etc. -- depend on this).
-- ============================================================
SELECT ok(
  has_table_privilege('service_role', 'public.'||t, 'SELECT') AND
  has_table_privilege('service_role', 'public.'||t, 'INSERT') AND
  has_table_privilege('service_role', 'public.'||t, 'UPDATE') AND
  has_table_privilege('service_role', 'public.'||t, 'DELETE'),
  t || ': service_role retains full CRUD'
)
FROM unnest(ARRAY[
  'analysis_attempts','leads','analysis_cases','usage_counters',
  'quote_gen_usage','export_jobs','invoices','shared_reports',
  'referral_codes','funnel_events'
]) AS t;

-- ============================================================
-- Part 6 — extend owner/non-owner isolation from invoices-only to the
-- remaining owner-scoped tables (charter item 1.7-1.10: the original pass
-- only covered invoices). referral_codes and quote_gen_usage need no FK;
-- export_jobs/shared_reports need a real analyses row (their user_id/
-- analysis_id are NOT NULL); usage_counters keys on identity_key, not
-- user_id directly.
-- ============================================================
DO $$
DECLARE
  v_analysis_id uuid;
BEGIN
  INSERT INTO public.analyses (user_id, idea, location, result)
  VALUES (current_setting('p0_test.owner_id')::uuid, 'P0 test idea', 'P0 test location', '{}'::jsonb)
  RETURNING id INTO v_analysis_id;
  PERFORM set_config('p0_test.analysis_id', v_analysis_id::text, true);
END $$;

INSERT INTO public.referral_codes (user_id, code)
SELECT current_setting('p0_test.owner_id')::uuid, 'P0TESTCODE';

INSERT INTO public.quote_gen_usage (user_id, month_key)
SELECT current_setting('p0_test.owner_id')::uuid, to_char(now(), 'YYYY-MM');

INSERT INTO public.usage_counters (identity_key)
SELECT 'user:' || current_setting('p0_test.owner_id');

INSERT INTO public.export_jobs (user_id, analysis_id)
SELECT current_setting('p0_test.owner_id')::uuid, current_setting('p0_test.analysis_id')::uuid;

INSERT INTO public.shared_reports (user_id, analysis_id)
SELECT current_setting('p0_test.owner_id')::uuid, current_setting('p0_test.analysis_id')::uuid;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  format('{"sub":"%s","role":"authenticated"}', current_setting('p0_test.other_id')), true);

SELECT is(
  (SELECT count(*)::int FROM public.referral_codes WHERE user_id = current_setting('p0_test.owner_id')::uuid),
  0,
  'different authenticated user sees zero rows of owner''s referral_codes'
);

SELECT is(
  (SELECT count(*)::int FROM public.quote_gen_usage WHERE user_id = current_setting('p0_test.owner_id')::uuid),
  0,
  'different authenticated user sees zero rows of owner''s quote_gen_usage'
);

SELECT is(
  (SELECT count(*)::int FROM public.usage_counters WHERE identity_key = 'user:' || current_setting('p0_test.owner_id')),
  0,
  'different authenticated user sees zero rows of owner''s usage_counters'
);

SELECT is(
  (SELECT count(*)::int FROM public.export_jobs WHERE user_id = current_setting('p0_test.owner_id')::uuid),
  0,
  'different authenticated user sees zero rows of owner''s export_jobs'
);

SELECT is(
  (SELECT count(*)::int FROM public.shared_reports WHERE user_id = current_setting('p0_test.owner_id')::uuid),
  0,
  'different authenticated user sees zero rows of owner''s shared_reports'
);
RESET ROLE;

-- ============================================================
-- Part 7 — ownership-reassignment attack (charter item 1.9): a different
-- authenticated user tries to INSERT a row claiming the OWNER's user_id
-- (impersonation via WITH CHECK), and the owner tries to UPDATE their own
-- row to reassign it to someone else. Both must be denied by WITH CHECK,
-- not merely hidden by SELECT-side RLS.
-- ============================================================
-- 4-arg form (sql, errcode, expected_message, description) -- the 3-arg
-- form ambiguously overloads its 3rd positional argument as an expected
-- error MESSAGE, not a description, so a 3-arg call here would silently
-- fail even when the real security behavior (42501) is correct. Verified
-- live against production: matches Part 3's already-correct 4-arg pattern.
SELECT throws_ok(
  format(
    $q$SET LOCAL ROLE authenticated;
       SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
       INSERT INTO public.referral_codes (user_id, code) VALUES ('%s'::uuid, 'IMPERSONATE');$q$,
    current_setting('p0_test.other_id'), current_setting('p0_test.owner_id')
  ),
  '42501',
  NULL,
  'a different authenticated user cannot INSERT a referral_codes row claiming the owner''s user_id (WITH CHECK denies impersonation)'
);

SELECT throws_ok(
  format(
    $q$SET LOCAL ROLE authenticated;
       SET LOCAL "request.jwt.claims" = '{"sub":"%s","role":"authenticated"}';
       UPDATE public.invoices SET user_id = '%s'::uuid WHERE user_id = '%s'::uuid;$q$,
    current_setting('p0_test.owner_id'), current_setting('p0_test.other_id'), current_setting('p0_test.owner_id')
  ),
  '42501',
  NULL,
  'the owner cannot reassign their own invoice''s user_id to another user (WITH CHECK denies ownership transfer)'
);

-- ============================================================
-- Part 8 — view-bypass check (charter item 1.10): analysis_health is
-- built on analysis_attempts (service-role-only); confirm the view itself
-- carries no anon/authenticated grant that would let it re-expose the
-- underlying table's data.
-- ============================================================
SELECT ok(
  NOT has_table_privilege('anon', 'public.analysis_health', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.analysis_health', 'SELECT'),
  'analysis_health view (built on analysis_attempts) grants no SELECT to anon/authenticated -- no view-bypass path'
);

SELECT * FROM finish();
ROLLBACK;
