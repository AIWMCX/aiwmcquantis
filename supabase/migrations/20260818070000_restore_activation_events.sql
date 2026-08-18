-- Migration-ledger drift recovery — Activation follow-up (PR #41) — 2026-08-18
--
-- Restores public.activation_events and its three functions
-- (get_user_activation_score, get_activation_funnel, get_activation_kpis),
-- missing from production since origin migration 20260426174842 despite
-- being marked applied -- consistent with the whole-transaction-rollback
-- pattern documented throughout this session's PR #41 recovery work.
--
-- DELIBERATE PRODUCT DECISION, not a default restore (per explicit
-- instruction not to simply resurrect a second analytics store):
--
-- funnel_events (restored/verified live in the Activation/Feedback slice,
-- see docs/MIGRATION_LEDGER_DRIFT_AUDIT_2026-08-17.md and
-- docs/MIGRATION_CONTROL_PLANE.md) is the canonical COMMERCIAL-FUNNEL store
-- -- did the user engage with the decision (verdict_viewed, scenario_compared,
-- assumption_changed, upgrade_cta_seen, subscription_started). Checked
-- whether get_user_activation_score() could instead be rewritten against
-- funnel_events' vocabulary. It cannot, without either dropping real signal
-- or building new instrumentation from scratch:
--   - activation_events' 8 event types (idea_entered, location_entered,
--     calculation_completed, pdf_exported, return_visit, doc_generated,
--     scenario_edited, invoice_created) and funnel_events' vocabulary
--     overlap on at most 2 of 8 (calculation_completed ~ analysis_completed;
--     scenario_edited ~ assumption_changed/scenario_compared).
--   - pdf_exported, doc_generated, invoice_created -- three of the highest-
--     weighted events (25/20/25) and three of contextualTriggers.ts's
--     highest-priority triggers (T1, T5, T6) -- have NO representation in
--     funnel_events at all today. A rewrite would silently kill those
--     upgrade triggers, not just relabel them.
--   - return_visit has no funnel_events analog without a new derived-event
--     mechanism.
-- These are two legitimately different domains: funnel_events answers
-- "did they engage with the decision," activation_events answers "are they
-- a power user across product surfaces" (feeding upgrade-trigger heuristics).
-- Restoring activation_events as a narrow, clearly-scoped store is the
-- correct call, not a violation of the "one canonical store" principle --
-- that principle is about not having two stores independently define the
-- SAME funnel, which this does not do.
--
-- Reach confirmed before restoring (per "do not restore a table simply
-- because code exists"): ActivationWidget is mounted in AppSidebar.tsx
-- (every authenticated page), ContextualUpgradeBanner and MyStats.tsx both
-- call useActivation() directly, and ActivationKpiCard is mounted in
-- AdminDashboard.tsx. All four consumers are currently reading/writing
-- against a table that does not exist -- every write silently fails
-- (logger.warn, swallowed) and every RPC call errors, defaulting the UI to
-- score=0/band='new' for every single user.
--
-- Schema and functions replayed verbatim from the origin migration (no
-- current-pattern drift to correct here -- the table never existed live,
-- so there is no "current live version" to diff against) with this
-- session's idempotency conventions layered on top (IF NOT EXISTS,
-- DROP POLICY IF EXISTS, explicit REVOKE/GRANT rather than relying on RLS
-- alone). Verified subscriptions.plan_id/status (read by get_activation_kpis)
-- exist on the live schema before writing this -- no is_public-style
-- surprise this time.

CREATE TABLE IF NOT EXISTS public.activation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_value INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_events_user_id ON public.activation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_events_event_type ON public.activation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_activation_events_created_at ON public.activation_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_user_created ON public.activation_events(user_id, created_at DESC);

ALTER TABLE public.activation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anonymous access to activation_events" ON public.activation_events;
CREATE POLICY "Deny anonymous access to activation_events"
  ON public.activation_events FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Users can view own activation events" ON public.activation_events;
CREATE POLICY "Users can view own activation events"
  ON public.activation_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activation events" ON public.activation_events;
CREATE POLICY "Users can insert own activation events"
  ON public.activation_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all activation events" ON public.activation_events;
CREATE POLICY "Admins can view all activation events"
  ON public.activation_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages activation_events" ON public.activation_events;
CREATE POLICY "Service role manages activation_events"
  ON public.activation_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.activation_events FROM anon;
REVOKE ALL ON TABLE public.activation_events FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.activation_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activation_events TO service_role;

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
  -- NULL-safe: is_service_role() returns SQL NULL (not false) when neither
  -- JWT claim is set, since it's `a = 'x' OR b = 'x'` with both operands
  -- unset -- NULL OR false = NULL. Un-wrapped, `NOT NULL` collapses this
  -- whole condition to NULL, and PL/pgSQL's `IF NULL THEN` is falsy, so the
  -- RAISE never fires: a real cross-user data leak, found live while
  -- verifying this restoration (a non-admin successfully read another
  -- user's activation score). COALESCE forces the missing-claim case closed.
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') AND NOT COALESCE(public.is_service_role(), false) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb)
  INTO v_event_counts
  FROM (
    SELECT event_type, COUNT(*)::int AS cnt
    FROM public.activation_events
    WHERE user_id = p_user_id
    GROUP BY event_type
  ) sub;

  v_score :=
    LEAST(3, COALESCE((v_event_counts->>'idea_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'location_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'calculation_completed')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'pdf_exported')::int, 0)) * 25 +
    LEAST(3, COALESCE((v_event_counts->>'return_visit')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'doc_generated')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'scenario_edited')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'invoice_created')::int, 0)) * 25;

  v_score := LEAST(100, v_score);

  SELECT COUNT(DISTINCT event_type)::int INTO v_unique_events
  FROM public.activation_events
  WHERE user_id = p_user_id;

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

  SELECT COUNT(DISTINCT user_id)::int INTO v_waf
  FROM public.activation_events
  WHERE event_type = 'calculation_completed'
    AND created_at > now() - interval '7 days';

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

DO $$
BEGIN
  IF to_regclass('public.activation_events') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.activation_events still does not exist';
  END IF;
  IF has_table_privilege('anon', 'public.activation_events', 'SELECT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can read activation_events';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_activation_score') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: get_user_activation_score missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_activation_funnel') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: get_activation_funnel missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_activation_kpis') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: get_activation_kpis missing';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: activation_events restored with all 3 functions, anon denied';
END $$;
