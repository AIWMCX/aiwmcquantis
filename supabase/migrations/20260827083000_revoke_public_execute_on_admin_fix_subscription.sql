-- P0 security fix: admin_fix_subscription(text, text, text, integer) had no
-- authorization check at all (no has_role()/is_service_role() guard,
-- unlike its sibling admin_force_sync_subscription, which correctly gates
-- on has_role(auth.uid(), 'admin')), and PostgREST/GraphQL granted EXECUTE
-- to anon by default.
--
-- Live impact confirmed before this fix: any unauthenticated caller could
-- invoke this RPC with an arbitrary user's email and mint themselves (or
-- overwrite anyone) a paid subscription/trial, completely bypassing Stripe.
--
-- This migration codifies a REVOKE already applied directly in production
-- (2026-08-27, user-authorized emergency response) so it survives a future
-- `supabase db reset` or fresh environment provision instead of being an
-- undocumented hotfix. service_role is untouched -- legitimate internal
-- admin tooling using the service key can still call this function; only
-- the anon/authenticated/PUBLIC execution paths are closed.
--
-- Related: PR #26 ("security(P0): effective-access remediation for 10
-- exposed tables") is a broader, still-draft remediation effort covering
-- a different set of functions/tables. This fix is scoped narrowly to the
-- one function found to be actively exploitable during a live security
-- advisor review on 2026-08-27.

REVOKE EXECUTE ON FUNCTION public.admin_fix_subscription(text, text, text, integer)
  FROM PUBLIC, anon, authenticated;
