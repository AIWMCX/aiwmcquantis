
-- 1) Public read on analysis reference-case tables (benchmark data)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'analysis_break_even','analysis_burn_runway','analysis_cash_flow','analysis_dcf',
    'analysis_dscr_credit','analysis_edge_cases','analysis_monte_carlo','analysis_pre_mortem',
    'analysis_scenario','analysis_tam_sam_som','analysis_unit_economics'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Public read access" ON public.%I FOR SELECT USING (true)', t);
  END LOOP;
END $$;

-- 2) document_downloads: add PERMISSIVE policies for authenticated users
CREATE POLICY "Authenticated can insert own downloads"
ON public.document_downloads
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated can view own downloads"
ON public.document_downloads
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
