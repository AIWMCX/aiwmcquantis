-- =============================================================================
-- RVCE telemetry on analyses + analysis_complete observability event
--
-- Audit 2026-06-20 findings D6.1 + D7.3:
--   D6.1 — RVCE observation telemetry not persisted on `analyses`. Cannot answer
--          "does RVCE actually render observations for users?" from the DB
--          without inspecting each result blob. Add explicit columns.
--   D7.3 — 1,846 funnel events in 30 days produced 1 analysis. The funnel is
--          tracking pageviews/clicks but never the completion event. Add a
--          dedicated table that is one row per completed analysis, with the
--          fields needed to compute ok-rate, degraded-rate, p50/p95 latency,
--          and cost/analysis at any time without joining 4 tables.
-- =============================================================================

-- ---- 1. RVCE telemetry columns on analyses ----------------------------------
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS rvce_observation_count integer
    DEFAULT 0
    CHECK (rvce_observation_count >= 0),
  ADD COLUMN IF NOT EXISTS rvce_status text
    CHECK (rvce_status IN ('observed', 'no_data', 'unavailable', 'skipped')),
  ADD COLUMN IF NOT EXISTS rvce_tavily_queries integer
    DEFAULT 0
    CHECK (rvce_tavily_queries >= 0),
  ADD COLUMN IF NOT EXISTS rvce_latency_ms integer
    CHECK (rvce_latency_ms IS NULL OR rvce_latency_ms >= 0);

COMMENT ON COLUMN public.analyses.rvce_observation_count IS
  'Number of RVCE observations rendered to the user. 0 with status=no_data means honest NO_DATA, not silently dropped.';
COMMENT ON COLUMN public.analyses.rvce_status IS
  'Final RVCE outcome: observed = ≥5 obs rendered; no_data = <5 obs, NO_DATA badge shown; unavailable = transport failed/timeout; skipped = tier did not request RVCE.';
COMMENT ON COLUMN public.analyses.rvce_tavily_queries IS
  'Number of Tavily search queries fired (deterministic transport). 0 with status=observed means the LLM-decides-to-search path was used instead — a Forensic-Issue signal.';
COMMENT ON COLUMN public.analyses.rvce_latency_ms IS
  'Wall-clock latency of the RVCE step in milliseconds. Used for the 20s tier budget enforcement.';

-- ---- 2. analysis_complete observability event -------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_complete_events (
  id              bigserial PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now(),
  analysis_id     uuid REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  tier            text NOT NULL CHECK (tier IN ('free', 'plus', 'pro')),
  ok              boolean NOT NULL,
  degraded        boolean NOT NULL DEFAULT false,
  reason          text,
  layer_latency_ms jsonb NOT NULL DEFAULT '{}'::jsonb,
  benchmark_match_type text CHECK (benchmark_match_type IN ('exact', 'sector', 'fallback', 'engine_fallback', 'none')),
  tokens_input    integer DEFAULT 0 CHECK (tokens_input >= 0),
  tokens_output   integer DEFAULT 0 CHECK (tokens_output >= 0),
  cost_usd        numeric(10, 6) DEFAULT 0 CHECK (cost_usd >= 0),
  rvce_status     text CHECK (rvce_status IN ('observed', 'no_data', 'unavailable', 'skipped')),
  rvce_observation_count integer DEFAULT 0 CHECK (rvce_observation_count >= 0),
  total_latency_ms integer CHECK (total_latency_ms IS NULL OR total_latency_ms >= 0)
);

COMMENT ON TABLE public.analysis_complete_events IS
  'One row per completed analysis. The canonical observability spine — every dashboard / cost-per-analysis / ok-rate query reads from here. See audit 2026-06-20 D7.3.';

CREATE INDEX IF NOT EXISTS idx_analysis_complete_events_created_at
  ON public.analysis_complete_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_complete_events_tier_ok
  ON public.analysis_complete_events (tier, ok, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_complete_events_user_id
  ON public.analysis_complete_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ---- 3. RLS ------------------------------------------------------------------
ALTER TABLE public.analysis_complete_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own events; admins can read all (via has_role).
DROP POLICY IF EXISTS analysis_complete_events_read_own ON public.analysis_complete_events;
CREATE POLICY analysis_complete_events_read_own
  ON public.analysis_complete_events
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Only the service role (edge functions) inserts; no client INSERTs allowed.
-- (No INSERT policy → INSERTs from anon/authenticated blocked by RLS.)

GRANT SELECT ON public.analysis_complete_events TO authenticated;
GRANT INSERT, SELECT ON public.analysis_complete_events TO service_role;
