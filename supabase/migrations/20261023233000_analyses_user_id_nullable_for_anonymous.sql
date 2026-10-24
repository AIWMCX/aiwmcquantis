-- Third blocker for anonymous saves (verified live 2026-10-23 after #302/#303):
-- the insert now passes RLS but fails with 23502 'null value in column
-- "user_id" of relation "analyses" violates not-null constraint'. The May
-- 2026 anonymous design assumed user_id was nullable; it never was.
--
-- 1. analyses.user_id becomes nullable. Owner-scoped RLS (user_id = auth.uid())
--    never matches NULL, so no new rows become visible to anyone; the only
--    anon write path is the restrictive policy from 20261023230000.
-- 2. update_engagement_on_analysis() returns early for unowned rows; it
--    inserted NEW.user_id into user_engagement and would fail the insert.
--    Body otherwise identical to 20260818040000.
-- notify_admin_new_analysis() already handles NULL; the plans-metric and
-- analysis-complete triggers do not read user_id as required.

ALTER TABLE public.analyses ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.update_engagement_on_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last_active date;
  v_current_streak integer;
  v_longest_streak integer;
BEGIN
  -- Anonymous analyses have no owner yet; engagement is per user.
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_engagement (user_id, last_active_date, current_streak, total_analyses)
  VALUES (NEW.user_id, v_today, 1, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_analyses = user_engagement.total_analyses + 1,
    updated_at = now();

  SELECT last_active_date, current_streak, longest_streak
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM public.user_engagement
  WHERE user_id = NEW.user_id;

  IF v_last_active IS NULL OR v_last_active < v_today - 1 THEN
    UPDATE public.user_engagement
    SET current_streak = 1, last_active_date = v_today, updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSIF v_last_active = v_today - 1 THEN
    UPDATE public.user_engagement
    SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_active_date = v_today,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.user_engagement
    SET last_active_date = v_today, updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

