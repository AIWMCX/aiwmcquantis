CREATE OR REPLACE FUNCTION public.get_user_plan_tier(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO public
AS $$
  WITH ranked AS (
    SELECT s.plan_id, s.status, s.trial_ends_at, s.current_period_end, s.updated_at
      FROM public.subscriptions s
     WHERE s.user_id = _uid
     ORDER BY
       CASE
         WHEN s.plan_id IN ('pro', 'enterprise') AND s.status IN ('active', 'trialing') THEN 1
         WHEN s.plan_id = 'plus' AND s.status IN ('active', 'trialing') THEN 2
         WHEN s.plan_id = 'free' AND s.status IN ('active', 'trialing') THEN 3
         ELSE 4
       END,
       s.updated_at DESC NULLS LAST,
       s.current_period_end DESC NULLS LAST
     LIMIT 1
  )
  SELECT COALESCE(
    CASE
      WHEN plan_id IN ('pro', 'enterprise')
       AND status IN ('active', 'trialing')
       AND (status <> 'trialing' OR trial_ends_at IS NULL OR trial_ends_at > now()) THEN 'pro'
      WHEN plan_id = 'plus'
       AND status IN ('active', 'trialing')
       AND (status <> 'trialing' OR trial_ends_at IS NULL OR trial_ends_at > now()) THEN 'plus'
      ELSE 'free'
    END,
    'free'
  )
  FROM ranked
$$;

REVOKE ALL ON FUNCTION public.get_user_plan_tier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_plan_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_tier(uuid) TO service_role;