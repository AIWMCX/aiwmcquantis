-- ============================================================================
-- Add share_link_created / share_originated_signup to the funnel_events
-- canonical name allowlist (MP2 WS-5 — share loop distinct event logging).
-- Without this, record_funnel_event() rejects both via the existing
-- funnel_events_canonical_name_chk CHECK constraint and the row is never
-- persisted (client-side GA4 mirror still fires, Supabase sink silently
-- drops it) — same failure mode already affecting several other
-- SowFunnelEvent values (idea_submitted, verdict_viewed, etc.) that were
-- added to the TS union without a matching migration. Not fixing those
-- here — out of scope for this pass — but not repeating the mistake for
-- the two new values this migration introduces.
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
    'share_link_created',
    'share_originated_signup'
  ));
