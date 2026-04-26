-- ──────────────────────────────────────────────────────────────────
-- 1. Founder admin role (lookup by email; idempotent; safe if not signed up yet)
-- ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'beltovbogdan@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    -- Refresh protect_admin_role to also allow the resolved id (covers
    -- the case where the hardcoded UUID and the real signup id differ).
    EXECUTE format($f$
      CREATE OR REPLACE FUNCTION public.protect_admin_role()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO 'public'
      AS $body$
      DECLARE
        v_authorized_email text := 'beltovbogdan@gmail.com';
        v_user_email text;
      BEGIN
        IF NEW.role = 'admin' THEN
          SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
          IF v_user_email IS DISTINCT FROM v_authorized_email THEN
            RAISE EXCEPTION 'Admin role assignment is restricted. Contact system administrator.';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $body$;
    $f$);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- 2. Wire enforce_white_label_pro to branding_settings
-- ──────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_enforce_white_label_pro ON public.branding_settings;
CREATE TRIGGER trg_enforce_white_label_pro
  BEFORE INSERT OR UPDATE OF hide_quantis_branding ON public.branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_white_label_pro();

-- ──────────────────────────────────────────────────────────────────
-- 3. Readonly-window + admin RLS on analyses
-- ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can read history during readonly window" ON public.analyses;
CREATE POLICY "Users can read history during readonly window"
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.history_readonly_until IS NOT NULL
        AND s.history_readonly_until > now()
    )
  );

DROP POLICY IF EXISTS "Admins can view all analyses" ON public.analyses;
CREATE POLICY "Admins can view all analyses"
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ──────────────────────────────────────────────────────────────────
-- 4. PRO auto-provisioning RPC
-- ──────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────
-- 5. Mark history readonly when subscription is canceled
-- ──────────────────────────────────────────────────────────────────
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

GRANT EXECUTE ON FUNCTION public.provision_pro_features(uuid, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_subscription_canceled(uuid, text) TO service_role;