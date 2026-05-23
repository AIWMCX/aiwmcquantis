-- RVCE validation log
CREATE TABLE IF NOT EXISTS public.rvce_validation_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id           UUID NOT NULL,
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rvce_version          TEXT NOT NULL DEFAULT 'rvce-0.1.0',
  global_confidence     NUMERIC(5,3),
  metrics_count         INT,
  outlier_count         INT DEFAULT 0,
  warn_count            INT DEFAULT 0,
  no_data_count         INT DEFAULT 0,
  total_observations    INT DEFAULT 0,
  reference_classes     JSONB,
  metrics_validation    JSONB,
  flags                 JSONB,
  evidence_samples      JSONB,
  latency_ms            INT,
  status                TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rvce_analysis ON public.rvce_validation_log(analysis_id);
CREATE INDEX IF NOT EXISTS idx_rvce_user ON public.rvce_validation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rvce_created ON public.rvce_validation_log(created_at DESC);

ALTER TABLE public.rvce_validation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rvce_read_own" ON public.rvce_validation_log;
CREATE POLICY "rvce_read_own"
  ON public.rvce_validation_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rvce_admin_read_all" ON public.rvce_validation_log;
CREATE POLICY "rvce_admin_read_all"
  ON public.rvce_validation_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role inserts via edge function; no anon/authenticated INSERT policy needed.

-- RVCE observation cache (server-side only, service role writes)
CREATE TABLE IF NOT EXISTS public.rvce_observation_cache (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric            TEXT NOT NULL,
  ref_class_id      TEXT NOT NULL,
  observation_value NUMERIC(14,2),
  source_url        TEXT,
  source_snippet    TEXT,
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_rvce_cache_metric_rc ON public.rvce_observation_cache(metric, ref_class_id);
CREATE INDEX IF NOT EXISTS idx_rvce_cache_expires ON public.rvce_observation_cache(expires_at);

ALTER TABLE public.rvce_observation_cache ENABLE ROW LEVEL SECURITY;

-- Cache is server-side only (edge function via service role). Admins can inspect.
DROP POLICY IF EXISTS "rvce_cache_admin_read" ON public.rvce_observation_cache;
CREATE POLICY "rvce_cache_admin_read"
  ON public.rvce_observation_cache
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));