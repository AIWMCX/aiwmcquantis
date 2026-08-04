-- ============================================================================
-- EMERGENCY REVERSION -- THIS SCRIPT REINTRODUCES CONFIRMED P0
-- UNAUTHORIZED ACCESS. EXECUTION REQUIRES INCIDENT-COMMANDER APPROVAL,
-- IMMEDIATE TRAFFIC CONTAINMENT, AND A TIME-BOXED FORWARD-FIX PLAN.
-- ============================================================================
--
-- Do NOT run this as a routine "undo." Running it puts production back into
-- the exact state proven exploitable in 02_EFFECTIVE_ACCESS_RESULTS.md: any
-- unauthenticated visitor can read/write/delete usage_counters,
-- analysis_attempts, invoices, leads, shared_reports, export_jobs,
-- quote_gen_usage, referral_codes, analysis_cases, and funnel_events using
-- only the public anon key.
--
-- BEFORE running this, prefer the safe operational fallback below, which
-- keeps deny-by-default access intact and only disables the specific
-- regressing workflow. Only fall through to this full reversion if the
-- regression cannot be isolated to one workflow and continuing to operate
-- with the hardened policies is genuinely worse than reopening the incident.
--
-- ============================================================================
-- SAFE OPERATIONAL FALLBACK (prefer this over full reversion)
-- ============================================================================
-- If exactly one workflow regresses post-deploy (e.g. an owner-scoped INSERT
-- policy is missing a required column), the safe fix is to ADD the missing
-- grant/policy for that one table, not to revert all ten tables to fully
-- open. Example pattern, if e.g. invoices needed an UPDATE path that wasn't
-- anticipated:
--
--   GRANT UPDATE ON TABLE public.invoices TO authenticated;
--   CREATE POLICY invoices_owner_update ON public.invoices
--     FOR UPDATE TO authenticated
--     USING (user_id = auth.uid())
--     WITH CHECK (user_id = auth.uid());
--
-- This preserves deny-by-default for every anon request and every other
-- authenticated user's rows, while unblocking the one real, legitimate gap.
-- Always attempt this path first; it never reopens the P0.
--
-- ============================================================================
-- FULL ROLLBACK (last resort only, per the warning above)
-- ============================================================================
-- Restores the exact pre-migration state (proven via 01_RAW_POLICY_EVIDENCE.sql):
-- every one of the 10 tables back to a single PERMISSIVE policy,
-- roles={public}, cmd=ALL, qual=true, with_check=true, plus full
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE grants to anon and authenticated.

-- usage_counters
DROP POLICY IF EXISTS usage_counters_service_only ON public.usage_counters;
CREATE POLICY usage_counters_self ON public.usage_counters FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.usage_counters TO anon, authenticated;

-- analysis_attempts
DROP POLICY IF EXISTS analysis_attempts_service_only ON public.analysis_attempts;
CREATE POLICY analysis_attempts_self ON public.analysis_attempts FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.analysis_attempts TO anon, authenticated;

-- leads
DROP POLICY IF EXISTS leads_service_only ON public.leads;
CREATE POLICY leads_svc ON public.leads FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.leads TO anon, authenticated;

-- quote_gen_usage
DROP POLICY IF EXISTS quote_gen_usage_service_only ON public.quote_gen_usage;
CREATE POLICY quote_gen_usage_svc ON public.quote_gen_usage FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.quote_gen_usage TO anon, authenticated;

-- analysis_cases
DROP POLICY IF EXISTS analysis_cases_service_only ON public.analysis_cases;
CREATE POLICY analysis_cases_svc ON public.analysis_cases FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.analysis_cases TO anon, authenticated;

-- invoices
DROP POLICY IF EXISTS invoices_owner_select ON public.invoices;
DROP POLICY IF EXISTS invoices_owner_insert ON public.invoices;
CREATE POLICY invoices_svc ON public.invoices FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.invoices TO anon, authenticated;

-- export_jobs
DROP POLICY IF EXISTS export_jobs_owner_all ON public.export_jobs;
CREATE POLICY export_jobs_svc ON public.export_jobs FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.export_jobs TO anon, authenticated;

-- shared_reports
DROP POLICY IF EXISTS shared_reports_owner_all ON public.shared_reports;
CREATE POLICY shared_reports_svc ON public.shared_reports FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.shared_reports TO anon, authenticated;

-- referral_codes
DROP POLICY IF EXISTS referral_codes_owner_select ON public.referral_codes;
CREATE POLICY referral_codes_svc ON public.referral_codes FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.referral_codes TO anon, authenticated;

-- funnel_events
DROP POLICY IF EXISTS funnel_events_service_only ON public.funnel_events;
DROP POLICY IF EXISTS funnel_events_admin_select ON public.funnel_events;
CREATE POLICY funnel_events_svc ON public.funnel_events FOR ALL USING (true) WITH CHECK (true);
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.funnel_events TO anon, authenticated;
