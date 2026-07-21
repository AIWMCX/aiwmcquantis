-- Domain 14 audit (Q131/Q140, 2026-07-21 profitability audit): the app has
-- no staged activation ladder between "verdict viewed" and "paid checkout
-- start" -- no way to see whether a user actually engages with scenario
-- comparison or edits an assumption before either converting or churning.
-- Adds the two events being wired in AccuracyTransparentResults.tsx this
-- commit. Additive only (superset of the current allowlist) -- verified
-- the full current list first via direct query before writing this.

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
    'assumption_changed'
  ));
