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

SELECT plan(16);

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

SELECT is(
  (
    WITH r AS (
      SELECT set_config('request.jwt.claims',
        format('{"sub":"%s","role":"authenticated"}', current_setting('p0_test.other_id')), true)
    )
    SELECT count(*)::int FROM r, public.invoices WHERE user_id = current_setting('p0_test.owner_id')::uuid
  ),
  0,
  'a different authenticated user querying the owner''s invoices sees zero rows'
);

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

SELECT * FROM finish();
ROLLBACK;
