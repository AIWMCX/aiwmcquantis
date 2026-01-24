-- Fix profiles_secure view: Recreate with security_invoker and row filter
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
SELECT 
  id,
  created_at,
  updated_at,
  full_name,
  -- Only show phone for the authenticated user viewing their own record
  -- Use get_my_phone() RPC for actual decryption with rate limiting
  CASE 
    WHEN auth.uid() = id THEN '[use get_my_phone() to retrieve]'
    ELSE NULL
  END AS phone
FROM public.profiles
WHERE auth.uid() = id;  -- Built-in row-level filter

COMMENT ON VIEW public.profiles_secure IS 'Secure view for profiles with built-in RLS filter. Uses security_invoker=on to inherit base table RLS. Use get_my_phone() RPC for decrypted phone.';

-- Fix subscriptions_public view: Recreate with security_invoker and row filter
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
FROM public.subscriptions
WHERE auth.uid() = user_id;  -- Only show user's own subscription

COMMENT ON VIEW public.subscriptions_public IS 'Public-safe subscription view excluding Stripe IDs. Uses security_invoker=on with built-in user filter.';

-- Fix admin_metrics view: Recreate with admin-only access via security_invoker
DROP VIEW IF EXISTS public.admin_metrics;

CREATE VIEW public.admin_metrics
WITH (security_invoker = on)
AS
SELECT 
  (SELECT count(*) FROM auth.users)::integer AS total_users,
  (SELECT count(*) FROM public.analyses)::integer AS total_analyses,
  (SELECT count(*) FROM public.subscriptions WHERE plan_id = 'plus' AND status = 'active')::integer AS plus_subscribers,
  (SELECT count(*) FROM public.subscriptions WHERE plan_id = 'free' OR plan_id IS NULL)::integer AS free_users,
  (SELECT count(*) FROM public.analyses WHERE created_at > now() - interval '30 days')::integer AS monthly_analyses,
  (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days')::integer AS weekly_signups,
  (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days')::integer AS monthly_signups
WHERE has_role(auth.uid(), 'admin');  -- Only admins can see metrics

COMMENT ON VIEW public.admin_metrics IS 'Admin-only business metrics. Requires admin role via has_role() check.';

-- Grant appropriate permissions
GRANT SELECT ON public.profiles_secure TO authenticated;
GRANT SELECT ON public.subscriptions_public TO authenticated;
GRANT SELECT ON public.admin_metrics TO authenticated;

-- Revoke from anon to be explicit
REVOKE ALL ON public.profiles_secure FROM anon;
REVOKE ALL ON public.subscriptions_public FROM anon;
REVOKE ALL ON public.admin_metrics FROM anon;