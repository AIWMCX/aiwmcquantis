-- Commercial fulfillment framework for the live $349 Founder Decision Review
-- and $499 Consultant Founding Pilot.
--
-- The Stripe webhook and session-bound intake edge function are the only
-- service-role writers. Customers never receive direct table access.

ALTER TABLE public.paid_engagements
  ADD COLUMN IF NOT EXISTS amount_paid_minor INTEGER,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS case_capacity SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS cases_completed SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intake_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS intake_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_target_hours SMALLINT,
  ADD COLUMN IF NOT EXISTS delivery_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pilot_window_days SMALLINT,
  ADD COLUMN IF NOT EXISTS pilot_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS substantive_work_started_at TIMESTAMPTZ;

-- The previous partial unique index could not reliably back PostgREST's
-- ON CONFLICT (stripe_checkout_session_id) upsert. PostgreSQL UNIQUE already
-- permits multiple NULLs, so a real constraint is both safe and compatible.
ALTER TABLE public.paid_engagements
  DROP CONSTRAINT IF EXISTS paid_engagements_stripe_checkout_session_id_key;
DROP INDEX IF EXISTS public.paid_engagements_stripe_checkout_session_id_key;
ALTER TABLE public.paid_engagements
  ADD CONSTRAINT paid_engagements_stripe_checkout_session_id_key
  UNIQUE (stripe_checkout_session_id);

ALTER TABLE public.paid_engagements
  DROP CONSTRAINT IF EXISTS paid_engagements_payment_status_check,
  DROP CONSTRAINT IF EXISTS paid_engagements_intake_status_check,
  DROP CONSTRAINT IF EXISTS paid_engagements_case_progress_check,
  DROP CONSTRAINT IF EXISTS paid_engagements_amount_minor_check;

ALTER TABLE public.paid_engagements
  ADD CONSTRAINT paid_engagements_payment_status_check
    CHECK (payment_status IN ('pending', 'paid', 'partially_refunded', 'refunded', 'failed')),
  ADD CONSTRAINT paid_engagements_intake_status_check
    CHECK (intake_status IN ('pending', 'complete', 'needs_information', 'waived')),
  ADD CONSTRAINT paid_engagements_case_progress_check
    CHECK (case_capacity BETWEEN 1 AND 20 AND cases_completed BETWEEN 0 AND case_capacity),
  ADD CONSTRAINT paid_engagements_amount_minor_check
    CHECK (amount_paid_minor IS NULL OR amount_paid_minor >= 0);

UPDATE public.paid_engagements
SET
  case_capacity = CASE offer_code
    WHEN 'consultant_founding_pilot' THEN 2
    ELSE 1
  END,
  delivery_target_hours = COALESCE(delivery_target_hours, 48),
  pilot_window_days = CASE
    WHEN offer_code = 'consultant_founding_pilot' THEN COALESCE(pilot_window_days, 30)
    ELSE pilot_window_days
  END,
  amount_paid_minor = COALESCE(amount_paid_minor, (price_usd * 100)::INTEGER),
  payment_status = CASE
    WHEN stripe_checkout_session_id IS NOT NULL AND payment_status = 'pending' THEN 'paid'
    ELSE payment_status
  END,
  paid_at = CASE
    WHEN stripe_checkout_session_id IS NOT NULL THEN COALESCE(paid_at, engaged_at)
    ELSE paid_at
  END
WHERE offer_code IN ('founder_decision_review', 'consultant_founding_pilot');

CREATE INDEX IF NOT EXISTS paid_engagements_fulfillment_queue_idx
  ON public.paid_engagements (payment_status, intake_status, engaged_at)
  WHERE status = 'scheduled';

COMMENT ON COLUMN public.paid_engagements.amount_paid_minor IS
  'Webhook-confirmed Stripe amount in minor units. Never derive fulfillment from price_usd alone.';
COMMENT ON COLUMN public.paid_engagements.intake_data IS
  'Customer-supplied non-card engagement context captured only after server-side Checkout Session verification.';
COMMENT ON COLUMN public.paid_engagements.delivery_due_at IS
  'Operational target calculated when complete intake is received; not a guarantee.';

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.paid_engagements', 'SELECT')
     OR has_table_privilege('anon', 'public.paid_engagements', 'INSERT')
     OR has_table_privilege('anon', 'public.paid_engagements', 'UPDATE') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can access paid_engagements';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.paid_engagements'::regclass
      AND conname = 'paid_engagements_stripe_checkout_session_id_key'
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: Checkout Session uniqueness constraint missing';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: paid engagement fulfillment framework installed';
END $$;
