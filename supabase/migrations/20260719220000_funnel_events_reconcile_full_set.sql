-- ============================================================================
-- Reconcile funnel_events_canonical_name_chk with what production actually
-- logs (2026-07-19 migration-backlog reconciliation).
--
-- 20260706120000_funnel_events_full_allowlist.sql was itself part of the
-- Jul 4-14 backlog that had never been applied to production. By the time
-- it was applied today, the live funnel_events table already contained 10
-- more distinct event_name values than that migration's allowlist covers
-- (sample_view, analysis_step_view, analysis_view, analysis_abandon,
-- trial_page_view, trial_redeem_click, sample_cta_click,
-- analysis_step_complete, sample_pdf_download, sample_full_open) — added to
-- the TypeScript union at some point with no matching migration, the exact
-- gap 20260705140000 and 20260706120000 were each written to close for an
-- earlier batch of names.
--
-- Applying 20260706120000's constraint verbatim today would have started
-- silently rejecting all 10 of those in-use event types. This migration
-- records the actual constraint applied: the prior allowlist unioned with
-- every value already live in production. Any new event name added to the
-- frontend union going forward still needs a matching migration here — this
-- does not fix that structural gap, only the immediate one.
-- ============================================================================

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
    'sample_full_open'
  ));
