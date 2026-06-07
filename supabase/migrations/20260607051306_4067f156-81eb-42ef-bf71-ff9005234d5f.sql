CREATE OR REPLACE FUNCTION public.consume_idea_gen_quota(
  p_user_id uuid,
  p_limit integer,
  p_month_year text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier text;
  v_used integer;
  v_allowed boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', p_limit, 'reason', 'missing_user');
  END IF;

  v_tier := COALESCE(public.get_user_plan_tier(p_user_id), 'free');

  IF v_tier IN ('plus', 'pro') THEN
    SELECT COALESCE(usage_count, 0)
      INTO v_used
      FROM public.idea_generation_usage
     WHERE user_id = p_user_id
       AND month_key = p_month_year;

    RETURN jsonb_build_object(
      'allowed', true,
      'used', COALESCE(v_used, 0),
      'limit', NULL,
      'remaining', NULL,
      'isUnlimited', true,
      'planTier', v_tier
    );
  END IF;

  INSERT INTO public.idea_generation_usage (user_id, month_key, plan_tier_snapshot, usage_count)
  VALUES (p_user_id, p_month_year, v_tier, 0)
  ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.idea_generation_usage
     SET usage_count = usage_count + 1,
         plan_tier_snapshot = v_tier,
         updated_at = now()
   WHERE user_id = p_user_id
     AND month_key = p_month_year
     AND usage_count < p_limit
   RETURNING usage_count INTO v_used;

  v_allowed := v_used IS NOT NULL;

  IF NOT v_allowed THEN
    SELECT COALESCE(usage_count, 0)
      INTO v_used
      FROM public.idea_generation_usage
     WHERE user_id = p_user_id
       AND month_key = p_month_year;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'used', COALESCE(v_used, 0),
    'limit', p_limit,
    'remaining', GREATEST(p_limit - COALESCE(v_used, 0), 0),
    'isUnlimited', false,
    'planTier', v_tier
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_idea_gen_quota(uuid, integer, text) TO service_role;