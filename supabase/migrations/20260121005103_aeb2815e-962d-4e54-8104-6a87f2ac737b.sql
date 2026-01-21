-- =====================================================
-- CRITICAL SECURITY FIX: Phone Numbers & Payment Data
-- =====================================================

-- PART 1: Fix profiles table - add permissive SELECT policy
-- Currently only has restrictive policies, need a permissive one

-- First check and drop any existing permissive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create permissive policy for users to view ONLY their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- PART 2: Secure the profiles_secure VIEW
-- Views don't have RLS, so we secure by revoking direct access

-- Revoke all access from anon and authenticated
REVOKE ALL ON public.profiles_secure FROM anon;
REVOKE ALL ON public.profiles_secure FROM authenticated;

-- Grant SELECT only to authenticated, but the view uses SECURITY INVOKER
-- which means RLS from base table (profiles) is enforced
GRANT SELECT ON public.profiles_secure TO authenticated;

-- PART 3: Secure the subscriptions_public VIEW
-- This view exposes subscription data - secure it

REVOKE ALL ON public.subscriptions_public FROM anon;
REVOKE ALL ON public.subscriptions_public FROM authenticated;

-- Recreate the view with SECURITY INVOKER to enforce base table RLS
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
  -- EXCLUDES: stripe_customer_id, stripe_subscription_id (sensitive)
FROM public.subscriptions
WHERE auth.uid() = user_id;  -- Additional filter in view

-- Grant access to authenticated only
GRANT SELECT ON public.subscriptions_public TO authenticated;

-- PART 4: Secure admin_metrics VIEW
-- This contains business intelligence - admin only

REVOKE ALL ON public.admin_metrics FROM anon;
REVOKE ALL ON public.admin_metrics FROM authenticated;

-- Don't grant any direct access - force use of get_admin_metrics() RPC
-- which has admin role check built in

-- PART 5: Add explicit deny for anon on profiles
DROP POLICY IF EXISTS "Deny all anon access to profiles" ON public.profiles;
CREATE POLICY "Deny all anon access to profiles"
ON public.profiles AS RESTRICTIVE
FOR ALL TO anon
USING (false);

-- PART 6: Ensure subscriptions base table blocks non-owners
-- Add a permissive policy that allows users to see only their own
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add comments documenting security measures
COMMENT ON VIEW public.profiles_secure IS 
'Secure view for profile data. Uses SECURITY INVOKER to enforce profiles table RLS. Phone numbers are decrypted only for the owning user.';

COMMENT ON VIEW public.subscriptions_public IS
'Public-safe subscription view. Excludes stripe_customer_id and stripe_subscription_id. Users can only see their own subscription.';

COMMENT ON VIEW public.admin_metrics IS
'Admin-only metrics view. Direct access revoked. Use get_admin_metrics() RPC with admin role check.';

COMMENT ON COLUMN public.profiles.phone IS 
'DEPRECATED: Do not use directly. All phone data stored encrypted in phone_encrypted column. Access via profiles_secure view or get_my_phone() RPC.';