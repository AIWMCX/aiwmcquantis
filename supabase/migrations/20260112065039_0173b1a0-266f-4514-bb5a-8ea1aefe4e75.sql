-- Fix overly permissive RLS policy on subscriptions table
-- Drop the current permissive "Service role full access" policy
DROP POLICY IF EXISTS "Service role full access" ON public.subscriptions;

-- Create a proper service role policy using a security definer function
-- The service role check needs to be done differently since auth.role() doesn't work the same way

-- Enable leaked password protection (this is done via auth config, not SQL)
-- The SQL below fixes the RLS policy

-- For subscriptions, the service role access is handled by the supabase service key
-- We'll use a security definer function to check for privileged access patterns

-- Create a helper function to check if the request is from service role context
--
-- Fixed 2026-08-10: proven live-broken via an isolated CI replay -- a
-- non-admin authenticated user (real Supabase-issued JWT, role
-- 'authenticated') got 200 reading public.funnel_events, and
-- get_referral_stats(p_user_id) let user A successfully read user B's
-- stats despite its own internal `auth.uid() != p_user_id AND NOT
-- is_service_role()` guard. Root cause: the original second OR branch,
-- `current_setting('role', true) = 'service_role'`, reads the Postgres
-- session's `role` GUC (last SET ROLE), NOT the caller's JWT role claim.
-- Depending on how the Postgres connection pooler in front of PostgREST is
-- configured (session mode vs. per-request SET ROLE), that GUC can reflect
-- the pooler's own connection role rather than the authenticated caller's
-- role -- on this local/CI stack it silently made is_service_role() return
-- true for every caller, defeating every policy/function that depends on
-- it. Replaced with the same JWT-claims-GUC read Supabase's own built-in
-- auth.role() uses (request.jwt.claims, the single JSON GUC PostgREST
-- always sets per-request, not the legacy flattened
-- request.jwt.claim.role variant, which is empty on current PostgREST
-- versions anyway) -- the one signal that is reliably the actual caller's
-- role regardless of pooler topology.
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role',
    false
  )
$$;

-- Recreate the service role policy with proper check
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- Also fix usage_tracking - update the service role policy to use the same pattern
DROP POLICY IF EXISTS "Service role can manage all usage" ON public.usage_tracking;

CREATE POLICY "Service role can manage usage"
ON public.usage_tracking
FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());