-- =====================================================================
-- COMMIT 1: Tier-gating foundation
-- =====================================================================

-- ---------- subscriptions: extend ------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_legacy_price boolean NOT NULL DEFAULT false;

-- billing_cycle constraint (drop-and-add for idempotency)
DO $$ BEGIN
  ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_billing_cycle_check
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly','annual'));
END $$;

-- plan_id constraint widened to include pro
DO $$ BEGIN
  ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_check;
  ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_check
    CHECK (plan_id IN ('free','plus','pro','enterprise'));
END $$;

-- Backfill: every existing paid subscriber is on legacy pricing
UPDATE public.subscriptions
SET is_legacy_price = true
WHERE plan_id IN ('plus','pro','enterprise')
  AND is_legacy_price = false;

-- ---------- usage_tracking: add downloads counter --------------------
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS downloads_date date,
  ADD COLUMN IF NOT EXISTS downloads_today int NOT NULL DEFAULT 0;

-- ---------- analyses: idempotency + tier snapshot --------------------
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS tier_at_creation text,
  ADD COLUMN IF NOT EXISTS depth text;

DO $$ BEGIN
  ALTER TABLE public.analyses DROP CONSTRAINT IF EXISTS analyses_depth_check;
  ALTER TABLE public.analyses
    ADD CONSTRAINT analyses_depth_check
    CHECK (depth IS NULL OR depth IN ('quick','full','pro'));
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS analyses_idempotency_key_uidx
  ON public.analyses(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ---------- Atomic quota RPC -----------------------------------------
-- Race-safe: 10 parallel callers with limit=1 → exactly 1 succeeds
CREATE OR REPLACE FUNCTION public.consume_analysis_quota(
  p_user_id uuid,
  p_limit int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_used int;
  v_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_user');
  END IF;

  -- Unlimited tier shortcut
  IF p_limit IS NULL OR p_limit <= 0 OR p_limit >= 2147483647 THEN
    INSERT INTO public.usage_tracking(user_id, month_year, analyses_count)
    VALUES (p_user_id, v_month, 1)
    ON CONFLICT (user_id, month_year)
    DO UPDATE SET analyses_count = usage_tracking.analyses_count + 1, updated_at = now()
    RETURNING analyses_count INTO v_used;
    RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', null);
  END IF;

  -- Ensure row exists
  INSERT INTO public.usage_tracking(user_id, month_year, analyses_count)
  VALUES (p_user_id, v_month, 0)
  ON CONFLICT (user_id, month_year) DO NOTHING;

  -- Atomic conditional increment (only succeeds if under limit)
  UPDATE public.usage_tracking
  SET analyses_count = analyses_count + 1, updated_at = now()
  WHERE user_id = p_user_id
    AND month_year = v_month
    AND analyses_count < p_limit
  RETURNING analyses_count INTO v_used;

  IF v_used IS NULL THEN
    SELECT analyses_count INTO v_used
    FROM public.usage_tracking
    WHERE user_id = p_user_id AND month_year = v_month;
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'used', v_used,
      'limit', p_limit
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit);
END;
$$;

-- ---------- Atomic download quota RPC --------------------------------
CREATE OR REPLACE FUNCTION public.consume_download_quota(
  p_user_id uuid,
  p_limit int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_used int;
  v_today date := (now() AT TIME ZONE 'UTC')::date;
  v_month text := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_user');
  END IF;

  IF p_limit IS NULL OR p_limit <= 0 OR p_limit >= 2147483647 THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'limit', null);
  END IF;

  INSERT INTO public.usage_tracking(user_id, month_year, downloads_date, downloads_today)
  VALUES (p_user_id, v_month, v_today, 0)
  ON CONFLICT (user_id, month_year) DO NOTHING;

  -- Reset counter if date rolled over
  UPDATE public.usage_tracking
  SET downloads_today = 0, downloads_date = v_today, updated_at = now()
  WHERE user_id = p_user_id
    AND month_year = v_month
    AND (downloads_date IS NULL OR downloads_date < v_today);

  -- Atomic conditional increment
  UPDATE public.usage_tracking
  SET downloads_today = COALESCE(downloads_today, 0) + 1,
      downloads_date = v_today,
      updated_at = now()
  WHERE user_id = p_user_id
    AND month_year = v_month
    AND COALESCE(downloads_today, 0) < p_limit
  RETURNING downloads_today INTO v_used;

  IF v_used IS NULL THEN
    SELECT downloads_today INTO v_used
    FROM public.usage_tracking
    WHERE user_id = p_user_id AND month_year = v_month;
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'quota_exceeded',
      'used', COALESCE(v_used, 0),
      'limit', p_limit
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit);
END;
$$;

-- ---------- Entitlement denial log (observability) -------------------
CREATE TABLE IF NOT EXISTS public.entitlement_denials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL,
  feature text NOT NULL,
  path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entitlement_denials_created_idx
  ON public.entitlement_denials(created_at DESC);
CREATE INDEX IF NOT EXISTS entitlement_denials_feature_idx
  ON public.entitlement_denials(feature, created_at DESC);

ALTER TABLE public.entitlement_denials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_denials" ON public.entitlement_denials;
CREATE POLICY "admin_read_denials"
  ON public.entitlement_denials
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- No user-facing insert policy — only service_role writes via edge functions

-- ---------- Helper: log a denial (callable from edge functions) ------
CREATE OR REPLACE FUNCTION public.log_entitlement_denial(
  p_user_id uuid,
  p_tier text,
  p_feature text,
  p_path text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.entitlement_denials (user_id, tier, feature, path, metadata)
  VALUES (p_user_id, p_tier, p_feature, p_path, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;