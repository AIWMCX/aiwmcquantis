-- First Decision Experience, Wave 2 (2026-09-25): server-side persistence
-- for "has this authenticated user started/completed the /app/start demo".
-- Wave 1 (PR #184) shipped the route and a client-only React state machine
-- (src/hooks/useFirstExperienceDemo.ts) with no durable state -- progress
-- was lost on refresh/new device. This table fixes that, WITHOUT changing
-- any routing/redirect behavior (that is a later wave).
--
-- Modeled directly on the dominant pattern for user-owned feature state in
-- this codebase (verified live via pg_policies/pg_get_functiondef before
-- writing this, not just local migration files, per this project's known
-- migration/prod drift history):
--   - a dedicated table (like user_brand_profiles, activation_events),
--     NOT new columns on `profiles` -- profiles is deliberately kept to
--     6 identity/consent columns; every other per-user feature concern
--     already lives in its own table.
--   - direct RLS (auth.uid() = user_id) plus an explicit anon-deny ALL,
--     matching activation_events / user_brand_profiles.
--   - SECURITY DEFINER RPC functions for read/write (get_.../mark_...),
--     matching get_user_brand_profile / upsert_user_brand_profile /
--     record_funnel_event, rather than direct client table access.
--
-- Only demo_started_at / demo_completed_at / demo_version are added now.
-- The founder's fuller spec (first_decision_started_at, first_analysis_id,
-- activation_achieved_at) belongs to later waves once the real intake and
-- resolver actually exist -- adding unused columns now would be writing
-- ahead of the feature that needs them.

CREATE TABLE IF NOT EXISTS public.first_experience_demo_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  demo_version text NOT NULL,
  demo_started_at timestamptz NOT NULL DEFAULT now(),
  demo_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.first_experience_demo_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_crud_own_first_experience_demo_state"
  ON public.first_experience_demo_state
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anon_deny_first_experience_demo_state"
  ON public.first_experience_demo_state
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Idempotent: re-calling after the row already exists updates demo_version
-- (in case the fixture/demo ships a new version) but never overwrites the
-- original demo_started_at -- that timestamp is "when this user first saw
-- the demo", not "when they last opened it".
CREATE OR REPLACE FUNCTION public.mark_first_experience_demo_started(_demo_version text)
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

  INSERT INTO public.first_experience_demo_state (user_id, demo_version, demo_started_at, updated_at)
  VALUES (v_uid, _demo_version, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    demo_version = _demo_version,
    updated_at = now();
END;
$function$;

-- Idempotent for the same reason: the FIRST completion timestamp is the
-- meaningful one for "did this user ever finish the demo".
CREATE OR REPLACE FUNCTION public.mark_first_experience_demo_completed(_demo_version text)
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

  INSERT INTO public.first_experience_demo_state (user_id, demo_version, demo_started_at, demo_completed_at, updated_at)
  VALUES (v_uid, _demo_version, now(), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    demo_version = _demo_version,
    demo_completed_at = COALESCE(public.first_experience_demo_state.demo_completed_at, now()),
    updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_first_experience_demo_state()
RETURNS TABLE(demo_version text, demo_started_at timestamptz, demo_completed_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT s.demo_version, s.demo_started_at, s.demo_completed_at
  FROM public.first_experience_demo_state s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
$function$;
