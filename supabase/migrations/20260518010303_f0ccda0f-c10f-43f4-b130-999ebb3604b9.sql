DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'analysis_edge_cases',
    'analysis_unit_economics',
    'analysis_monte_carlo',
    'analysis_tam_sam_som',
    'analysis_break_even',
    'analysis_scenario',
    'analysis_cash_flow',
    'analysis_dcf',
    'analysis_dscr_credit',
    'analysis_burn_runway',
    'analysis_pre_mortem'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN sample_size SET DEFAULT 95500', t);
    EXECUTE format('UPDATE public.%I SET sample_size = 95500 WHERE sample_size = 97500', t);
  END LOOP;
END $$;