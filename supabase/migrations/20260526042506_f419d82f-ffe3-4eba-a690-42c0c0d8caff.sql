DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'analysis_edge_cases','analysis_unit_economics','analysis_monte_carlo',
    'analysis_tam_sam_som','analysis_break_even','analysis_scenario',
    'analysis_cash_flow','analysis_dcf','analysis_dscr_credit',
    'analysis_burn_runway','analysis_pre_mortem'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated read access" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON public.%I', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Authenticated read access" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format(
      'CREATE POLICY "Service role full access" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;