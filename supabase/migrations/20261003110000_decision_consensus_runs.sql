-- Decision Consensus Runs — Phase C persistence.
--
-- One row per deterministic reconciliation of the canonical Quantis
-- verdict + a decision_reviews row (or its absence) + integrity state.
-- Pure logic output (consensus-policy.ts) — never a second LLM vote, so
-- there is no "cost" or "latency" column here the way decision_reviews
-- has for the actual reviewer call.

CREATE TABLE IF NOT EXISTS public.decision_consensus_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id           uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  decision_review_id    uuid REFERENCES public.decision_reviews(id) ON DELETE SET NULL,

  policy_version        text NOT NULL,
  quantis_decision       text NOT NULL,
  independent_decision   text,
  consensus_state        text NOT NULL,

  agreement              boolean,
  reason_codes           text[] NOT NULL DEFAULT '{}',
  critical_assumption    text,
  next_validation_action text,

  canonical_result_hash  text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS decision_consensus_runs_analysis_id_idx
  ON public.decision_consensus_runs (analysis_id);
CREATE INDEX IF NOT EXISTS decision_consensus_runs_created_at_idx
  ON public.decision_consensus_runs (created_at DESC);

ALTER TABLE public.decision_consensus_runs ENABLE ROW LEVEL SECURITY;

-- Same ownership shape as decision_reviews: readable only via the owning
-- analysis's user, or an admin. No direct user_id column here (every row
-- is reached through analysis_id), so the policy joins to analyses.
DROP POLICY IF EXISTS "users read own consensus runs" ON public.decision_consensus_runs;
CREATE POLICY "users read own consensus runs"
  ON public.decision_consensus_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses a
      WHERE a.id = decision_consensus_runs.analysis_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admins read all consensus runs" ON public.decision_consensus_runs;
CREATE POLICY "admins read all consensus runs"
  ON public.decision_consensus_runs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'decision_consensus_runs'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: decision_consensus_runs table missing';
  END IF;
END $$;
