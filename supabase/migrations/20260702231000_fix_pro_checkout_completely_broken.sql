-- ============================================================================
-- FIX: Pro ($49/mo) checkout has been completely broken since the tier model
-- was extended to include a "pro" plan. Discovered 2026-07-02 when a real
-- customer completed a live Stripe checkout for Pro (Stripe subscription
-- sub_1TotZjLKMhSmZURCEpzsCh7M, status trialing, correctly tagged with their
-- supabase_user_id in metadata) and the app showed FREE PLAN / 0 of 5 used
-- afterward, with zero rows in public.subscriptions for their account.
--
-- Two independent bugs compounded:
--
-- 1. public.subscriptions' `valid_plan` CHECK constraint only allowed
--    ('free', 'plus', 'enterprise') — 'pro' was never added when the tier
--    model changed. Every Pro checkout's DB write has been silently
--    rejected at the constraint level since this check was created,
--    regardless of whether the Stripe webhook itself was delivered
--    correctly. Confirmed: the only non-null plan_id value that has EVER
--    existed in this table (across all rows) was 'plus'.
--
-- 2. public.provision_pro_features() and public.mark_subscription_canceled()
--    — called by supabase/functions/stripe-webhook/index.ts on every
--    checkout.session.completed and cancellation event — were defined in
--    migration 20260426203612 but that migration never actually applied in
--    production (same root cause as the broader deploy-freeze incident:
--    SUPABASE_DB_PASSWORD is not configured in GitHub Actions secrets, so
--    `supabase db push` has been silently skipping in production-deploy.yml
--    for weeks). Confirmed via `select proname from pg_proc` returning zero
--    rows for either function name before this fix.
--
-- This migration is idempotent and safe to re-run. It:
--   (a) widens valid_plan to include 'pro' without removing existing values
--   (b) ensures every column provision_pro_features/mark_subscription_canceled
--       reference actually exists (some were added by other migrations that
--       DID apply; `canceled_at` specifically had not)
--   (c) creates both functions, standalone (NOT the trigger/RLS sections of
--       20260426203612 that reference public.enforce_white_label_pro, which
--       does not exist in production — that is a separate, tracked gap, not
--       bundled into this fix)
--   (d) grants EXECUTE to service_role, matching the original migration
--
-- The one real customer affected by this (user_id 83cd4597-94a6-4b4e-ac3f-
-- 48dae9b23254) was manually reconciled against Stripe's authoritative
-- subscription record the same day this was found, before this migration
-- was written.
-- ============================================================================

-- (a) Widen the plan check constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS valid_plan;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT valid_plan CHECK (plan_id = ANY (ARRAY['free'::text, 'plus'::text, 'pro'::text, 'enterprise'::text]));

-- (b) Ensure every column the two functions below actually write exists.
-- (billing_cycle, cancel_at_period_end, is_legacy_price, payment_failed_at,
-- history_readonly_until already existed in production prior to this
-- migration via other applied migrations — included here with IF NOT EXISTS
-- so this file is a complete, standalone source of truth regardless.)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_legacy_price boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS history_readonly_until timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- (c) The two provisioning RPCs, standalone (no dependency on
-- enforce_white_label_pro or the analyses-table RLS section of the
-- original 20260426203612 migration — those remain a separate open gap).
CREATE OR REPLACE FUNCTION public.provision_pro_features(
  p_user_id uuid,
  p_period_end timestamptz DEFAULT NULL,
  p_stripe_customer_id text DEFAULT NULL,
  p_stripe_subscription_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_user');
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM public.subscriptions s WHERE s.user_id = p_user_id;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, current_period_end,
    stripe_customer_id, stripe_subscription_id, history_readonly_until
  )
  VALUES (
    p_user_id, 'pro', 'active',
    COALESCE(p_period_end, now() + interval '30 days'),
    p_stripe_customer_id, p_stripe_subscription_id, NULL
  )
  ON CONFLICT (user_id) DO UPDATE
  SET plan_id = 'pro',
      status = 'active',
      current_period_end = COALESCE(EXCLUDED.current_period_end, public.subscriptions.current_period_end),
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.subscriptions.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, public.subscriptions.stripe_subscription_id),
      payment_failed_at = NULL,
      cancel_at_period_end = false,
      canceled_at = NULL,
      history_readonly_until = NULL,
      updated_at = now();

  SELECT to_jsonb(s) INTO v_new FROM public.subscriptions s WHERE s.user_id = p_user_id;

  INSERT INTO public.subscription_audit_log (
    user_id, event_source, event_type, previous_state, new_state, reason
  ) VALUES (
    p_user_id, 'stripe_webhook', 'pro_provisioned',
    COALESCE(v_old, '{}'::jsonb), v_new,
    'PRO features auto-provisioned by stripe webhook'
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'plan_id', 'pro');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_subscription_canceled(
  p_user_id uuid,
  p_reason text DEFAULT 'subscription_canceled'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_user');
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM public.subscriptions s WHERE s.user_id = p_user_id;

  UPDATE public.subscriptions
  SET plan_id = 'free',
      status = 'canceled',
      canceled_at = COALESCE(canceled_at, now()),
      history_readonly_until = now() + interval '30 days',
      updated_at = now()
  WHERE user_id = p_user_id;

  SELECT to_jsonb(s) INTO v_new FROM public.subscriptions s WHERE s.user_id = p_user_id;

  INSERT INTO public.subscription_audit_log (
    user_id, event_source, event_type, previous_state, new_state, reason
  ) VALUES (
    p_user_id, 'stripe_webhook', 'downgraded',
    COALESCE(v_old, '{}'::jsonb), COALESCE(v_new, '{}'::jsonb), p_reason
  );

  RETURN jsonb_build_object('success', true, 'readonly_until', now() + interval '30 days');
END;
$$;

-- (d) Grants
GRANT EXECUTE ON FUNCTION public.provision_pro_features(uuid, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_subscription_canceled(uuid, text) TO service_role;
