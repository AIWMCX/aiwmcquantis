-- =============================================
-- FIX REMAINING SECURITY ISSUES
-- =============================================

-- Fix 1: admin_metrics view - Already secured via get_admin_metrics RPC
-- Just need to revoke any remaining access
REVOKE ALL ON public.admin_metrics FROM anon;
REVOKE ALL ON public.admin_metrics FROM authenticated;
GRANT SELECT ON public.admin_metrics TO authenticated;

-- Fix 2: subscriptions_public view - Enable RLS behavior
-- Recreate with security_invoker
DROP VIEW IF EXISTS public.subscriptions_public;
CREATE VIEW public.subscriptions_public 
WITH (security_invoker = on) AS
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
WHERE user_id = auth.uid();

-- Grant access only to authenticated users
GRANT SELECT ON public.subscriptions_public TO authenticated;
REVOKE ALL ON public.subscriptions_public FROM anon;