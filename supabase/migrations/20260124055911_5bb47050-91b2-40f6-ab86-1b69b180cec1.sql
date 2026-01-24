-- Fix 1: Recreate profiles_secure view with security_invoker and proper filtering
DROP VIEW IF EXISTS public.profiles_secure;
CREATE VIEW public.profiles_secure
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.created_at,
  p.updated_at,
  CASE 
    WHEN auth.uid() = p.id THEN '***-***-****' -- Masked for owner, use RPC for actual
    ELSE NULL 
  END as phone,
  p.full_name
FROM public.profiles p
WHERE auth.uid() = p.id; -- Only show own profile

-- Revoke all access from anon
REVOKE ALL ON public.profiles_secure FROM anon;
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Fix 2: Recreate subscriptions_public view with security_invoker and proper filtering
DROP VIEW IF EXISTS public.subscriptions_public;
CREATE VIEW public.subscriptions_public
WITH (security_invoker = on)
AS
SELECT 
  s.id,
  s.user_id,
  s.current_period_start,
  s.current_period_end,
  s.created_at,
  s.updated_at,
  s.plan_id,
  s.status
FROM public.subscriptions s
WHERE auth.uid() = s.user_id; -- Only show own subscription

-- Revoke all access from anon
REVOKE ALL ON public.subscriptions_public FROM anon;
GRANT SELECT ON public.subscriptions_public TO authenticated;

-- Fix 3: Recreate admin_metrics view with security_invoker and admin-only access
DROP VIEW IF EXISTS public.admin_metrics;
CREATE VIEW public.admin_metrics
WITH (security_invoker = on)
AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles)::integer as total_users,
  (SELECT COUNT(*) FROM public.analyses)::integer as total_analyses,
  (SELECT COUNT(*) FROM public.subscriptions WHERE plan_id = 'plus' AND status = 'active')::integer as plus_subscribers,
  (SELECT COUNT(*) FROM public.subscriptions WHERE plan_id = 'free' OR status != 'active')::integer as free_users,
  (SELECT COUNT(*) FROM public.analyses WHERE created_at > NOW() - INTERVAL '30 days')::integer as monthly_analyses,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '7 days')::integer as weekly_signups,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '30 days')::integer as monthly_signups
WHERE has_role(auth.uid(), 'admin'); -- Admin only

-- Revoke all access from anon and restrict to authenticated admins
REVOKE ALL ON public.admin_metrics FROM anon;
GRANT SELECT ON public.admin_metrics TO authenticated;