CREATE TABLE IF NOT EXISTS public.accuracy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  vector_id UUID NOT NULL REFERENCES public.golden_test_vectors(id) ON DELETE CASCADE,
  vector_code TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  deviation_pct NUMERIC,
  expected JSONB NOT NULL DEFAULT '{}'::jsonb,
  actual JSONB NOT NULL DEFAULT '{}'::jsonb,
  failed_metrics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  latency_ms INTEGER,
  engine_version TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accuracy_runs_run_id ON public.accuracy_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_runs_vector_id ON public.accuracy_runs(vector_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_runs_created_at ON public.accuracy_runs(created_at DESC);

ALTER TABLE public.accuracy_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read accuracy_runs"
  ON public.accuracy_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert accuracy_runs"
  ON public.accuracy_runs FOR INSERT
  TO service_role
  WITH CHECK (true);