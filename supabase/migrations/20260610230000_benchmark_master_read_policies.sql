-- Benchmark master tables: RLS was enabled with ZERO policies, so every
-- frontend (anon/authenticated) SELECT returned 0 rows and the Benchmark
-- Citations panel fell back to "Estimated · No direct benchmark" for every
-- metric. Edge functions were unaffected (service role bypasses RLS), which
-- is why PDF/CSV exports cited exact matches while the UI showed fallbacks.
--
-- The benchmark dataset is aggregate, non-personal market data — it is the
-- product's public selling point. Read-only access for all client roles;
-- writes remain service-role-only (no INSERT/UPDATE/DELETE policies).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'benchmark_master_core',
    'benchmark_master_unit_econ',
    'benchmark_master_geo',
    'benchmark_master_risk',
    'benchmark_master_invoice'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Public read access" ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t
    );
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
  END LOOP;
END $$;
