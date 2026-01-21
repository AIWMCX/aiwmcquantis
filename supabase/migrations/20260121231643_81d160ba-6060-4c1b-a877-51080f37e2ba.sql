-- Drop and recreate subscriptions_public view with built-in security
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
FROM public.subscriptions
WHERE auth.uid() = user_id;

-- Add comment explaining security
COMMENT ON VIEW public.subscriptions_public IS 'Secure view of subscriptions - only returns current user data, excludes Stripe internal IDs';

-- Similarly fix profiles_secure view
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS 
SELECT 
  id,
  full_name,
  CASE 
    WHEN public.can_access_pii(id) THEN public.decrypt_pii(phone_encrypted)::text
    ELSE NULL
  END as phone,
  created_at,
  updated_at
FROM public.profiles
WHERE auth.uid() = id;

COMMENT ON VIEW public.profiles_secure IS 'Secure view of profiles - only returns current user data with PII access controls';

-- Fix admin_metrics view - restrict to admin role only
DROP VIEW IF EXISTS public.admin_metrics;

CREATE VIEW public.admin_metrics 
WITH (security_invoker = true)
AS 
SELECT 
  (SELECT COUNT(*)::integer FROM public.profiles) AS total_users,
  (SELECT COUNT(*)::integer FROM public.analyses) AS total_analyses,
  (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status IN ('active', 'trialing') AND plan_id = 'plus') AS plus_subscribers,
  (SELECT COUNT(*)::integer FROM public.subscriptions WHERE status = 'active' AND plan_id = 'free') AS free_users,
  (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking WHERE month_year = to_char(now(), 'YYYY-MM')) AS monthly_analyses,
  (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= now() - interval '7 days') AS weekly_signups,
  (SELECT COUNT(*)::integer FROM public.profiles WHERE created_at >= now() - interval '30 days') AS monthly_signups
WHERE public.has_role(auth.uid(), 'admin');

COMMENT ON VIEW public.admin_metrics IS 'Admin-only business metrics view - requires admin role';