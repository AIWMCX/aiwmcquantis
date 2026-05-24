CREATE TABLE public.analysis_run_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  user_id       uuid NULL,
  tier          text NOT NULL DEFAULT 'FREE',
  source        text NOT NULL DEFAULT 'web-app',
  sector        text,
  geo           text,
  model_type    text,
  status        text,
  engine_version text,
  rvce_version  text,
  financial_core jsonb NOT NULL DEFAULT '{}'::jsonb,
  pl36          jsonb NOT NULL DEFAULT '{}'::jsonb,
  monte_carlo   jsonb NOT NULL DEFAULT '{}'::jsonb,
  rvce          jsonb NOT NULL DEFAULT '{}'::jsonb,
  benchmarks    jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_summary  jsonb NOT NULL DEFAULT '{}'::jsonb,
  input         jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  inserted_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_run_logs_analysis_id_unique UNIQUE (analysis_id)
);

CREATE INDEX idx_analysis_run_logs_created_at ON public.analysis_run_logs (created_at DESC);
CREATE INDEX idx_analysis_run_logs_user_id ON public.analysis_run_logs (user_id);
CREATE INDEX idx_analysis_run_logs_tier ON public.analysis_run_logs (tier);
CREATE INDEX idx_analysis_run_logs_sector ON public.analysis_run_logs (sector);

ALTER TABLE public.analysis_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own run logs"
  ON public.analysis_run_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all run logs"
  ON public.analysis_run_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));