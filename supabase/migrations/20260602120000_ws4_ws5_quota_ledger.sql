-- WS4: identity-keyed usage_counters + atomic charge_free_analysis
-- WS5: analysis_attempts observability ledger + health view

CREATE TABLE IF NOT EXISTS public.usage_counters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key  text NOT NULL,
  tier          text NOT NULL DEFAULT 'free',
  period_start  date NOT NULL DEFAULT date_trunc('month', now())::date,
  analyses_used int  NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_key, period_start)
);
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_counters_self ON public.usage_counters;
CREATE POLICY usage_counters_self ON public.usage_counters FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.analysis_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  text NOT NULL UNIQUE,
  identity_key     text NOT NULL,
  tier             text NOT NULL DEFAULT 'free',
  status           text NOT NULL DEFAULT 'pending',
  degraded         boolean NOT NULL DEFAULT false,
  reason           text,
  claude_attempts  int NOT NULL DEFAULT 0,
  latency_ms       int,
  result_json      jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);
ALTER TABLE public.analysis_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analysis_attempts_self ON public.analysis_attempts;
CREATE POLICY analysis_attempts_self ON public.analysis_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_analysis_attempts_identity ON public.analysis_attempts(identity_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_attempts_idem ON public.analysis_attempts(idempotency_key);

CREATE OR REPLACE FUNCTION public.charge_free_analysis(p_identity text)
RETURNS TABLE(allowed boolean, used int, remaining int)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_limit  int  := 5;
  v_used   int;
  v_period date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO public.usage_counters(identity_key, period_start, analyses_used)
    VALUES (p_identity, v_period, 0)
    ON CONFLICT (identity_key, period_start) DO NOTHING;

  UPDATE public.usage_counters
     SET analyses_used = analyses_used + 1, updated_at = now()
   WHERE identity_key = p_identity
     AND period_start = v_period
     AND analyses_used < v_limit
  RETURNING analyses_used INTO v_used;

  IF v_used IS NULL THEN
    SELECT analyses_used INTO v_used FROM public.usage_counters
      WHERE identity_key = p_identity AND period_start = v_period;
    RETURN QUERY SELECT false, v_used, GREATEST(v_limit - v_used, 0);
  ELSE
    RETURN QUERY SELECT true, v_used, GREATEST(v_limit - v_used, 0);
  END IF;
END$$;

CREATE OR REPLACE VIEW public.analysis_health AS
SELECT
  date_trunc('day', created_at)::date AS day,
  tier,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'succeeded') AS succeeded,
  COUNT(*) FILTER (WHERE degraded = true) AS degraded,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'succeeded') * 100.0 / NULLIF(COUNT(*), 0), 1) AS ok_rate_pct,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms
FROM public.analysis_attempts
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
