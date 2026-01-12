-- Fix Critical Security Vulnerability: Remove user INSERT policy on subscriptions
-- Only the Stripe webhook (via service_role) should be able to create/modify subscriptions

-- Drop the dangerous policy that allows users to create their own subscriptions
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- The existing policies are now:
-- 1. "Service role can manage subscriptions" - FOR ALL using is_service_role() (keeps Stripe webhook working)
-- 2. "Users can view own subscription" - FOR SELECT using auth.uid() = user_id (keeps frontend working)