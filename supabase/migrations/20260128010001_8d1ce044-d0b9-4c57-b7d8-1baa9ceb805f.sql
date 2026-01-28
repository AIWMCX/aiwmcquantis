-- Revoke all access from anon and public roles on subscriptions_public view
REVOKE ALL ON public.subscriptions_public FROM anon;
REVOKE ALL ON public.subscriptions_public FROM public;

-- Recreate the view with security_invoker and strict user filtering
DROP VIEW IF EXISTS public.subscriptions_public;

CREATE VIEW public.subscriptions_public
WITH (security_invoker = on)
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
  -- Explicitly excludes: stripe_customer_id, stripe_subscription_id (sensitive)
FROM public.subscriptions
WHERE auth.uid() = user_id;  -- Users can ONLY see their own subscription

-- Revoke anon/public access after recreation
REVOKE ALL ON public.subscriptions_public FROM anon;
REVOKE ALL ON public.subscriptions_public FROM public;

-- Grant access ONLY to authenticated users (base table RLS provides additional protection)
GRANT SELECT ON public.subscriptions_public TO authenticated;