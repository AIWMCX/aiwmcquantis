-- First Decision Experience, Wave 1 (2026-09-25): replaces the dead
-- OnboardingTour.tsx with an interactive walkthrough of the SAME production
-- founder-demo fixture/engine already live at /demo/founder-decision-review,
-- so a new user learns facts-vs-assumptions -> connected economics ->
-- stress test -> sensitivity -> decision gate instead of a feature tour.
-- These 5 events are demo-context only (see `context: "demo"` in the
-- analytics payload) and must never be counted toward commercial
-- activation alongside `assumption_changed`/`scenario_compared`, which are
-- the real-usage versions of the same concepts.
-- Additive only (superset of the current allowlist) -- verified the full
-- current list via `pg_get_constraintdef` against live prod before writing
-- this, matching the pattern from 20260721184551_add_activation_ladder_events.sql.

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
    'first_experience_own_decision_started'
  ));
