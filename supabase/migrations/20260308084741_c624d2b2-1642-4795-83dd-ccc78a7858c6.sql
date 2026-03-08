
-- analysis_logs: structured event log
CREATE TABLE public.analysis_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analysis_logs_analysis_id ON public.analysis_logs(analysis_id);
CREATE INDEX idx_analysis_logs_event_created ON public.analysis_logs(event_type, created_at);

ALTER TABLE public.analysis_logs ENABLE ROW LEVEL SECURITY;

-- Deny anon
CREATE POLICY "analysis_logs_anon_deny" ON public.analysis_logs
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- Authenticated can insert own rows
CREATE POLICY "analysis_logs_insert_own" ON public.analysis_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can select all
CREATE POLICY "analysis_logs_admin_select" ON public.analysis_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypass (for edge functions)
CREATE POLICY "analysis_logs_service_role" ON public.analysis_logs
  FOR ALL TO authenticated USING (public.is_service_role()) WITH CHECK (public.is_service_role());

-- quality_metrics_daily: aggregated KPIs
CREATE TABLE public.quality_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  reconciliation_rate NUMERIC,
  avg_confidence_score NUMERIC,
  inconsistency_rate NUMERIC,
  avg_consensus_score NUMERIC,
  benchmark_coverage_rate NUMERIC,
  error_rate_by_code JSONB DEFAULT '{}'::jsonb,
  p50_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  p99_latency_ms NUMERIC,
  total_analyses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quality_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Deny anon
CREATE POLICY "quality_metrics_anon_deny" ON public.quality_metrics_daily
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- Admins can select
CREATE POLICY "quality_metrics_admin_select" ON public.quality_metrics_daily
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/update
CREATE POLICY "quality_metrics_service_insert" ON public.quality_metrics_daily
  FOR ALL TO authenticated USING (public.is_service_role()) WITH CHECK (public.is_service_role());
