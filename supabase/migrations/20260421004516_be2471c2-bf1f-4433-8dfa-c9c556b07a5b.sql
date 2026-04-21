ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS canceled_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS subscriptions_canceled_at_idx
  ON public.subscriptions (canceled_at)
  WHERE canceled_at IS NOT NULL;

COMMENT ON COLUMN public.subscriptions.canceled_at IS
  'When the subscription was canceled. plan_id stays intact until current_period_end (soft downgrade); the process-subscription-downgrades cron flips plan_id to free at period end.';