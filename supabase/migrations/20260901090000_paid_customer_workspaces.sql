-- Customer-facing paid workspaces for the Founder Review and Consultant Pilot.
-- Data remains service-role controlled; the payment session is the capability token.
ALTER TABLE public.paid_engagements
  ADD COLUMN IF NOT EXISTS workspace_status TEXT NOT NULL DEFAULT 'intake',
  ADD COLUMN IF NOT EXISTS workspace_data JSONB NOT NULL DEFAULT '{"version":1,"stage":"intake","assumptions":[],"scenarios":[],"questions":[],"cases":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS workspace_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_last_active_at TIMESTAMPTZ;

ALTER TABLE public.paid_engagements
  DROP CONSTRAINT IF EXISTS paid_engagements_workspace_status_check,
  DROP CONSTRAINT IF EXISTS paid_engagements_workspace_data_check;

ALTER TABLE public.paid_engagements
  ADD CONSTRAINT paid_engagements_workspace_status_check
    CHECK (workspace_status IN ('intake','briefing','analysis','review','delivered','closed')),
  ADD CONSTRAINT paid_engagements_workspace_data_check
    CHECK (jsonb_typeof(workspace_data) = 'object');

UPDATE public.paid_engagements
SET workspace_updated_at = COALESCE(workspace_updated_at, updated_at),
    customer_last_active_at = COALESCE(customer_last_active_at, updated_at)
WHERE workspace_updated_at IS NULL OR customer_last_active_at IS NULL;

CREATE INDEX IF NOT EXISTS paid_engagements_workspace_queue_idx
  ON public.paid_engagements (workspace_status, customer_last_active_at)
  WHERE payment_status = 'paid' AND status = 'scheduled';

COMMENT ON COLUMN public.paid_engagements.workspace_data IS
  'Versioned customer-supplied decision workspace data. No card data or payment secrets.';
