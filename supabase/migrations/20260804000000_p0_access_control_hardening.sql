-- P0 SECURITY REMEDIATION — 2026-08-04
-- Incident: docs/security/2026-08-03-p0-access/00_EXECUTIVE_SUMMARY.md
--
-- Proven live (see 02_EFFECTIVE_ACCESS_RESULTS.md): 10 tables had RLS
-- policies named "_svc"/"_self" (signalling service-role-only or
-- owner-only intent) that were never actually scoped that way -- every one
-- was `USING (true) WITH CHECK (true)` for role {public}, combined with
-- full SELECT/INSERT/UPDATE/DELETE/TRUNCATE GRANTs to both anon and
-- authenticated. Confirmed exploitable via the real PostgREST API using
-- only the public anon key: anon could read, update, and delete a
-- usage_counters row, and enumerate real invoices/leads row ids.
--
-- NOT YET APPLIED TO PRODUCTION. Requires founder approval per the
-- production action preview in this incident's chat response.
--
-- Additive and idempotent: DROP POLICY IF EXISTS + CREATE POLICY (policies
-- have no CREATE OR REPLACE), REVOKE is a no-op if the privilege isn't
-- held. No table, column, or row is altered in shape; only access control
-- changes.

-- ============================================================
-- 1. Dead tables, zero live callers found anywhere in the app.
--    service_role only. Revoking here is a pure risk reduction with zero
--    functional change (nothing currently depends on anon/authenticated
--    access to these five tables).
-- ============================================================

-- usage_counters
REVOKE ALL ON TABLE public.usage_counters FROM anon, authenticated;
DROP POLICY IF EXISTS usage_counters_self ON public.usage_counters;
CREATE POLICY usage_counters_service_only
  ON public.usage_counters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- analysis_attempts
REVOKE ALL ON TABLE public.analysis_attempts FROM anon, authenticated;
DROP POLICY IF EXISTS analysis_attempts_self ON public.analysis_attempts;
CREATE POLICY analysis_attempts_service_only
  ON public.analysis_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- leads (no direct client caller found; edge functions use service-role
-- and are unaffected by this)
REVOKE ALL ON TABLE public.leads FROM anon, authenticated;
DROP POLICY IF EXISTS leads_svc ON public.leads;
CREATE POLICY leads_service_only
  ON public.leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- quote_gen_usage (get_quote_gen_status / increment_quote_gen_usage RPCs
-- are SECURITY DEFINER and already hardened -- unaffected by this revoke)
REVOKE ALL ON TABLE public.quote_gen_usage FROM anon, authenticated;
DROP POLICY IF EXISTS quote_gen_usage_svc ON public.quote_gen_usage;
CREATE POLICY quote_gen_usage_service_only
  ON public.quote_gen_usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- analysis_cases (analyze-business/index.ts INSERT and prediction-engine.ts
-- SELECT both already run under the service-role client -- unaffected)
REVOKE ALL ON TABLE public.analysis_cases FROM anon, authenticated;
DROP POLICY IF EXISTS analysis_cases_svc ON public.analysis_cases;
CREATE POLICY analysis_cases_service_only
  ON public.analysis_cases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 2. Owner-scoped tables. Real client code already filters by user_id
--    client-side (useInvoices.ts, useExportQueue.ts, useReferral.ts) --
--    this makes that a real, server-enforced boundary instead of a
--    cosmetic one a client could simply omit.
-- ============================================================

-- invoices: owner SELECT + INSERT only. No direct client UPDATE/DELETE
-- call site was found this pass -- if a void/edit workflow exists and
-- needs it, add a matching owner-scoped UPDATE policy before deploying
-- (flagged in 04_REMEDIATION_PLAN.md for founder/eng confirmation).
REVOKE ALL ON TABLE public.invoices FROM anon;
REVOKE ALL ON TABLE public.invoices FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.invoices TO authenticated;
DROP POLICY IF EXISTS invoices_svc ON public.invoices;
CREATE POLICY invoices_owner_select
  ON public.invoices
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY invoices_owner_insert
  ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- export_jobs: owner SELECT/INSERT/UPDATE (useExportQueue.ts, exportJobs.ts,
-- MyDocuments.tsx all read/write only the caller's own rows).
REVOKE ALL ON TABLE public.export_jobs FROM anon;
REVOKE ALL ON TABLE public.export_jobs FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.export_jobs TO authenticated;
DROP POLICY IF EXISTS export_jobs_svc ON public.export_jobs;
CREATE POLICY export_jobs_owner_all
  ON public.export_jobs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- shared_reports: owner-managed rows only via direct table access. Public
-- token-based reads stay exactly as they are today, inside
-- supabase/functions/share-report/index.ts, which already uses a
-- service-role client internally and is completely unaffected by this
-- revoke (service_role bypasses RLS by design).
REVOKE ALL ON TABLE public.shared_reports FROM anon;
REVOKE ALL ON TABLE public.shared_reports FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_reports TO authenticated;
DROP POLICY IF EXISTS shared_reports_svc ON public.shared_reports;
CREATE POLICY shared_reports_owner_all
  ON public.shared_reports
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- referral_codes: owner SELECT only (useReferral.ts:73-76 reads only the
-- caller's own code id). All mutation (generate/track/complete) already
-- goes through SECURITY DEFINER RPCs, unaffected by this revoke.
REVOKE ALL ON TABLE public.referral_codes FROM anon;
REVOKE ALL ON TABLE public.referral_codes FROM authenticated;
GRANT SELECT ON TABLE public.referral_codes TO authenticated;
DROP POLICY IF EXISTS referral_codes_svc ON public.referral_codes;
CREATE POLICY referral_codes_owner_select
  ON public.referral_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. RPC-mediated table. The only legitimate anon/authenticated write
--    path is record_funnel_event(), already SECURITY DEFINER with its own
--    rate limit and canonical-name allowlist -- direct table grants are
--    pure excess with zero corresponding legitimate use. Adds a genuine
--    admin-only read policy so the /admin/funnel dashboard's existing
--    "admin-only" code comment becomes actually true (it was not
--    previously enforced by any policy).
-- ============================================================

REVOKE ALL ON TABLE public.funnel_events FROM anon, authenticated;
-- BLOCKER 1 FIX (2026-08-04 review): an RLS policy does not grant table
-- privileges on its own -- FOR SELECT + a role list only *restricts which
-- rows a role with SELECT can see*, it never *confers* SELECT. Without
-- this GRANT, authenticated (including real admins) would have gotten a
-- 403 (insufficient_privilege) on every query regardless of the policy,
-- and /admin/funnel would have silently broken. Only SELECT is granted --
-- authenticated never gets INSERT/UPDATE/DELETE/TRUNCATE on this table;
-- the RPC remains the only write path.
GRANT SELECT ON TABLE public.funnel_events TO authenticated;
-- Fixed 2026-08-10: the FOR ALL TO service_role policy below grants row
-- visibility, not table privilege -- service_role never had an explicit
-- table GRANT here either (same class of gap as section 5 below).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.funnel_events TO service_role;
DROP POLICY IF EXISTS funnel_events_svc ON public.funnel_events;
CREATE POLICY funnel_events_service_only
  ON public.funnel_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY funnel_events_admin_select
  ON public.funnel_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 4. BLOCKER 2 FIX (round-2 review): close the SECURITY DEFINER
--    alternate-access path into usage_counters.
--
--    Enumerated via:
--      SELECT p.oid::regprocedure AS function_signature, p.prosecdef,
--             p.proconfig, pg_get_userbyid(p.proowner) AS owner,
--             pg_get_function_identity_arguments(p.oid) AS identity_arguments
--      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public' AND p.proname = 'charge_free_analysis';
--
--    Two confirmed overloads, both SECURITY DEFINER, both writing to
--    usage_counters regardless of that table's REVOKE above (SECURITY
--    DEFINER bypasses the caller's table grants entirely):
--
--      charge_free_analysis(text)                -- NOT actually created by
--                                                    any tracked migration
--                                                    (corrected 2026-08-10:
--                                                    the "introduced
--                                                    20260610171342" claim
--                                                    below was wrong -- that
--                                                    migration only creates
--                                                    the (text, boolean)
--                                                    overload; confirmed via
--                                                    direct read). Exists in
--                                                    production only via
--                                                    out-of-band creation --
--                                                    same class as several
--                                                    other functions/tables
--                                                    found missing from
--                                                    tracked history this
--                                                    session. REVOKE/ALTER
--                                                    below are guarded
--                                                    accordingly;
--                                                    missing search_path;
--                                                    explicitly re-granted
--                                                    anon/authenticated/
--                                                    service_role EXECUTE in
--                                                    20260613022816 under an
--                                                    "intentionally public"
--                                                    bucket that did not
--                                                    actually apply to it --
--                                                    no live caller exists
--                                                    anywhere in src/ or
--                                                    supabase/functions/.
--      charge_free_analysis(text, boolean)       -- introduced 20260610171342
--                                                    with SET search_path TO
--                                                    'public' and a p_dry_run
--                                                    branch; only ever
--                                                    granted to service_role;
--                                                    also has zero live
--                                                    callers.
--
--    Neither overload has a real caller (confirmed by grep across src/ and
--    supabase/functions/ -- only the auto-generated types.ts references the
--    name). Per the review's instruction to retain-but-revoke rather than
--    drop during an emergency remediation (removal needs a separate
--    migration-dependency pass), both overloads are kept, EXECUTE is fully
--    revoked from PUBLIC/anon/authenticated, and neither is re-granted to
--    service_role -- no server workflow was found that needs it. If one is
--    later found to be required, grant EXECUTE to service_role explicitly
--    in a follow-up migration with a comment naming the caller.
-- ============================================================

-- Fixed 2026-08-10: charge_free_analysis(text) is not created by any
-- tracked migration (confirmed by grep and by directly reading
-- 20260610171342, which only creates the (text, boolean) overload) -- it
-- exists in production only via out-of-band creation. Guarded with this
-- repo's own established EXCEPTION WHEN undefined_function idiom (see the
-- "Maintenance / cleanup" block in 20260613022816_...sql) so a fresh
-- database replay doesn't abort on a function that may not exist there.
-- The (text, boolean) overload IS genuinely created by 20260610171342, so
-- its REVOKE/ALTER stay unguarded -- confirmed to always exist by this
-- point in the chain.
DO $$
BEGIN
  REVOKE ALL ON FUNCTION public.charge_free_analysis(text) FROM PUBLIC, anon, authenticated, service_role;
  ALTER FUNCTION public.charge_free_analysis(text) SET search_path = public, pg_temp;
EXCEPTION WHEN undefined_function THEN
  RAISE NOTICE 'charge_free_analysis(text) does not exist on this database -- skipping (out-of-band-only function, not in tracked migration history)';
END $$;

REVOKE ALL ON FUNCTION public.charge_free_analysis(text, boolean) FROM PUBLIC, anon, authenticated, service_role;
ALTER FUNCTION public.charge_free_analysis(text, boolean) SET search_path = public, pg_temp;

-- ============================================================
-- 5. Added 2026-08-10: missing service_role table grants, found via this
--    exact isolated CI replay ("permission denied for table analyses",
--    42501). RLS bypassrls (which service_role has) only skips row-level
--    policies -- it does not confer table-level SELECT/INSERT/UPDATE/DELETE,
--    a separate Postgres privilege that must be granted explicitly. Every
--    table this branch's own edge functions and this suite's service-role
--    seeding write to was checked; the four below (plus public.analyses,
--    fixed at its origin migration 20251127185736) had never received an
--    explicit service_role grant anywhere in tracked history and relied
--    entirely on ambient default privileges that do not reliably apply on a
--    fresh `supabase db reset` replay. Production evidently has these
--    already (the live app's invoice/export/share/referral/funnel-logging
--    paths all work), so this is additive and safe everywhere.
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.export_jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.shared_reports TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.referral_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO service_role;
