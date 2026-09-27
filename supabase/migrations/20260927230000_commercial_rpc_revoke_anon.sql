-- Hardening (2026-09-27): Supabase security advisor flagged the Commercial
-- Ops SECURITY DEFINER RPCs as executable by `anon` (Postgres grants EXECUTE
-- to PUBLIC by default). Each function already raises 'not authorized'
-- unless has_role(auth.uid(), 'admin'), so this was not exploitable, but
-- these RPCs are only ever called by an authenticated admin through the
-- commercial-workflow edge function. Remove the anonymous path entirely.
REVOKE EXECUTE ON FUNCTION public.transition_prospect_stage(uuid, public.commercial_funnel_stage, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_commercial_followup(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_commercial_followup(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_commercial_followup_sent(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.transition_prospect_stage(uuid, public.commercial_funnel_stage, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_commercial_followup(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_commercial_followup(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_commercial_followup_sent(uuid) TO authenticated, service_role;
