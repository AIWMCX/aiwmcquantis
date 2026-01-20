-- =====================================================
-- Pro Tier Removal Migration
-- Consolidates Pro features into Plus tier
-- Safe migration: keeps tables, updates constraints and RLS
-- =====================================================

-- 1. First migrate any existing 'pro' users to 'plus' (BEFORE constraint change)
UPDATE public.subscriptions 
SET plan_id = 'plus', updated_at = now()
WHERE plan_id = 'pro';

-- 2. Update subscription constraint - remove 'pro'
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE public.subscriptions ADD CONSTRAINT valid_plan 
  CHECK (plan_id IN ('free', 'plus', 'enterprise'));

-- 3. Create verify_plus_subscription function (replacing verify_pro_subscription)
CREATE OR REPLACE FUNCTION public.verify_plus_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT plan_id, status, current_period_end
  INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check for Plus (or enterprise) plan with active or trialing status
  IF v_subscription.plan_id IN ('plus', 'enterprise')
     AND (v_subscription.status = 'active' OR v_subscription.status = 'trialing')
     AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW())
  THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 4. Update RLS policy on branding_settings to use verify_plus_subscription
DROP POLICY IF EXISTS "Users can insert their branding settings if Pro" ON public.branding_settings;

CREATE POLICY "Users can insert their branding settings if Plus" 
ON public.branding_settings 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND public.verify_plus_subscription(auth.uid())
);

-- 5. Update RLS policy on api_keys to use verify_plus_subscription (keep feature available for Plus)
DROP POLICY IF EXISTS "Users can insert their own API keys if Pro" ON public.api_keys;

CREATE POLICY "Users can insert their own API keys if Plus" 
ON public.api_keys 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND public.verify_plus_subscription(auth.uid())
);

-- 6. Update RLS policy on teams to use verify_plus_subscription (keep feature available for Plus)
DROP POLICY IF EXISTS "Pro users can create teams" ON public.teams;

CREATE POLICY "Plus users can create teams" 
ON public.teams 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = owner_id 
  AND public.verify_plus_subscription(auth.uid())
);

-- 7. Update verify_paid_subscription to remove 'pro' logic (return 'plus' for paid users)
CREATE OR REPLACE FUNCTION public.verify_paid_subscription(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'free';
  END IF;

  SELECT plan_id, status, current_period_end
  INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'free';
  END IF;
  
  IF (v_subscription.status = 'active' OR v_subscription.status = 'trialing')
     AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW())
  THEN
    -- Return actual plan (plus or enterprise, no more pro)
    RETURN v_subscription.plan_id;
  END IF;
  
  RETURN 'free';
END;
$$;

-- 8. Keep verify_pro_subscription for backwards compatibility but always return false
CREATE OR REPLACE FUNCTION public.verify_pro_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Pro tier has been removed - use verify_plus_subscription instead
  -- This function remains for backwards compatibility but always returns false
  RETURN false;
END;
$$;