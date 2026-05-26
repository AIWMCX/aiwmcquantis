
CREATE TABLE IF NOT EXISTS public.quote_gen_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL,
  plan_tier_snapshot text NOT NULL DEFAULT 'free',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_gen_usage_unique_user_month UNIQUE (user_id, month_key),
  CONSTRAINT quote_gen_usage_count_nonneg CHECK (usage_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quote_gen_usage_user_month
  ON public.quote_gen_usage (user_id, month_key);

ALTER TABLE public.quote_gen_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own quote_gen_usage" ON public.quote_gen_usage;
CREATE POLICY "Users read own quote_gen_usage"
  ON public.quote_gen_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages quote_gen_usage" ON public.quote_gen_usage;
CREATE POLICY "Service role manages quote_gen_usage"
  ON public.quote_gen_usage FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
-- Intentionally no INSERT/UPDATE/DELETE policies for authenticated; writes only via SECURITY DEFINER RPCs below.

-- Resolve current plan tier for a user from subscriptions table.
CREATE OR REPLACE FUNCTION public.get_user_plan_tier(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN s.plan_id IN ('pro','enterprise') AND s.status IN ('active','trialing') THEN 'pro'
    WHEN s.plan_id = 'plus' AND s.status IN ('active','trialing') THEN 'plus'
    ELSE 'free'
  END
  FROM public.subscriptions s
  WHERE s.user_id = _uid
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1
$$;

-- Read-only status for current caller.
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
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object(
      'planTier','free','limit',0,'used',0,'remaining',0,
      'isEnabled',false,'isExhausted',true,'monthKey',_month
    );
  END IF;
  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _limit := CASE _tier WHEN 'pro' THEN 15 WHEN 'plus' THEN 5 ELSE 0 END;
  SELECT usage_count INTO _used
    FROM public.quote_gen_usage
   WHERE user_id = _uid AND month_key = _month;
  _used := COALESCE(_used, 0);
  RETURN jsonb_build_object(
    'planTier',_tier,
    'limit',_limit,
    'used',_used,
    'remaining',GREATEST(_limit - _used, 0),
    'isEnabled',_limit > 0,
    'isExhausted',_used >= _limit,
    'monthKey',_month
  );
END
$$;

-- Atomic check + increment. Returns { ok, reason?, planTier, limit, used, remaining, monthKey }.
CREATE OR REPLACE FUNCTION public.increment_quote_gen_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _new int;
  _cur int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;
  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _limit := CASE _tier WHEN 'pro' THEN 15 WHEN 'plus' THEN 5 ELSE 0 END;

  IF _limit = 0 THEN
    RETURN jsonb_build_object(
      'ok',false,'reason','plan_tier',
      'planTier',_tier,'limit',0,'used',0,'remaining',0,'monthKey',_month
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
      'remaining',0,'monthKey',_month
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'planTier',_tier,'limit',_limit,'used',_new,
    'remaining',_limit - _new,'monthKey',_month
  );
END
$$;

-- Refund helper: decrement by 1 (clamped at 0) for current month.
CREATE OR REPLACE FUNCTION public.decrement_quote_gen_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.quote_gen_usage
     SET usage_count = GREATEST(usage_count - 1, 0),
         updated_at = now()
   WHERE user_id = _uid AND month_key = _month;
END
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_gen_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_quote_gen_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_quote_gen_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_tier(uuid) TO authenticated;

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_quote_gen_usage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_touch_quote_gen_usage ON public.quote_gen_usage;
CREATE TRIGGER trg_touch_quote_gen_usage
BEFORE UPDATE ON public.quote_gen_usage
FOR EACH ROW EXECUTE FUNCTION public.touch_quote_gen_usage();
