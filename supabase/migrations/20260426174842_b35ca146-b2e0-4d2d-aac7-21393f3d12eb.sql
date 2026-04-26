-- ============================================
-- ACTIVATION EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.activation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_value INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_activation_events_user_id ON public.activation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_event_type ON public.activation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activation_events_created_at ON public.activation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_user_created ON public.activation_events(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

-- RLS: users can view their own events
CREATE POLICY "Users can view own activation events"
ON public.activation_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS: users can insert their own events
CREATE POLICY "Users can insert own activation events"
ON public.activation_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- RLS: admins can read all events
CREATE POLICY "Admins can view all activation events"
ON public.activation_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- ACTIVATION SCORING WEIGHTS
-- ============================================
-- Event type → score weight (canonical)
-- idea_entered: 10
-- location_entered: 10
-- calculation_completed: 20
-- pdf_exported: 25
-- return_visit: 15
-- doc_generated: 20
-- scenario_edited: 15
-- invoice_created: 25

-- ============================================
-- PER-USER ACTIVATION SCORE
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_activation_score(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_event_counts JSONB;
  v_band TEXT;
  v_next_step TEXT;
  v_unique_events INTEGER;
BEGIN
  -- Authz: user can read own; admins can read any
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Aggregate counts per event type
  SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb)
  INTO v_event_counts
  FROM (
    SELECT event_type, COUNT(*)::int AS cnt
    FROM public.activation_events
    WHERE user_id = p_user_id
    GROUP BY event_type
  ) sub;

  -- Compute weighted score (cap each event type's contribution to 3 occurrences)
  v_score :=
    LEAST(3, COALESCE((v_event_counts->>'idea_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'location_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'calculation_completed')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'pdf_exported')::int, 0)) * 25 +
    LEAST(3, COALESCE((v_event_counts->>'return_visit')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'doc_generated')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'scenario_edited')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'invoice_created')::int, 0)) * 25;

  -- Cap at 100
  v_score := LEAST(100, v_score);

  -- Distinct events (used for band logic)
  SELECT COUNT(DISTINCT event_type)::int INTO v_unique_events
  FROM public.activation_events
  WHERE user_id = p_user_id;

  -- Band assignment (matches strategy PDF)
  IF v_score >= 80 THEN
    v_band := 'champion';
    v_next_step := 'Upgrade to Plus and unlock unlimited analyses + investor-ready exports.';
  ELSIF v_score >= 50 THEN
    v_band := 'engaged';
    v_next_step := 'Export your analysis as PDF to see the full investor-ready report.';
  ELSIF v_score >= 25 THEN
    v_band := 'exploring';
    v_next_step := 'Run a full calculation to see your unit economics and verdict.';
  ELSE
    v_band := 'new';
    v_next_step := 'Enter your business idea and location to start your first analysis.';
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'band', v_band,
    'next_step', v_next_step,
    'event_counts', v_event_counts,
    'unique_events', v_unique_events
  );
END;
$$;

-- ============================================
-- ACTIVATION FUNNEL (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_activation_funnel(p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users INTEGER;
  v_idea_entered INTEGER;
  v_location_entered INTEGER;
  v_calc_completed INTEGER;
  v_pdf_exported INTEGER;
  v_return_visit INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(DISTINCT id)::int INTO v_total_users
  FROM auth.users
  WHERE created_at > now() - (p_days || ' days')::interval;

  SELECT COUNT(DISTINCT user_id)::int INTO v_idea_entered
  FROM public.activation_events
  WHERE event_type = 'idea_entered' AND created_at > now() - (p_days || ' days')::interval;

  SELECT COUNT(DISTINCT user_id)::int INTO v_location_entered
  FROM public.activation_events
  WHERE event_type = 'location_entered' AND created_at > now() - (p_days || ' days')::interval;

  SELECT COUNT(DISTINCT user_id)::int INTO v_calc_completed
  FROM public.activation_events
  WHERE event_type = 'calculation_completed' AND created_at > now() - (p_days || ' days')::interval;

  SELECT COUNT(DISTINCT user_id)::int INTO v_pdf_exported
  FROM public.activation_events
  WHERE event_type = 'pdf_exported' AND created_at > now() - (p_days || ' days')::interval;

  SELECT COUNT(DISTINCT user_id)::int INTO v_return_visit
  FROM public.activation_events
  WHERE event_type = 'return_visit' AND created_at > now() - (p_days || ' days')::interval;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'total_new_users', v_total_users,
    'idea_entered', v_idea_entered,
    'location_entered', v_location_entered,
    'calculation_completed', v_calc_completed,
    'pdf_exported', v_pdf_exported,
    'return_visit', v_return_visit
  );
END;
$$;

-- ============================================
-- KPI: WAF, TRIAL-TO-PAID, RETENTION (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_activation_kpis()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waf INTEGER;
  v_total_signups INTEGER;
  v_paid_subs INTEGER;
  v_trial_to_paid_pct NUMERIC;
  v_retention_3m NUMERIC;
  v_retention_6m NUMERIC;
  v_retention_12m NUMERIC;
  v_cohort_3m INTEGER;
  v_cohort_6m INTEGER;
  v_cohort_12m INTEGER;
  v_active_3m INTEGER;
  v_active_6m INTEGER;
  v_active_12m INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Weekly Active Founders (distinct users with calculation_completed in last 7 days)
  SELECT COUNT(DISTINCT user_id)::int INTO v_waf
  FROM public.activation_events
  WHERE event_type = 'calculation_completed'
    AND created_at > now() - interval '7 days';

  -- Trial-to-paid conversion (last 90 days)
  SELECT COUNT(*)::int INTO v_total_signups
  FROM auth.users
  WHERE created_at > now() - interval '90 days';

  SELECT COUNT(*)::int INTO v_paid_subs
  FROM public.subscriptions s
  JOIN auth.users u ON u.id = s.user_id
  WHERE u.created_at > now() - interval '90 days'
    AND s.plan_id IN ('plus', 'pro', 'enterprise')
    AND s.status IN ('active', 'trialing');

  v_trial_to_paid_pct := CASE
    WHEN v_total_signups > 0 THEN ROUND((v_paid_subs::numeric / v_total_signups::numeric) * 100, 2)
    ELSE 0
  END;

  -- Retention cohorts: % of users from N months ago who returned in last 30 days
  -- 3-month cohort
  SELECT COUNT(*)::int INTO v_cohort_3m
  FROM auth.users
  WHERE created_at BETWEEN now() - interval '4 months' AND now() - interval '3 months';

  SELECT COUNT(DISTINCT u.id)::int INTO v_active_3m
  FROM auth.users u
  WHERE u.created_at BETWEEN now() - interval '4 months' AND now() - interval '3 months'
    AND EXISTS (
      SELECT 1 FROM public.activation_events e
      WHERE e.user_id = u.id AND e.created_at > now() - interval '30 days'
    );

  v_retention_3m := CASE WHEN v_cohort_3m > 0 THEN ROUND((v_active_3m::numeric / v_cohort_3m::numeric) * 100, 2) ELSE 0 END;

  -- 6-month cohort
  SELECT COUNT(*)::int INTO v_cohort_6m
  FROM auth.users
  WHERE created_at BETWEEN now() - interval '7 months' AND now() - interval '6 months';

  SELECT COUNT(DISTINCT u.id)::int INTO v_active_6m
  FROM auth.users u
  WHERE u.created_at BETWEEN now() - interval '7 months' AND now() - interval '6 months'
    AND EXISTS (
      SELECT 1 FROM public.activation_events e
      WHERE e.user_id = u.id AND e.created_at > now() - interval '30 days'
    );

  v_retention_6m := CASE WHEN v_cohort_6m > 0 THEN ROUND((v_active_6m::numeric / v_cohort_6m::numeric) * 100, 2) ELSE 0 END;

  -- 12-month cohort
  SELECT COUNT(*)::int INTO v_cohort_12m
  FROM auth.users
  WHERE created_at BETWEEN now() - interval '13 months' AND now() - interval '12 months';

  SELECT COUNT(DISTINCT u.id)::int INTO v_active_12m
  FROM auth.users u
  WHERE u.created_at BETWEEN now() - interval '13 months' AND now() - interval '12 months'
    AND EXISTS (
      SELECT 1 FROM public.activation_events e
      WHERE e.user_id = u.id AND e.created_at > now() - interval '30 days'
    );

  v_retention_12m := CASE WHEN v_cohort_12m > 0 THEN ROUND((v_active_12m::numeric / v_cohort_12m::numeric) * 100, 2) ELSE 0 END;

  RETURN jsonb_build_object(
    'waf', v_waf,
    'waf_target', 200,
    'trial_to_paid', jsonb_build_object(
      'percent', v_trial_to_paid_pct,
      'target_percent', 8,
      'signups_90d', v_total_signups,
      'paid_90d', v_paid_subs
    ),
    'retention', jsonb_build_object(
      '3m', jsonb_build_object('percent', v_retention_3m, 'target_percent', 60, 'cohort_size', v_cohort_3m, 'active', v_active_3m),
      '6m', jsonb_build_object('percent', v_retention_6m, 'target_percent', 45, 'cohort_size', v_cohort_6m, 'active', v_active_6m),
      '12m', jsonb_build_object('percent', v_retention_12m, 'target_percent', 30, 'cohort_size', v_cohort_12m, 'active', v_active_12m)
    ),
    'generated_at', now()
  );
END;
$$;