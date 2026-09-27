-- Activation-to-revenue Wave 5 (PR B, 2026-09-27): First Result Activation's
-- own telemetry (result_rendered, result_viewed, driver_inspected,
-- next_action_selected). Deliberately does NOT add a "real analysis
-- started" or duplicate verdict event -- 'verdict_viewed' and
-- 'assumption_changed'/'scenario_compared' already exist and mean
-- something adjacent but distinct (see src/lib/analytics.ts's own comment
-- on this event group).
--
-- Additive only (superset of the current allowlist) -- verified the full
-- current list via pg_get_constraintdef against LIVE production
-- immediately before writing this (not copied from a possibly-stale file),
-- matching the pattern from every prior wave's migration.

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
    'first_experience_redirected',
    'first_experience_demo_skipped',
    'new_decision_viewed',
    'decision_type_selected',
    'decision_input_started',
    'result_rendered',
    'result_viewed',
    'driver_inspected',
    'next_action_selected'
  ));
