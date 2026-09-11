-- Stripe<->Supabase subscription reconciliation job (founder-approved,
-- 2026-09-11). Real, previously-uncaught drift this session: a subscription
-- Stripe canceled for payment_failed on 2026-07-31 stayed active/pro in
-- Supabase for 5+ weeks because its customer.subscription.deleted webhook
-- event was never received -- found only because two audit reports
-- disagreed, not because any monitoring caught it. This table backs a
-- scheduled job that checks every "active"/"trialing" Supabase subscription
-- with a real Stripe ID against live Stripe state daily, so a future
-- delivery gap surfaces automatically instead of persisting for weeks.

create table public.stripe_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  checked_count integer not null default 0,
  drift_found_count integer not null default 0,
  repaired_count integer not null default 0,
  ambiguous_count integer not null default 0,
  error_message text,
  details jsonb not null default '[]'::jsonb
);

comment on table public.stripe_reconciliation_runs is
  'One row per scheduled reconciliation run. details is an array of {subscription_id, stripe_subscription_id, supabase_status, stripe_status, action_taken} objects for every row where Supabase and Stripe disagreed -- deterministic cases (Stripe says canceled/incomplete_expired/unpaid, Supabase still says active/trialing) are auto-repaired via the same mark_subscription_canceled RPC the webhook itself uses; anything else (e.g. Stripe object not found, unexpected status combination) is recorded as ambiguous_count and left for manual review, never guessed at.';

alter table public.stripe_reconciliation_runs enable row level security;
alter table public.stripe_reconciliation_runs force row level security;

create index stripe_reconciliation_runs_started_idx on public.stripe_reconciliation_runs(started_at desc);

create policy "Admins can read reconciliation runs"
  on public.stripe_reconciliation_runs for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Service role manages reconciliation runs"
  on public.stripe_reconciliation_runs for all
  to service_role
  using (true) with check (true);

revoke all on table public.stripe_reconciliation_runs from anon, authenticated;
grant select on table public.stripe_reconciliation_runs to authenticated;
grant all on table public.stripe_reconciliation_runs to service_role;
