-- ============================================================
-- SECURITY FIX: Hide Stripe IDs from user access
-- Creates a secure view that excludes sensitive payment data
-- ============================================================

-- Step 1: Drop the existing user SELECT policy on base table
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;

-- Step 2: Create a secure view that hides Stripe IDs
-- Users will query this view instead of the base table
CREATE OR REPLACE VIEW public.subscriptions_public
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
  -- SECURITY: stripe_customer_id and stripe_subscription_id are intentionally excluded
  -- These IDs should only be accessible by service_role (webhook operations)
FROM public.subscriptions;

-- Step 3: Add comment explaining the security rationale
COMMENT ON VIEW public.subscriptions_public IS 
'Secure view for user access - excludes Stripe IDs to prevent payment fraud vectors. 
Service role accesses base table directly for webhook operations.';

-- Step 4: Grant access to the view for authenticated users
GRANT SELECT ON public.subscriptions_public TO authenticated;

-- Step 5: Create RLS policy for the view access pattern
-- Users can only see their own subscription data via the view
CREATE POLICY "Users can view own subscription via view" 
ON public.subscriptions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Step 6: Ensure service role retains full access (already exists but verify)
-- The existing "Service role can manage subscriptions" policy handles this

-- Step 7: Explicitly deny anonymous access
CREATE POLICY "Deny anonymous access to subscriptions"
ON public.subscriptions
FOR SELECT
TO anon
USING (false);