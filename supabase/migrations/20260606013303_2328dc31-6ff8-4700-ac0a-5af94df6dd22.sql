CREATE TABLE IF NOT EXISTS public.idea_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL,
  plan_tier_snapshot text NOT NULL DEFAULT 'free',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idea_generation_usage_unique_user_month UNIQUE (user_id, month_key),
  CONSTRAINT idea_generation_usage_count_nonneg CHECK (usage_count >= 0)
);

GRANT SELECT ON public.idea_generation_usage TO authenticated;
GRANT ALL ON public.idea_generation_usage TO service_role;

ALTER TABLE public.idea_generation_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own idea generation usage" ON public.idea_generation_usage;
CREATE POLICY "Users read own idea generation usage"
ON public.idea_generation_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages idea generation usage" ON public.idea_generation_usage;
CREATE POLICY "Service role manages idea generation usage"
ON public.idea_generation_usage
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_idea_generation_usage_user_month
ON public.idea_generation_usage (user_id, month_key);

CREATE OR REPLACE FUNCTION public.touch_idea_generation_usage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_idea_generation_usage ON public.idea_generation_usage;
CREATE TRIGGER trg_touch_idea_generation_usage
BEFORE UPDATE ON public.idea_generation_usage
FOR EACH ROW EXECUTE FUNCTION public.touch_idea_generation_usage();

CREATE OR REPLACE FUNCTION public.get_idea_generation_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _used int;
  _unlimited boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object(
      'planTier','free','limit',5,'used',0,'remaining',5,
      'isEnabled',false,'isExhausted',false,'isUnlimited',false,'monthKey',_month
    );
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _unlimited := _tier IN ('plus','pro');
  _limit := CASE WHEN _unlimited THEN 2147483647 ELSE 5 END;

  SELECT usage_count INTO _used
    FROM public.idea_generation_usage
   WHERE user_id = _uid AND month_key = _month;

  _used := COALESCE(_used, 0);

  RETURN jsonb_build_object(
    'planTier',_tier,
    'limit',CASE WHEN _unlimited THEN NULL ELSE _limit END,
    'used',_used,
    'remaining',CASE WHEN _unlimited THEN NULL ELSE GREATEST(_limit - _used, 0) END,
    'isEnabled',true,
    'isExhausted',CASE WHEN _unlimited THEN false ELSE _used >= _limit END,
    'isUnlimited',_unlimited,
    'monthKey',_month
  );
END
$$;

CREATE OR REPLACE FUNCTION public.increment_idea_generation_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int := 5;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _new int;
  _cur int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');

  IF _tier IN ('plus','pro') THEN
    SELECT usage_count INTO _cur
      FROM public.idea_generation_usage
     WHERE user_id = _uid AND month_key = _month;

    RETURN jsonb_build_object(
      'ok',true,'planTier',_tier,'limit',NULL,'used',COALESCE(_cur,0),
      'remaining',NULL,'isUnlimited',true,'monthKey',_month
    );
  END IF;

  INSERT INTO public.idea_generation_usage (user_id, month_key, plan_tier_snapshot, usage_count)
    VALUES (_uid, _month, _tier, 0)
    ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.idea_generation_usage
     SET usage_count = usage_count + 1,
         plan_tier_snapshot = _tier,
         updated_at = now()
   WHERE user_id = _uid
     AND month_key = _month
     AND usage_count < _limit
   RETURNING usage_count INTO _new;

  IF _new IS NULL THEN
    SELECT usage_count INTO _cur
      FROM public.idea_generation_usage
     WHERE user_id = _uid AND month_key = _month;

    RETURN jsonb_build_object(
      'ok',false,'reason','quota',
      'planTier',_tier,'limit',_limit,'used',COALESCE(_cur,0),
      'remaining',0,'isUnlimited',false,'monthKey',_month
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'planTier',_tier,'limit',_limit,'used',_new,
    'remaining',_limit - _new,'isUnlimited',false,'monthKey',_month
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.get_idea_generation_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_idea_generation_usage() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_quote_gen_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _used int;
  _unlimited boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object(
      'planTier','free','limit',0,'used',0,'remaining',0,
      'isEnabled',false,'isExhausted',true,'isUnlimited',false,'monthKey',_month
    );
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _unlimited := _tier IN ('plus','pro');
  _limit := CASE WHEN _unlimited THEN 2147483647 ELSE 5 END;

  SELECT usage_count INTO _used
    FROM public.quote_gen_usage
   WHERE user_id = _uid AND month_key = _month;

  _used := COALESCE(_used, 0);

  RETURN jsonb_build_object(
    'planTier',_tier,
    'limit',CASE WHEN _unlimited THEN NULL ELSE _limit END,
    'used',_used,
    'remaining',CASE WHEN _unlimited THEN NULL ELSE GREATEST(_limit - _used, 0) END,
    'isEnabled',true,
    'isExhausted',CASE WHEN _unlimited THEN false ELSE _used >= _limit END,
    'isUnlimited',_unlimited,
    'monthKey',_month
  );
END
$$;

CREATE OR REPLACE FUNCTION public.increment_quote_gen_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int := 5;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _new int;
  _cur int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');

  IF _tier IN ('plus','pro') THEN
    SELECT usage_count INTO _cur
      FROM public.quote_gen_usage
     WHERE user_id = _uid AND month_key = _month;

    RETURN jsonb_build_object(
      'ok',true,'planTier',_tier,'limit',NULL,'used',COALESCE(_cur,0),
      'remaining',NULL,'isUnlimited',true,'monthKey',_month
    );
  END IF;

  INSERT INTO public.quote_gen_usage (user_id, month_key, plan_tier_snapshot, usage_count)
    VALUES (_uid, _month, _tier, 0)
    ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.quote_gen_usage
     SET usage_count = usage_count + 1,
         plan_tier_snapshot = _tier,
         updated_at = now()
   WHERE user_id = _uid
     AND month_key = _month
     AND usage_count < _limit
   RETURNING usage_count INTO _new;

  IF _new IS NULL THEN
    SELECT usage_count INTO _cur
      FROM public.quote_gen_usage
     WHERE user_id = _uid AND month_key = _month;

    RETURN jsonb_build_object(
      'ok',false,'reason','quota',
      'planTier',_tier,'limit',_limit,'used',COALESCE(_cur,0),
      'remaining',0,'isUnlimited',false,'monthKey',_month
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'planTier',_tier,'limit',_limit,'used',_new,
    'remaining',_limit - _new,'isUnlimited',false,'monthKey',_month
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_gen_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_quote_gen_usage() TO authenticated;