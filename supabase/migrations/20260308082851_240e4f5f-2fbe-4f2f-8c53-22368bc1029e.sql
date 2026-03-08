
-- Versioned Benchmark Knowledge Store
CREATE TABLE public.benchmark_store (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_type TEXT NOT NULL,
  parameter     TEXT NOT NULL,
  geo_scope     TEXT NOT NULL DEFAULT 'us_national',
  p10           NUMERIC NOT NULL,
  p25           NUMERIC NOT NULL,
  p50           NUMERIC NOT NULL,
  p75           NUMERIC NOT NULL,
  p90           NUMERIC NOT NULL,
  unit          TEXT NOT NULL,
  source        TEXT NOT NULL,
  source_year   INTEGER NOT NULL,
  sample_size   INTEGER,
  notes         TEXT,
  version       INTEGER NOT NULL DEFAULT 1,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(industry_type, parameter, geo_scope, version)
);

CREATE INDEX idx_benchmark_store_active_lookup 
  ON public.benchmark_store(industry_type, parameter, geo_scope)
  WHERE is_active = true;

ALTER TABLE public.benchmark_store ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read benchmarks
CREATE POLICY "Authenticated users can read benchmarks"
  ON public.benchmark_store
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can modify benchmarks
CREATE POLICY "Admins can manage benchmarks"
  ON public.benchmark_store
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Deny anonymous access
CREATE POLICY "Deny anon access to benchmark_store"
  ON public.benchmark_store
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);
