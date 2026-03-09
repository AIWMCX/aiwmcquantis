
-- 1. Create data_provenance table
CREATE TABLE public.data_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text,
  license_type text NOT NULL,
  allowed_uses text[] DEFAULT '{}',
  restricted_uses text[] DEFAULT '{}',
  dataset_type text NOT NULL,
  coverage_description text,
  record_count integer,
  date_range_start date,
  date_range_end date,
  last_ingested_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.data_provenance ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated users can read provenance"
  ON public.data_provenance FOR SELECT
  TO authenticated
  USING (true);

-- Admin-only write
CREATE POLICY "Admins can insert provenance"
  ON public.data_provenance FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update provenance"
  ON public.data_provenance FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete provenance"
  ON public.data_provenance FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Deny anon
CREATE POLICY "Deny anon access to data_provenance"
  ON public.data_provenance FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Service role bypass
CREATE POLICY "Service role full access to data_provenance"
  ON public.data_provenance FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Create benchmark_sources table
CREATE TABLE public.benchmark_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_id uuid REFERENCES public.industry_benchmarks(id) ON DELETE CASCADE,
  provenance_id uuid REFERENCES public.data_provenance(id) ON DELETE CASCADE,
  weight numeric DEFAULT 1.0,
  metric_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.benchmark_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read benchmark_sources"
  ON public.benchmark_sources FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage benchmark_sources"
  ON public.benchmark_sources FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny anon access to benchmark_sources"
  ON public.benchmark_sources FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role full access to benchmark_sources"
  ON public.benchmark_sources FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Create training_cases table
CREATE TABLE public.training_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_name text NOT NULL,
  industry_id text NOT NULL,
  provenance_id uuid REFERENCES public.data_provenance(id),
  input_params jsonb NOT NULL,
  expected_outputs jsonb NOT NULL,
  actual_quantis_outputs jsonb,
  accuracy_score numeric,
  tags text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_tested_at timestamptz
);

ALTER TABLE public.training_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage training_cases"
  ON public.training_cases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Deny anon access to training_cases"
  ON public.training_cases FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Service role full access to training_cases"
  ON public.training_cases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Expand industry_benchmarks with percentile columns
ALTER TABLE public.industry_benchmarks
  ADD COLUMN IF NOT EXISTS gross_margin_p10 numeric,
  ADD COLUMN IF NOT EXISTS gross_margin_p25 numeric,
  ADD COLUMN IF NOT EXISTS gross_margin_p75 numeric,
  ADD COLUMN IF NOT EXISTS gross_margin_p90 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p10 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p25 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p75 numeric,
  ADD COLUMN IF NOT EXISTS net_margin_p90 numeric,
  ADD COLUMN IF NOT EXISTS revenue_volatility_pct numeric,
  ADD COLUMN IF NOT EXISTS survival_rate_1yr numeric,
  ADD COLUMN IF NOT EXISTS survival_rate_3yr numeric,
  ADD COLUMN IF NOT EXISTS source_count integer DEFAULT 1;
