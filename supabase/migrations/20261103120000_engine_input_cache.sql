-- Same idea, same numbers (2026-11-03).
--
-- analyze-business feeds the narrator's revenue / price / investment
-- estimates into the engine when the user types no numbers, and an LLM
-- estimates differently on every call: the same HVAC idea gave $15.1k and
-- then $32.1k monthly net in production. The first run's engine inputs are
-- stored here, keyed by a SHA-256 of the normalized idea, location, detected
-- industry and typed numbers (see analyze-business/engine-inputs.ts), and a
-- repeat run reuses them.
--
-- Privacy: only the hash is stored, never the idea or location text.
-- ACCESS MODEL: service role only (the analyze-business edge function).
-- RLS is on with no policies, and anon/authenticated have no grants.

CREATE TABLE IF NOT EXISTS public.engine_input_cache (
  cache_key text PRIMARY KEY CHECK (cache_key ~ '^[0-9a-f]{64}$'),
  -- {mrr, startup_investment, average_check, ltv}: numbers or null
  inputs jsonb NOT NULL CHECK (jsonb_typeof(inputs) = 'object'),
  source text NOT NULL CHECK (source IN ('narrator', 'industry_default')),
  industry_id text NOT NULL,
  input_version smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_input_cache ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.engine_input_cache FROM anon, authenticated;
GRANT SELECT, INSERT ON public.engine_input_cache TO service_role;

COMMENT ON TABLE public.engine_input_cache IS
  'analyze-business: first-run engine inputs per normalized idea+location+industry+typed numbers (hash only), so the same idea gives the same numbers. Service role only.';
