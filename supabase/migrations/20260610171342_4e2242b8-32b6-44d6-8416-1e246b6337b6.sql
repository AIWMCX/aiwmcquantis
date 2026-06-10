-- Fix #5: idempotent, race-safe, atomic quota ledger.
--
-- Why: today a crashed analysis can burn one of the 5 free credits without
-- ever returning a result, and a double-click can double-charge. Both kill
-- activation. The fix is: charge ONLY on success, by-identity, atomically.

-- 1. usage_counters: one row per identity per calendar month.
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key    text NOT NULL,
  tier            text NOT NULL DEFAULT 'free',
  period_start    date NOT NULL DEFAULT date_trunc('month', now())::date,
  analyses_used   int  NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_key, period_start)
);

GRANT SELECT ON public.usage_counters TO authenticated;
GRANT ALL    ON public.usage_counters TO service_role;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Users may read their own counter row, scoped by identity_key prefix.
-- (Write happens through the SECURITY DEFINER function below — no INSERT/UPDATE policy needed.)
DROP POLICY IF EXISTS "Users read own usage_counter" ON public.usage_counters;
CREATE POLICY "Users read own usage_counter"
  ON public.usage_counters
  FOR SELECT
  TO authenticated
  USING (identity_key = 'user:' || auth.uid()::text);

-- 2. Atomic charge function — increments ONLY if quota remains.
-- dry_run = true  → read-only "do I have room?" check, never mutates.
-- dry_run = false → atomic increment, returns allowed=false if quota exhausted.
CREATE OR REPLACE FUNCTION public.charge_free_analysis(
  p_identity text,
  p_dry_run  boolean DEFAULT false
)
RETURNS TABLE(allowed boolean, used int, remaining int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Keep in sync with FREE_ANALYSIS_LIMIT in src/config/tiers.ts (invariant I-8).
  v_limit  int  := 5;
  v_period date := date_trunc('month', now())::date;
  v_used   int;
BEGIN
  -- Ensure a counter row exists for this identity + period.
  INSERT INTO public.usage_counters(identity_key, period_start, analyses_used)
    VALUES (p_identity, v_period, 0)
    ON CONFLICT (identity_key, period_start) DO NOTHING;

  IF p_dry_run THEN
    SELECT analyses_used INTO v_used
      FROM public.usage_counters
     WHERE identity_key = p_identity
       AND period_start = v_period;
    RETURN QUERY SELECT (v_used < v_limit), v_used, GREATEST(v_limit - v_used, 0);
    RETURN;
  END IF;

  -- Atomic increment only if below limit. The WHERE-clause guard prevents
  -- the classic race condition where two concurrent requests both pass an
  -- earlier "remaining > 0" check and then each increment.
  UPDATE public.usage_counters
     SET analyses_used = analyses_used + 1,
         updated_at    = now()
   WHERE identity_key  = p_identity
     AND period_start  = v_period
     AND analyses_used < v_limit
  RETURNING analyses_used INTO v_used;

  IF v_used IS NULL THEN
    -- Quota exhausted — nothing was charged.
    SELECT analyses_used INTO v_used
      FROM public.usage_counters
     WHERE identity_key = p_identity
       AND period_start = v_period;
    RETURN QUERY SELECT false, v_used, 0;
  ELSE
    RETURN QUERY SELECT true, v_used, GREATEST(v_limit - v_used, 0);
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.charge_free_analysis(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.charge_free_analysis(text, boolean) TO service_role;