
-- Case Memory Library: stores snapshots of every analysis run
CREATE TABLE public.analysis_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  industry_id TEXT NOT NULL,
  location TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB NOT NULL,
  engine_version TEXT NOT NULL,
  benchmark_version TEXT,
  assumption_graph JSONB,
  sanity_flags JSONB,
  confidence_score NUMERIC,
  user_corrections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.analysis_cases ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to analysis_cases"
  ON public.analysis_cases
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Users can read their own cases
CREATE POLICY "Users can read own analysis_cases"
  ON public.analysis_cases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role has full access (for edge function inserts)
CREATE POLICY "Service role full access to analysis_cases"
  ON public.analysis_cases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for similar case lookups by industry
CREATE INDEX idx_analysis_cases_industry ON public.analysis_cases (industry_id);
CREATE INDEX idx_analysis_cases_user ON public.analysis_cases (user_id);
