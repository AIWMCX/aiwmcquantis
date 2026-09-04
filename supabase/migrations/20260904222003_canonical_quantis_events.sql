-- Priority 4: Canonical Revenue and Activation Events.
-- Additive only; existing funnel_events call sites remain unchanged.

create table public.quantis_events (
  id bigint generated always as identity primary key,
  event_version smallint not null default 1,
  event_name text not null,
  occurred_at timestamptz not null default now(),
  anonymous_id text,
  user_id uuid,
  analysis_run_id uuid,
  engagement_id uuid references public.paid_engagements(id),
  offer_id text check (
    offer_id is null or
    offer_id in ('founder_review_349', 'consultant_pilot_499')
  ),
  source text,
  status text not null check (status in ('started', 'succeeded', 'failed')),
  failure_code text,
  created_at timestamptz not null default now()
);

create index quantis_events_event_name_occurred_at_idx
  on public.quantis_events (event_name, occurred_at);
create index quantis_events_engagement_id_idx
  on public.quantis_events (engagement_id)
  where engagement_id is not null;
create index quantis_events_analysis_run_id_idx
  on public.quantis_events (analysis_run_id)
  where analysis_run_id is not null;

alter table public.quantis_events enable row level security;
