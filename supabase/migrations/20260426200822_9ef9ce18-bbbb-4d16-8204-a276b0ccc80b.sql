-- Spec §11.3 — failed-payment grace tracking + 30-day read-only history flag.
-- payment_failed_at: timestamp of the FIRST failed invoice in the current
--   delinquency cycle. Cleared on next successful invoice.paid.
-- history_readonly_until: when set in the future, the user retains read-only
--   access to past analyses even after their plan reverts to FREE.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS history_readonly_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_failed_at
  ON public.subscriptions (payment_failed_at)
  WHERE payment_failed_at IS NOT NULL;