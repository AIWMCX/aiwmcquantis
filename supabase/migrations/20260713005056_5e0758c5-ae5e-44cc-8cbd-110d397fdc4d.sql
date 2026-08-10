
-- 1. autoposter_credentials: explicit service_role full-access policy
DROP POLICY IF EXISTS "Service role manages autoposter credentials" ON public.autoposter_credentials;
CREATE POLICY "Service role manages autoposter credentials"
  ON public.autoposter_credentials
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Deny anon access to autoposter credentials" ON public.autoposter_credentials;
CREATE POLICY "Deny anon access to autoposter credentials"
  ON public.autoposter_credentials
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 2. gsc_verification: explicit anon deny + service_role manage
DROP POLICY IF EXISTS "Deny anon access to gsc_verification" ON public.gsc_verification;
CREATE POLICY "Deny anon access to gsc_verification"
  ON public.gsc_verification
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Service role manages gsc_verification" ON public.gsc_verification;
CREATE POLICY "Service role manages gsc_verification"
  ON public.gsc_verification
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RECONSTRUCTED 2026-08-10: quantis_learning_config was referenced by the
-- policies below but never created by any migration in this repo's tracked
-- history (confirmed by grep) -- same out-of-band-creation pattern found
-- repeatedly in this investigation (analysis_run_logs, rvce_cache,
-- analysis_self_learning). Reconstructed from
-- src/integrations/supabase/types.ts (real column names/nullability from
-- live schema introspection). created_by's exact default is INFERRED
-- (Insert marks it optional, meaning some default exists, likely
-- auth.uid() given the column name, but this isn't captured in generated
-- types) -- verify against production before fully trusting this migration.
CREATE TABLE IF NOT EXISTS public.quantis_learning_config (
  version integer PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT false,
  priors jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_hints jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  segments_count integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid NOT NULL DEFAULT auth.uid(), -- INFERRED default expression, verify
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quantis_learning_config ENABLE ROW LEVEL SECURITY;

-- 3. quantis_learning_config: explicit service_role write policy + anon deny
DROP POLICY IF EXISTS "Service role manages quantis_learning_config" ON public.quantis_learning_config;
CREATE POLICY "Service role manages quantis_learning_config"
  ON public.quantis_learning_config
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Deny anon access to quantis_learning_config" ON public.quantis_learning_config;
CREATE POLICY "Deny anon access to quantis_learning_config"
  ON public.quantis_learning_config
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
