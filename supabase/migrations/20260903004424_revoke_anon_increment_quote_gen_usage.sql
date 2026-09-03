-- P0 security hardening, follow-up to Track A (20260814120000) and the
-- fourth-wave low-severity sweep (20260827092000).
--
-- Track A revoked anon EXECUTE on decrement_quote_gen_usage() but never
-- covered its sibling increment_quote_gen_usage() -- confirmed live
-- (pg_proc.proacl) still carries an anon=X grant, one of the two
-- "flagged, not yet fixed" items from the 2026-08-27 canonical register.
--
-- Severity: low. The function is already NULL-safe -- for an anonymous
-- caller (auth.uid() IS NULL) it returns an inert
-- {ok:false, reason:'plan_tier', planTier:'free', ...} jsonb and never
-- reads or writes any real user's quote_gen_usage row (confirmed by
-- reading the live function body via pg_get_functiondef before writing
-- this migration). This is excess privilege, not an active exploit --
-- closed for defense-in-depth and to match the already-established
-- precedent for the sibling function, not because of an observed leak.
--
-- Least-privilege re-verified: sole caller is
-- src/services/serviceJob.ts's assertAndConsumeQuoteGenQuota(), invoked
-- only under an authenticated Supabase client session. No service_role
-- caller exists (grepped supabase/functions/, zero matches), so no
-- service_role grant is added here.
--
-- Additive and idempotent: REVOKE is a no-op if the privilege isn't
-- held. No table or row is touched, no function body changes.

DO $$
BEGIN
  RAISE NOTICE 'PRECONDITION -- anon can execute increment_quote_gen_usage(): %',
    has_function_privilege('anon', 'public.increment_quote_gen_usage()', 'EXECUTE');
END $$;

REVOKE EXECUTE ON FUNCTION public.increment_quote_gen_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_quote_gen_usage() TO authenticated;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.increment_quote_gen_usage()', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still execute increment_quote_gen_usage()';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.increment_quote_gen_usage()', 'EXECUTE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: authenticated lost EXECUTE on increment_quote_gen_usage() -- would break src/services/serviceJob.ts';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: increment_quote_gen_usage() correctly authenticated-only, anon denied';
END $$;
