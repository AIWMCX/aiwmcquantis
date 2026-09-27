-- Activation-to-revenue Wave 4 (2026-09-26): /app/new-decision's own
-- intent-capture telemetry (new_decision_viewed, decision_type_selected,
-- decision_input_started). Deliberately does NOT add a "real analysis
-- started" event -- 'analysis_started' already means exactly that and
-- already fires from the existing useAnalysis() submit handoff (see
-- src/lib/analytics.ts's SowFunnelEvent comment) -- adding a synonym for
-- the same moment would violate the founder's own "no coexisting
-- synonyms" rule (spec section 6).
--
-- Additive only (superset of the current allowlist) -- verified the full
-- current list via a live disposable transaction before writing this,
-- matching the pattern from 20260926010000_first_experience_wave3_resolver_support.sql.

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
    'decision_input_started'
  ));
