-- Pro = superset of Plus. Pro users must pass the Plus gate too.
CREATE OR REPLACE FUNCTION public.verify_plus_subscription(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Plus, Pro, and Enterprise all unlock Plus-tier features
  IF v_subscription.plan_id IN ('plus', 'pro', 'enterprise')
     AND (v_subscription.status = 'active' OR v_subscription.status = 'trialing')
     AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW())
  THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- Restore real Pro check (was previously stubbed to false after Pro removal).
CREATE OR REPLACE FUNCTION public.verify_pro_subscription(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_subscription.plan_id IN ('pro', 'enterprise')
     AND (v_subscription.status = 'active' OR v_subscription.status = 'trialing')
     AND (v_subscription.current_period_end IS NULL OR v_subscription.current_period_end > NOW())
  THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;