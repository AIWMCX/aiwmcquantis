alter table public.paid_engagements
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists currency text,
  add column if not exists offer_code text;

create unique index if not exists paid_engagements_stripe_checkout_session_id_key
  on public.paid_engagements (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

comment on column public.paid_engagements.stripe_checkout_session_id is
  'Stripe Checkout Session ID for the payment that created this row. Unique (partial index, nulls allowed) so the webhook can upsert on conflict and never create a duplicate row for the same session, per QNT one-time-engagement fulfillment spec (2026-08-30).';
