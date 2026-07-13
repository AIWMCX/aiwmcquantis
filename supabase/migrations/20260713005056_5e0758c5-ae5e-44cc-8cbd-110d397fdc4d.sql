
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
