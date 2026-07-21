-- QOC Audit Trail: structured per-stage tracing for every analysis run.
-- Each row = one stage (preflight, dedupe, engine, narrate, verify).
-- A correlation_id ties all stages of a single run together.

CREATE TABLE IF NOT EXISTS public.qoc_audit (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  correlation_id TEXT       NOT NULL,
  analysis_id   UUID       REFERENCES public.analyses(id) ON DELETE SET NULL,
  user_id       UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  stage         TEXT       NOT NULL CHECK (stage IN ('preflight', 'dedupe', 'engine', 'narrate', 'verify')),
  ok            BOOLEAN    NOT NULL DEFAULT true,
  duration_ms   INTEGER,
  detail        JSONB      NOT NULL DEFAULT '{}',
  error_message TEXT
);

-- Fast lookups
CREATE INDEX idx_qoc_audit_correlation ON public.qoc_audit (correlation_id);
CREATE INDEX idx_qoc_audit_analysis    ON public.qoc_audit (analysis_id) WHERE analysis_id IS NOT NULL;
CREATE INDEX idx_qoc_audit_user_stage  ON public.qoc_audit (user_id, stage, created_at DESC);
CREATE INDEX idx_qoc_audit_created     ON public.qoc_audit (created_at DESC);

-- RLS: users see own rows only; service role sees all
ALTER TABLE public.qoc_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own qoc_audit rows"
  ON public.qoc_audit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on qoc_audit"
  ON public.qoc_audit FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Cleanup: auto-delete rows older than 90 days (run via pg_cron or manual)
-- SELECT cron.schedule('cleanup_qoc_audit', '0 3 * * 0', $$DELETE FROM public.qoc_audit WHERE created_at < now() - interval '90 days'$$);

COMMENT ON TABLE public.qoc_audit IS 'Per-stage structured trace for every QOC analysis run. correlation_id groups all stages of one run.';
