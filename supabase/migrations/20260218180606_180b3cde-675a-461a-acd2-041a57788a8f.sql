
-- =====================================================
-- PHASE 1A: Fix update_engagement_on_analysis trigger
-- Add activity_score computation (was always 0 before)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_engagement_on_analysis()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := CURRENT_DATE;
  v_last_active date;
  v_current_streak integer;
  v_longest_streak integer;
  v_total_analyses integer;
  v_total_exports integer;
  v_new_streak integer;
  v_new_activity_score integer;
BEGIN
  -- Upsert engagement record (insert if not exists)
  INSERT INTO public.user_engagement (user_id, last_active_date, current_streak, longest_streak, total_analyses, total_exports, activity_score, engagement_tier)
  VALUES (NEW.user_id, v_today, 1, 1, 1, 0, 10, 'active')
  ON CONFLICT (user_id) DO UPDATE SET
    total_analyses = user_engagement.total_analyses + 1,
    updated_at = now();

  -- Read current state after upsert
  SELECT last_active_date, current_streak, longest_streak, total_analyses, total_exports
  INTO v_last_active, v_current_streak, v_longest_streak, v_total_analyses, v_total_exports
  FROM public.user_engagement
  WHERE user_id = NEW.user_id;

  -- Compute new streak
  IF v_last_active IS NULL OR v_last_active < v_today - 1 THEN
    v_new_streak := 1;
  ELSIF v_last_active = v_today - 1 THEN
    v_new_streak := v_current_streak + 1;
  ELSE
    v_new_streak := v_current_streak; -- same day
  END IF;

  -- Compute activity_score: (analyses * 10) + (exports * 15) + (streak * 5), cap at 100
  v_new_activity_score := LEAST(100, 
    (v_total_analyses * 10) + 
    (COALESCE(v_total_exports, 0) * 15) + 
    (v_new_streak * 5)
  );

  -- Update streak, last_active_date, and activity_score
  UPDATE public.user_engagement
  SET 
    current_streak = v_new_streak,
    longest_streak = GREATEST(COALESCE(longest_streak, 0), v_new_streak),
    last_active_date = v_today,
    activity_score = v_new_activity_score,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;

-- Re-create the trigger (in case it was dropped/missing)
DROP TRIGGER IF EXISTS on_analysis_created ON public.analyses;
CREATE TRIGGER on_analysis_created
  AFTER INSERT ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_engagement_on_analysis();

-- =====================================================
-- PHASE 1B: Fix handle_new_user to create user_engagement
-- record on signup so ALL users are tracked
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_phone_raw text;
  v_error_message text;
  v_error_detail text;
BEGIN
  v_phone_raw := NEW.raw_user_meta_data ->> 'phone';

  -- Insert profile
  BEGIN
    INSERT INTO public.profiles (id, full_name, phone_encrypted)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User'),
      CASE 
        WHEN v_phone_raw IS NOT NULL AND v_phone_raw != '' 
        THEN public.encrypt_pii(v_phone_raw)
        ELSE NULL
      END
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_detail = PG_EXCEPTION_DETAIL;
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (NEW.id, 'profile_creation_failed', jsonb_build_object('error', v_error_message, 'detail', v_error_detail, 'timestamp', NOW()));
  END;

  -- Create free subscription
  BEGIN
    INSERT INTO public.subscriptions (user_id, plan_id, status)
    VALUES (NEW.id, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_detail = PG_EXCEPTION_DETAIL;
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (NEW.id, 'subscription_creation_failed', jsonb_build_object('error', v_error_message, 'detail', v_error_detail, 'timestamp', NOW()));
  END;

  -- NEW: Create baseline user_engagement record on signup
  -- This ensures ALL users are tracked, not just those who run analyses
  BEGIN
    INSERT INTO public.user_engagement (
      user_id, 
      current_streak, 
      longest_streak, 
      total_analyses, 
      total_exports,
      activity_score,
      churn_risk_score,
      engagement_tier,
      email_frequency,
      milestones_achieved
    )
    VALUES (
      NEW.id, 0, 0, 0, 0, 0, 50, 'new', 'weekly', '[]'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT, v_error_detail = PG_EXCEPTION_DETAIL;
    INSERT INTO public.security_logs (user_id, event_type, event_data)
    VALUES (NEW.id, 'engagement_creation_failed', jsonb_build_object('error', v_error_message, 'detail', v_error_detail, 'timestamp', NOW()));
  END;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- PHASE 1C: Backfill user_engagement for existing users
-- who signed up but never ran an analysis
-- =====================================================
INSERT INTO public.user_engagement (
  user_id,
  current_streak,
  longest_streak,
  total_analyses,
  total_exports,
  activity_score,
  churn_risk_score,
  engagement_tier,
  email_frequency,
  milestones_achieved
)
SELECT 
  p.id,
  0, 0, 0, 0, 0, 60, 'dormant', 'weekly', '[]'::jsonb
FROM public.profiles p
WHERE p.id NOT IN (SELECT user_id FROM public.user_engagement)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- PHASE 1D: Backfill activity_score for existing users
-- based on their actual analysis and streak data
-- =====================================================
UPDATE public.user_engagement ue
SET 
  activity_score = LEAST(100, 
    (
      (SELECT COUNT(*) FROM public.analyses a WHERE a.user_id = ue.user_id) * 10
    ) + 
    (COALESCE(ue.total_exports, 0) * 15) + 
    (COALESCE(ue.current_streak, 0) * 5)
  ),
  -- Also sync total_analyses in case it drifted
  total_analyses = (SELECT COUNT(*) FROM public.analyses a WHERE a.user_id = ue.user_id),
  updated_at = now()
WHERE true;

-- =====================================================
-- Verify: show current state after fixes
-- =====================================================
-- (This is just a comment - the migration itself runs the UPDATEs above)
