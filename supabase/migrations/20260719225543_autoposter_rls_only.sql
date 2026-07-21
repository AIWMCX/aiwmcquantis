-- Reconciliation file (2026-07-21): applied via the Supabase Management
-- API earlier this session under exactly this version/name, but no
-- matching local .sql file was ever committed -- confirmed via a
-- `supabase db push` failure flagging this version as "remote, no local
-- file". Content below is exactly what was applied at the time.
--
-- Originally scoped from a larger 3-table migration
-- (20260713005056_5e0758c5-....sql) that also touched gsc_verification and
-- quantis_learning_config -- both tables did not exist in production when
-- this was applied (confirmed via direct query), so only the
-- autoposter_credentials policies were actually run.

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
