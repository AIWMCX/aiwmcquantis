-- Fix subscriptions_public view security
-- The view already has security_invoker = true, but we need to ensure
-- the underlying subscriptions table policies are properly applied

-- First, verify the view is using security invoker (recreate to be safe)
DROP VIEW IF EXISTS public.subscriptions_public;

CREATE VIEW public.subscriptions_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
FROM public.subscriptions;

-- Grant access to authenticated users (the RLS on subscriptions table will filter)
GRANT SELECT ON public.subscriptions_public TO authenticated;

-- Revoke from anon to be extra safe
REVOKE ALL ON public.subscriptions_public FROM anon;