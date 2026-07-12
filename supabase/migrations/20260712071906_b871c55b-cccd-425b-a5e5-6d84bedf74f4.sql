
-- 1) Make the signup trigger fail-safe so it never blocks account creation.
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
      user_id, plan_id, status, current_period_start, current_period_end, billing_cycle
    ) VALUES (
      NEW.id, g.plan_id, 'active', now(), period_end, 'monthly'
    )
    ON CONFLICT (user_id) DO UPDATE
      SET plan_id = EXCLUDED.plan_id,
          status = 'active',
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          billing_cycle = EXCLUDED.billing_cycle,
          cancel_at_period_end = false,
          canceled_at = NULL,
          updated_at = now();

    UPDATE public.pending_plan_grants
       SET granted_at = now(), granted_user_id = NEW.id
     WHERE id = g.id;
  EXCEPTION WHEN OTHERS THEN
    -- Never block signup; grant will be applied on next login via RPC.
    RAISE WARNING 'apply_pending_plan_grant failed for %: %', NEW.email, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 2) Client-callable RPC: applies any pending grant to the CURRENT signed-in user.
CREATE OR REPLACE FUNCTION public.claim_pending_plan_grant()
RETURNS TABLE (applied boolean, plan_id text, current_period_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        updated_at = now();

  UPDATE public.pending_plan_grants
     SET granted_at = now(), granted_user_id = uid
   WHERE id = g.id;

  RETURN QUERY SELECT true, g.plan_id, period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_plan_grant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_pending_plan_grant() TO authenticated;
