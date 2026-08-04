-- ROLLBACK for 20260804000000_p0_access_control_hardening.sql
-- Restores the exact pre-migration state (proven via 01_RAW_POLICY_EVIDENCE.sql):
-- every one of the 10 tables back to a single PERMISSIVE policy,
-- roles={public}, cmd=ALL, qual=true, with_check=true, plus full
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE grants to anon and authenticated.
--
-- This restores the vulnerability. Only run this if the migration causes a
-- real regression that must be reverted immediately while a fix is
-- prepared -- not as a routine operation.

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
