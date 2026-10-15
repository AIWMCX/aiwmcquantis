-- Protect manual plan grants from stale Stripe events (2026-10-15).
--
-- subscriptions is one row per user. Two gaps let an old Stripe
-- subscription downgrade a user who had since been granted a plan:
--   1. claim_pending_plan_grant reused the row but kept the old
--      stripe_subscription_id and payment_failed_at, so a later
--      invoice.payment_failed for that old subscription still matched
--      the row, with its grace window already expired.
--   2. mark_subscription_canceled downgraded by user_id alone, never
--      checking which subscription the triggering event was about.

-- 1. Scope cancellation to the subscription that triggered it.
--    p_stripe_subscription_id is optional so existing two-argument callers
--    (e.g. process-subscription-downgrades) keep today's behaviour.
DROP FUNCTION IF EXISTS public.mark_subscription_canceled(uuid, text);

CREATE OR REPLACE FUNCTION public.mark_subscription_canceled(
  p_user_id uuid,
  p_reason text DEFAULT 'subscription_canceled'::text,
  p_stripe_subscription_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_user');
  END IF;

  SELECT to_jsonb(s) INTO v_old FROM public.subscriptions s WHERE s.user_id = p_user_id;

  IF p_stripe_subscription_id IS NOT NULL
     AND (v_old IS NULL OR v_old->>'stripe_subscription_id' IS DISTINCT FROM p_stripe_subscription_id) THEN
    INSERT INTO public.subscription_audit_log (
      user_id, event_source, event_type, previous_state, new_state, reason
    ) VALUES (
      p_user_id, 'stripe_webhook', 'downgrade_skipped_stale',
      COALESCE(v_old, '{}'::jsonb), COALESCE(v_old, '{}'::jsonb),
      p_reason || ' (event for ' || p_stripe_subscription_id || ', row linked to '
        || COALESCE(v_old->>'stripe_subscription_id', 'none') || ')'
    );
    RETURN jsonb_build_object('success', false, 'error', 'stale_subscription');
  END IF;

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
$function$;

REVOKE ALL ON FUNCTION public.mark_subscription_canceled(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_subscription_canceled(uuid, text, text) TO service_role;

-- 2. A claimed grant detaches the row from any old Stripe subscription, so
--    later events for that subscription no longer match it.
CREATE OR REPLACE FUNCTION public.claim_pending_plan_grant()
RETURNS TABLE(applied boolean, plan_id text, current_period_end timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  uemail text;
  g RECORD;
  period_end timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;
  IF uemail IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO g
  FROM public.pending_plan_grants
  WHERE lower(email) = lower(uemail)
    AND granted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  period_end := now() + make_interval(days => g.duration_days);

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, current_period_start, current_period_end, billing_cycle
  ) VALUES (
    uid, g.plan_id, 'active', now(), period_end, 'monthly'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        billing_cycle = EXCLUDED.billing_cycle,
        cancel_at_period_end = false,
        canceled_at = NULL,
        stripe_subscription_id = NULL,
        payment_failed_at = NULL,
        history_readonly_until = NULL,
        updated_at = now();

  UPDATE public.pending_plan_grants
     SET granted_at = now(), granted_user_id = uid
   WHERE id = g.id;

  RETURN QUERY SELECT true, g.plan_id, period_end;
END;
$function$;
