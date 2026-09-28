-- Plan invites: one link → one person → one month of Pro (2026-09-28).
--
-- For founder-led outreach (LinkedIn etc.) we usually don't know which email
-- someone will sign up with, so the email-keyed pending_plan_grants path
-- can't carry the "1 month of Pro, free" offer. An invite is a random token
-- in a link (aiwmcquantis.com/invite/<token>). The invitee opens it, signs up
-- or signs in with any email or Google, and redeem_plan_invite() activates
-- Pro immediately — no card, no manual step, no waiting on the founder.
--
-- Rules enforced here, server-side:
--   * the invite must exist, not be revoked, not be past its redeem-by date,
--     and have redemptions left (default: exactly one person);
--   * a user with a live paid Stripe subscription is never touched;
--   * a user who already redeemed any invite can't stack another month;
--   * the grant is time-boxed: current_period_end = now + duration_days and
--     cancel_at_period_end = true, so the hourly downgrade job flips it to
--     free when the month ends, and server entitlements fail closed on the
--     same date even before that job runs;
--   * the subscription row is marked grant_source = 'invite' and its stale
--     stripe_subscription_id (from an old canceled trial) is cleared, so the
--     app shows "free Pro month — N days left / keep Pro" instead of a
--     Stripe portal that has nothing to manage.
-- Every redemption is recorded (who, when, which invite) and audited by the
-- existing subscriptions audit trigger.

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grant_source text;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_grant_source_chk') THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_grant_source_chk CHECK (grant_source IS NULL OR grant_source IN ('invite', 'pending_grant', 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.plan_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE CHECK (token ~ '^[A-Za-z0-9_-]{12,64}$'),
  plan_id text NOT NULL DEFAULT 'pro' CHECK (plan_id IN ('plus', 'pro')),
  duration_days integer NOT NULL DEFAULT 30 CHECK (duration_days BETWEEN 1 AND 365),
  max_redemptions integer NOT NULL DEFAULT 1 CHECK (max_redemptions BETWEEN 1 AND 500),
  redeemed_count integer NOT NULL DEFAULT 0,
  redeem_by timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  label text NOT NULL,
  channel text,
  prospect_id uuid REFERENCES public.commercial_prospects(id) ON DELETE SET NULL,
  created_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id uuid NOT NULL REFERENCES public.plan_invites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  period_end timestamptz NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invite_id, user_id)
);
CREATE INDEX IF NOT EXISTS plan_invite_redemptions_user_idx ON public.plan_invite_redemptions (user_id);

ALTER TABLE public.plan_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_invite_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_invites_admin_all ON public.plan_invites;
CREATE POLICY plan_invites_admin_all ON public.plan_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS plan_invite_redemptions_admin_read ON public.plan_invite_redemptions;
CREATE POLICY plan_invite_redemptions_admin_read ON public.plan_invite_redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
REVOKE ALL ON public.plan_invites, public.plan_invite_redemptions FROM anon;

-- When a granted user starts paying (Stripe writes a subscription id onto
-- the row), the grant markers must go: otherwise cancel_at_period_end would
-- let the downgrade job end a paying customer's plan at the grant's date.
CREATE OR REPLACE FUNCTION public.clear_grant_on_paid_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.grant_source IS NOT NULL
     AND NEW.stripe_subscription_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.stripe_subscription_id IS DISTINCT FROM NEW.stripe_subscription_id) THEN
    NEW.grant_source := NULL;
    NEW.cancel_at_period_end := false;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS trg_clear_grant_on_paid_subscription ON public.subscriptions;
CREATE TRIGGER trg_clear_grant_on_paid_subscription
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.clear_grant_on_paid_subscription();

-- ── Public preview (the invite page before sign-in) ─────────────────────
-- Returns only what the landing page needs; never the label/prospect.
CREATE OR REPLACE FUNCTION public.preview_plan_invite(_token text)
RETURNS TABLE (status text, plan_id text, duration_days integer, redeem_by timestamptz)
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
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;
  RETURN QUERY SELECT
    CASE
      WHEN i.revoked_at IS NOT NULL THEN 'revoked'
      WHEN i.redeem_by < now() THEN 'expired'
      WHEN i.redeemed_count >= i.max_redemptions THEN 'used'
      ELSE 'valid'
    END,
    i.plan_id, i.duration_days, i.redeem_by;
END;
$function$;

-- ── Redeem (signed-in invitee) ──────────────────────────────────────────
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

REVOKE ALL ON FUNCTION public.preview_plan_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_plan_invite(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.redeem_plan_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_plan_invite(text) TO authenticated, service_role;

-- ── Founder view: what each invitee actually did (admin only) ───────────
CREATE OR REPLACE FUNCTION public.get_plan_invite_activity()
RETURNS TABLE (
  invite_id uuid,
  user_id uuid,
  email text,
  redeemed_at timestamptz,
  period_end timestamptz,
  last_sign_in_at timestamptz,
  analyses integer,
  last_analysis_at timestamptz,
  invoices integer,
  documents integer,
  plan_now text,
  paid boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT r.invite_id, r.user_id, u.email::text, r.redeemed_at, r.period_end, u.last_sign_in_at,
    (SELECT count(*)::int FROM public.analyses a WHERE a.user_id = r.user_id AND a.created_at >= r.redeemed_at),
    (SELECT max(a.created_at) FROM public.analyses a WHERE a.user_id = r.user_id),
    (SELECT count(*)::int FROM public.invoices v WHERE v.user_id = r.user_id AND v.created_at >= r.redeemed_at),
    (SELECT count(*)::int FROM public.documents d WHERE d.user_id = r.user_id AND d.created_at >= r.redeemed_at),
    s.plan_id,
    (s.stripe_subscription_id IS NOT NULL AND s.status IN ('active', 'trialing'))
  FROM public.plan_invite_redemptions r
  LEFT JOIN auth.users u ON u.id = r.user_id
  LEFT JOIN public.subscriptions s ON s.user_id = r.user_id
  ORDER BY r.redeemed_at DESC;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_plan_invite_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_plan_invite_activity() TO authenticated, service_role;

-- ── Email-keyed grants: same clean expiry and labelling ─────────────────
-- (pending_plan_grants path, verified working on 2026-09-28; it now also
-- sets cancel_at_period_end so the month ends cleanly, and marks the row.)
CREATE OR REPLACE FUNCTION public.apply_pending_plan_grant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g RECORD;
  period_end timestamptz;
BEGIN
  BEGIN
    SELECT * INTO g
    FROM public.pending_plan_grants
    WHERE lower(email) = lower(NEW.email)
      AND granted_at IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    period_end := now() + make_interval(days => g.duration_days);

    INSERT INTO public.subscriptions (
      user_id, plan_id, status, current_period_start, current_period_end, billing_cycle, cancel_at_period_end, grant_source
    ) VALUES (
      NEW.id, g.plan_id, 'active', now(), period_end, 'monthly', true, 'pending_grant'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET plan_id = EXCLUDED.plan_id,
          status = 'active',
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          billing_cycle = EXCLUDED.billing_cycle,
          cancel_at_period_end = true,
          canceled_at = NULL,
          grant_source = 'pending_grant',
          updated_at = now();

    UPDATE public.pending_plan_grants
       SET granted_at = now(), granted_user_id = NEW.id
     WHERE id = g.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'apply_pending_plan_grant failed for %: %', NEW.email, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
-- Trigger-only: not callable over the API.
REVOKE ALL ON FUNCTION public.apply_pending_plan_grant() FROM PUBLIC, anon, authenticated;
