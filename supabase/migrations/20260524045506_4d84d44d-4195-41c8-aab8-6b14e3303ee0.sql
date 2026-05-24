-- Restrict analysis_jobs INSERT to authenticated users only (defense in depth)
DROP POLICY IF EXISTS "Users insert own analysis jobs" ON public.analysis_jobs;

CREATE POLICY "Users insert own analysis jobs"
ON public.analysis_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Explicit restrictive deny for anon role on INSERT
CREATE POLICY "Deny anon insert on analysis_jobs"
ON public.analysis_jobs
AS RESTRICTIVE
FOR INSERT
TO anon
WITH CHECK (false);