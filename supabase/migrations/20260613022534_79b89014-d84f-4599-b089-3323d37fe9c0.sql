
CREATE POLICY "Deny anon access" ON public.analysis_self_learning
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON public.rvce_validation_log
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
