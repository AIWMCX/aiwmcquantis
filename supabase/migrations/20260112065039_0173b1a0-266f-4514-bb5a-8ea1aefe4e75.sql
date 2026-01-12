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
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT current_setting('request.jwt.claim.role', true) = 'service_role'
    OR current_setting('role', true) = 'service_role'
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