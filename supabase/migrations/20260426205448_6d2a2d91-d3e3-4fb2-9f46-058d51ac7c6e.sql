DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'beltovbogdan@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Founder user not found - skipping PRO grant';
    RETURN;
  END IF;

  DELETE FROM public.subscriptions WHERE user_id = v_user_id;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, billing_cycle,
    current_period_start, current_period_end,
    cancel_at_period_end, is_legacy_price,
    stripe_customer_id, stripe_subscription_id
  ) VALUES (
    v_user_id, 'pro', 'active', 'annual',
    now(), now() + interval '10 years',
    false, false,
    'founder_lifetime', 'founder_lifetime_pro'
  );

  -- Auto-provision PRO features (white-label, API key, team seats) if helper exists
  BEGIN
    PERFORM public.provision_pro_features(v_user_id);
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'provision_pro_features not found - skipping';
  END;

  RAISE NOTICE 'Founder PRO subscription granted to user %', v_user_id;
END $$;