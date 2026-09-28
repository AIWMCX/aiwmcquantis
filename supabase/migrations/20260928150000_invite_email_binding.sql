-- Email-bound invites (2026-09-28).
--
-- For cold email / known-lead outreach we already know exactly who the
-- invite is for. An unbound token can otherwise be redeemed by whoever
-- clicks it first -- fine for a LinkedIn DM with no known email, wrong
-- for a targeted cold-email invite where "1 prospect = 1 expected email
-- = 1 auth user = 1 redemption = 1 Pro grant" is the actual requirement.
--
-- expected_email is optional: NULL keeps today's behavior (first
-- verified email to redeem it owns it -- the LinkedIn/unknown-email
-- case). Set, it becomes a hard server-side gate: only that email may
-- redeem, checked at redemption time against the authenticated user's
-- real auth.users.email, regardless of how they signed in (password or
-- the passwordless magic-link entry from the prior migration/commit).
-- No plan/label/prospect data leaks to a non-matching signed-in user --
-- this is a same-privacy-shape addition to the existing 'revoked' /
-- 'expired' / 'used' family of denials, not a new leak surface.

ALTER TABLE public.plan_invites
  ADD COLUMN IF NOT EXISTS expected_email text;
ALTER TABLE public.plan_invites
  DROP CONSTRAINT IF EXISTS plan_invites_expected_email_lower_chk;
ALTER TABLE public.plan_invites
  ADD CONSTRAINT plan_invites_expected_email_lower_chk
  CHECK (expected_email IS NULL OR expected_email = lower(expected_email));

CREATE OR REPLACE FUNCTION public.preview_plan_invite(_token text)
RETURNS TABLE (status text, plan_id text, duration_days integer, redeem_by timestamptz, email_locked boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  i public.plan_invites;
BEGIN
  SELECT * INTO i FROM public.plan_invites WHERE token = _token;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::integer, NULL::timestamptz, false;
    RETURN;
  END IF;
  RETURN QUERY SELECT
    CASE
      WHEN i.revoked_at IS NOT NULL THEN 'revoked'
      WHEN i.redeem_by < now() THEN 'expired'
      WHEN i.redeemed_count >= i.max_redemptions THEN 'used'
      ELSE 'valid'
    END,
    i.plan_id, i.duration_days, i.redeem_by,
    (i.expected_email IS NOT NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_plan_invite(_token text)
RETURNS TABLE (result text, plan_id text, current_period_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  i public.plan_invites;
  s public.subscriptions;
  prior public.plan_invite_redemptions;
  period_end timestamptz;
  v_email text;
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT 'not_signed_in'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT * INTO i FROM public.plan_invites WHERE token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- Idempotent: opening the same link again after redeeming is a success.
  SELECT * INTO prior FROM public.plan_invite_redemptions r WHERE r.invite_id = i.id AND r.user_id = uid;
  IF FOUND THEN
    RETURN QUERY SELECT 'already_redeemed'::text, prior.plan_id, prior.period_end;
    RETURN;
  END IF;

  IF i.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'revoked'::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  IF i.redeem_by < now() THEN
    RETURN QUERY SELECT 'expired'::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;
  IF i.redeemed_count >= i.max_redemptions THEN
    RETURN QUERY SELECT 'used'::text, NULL::text, NULL::timestamptz; RETURN;
  END IF;

  -- Email-bound invite: only the intended recipient's authenticated
  -- email may redeem it. Checked before any other side effect, and
  -- denied with no grant, no redemption row, no leaked plan detail.
  IF i.expected_email IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = uid;
    IF v_email IS NULL OR lower(v_email) <> i.expected_email THEN
      RETURN QUERY SELECT 'wrong_email'::text, NULL::text, NULL::timestamptz; RETURN;
    END IF;
  END IF;

  -- One free month per person, whichever invite they come through.
  SELECT * INTO prior FROM public.plan_invite_redemptions r WHERE r.user_id = uid ORDER BY redeemed_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT 'already_had_invite'::text, prior.plan_id, prior.period_end;
    RETURN;
  END IF;

  SELECT * INTO s FROM public.subscriptions WHERE user_id = uid;
  -- Never overwrite a live paid subscription.
  IF FOUND AND s.stripe_subscription_id IS NOT NULL
     AND s.status IN ('active', 'trialing', 'past_due')
     AND s.plan_id IN ('plus', 'pro')
     AND (s.current_period_end IS NULL OR s.current_period_end > now()) THEN
    RETURN QUERY SELECT 'already_subscribed'::text, s.plan_id, s.current_period_end;
    RETURN;
  END IF;

  period_end := now() + make_interval(days => i.duration_days);

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, current_period_start, current_period_end, billing_cycle, cancel_at_period_end, grant_source
  ) VALUES (
    uid, i.plan_id, 'active', now(), period_end, 'monthly', true, 'invite'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        status = 'active',
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        billing_cycle = 'monthly',
        cancel_at_period_end = true,
        canceled_at = NULL,
        trial_ends_at = NULL,
        payment_failed_at = NULL,
        stripe_subscription_id = NULL,
        grant_source = 'invite',
        updated_at = now();

  INSERT INTO public.plan_invite_redemptions (invite_id, user_id, plan_id, period_end)
  VALUES (i.id, uid, i.plan_id, period_end);
  UPDATE public.plan_invites SET redeemed_count = redeemed_count + 1 WHERE id = i.id;

  RETURN QUERY SELECT 'granted'::text, i.plan_id, period_end;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'plan_invites' AND column_name = 'expected_email'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: plan_invites.expected_email missing';
  END IF;
END $$;
