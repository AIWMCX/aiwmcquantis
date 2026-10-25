-- Allow 'paid_review_view' (/decision-review page view) in funnel_events.
-- It was GA4-only; the page now records it through recordFunnelEvent, and the
-- CHECK constraint would otherwise reject the row silently (the RPC is
-- fire-and-forget). Same additive pattern as 20261003130000; live constraint
-- read with pg_get_constraintdef on 2026-10-24 before writing this.

ALTER TABLE public.funnel_events
  DROP CONSTRAINT IF EXISTS funnel_events_canonical_name_chk;
ALTER TABLE public.funnel_events
  ADD CONSTRAINT funnel_events_canonical_name_chk
  CHECK (event_name = ANY (ARRAY[
    'home_view', 'free_signup_start', 'free_signup_complete', 'analysis_start', 'analysis_complete',
    'pricing_view', 'paid_checkout_start', 'paid_checkout_complete', 'idea_submitted', 'analysis_started',
    'analysis_completed', 'verdict_viewed', 'upgrade_cta_seen', 'subscription_started', 'vs_page_view',
    'share_link_created', 'share_originated_signup', 'open_the_hood_view', 'open_the_hood_scroll_75',
    'open_the_hood_cta_click', 'sample_view', 'analysis_step_view', 'analysis_view', 'analysis_abandon',
    'trial_page_view', 'trial_redeem_click', 'sample_cta_click', 'analysis_step_complete',
    'sample_pdf_download', 'sample_full_open', 'scenario_compared', 'assumption_changed',
    'first_experience_demo_started', 'first_experience_demo_step_viewed',
    'first_experience_variable_inspected', 'first_experience_demo_completed',
    'first_experience_own_decision_started', 'first_experience_resolved', 'first_experience_redirected',
    'first_experience_demo_skipped', 'new_decision_viewed', 'decision_type_selected',
    'decision_input_started', 'result_rendered', 'result_viewed', 'driver_inspected',
    'next_action_selected', 'subscription_activated', 'subscription_failed', 'subscription_cancelled',
    'independent_review_viewed', 'decision_consensus_viewed', 'decision_breakpoint_viewed',
    'paid_review_view'
  ]::text[]));

DO $$
BEGIN
  IF pg_get_constraintdef((SELECT oid FROM pg_constraint WHERE conname = 'funnel_events_canonical_name_chk'))
     NOT LIKE '%paid_review_view%' THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: paid_review_view not allowed';
  END IF;
END $$;
