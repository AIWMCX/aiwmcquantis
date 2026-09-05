-- Applied directly to production via the Supabase MCP tool on 2026-09-04,
-- before GitHub repository access was available in that session. Committed
-- here now, at its actual ledger-assigned version, to close the ledger/repo
-- drift this omission caused (caught by scripts/verify-migration-ledger.mjs
-- blocking every Production Deploy since).
--
-- Step 1 of 2 (paired with engagement_transition_rules_and_failure_paths):
-- add new enum values only. Postgres restricts using a brand-new enum
-- value inside the same transaction it was added in, so this is
-- deliberately its own migration, separate from the function/table changes
-- that consume these values.
alter type public.engagement_journey_state add value 'payment_failed';
alter type public.engagement_journey_state add value 'checkout_expired';
alter type public.engagement_journey_state add value 'canceled';
alter type public.engagement_journey_state add value 'refunded';
alter type public.engagement_journey_state add value 'partially_refunded';
alter type public.engagement_journey_state add value 'admin_corrected';
alter type public.engagement_journey_state add value 'intake_abandoned';
