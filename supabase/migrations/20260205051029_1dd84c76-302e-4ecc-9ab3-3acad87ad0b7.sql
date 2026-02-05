-- =========================================================
-- SECURITY HARDENING: Enable RLS on exposed views/tables
-- Fixes: profiles_secure, admin_metrics, subscriptions_public
-- =========================================================

-- NOTE: profiles_secure, admin_metrics, and subscriptions_public are VIEWs (not tables)
-- Views cannot have RLS policies directly applied to them.
-- We need to EITHER:
-- 1. Replace them with security-definer functions that check auth
-- 2. Make them materialize from tables with RLS
-- 3. Drop them if not needed

-- profiles_secure is a VIEW that decrypts PII - DROP IT
-- It defeats the purpose of encryption by exposing decrypted data
DROP VIEW IF EXISTS public.profiles_secure CASCADE;

-- admin_metrics is a VIEW that exposes business intelligence - DROP IT
-- Use the get_admin_metrics() function instead which has proper auth checks
DROP VIEW IF EXISTS public.admin_metrics CASCADE;

-- subscriptions_public is a VIEW that exposes subscription data - DROP IT  
-- The subscriptions table already has proper RLS, no need for a public view
DROP VIEW IF EXISTS public.subscriptions_public CASCADE;

-- Create a secure admin-only function for subscription overview
-- This replaces the insecure subscriptions_public view
CREATE OR REPLACE FUNCTION public.get_subscription_summary(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- If user_id provided, they can only see their own data
  IF p_user_id IS NOT NULL THEN
    -- User can only query their own subscription
    IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: Cannot view other users subscriptions';
    END IF;
    
    SELECT jsonb_build_object(
      'plan_id', plan_id,
      'status', status,
      'current_period_start', current_period_start,
      'current_period_end', current_period_end
    )
    INTO v_result
    FROM public.subscriptions
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_result, jsonb_build_object('plan_id', 'free', 'status', 'none'));
  END IF;
  
  -- Aggregate stats - admin only
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required for aggregate subscription data';
  END IF;
  
  SELECT jsonb_build_object(
    'total_subscriptions', COUNT(*),
    'active_plus', COUNT(*) FILTER (WHERE plan_id = 'plus' AND status = 'active'),
    'active_free', COUNT(*) FILTER (WHERE plan_id = 'free' AND status = 'active'),
    'trialing', COUNT(*) FILTER (WHERE status = 'trialing')
  )
  INTO v_result
  FROM public.subscriptions;
  
  RETURN v_result;
END;
$$;

-- Grant execute on the new function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_subscription_summary(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_subscription_summary IS 'Secure function to get subscription data. Users can only view their own subscription. Admins can get aggregate stats by calling with NULL.';
