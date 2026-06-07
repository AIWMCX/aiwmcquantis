
-- analysis_run_logs: restrict INSERT to service role only (this table is written by edge functions)
CREATE POLICY "Service role inserts run logs"
ON public.analysis_run_logs
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Block authenticated inserts on run logs"
ON public.analysis_run_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny anon access to run logs"
ON public.analysis_run_logs
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- doc_performance_signals: let users read their own signals
CREATE POLICY "Users read own doc signals"
ON public.doc_performance_signals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- rvce_cache: explicit deny for anon/authenticated, service_role full access
CREATE POLICY "Service role manages rvce cache"
ON public.rvce_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Deny anon access to rvce cache"
ON public.rvce_cache
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny authenticated writes to rvce cache"
ON public.rvce_cache
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
