CREATE POLICY "Deny anon select on analysis_jobs" ON public.analysis_jobs AS RESTRICTIVE FOR SELECT TO anon USING (false);

CREATE POLICY "Users can read their own entitlement denials" ON public.entitlement_denials FOR SELECT TO authenticated USING (auth.uid() = user_id);