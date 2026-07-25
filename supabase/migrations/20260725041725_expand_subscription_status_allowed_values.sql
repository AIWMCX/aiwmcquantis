-- Finding 16-1 (Stripe billing audit 2026-07-22/24): the stripe-webhook handlers
-- previously defaulted ANY unrecognized Stripe status to "active", because the
-- CHECK constraint only permitted 4 values. Confirmed live: subscription
-- sub_1TotZjLKMhSmZURCEpzsCh7M is past_due in Stripe (4 failed charge attempts,
-- $0 paid) while our row still reads active -- granting paid access on a failing
-- subscription.
--
-- This widens the allowed set to the full Stripe subscription status vocabulary
-- so the handler fix can pass real statuses through instead of masking them.
-- Additive only: every existing row already holds one of the original 4 values.

alter table public.subscriptions drop constraint if exists valid_status;

alter table public.subscriptions add constraint valid_status
  check (status = any (array[
    'active',
    'canceled',
    'past_due',
    'trialing',
    'incomplete',
    'incomplete_expired',
    'unpaid',
    'paused'
  ]));
