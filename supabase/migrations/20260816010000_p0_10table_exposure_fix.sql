-- P0 SECURITY — 10-table effective-access exposure — 2026-08-16
--
-- This is the exact vulnerability PR #26 (security/p0-effective-access-control,
-- open since 2026-08-04, now CONFLICTING against main) exists to fix. That PR
-- was never merged. Verified DIRECTLY against live production this session
-- (not from PR #26's own writeup): all 10 tables below currently grant
-- SELECT/INSERT/UPDATE/DELETE to anon, and every one carries a policy named
-- "*_svc" or "*_self" (signalling service-role/owner-only intent) that is
-- actually `USING (true) WITH CHECK (true)` FOR ALL TO {public} -- i.e. it
-- grants every row to every role, including anon. This is live, unpatched,
-- exploitable through the real PostgREST API with only the public anon key.
--
-- Rather than merge PR #26 wholesale (stale, based on older main, contains at
-- least one confirmed-wrong migration reconstruction -- see the Track A
-- session notes on 20260613022534 for that exact class of mistake), this
-- extracts only the verified-necessary fix against CURRENT live schema and
-- policies, checked directly before writing this file.
--
-- Three tables (export_jobs, quote_gen_usage, usage_counters) already have
-- correct owner-scoped policies layered on top of the open one -- adding a
-- second correct policy does not fix anything while the permissive `_svc`
-- policy (TO public, USING true) is still present, because Postgres RLS
-- policies are OR'd together. The fix for those three is: keep the existing
-- correct owner policy, replace only the `_svc`/`_self` policy's role from
-- {public} to service_role, and fix the table-level GRANT.
--
-- Additive and idempotent: DROP POLICY IF EXISTS + CREATE POLICY, REVOKE is a
-- no-op if the privilege isn't held. No table, column, or row is altered.

-- ============================================================
-- 1. Dead/internal tables -- zero legitimate anon/authenticated caller found
--    (analysis_attempts, leads: no client-facing read/write path; edge
--    functions that touch them already use the service-role client and are
--    unaffected by this revoke).
-- ============================================================
REVOKE ALL ON TABLE public.analysis_attempts FROM anon, authenticated;
DROP POLICY IF EXISTS analysis_attempts_self ON public.analysis_attempts;
CREATE POLICY analysis_attempts_service_only ON public.analysis_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
DROP POLICY IF EXISTS leads_svc ON public.leads;
CREATE POLICY leads_service_only ON public.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.analysis_cases FROM anon, authenticated;
DROP POLICY IF EXISTS analysis_cases_svc ON public.analysis_cases;
CREATE POLICY analysis_cases_service_only ON public.analysis_cases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 2. Already-partially-hardened tables -- keep the existing correct owner
--    policy, close only the permissive service policy's role.
-- ============================================================
REVOKE ALL ON TABLE public.usage_counters FROM anon, authenticated;
GRANT SELECT ON TABLE public.usage_counters TO authenticated; -- required by the existing "Users read own usage_counter" policy
DROP POLICY IF EXISTS usage_counters_self ON public.usage_counters;
CREATE POLICY usage_counters_service_only ON public.usage_counters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.quote_gen_usage FROM anon, authenticated;
GRANT SELECT ON TABLE public.quote_gen_usage TO authenticated; -- required by "Users read own quote_gen_usage"
DROP POLICY IF EXISTS quote_gen_usage_svc ON public.quote_gen_usage;
CREATE POLICY quote_gen_usage_service_only ON public.quote_gen_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.export_jobs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.export_jobs TO authenticated; -- matches the 3 existing owner policies (select/insert/update, no delete)
DROP POLICY IF EXISTS export_jobs_svc ON public.export_jobs;
CREATE POLICY export_jobs_service_only ON public.export_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Owner-scoped tables with NO existing hardening -- add real owner
--    policies for the first time.
-- ============================================================

-- invoices: owner SELECT + INSERT + UPDATE. Checked src/hooks/useInvoices.ts
-- directly before writing this: useUpdateInvoiceStatus() does a real
-- client-side UPDATE (marking an invoice paid/status change) under the
-- caller's own authenticated session -- an owner UPDATE policy is required,
-- not optional, or this live feature breaks. No client-side DELETE call
-- site found.
REVOKE ALL ON TABLE public.invoices FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.invoices TO authenticated;
DROP POLICY IF EXISTS invoices_svc ON public.invoices;
CREATE POLICY invoices_owner_select ON public.invoices
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY invoices_owner_insert ON public.invoices
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY invoices_owner_update ON public.invoices
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY invoices_service_all ON public.invoices
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- shared_reports: owner-managed rows via direct table access. The public,
-- token-based read path stays untouched -- it lives entirely inside
-- supabase/functions/share-report/index.ts, which already uses a
-- service-role client internally (bypasses RLS by design) and never goes
-- through anon/authenticated grants at all.
REVOKE ALL ON TABLE public.shared_reports FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_reports TO authenticated;
DROP POLICY IF EXISTS shared_reports_svc ON public.shared_reports;
CREATE POLICY shared_reports_owner_all ON public.shared_reports
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY shared_reports_service_all ON public.shared_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- referral_codes: owner SELECT only. All mutation (generate/track/complete)
-- already goes through SECURITY DEFINER RPCs (Track A, this session), which
-- are unaffected by this table-level revoke.
REVOKE ALL ON TABLE public.referral_codes FROM anon, authenticated;
GRANT SELECT ON TABLE public.referral_codes TO authenticated;
DROP POLICY IF EXISTS referral_codes_svc ON public.referral_codes;
CREATE POLICY referral_codes_owner_select ON public.referral_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY referral_codes_service_all ON public.referral_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- funnel_events: the only legitimate write path is server-side event capture
-- (service-role) plus this session's new AFTER INSERT trigger on analyses
-- (also service-role, SECURITY DEFINER). No legitimate anon/authenticated
-- write path exists. Read access is admin-dashboard-only.
REVOKE ALL ON TABLE public.funnel_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.funnel_events TO authenticated;
DROP POLICY IF EXISTS funnel_events_svc ON public.funnel_events;
CREATE POLICY funnel_events_admin_select ON public.funnel_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY funnel_events_service_all ON public.funnel_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 4. service_role table grants -- RLS bypass does not confer table-level
--    privilege (separate Postgres mechanism); confirmed missing on several
--    of these tables this session (same class of gap Track A's own history
--    found on invoices/export_jobs/shared_reports/referral_codes/user_roles
--    back in the E6 branch). Explicit here so a fresh replay or this exact
--    production database both have it regardless of ambient defaults.
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analysis_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.leads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analysis_cases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.usage_counters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.quote_gen_usage TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.export_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.referral_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funnel_events TO service_role;

-- ============================================================
-- POSTCONDITION -- hard assertions, matching the Track A migration's own
-- pattern: fail loudly rather than silently no-op.
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'analysis_attempts','leads','analysis_cases','usage_counters',
    'quote_gen_usage','export_jobs','invoices','shared_reports',
    'referral_codes','funnel_events'
  ] LOOP
    IF has_table_privilege('anon', 'public.'||t, 'SELECT')
       OR has_table_privilege('anon', 'public.'||t, 'INSERT')
       OR has_table_privilege('anon', 'public.'||t, 'UPDATE')
       OR has_table_privilege('anon', 'public.'||t, 'DELETE') THEN
      RAISE EXCEPTION 'P0 POSTCONDITION FAILED: anon still has some privilege on %', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'P0 POSTCONDITION PASSED: anon fully denied on all 10 tables';
END $$;
