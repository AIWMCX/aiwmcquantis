CREATE TABLE public.tier_qa_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','passed','failed','error')),
  tier TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('cron','manual','ci')),
  total_cases INTEGER NOT NULL DEFAULT 0,
  passed_cases INTEGER NOT NULL DEFAULT 0,
  failed_cases INTEGER NOT NULL DEFAULT 0,
  pass_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tier_qa_runs_started_at ON public.tier_qa_runs (started_at DESC);
CREATE INDEX idx_tier_qa_runs_status ON public.tier_qa_runs (status, started_at DESC);

ALTER TABLE public.tier_qa_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read tier_qa_runs"
  ON public.tier_qa_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages tier_qa_runs"
  ON public.tier_qa_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
