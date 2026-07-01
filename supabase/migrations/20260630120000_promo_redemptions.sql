-- Durable, webhook-verified record of promo code redemptions.
-- Source of truth for "never show this promo invite again" — this table is
-- populated ONLY by supabase/functions/stripe-webhook on checkout.session.completed
-- (server-verified: Stripe actually applied the discount), never by the client.
-- One row per (user_id, promo_code) — the unique constraint is the hard
-- application-level guarantee that backs the Stripe-level max_redemptions cap.
create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  promo_code text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  redeemed_at timestamptz not null default now(),
  unique (user_id, promo_code)
);

create index if not exists idx_promo_redemptions_user on public.promo_redemptions(user_id);
create index if not exists idx_promo_redemptions_code on public.promo_redemptions(promo_code);

alter table public.promo_redemptions enable row level security;

-- Users may read only their own redemption rows — this is what lets the
-- frontend (usePromoStatus) permanently hide the promo banner client-side
-- once a real, webhook-confirmed redemption exists.
create policy "promo_redemptions_select_own"
  on public.promo_redemptions
  for select
  using (auth.uid() = user_id);

-- Deliberately no insert/update/delete policy for authenticated/anon roles.
-- Only the service_role key (used exclusively by the stripe-webhook function)
-- can write here, and it bypasses RLS. This prevents any client from ever
-- forging or clearing their own redemption record.
