
CREATE TABLE IF NOT EXISTS public.pending_plan_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plan_id text NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  note text,
  granted_at timestamptz,
  granted_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pending_plan_grants_email_unique_pending
  ON public.pending_plan_grants (lower(email)) WHERE granted_at IS NULL;

GRANT ALL ON public.pending_plan_grants TO service_role;
ALTER TABLE public.pending_plan_grants ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role / SECURITY DEFINER functions may access.

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_pending_plan_grant ON auth.users;
CREATE TRIGGER trg_apply_pending_plan_grant
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.apply_pending_plan_grant();
