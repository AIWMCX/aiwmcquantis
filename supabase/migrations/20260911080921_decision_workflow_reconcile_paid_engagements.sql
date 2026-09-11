-- Correction, same session as the Day 1 schema (20260911075212): discovered
-- immediately after merging that a live, tested payment pipeline already
-- exists for exactly these two offers -- Stripe Payment Links -> stripe-webhook
-- -> public.paid_engagements (shipped 2026-08-30, offer codes
-- 'founder_decision_review' / 'consultant_founding_pilot' in
-- supabase/functions/_shared/engagement-offers.ts). workflow_entitlements
-- would have been a second, competing "did this person pay" record for the
-- same purchase -- paid_engagements already IS that record, with idempotent
-- Stripe fulfillment, refund tracking, and journey_state. Dropping the
-- redundant table now (zero rows, zero application code references it yet)
-- rather than letting two systems answer the same question.

alter table public.decision_workspaces
  add column paid_engagement_id uuid references public.paid_engagements(id);

-- Backfill is a no-op (zero workspaces exist yet), but the column must be
-- nullable=false eventually once app code always supplies it; left nullable
-- for now since decision_workspaces.entitlement_id is being dropped in the
-- same migration and no workspace currently exists to violate a not-null.
alter table public.decision_workspaces
  drop constraint decision_workspaces_entitlement_id_fkey,
  drop column entitlement_id;

drop table public.workflow_entitlements;

create index decision_workspaces_paid_engagement_idx on public.decision_workspaces(paid_engagement_id);

comment on column public.decision_workspaces.paid_engagement_id is
  'The canonical "did this person pay" link -- public.paid_engagements, not a separate entitlement table. One paid_engagements row may eventually own more than one decision_workspaces row is NOT assumed here (Consultant Founding Pilot has case_capacity=2, i.e. two client cases per purchase) -- this column is intentionally not unique, so a single paid engagement can back multiple workspaces (one per case) once the consultant multi-case flow is built.';
