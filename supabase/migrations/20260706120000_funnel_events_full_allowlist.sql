-- ============================================================================
-- Complete the funnel_events canonical name allowlist.
--
-- The 20260705140000 migration's own comment flagged that several
-- SowFunnelEvent values already in the TypeScript union were never added
-- to this CHECK constraint: idea_submitted, analysis_started,
-- analysis_completed, verdict_viewed, upgrade_cta_seen,
-- subscription_started, vs_page_view. Every call to recordFunnelEvent()
-- with one of those names has been silently rejected by
-- record_funnel_event() since it was introduced — the row never persists,
-- even though the GA4 mirror still fires client-side. That migration
-- explicitly deferred fixing this ("out of scope for this pass").
--
-- Fixing it now because this migration is already touching the same
-- constraint to add the 3 new Screen-5 ("Open the Hood") engagement
-- events (MP2-DESIGN-01) — no reason to reintroduce the same gap for a
-- fourth time.
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
    'open_the_hood_cta_click'
  ));
