-- =============================================================================
-- Actual-outcome collection scaffold — Handbook §19 item 10
--
-- Quantis projects payback/ROI/breakeven at analysis time but has never
-- collected what actually happened. This is the schema + scheduling table
-- for a follow-up loop: at 1/3/6/12/24/36 months after an analysis, ask the
-- user (email/in-app prompt — the actual send mechanism is a separate,
-- future edge function/cron, not part of this migration) how their real
-- numbers compare to the projection, so projected-vs-actual accuracy can
-- eventually be measured instead of asserted.
--
-- Two tables:
--   analysis_outcome_schedule — one row per (analysis, checkpoint month),
--     created once at analysis time, tracks whether/when the prompt was sent.
--   analysis_outcomes — the actual response, once (if) the user provides it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analysis_outcome_schedule (
  id                bigserial PRIMARY KEY,
  created_at        timestamptz NOT NULL DEFAULT now(),
  analysis_id       uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  checkpoint_months integer NOT NULL CHECK (checkpoint_months IN (1, 3, 6, 12, 24, 36)),
  due_at            timestamptz NOT NULL,
  prompt_sent_at    timestamptz,
  responded_at      timestamptz,
  UNIQUE (analysis_id, checkpoint_months)
);

COMMENT ON TABLE public.analysis_outcome_schedule IS
  'One row per (analysis, checkpoint) — Handbook §19 item 10. Populated once at analysis time with 6 rows (1/3/6/12/24/36mo). due_at drives a future cron/edge function that sends the follow-up prompt; that sender is not part of this migration.';

CREATE INDEX IF NOT EXISTS idx_outcome_schedule_due
  ON public.analysis_outcome_schedule (due_at)
  WHERE prompt_sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outcome_schedule_analysis_id
  ON public.analysis_outcome_schedule (analysis_id);

CREATE TABLE IF NOT EXISTS public.analysis_outcomes (
  id                  bigserial PRIMARY KEY,
  created_at          timestamptz NOT NULL DEFAULT now(),
  schedule_id         bigint NOT NULL REFERENCES public.analysis_outcome_schedule(id) ON DELETE CASCADE,
  analysis_id         uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  checkpoint_months   integer NOT NULL CHECK (checkpoint_months IN (1, 3, 6, 12, 24, 36)),
  actual_mrr          numeric(14, 2),
  actual_net_profit   numeric(14, 2),
  actual_customers    integer CHECK (actual_customers IS NULL OR actual_customers >= 0),
  business_status     text NOT NULL CHECK (business_status IN ('on_track', 'ahead', 'behind', 'pivoted', 'closed', 'not_started')),
  user_notes          text,
  UNIQUE (schedule_id)
);

COMMENT ON TABLE public.analysis_outcomes IS
  'User-submitted actual results at a given checkpoint (Handbook §19 item 10). One row per schedule entry — links back to the original projection via analysis_id so projected-vs-actual accuracy can be measured (e.g. compare against analysis_snapshots.investment_payback).';
COMMENT ON COLUMN public.analysis_outcomes.business_status IS
  'not_started = business never launched; closed = shut down. Both are valid, informative outcomes for accuracy tracking, not missing data.';

CREATE INDEX IF NOT EXISTS idx_outcomes_analysis_id
  ON public.analysis_outcomes (analysis_id);

ALTER TABLE public.analysis_outcome_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outcome_schedule_read_own ON public.analysis_outcome_schedule;
CREATE POLICY outcome_schedule_read_own
  ON public.analysis_outcome_schedule
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Users may submit their own outcome response (one row per schedule entry,
-- enforced by the UNIQUE constraint above) but may not edit or delete it
-- afterward — no UPDATE/DELETE policy exists for the authenticated role.
DROP POLICY IF EXISTS outcomes_read_own ON public.analysis_outcomes;
CREATE POLICY outcomes_read_own
  ON public.analysis_outcomes
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS outcomes_insert_own ON public.analysis_outcomes;
CREATE POLICY outcomes_insert_own
  ON public.analysis_outcomes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

GRANT SELECT ON public.analysis_outcome_schedule TO authenticated;
GRANT INSERT, SELECT, UPDATE ON public.analysis_outcome_schedule TO service_role;
GRANT SELECT, INSERT ON public.analysis_outcomes TO authenticated;
GRANT SELECT, INSERT ON public.analysis_outcomes TO service_role;
