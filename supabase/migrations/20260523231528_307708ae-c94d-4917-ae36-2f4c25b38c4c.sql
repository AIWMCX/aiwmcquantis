CREATE TABLE IF NOT EXISTS public.rvce_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  variable TEXT NOT NULL,
  business_type TEXT,
  location TEXT,
  tier_cap INTEGER NOT NULL,
  evidence JSONB NOT NULL,
  observation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_rvce_cache_key ON public.rvce_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_rvce_cache_expires ON public.rvce_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_rvce_cache_variable ON public.rvce_cache(variable);

ALTER TABLE public.rvce_cache ENABLE ROW LEVEL SECURITY;

-- Server-only: no policies for authenticated/anon roles.
-- Service role bypasses RLS automatically. End users cannot read or write.

COMMENT ON TABLE public.rvce_cache IS 'RVCE fan-out evidence cache. Keyed by (variable,business_type,location,tier_cap). 24h TTL. Server-only via service role.';