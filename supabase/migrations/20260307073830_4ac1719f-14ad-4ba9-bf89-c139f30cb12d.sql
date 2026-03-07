
-- Industry distributions table for Bayesian market prior engine
CREATE TABLE public.industry_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naics_code text NOT NULL,
  segment text NOT NULL DEFAULT 'general',
  metric_name text NOT NULL,
  mean numeric NOT NULL,
  stddev numeric NOT NULL DEFAULT 0,
  p10 numeric,
  p25 numeric,
  median numeric,
  p75 numeric,
  p90 numeric,
  sample_size integer DEFAULT 50,
  source text DEFAULT 'benchmark_derived',
  last_updated timestamptz DEFAULT now(),
  UNIQUE(naics_code, segment, metric_name)
);

-- RLS
ALTER TABLE public.industry_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to industry_distributions"
  ON public.industry_distributions FOR ALL TO anon
  USING (false);

CREATE POLICY "Authenticated users can read industry_distributions"
  ON public.industry_distributions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role manages industry_distributions"
  ON public.industry_distributions FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());
