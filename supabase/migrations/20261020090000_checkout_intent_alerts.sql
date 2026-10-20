-- Checkout-intent alerts: one row per external paid_checkout_start event that
-- the founder has been emailed about, so notify-checkout-intent never repeats.
create table if not exists public.checkout_intent_alerts (
  funnel_event_id uuid primary key,
  session_id text,
  offer text,
  alerted_at timestamptz not null default now(),
  email_id text
);

alter table public.checkout_intent_alerts enable row level security;
-- No policies: only the service role (the edge function) reads or writes it.

comment on table public.checkout_intent_alerts is
  'Dedupe ledger for founder checkout-intent emails (notify-checkout-intent).';
