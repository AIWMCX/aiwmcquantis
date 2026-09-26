-- First Decision Experience, Wave 3 (2026-09-26): routing resolver support.
-- Adds exactly what the resolver needs and nothing else -- no new table
-- (reusing Wave 2's first_experience_demo_state, per the spec's explicit
-- "do not add a second onboarding persistence model" instruction), and a
-- derived check for "has this user ever completed a REAL analysis" rather
-- than a duplicated boolean flag (the spec's own "prefer canonical business
-- records over duplicated booleans" instruction) -- there was no existing
-- helper for this, confirmed by grep across supabase/functions and
-- supabase/migrations before writing this.

-- 1. Skip contract (spec section 6): a user can explicitly skip the demo
-- from its intro screen. Without a distinct skipped state, the resolver
-- would have no way to tell "abandoned mid-demo, should resume" apart from
-- "explicitly declined, should never be shown the demo again" -- both would
-- otherwise look identical (demo_started_at set, demo_completed_at null).
ALTER TABLE public.first_experience_demo_state
  ADD COLUMN IF NOT EXISTS demo_skipped_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_first_experience_demo_skipped(_demo_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.first_experience_demo_state (user_id, demo_version, demo_started_at, demo_skipped_at, updated_at)
  VALUES (v_uid, _demo_version, now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    demo_version = _demo_version,
    demo_skipped_at = COALESCE(public.first_experience_demo_state.demo_skipped_at, now()),
    updated_at = now();
END;
$function$;

-- get_first_experience_demo_state must also return the skip timestamp, or
-- the resolver and the useFirstExperienceDemoState hook can't see it.
-- Postgres cannot CREATE OR REPLACE a function into a new return type
-- (RETURNS TABLE shape changed) -- the old signature must be dropped first.
DROP FUNCTION IF EXISTS public.get_first_experience_demo_state();

CREATE FUNCTION public.get_first_experience_demo_state()
RETURNS TABLE(demo_version text, demo_started_at timestamptz, demo_completed_at timestamptz, demo_skipped_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.demo_version, s.demo_started_at, s.demo_completed_at, s.demo_skipped_at
  FROM public.first_experience_demo_state s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
$function$;

-- 2. Derived (not persisted) check for "has this user ever completed a
-- REAL analysis" -- the ground-truth signal per public.analyses, whose
-- own comment (20260816000000_analysis_complete_event_trigger.sql) states
-- it "only stores completed runs". The existing idx_analyses_user_created
-- (user_id, created_at DESC) index makes this EXISTS check cheap.
CREATE OR REPLACE FUNCTION public.has_completed_real_analysis()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.analyses WHERE user_id = auth.uid()
  );
$function$;

-- 3. New funnel events for the resolver itself (spec section 14) --
-- extending the existing canonical allowlist, not a parallel store.
-- Verified the current full list live via pg_get_constraintdef immediately
-- before writing this, per this project's documented migration/prod drift
-- history.
ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_canonical_name_chk;

ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_canonical_name_chk
  CHECK (event_name IN (
    'home_view',
    'free_signup_start',
    'free_signup_complete',
    'analysis_start',
    'analysis_complete',
    'pricing_view',
    'paid_checkout_start',
    'paid_checkout_complete',
    'idea_submitted',
    'analysis_started',
    'analysis_completed',
    'verdict_viewed',
    'upgrade_cta_seen',
    'subscription_started',
    'vs_page_view',
    'share_link_created',
    'share_originated_signup',
    'open_the_hood_view',
    'open_the_hood_scroll_75',
    'open_the_hood_cta_click',
    'sample_view',
    'analysis_step_view',
    'analysis_view',
    'analysis_abandon',
    'trial_page_view',
    'trial_redeem_click',
    'sample_cta_click',
    'analysis_step_complete',
    'sample_pdf_download',
    'sample_full_open',
    'scenario_compared',
    'assumption_changed',
    'first_experience_demo_started',
    'first_experience_demo_step_viewed',
    'first_experience_variable_inspected',
    'first_experience_demo_completed',
    'first_experience_own_decision_started',
    'first_experience_resolved',
    'first_experience_redirected'
  ));
