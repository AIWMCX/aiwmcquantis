-- Decision Review (JEV) — Phase B persistence.
--
-- Additive only. Widens ai_calls.provider so decision-review telemetry can
-- reuse the existing cost ledger (contract §30) instead of a parallel
-- observability table, and creates decision_reviews for idempotent,
-- versioned persistence of each independent review (contract §9/§10).
--
-- decision_consensus_runs (Phase C) is intentionally NOT created here —
-- kept in its own migration so this diff stays reviewable per phase, per
-- docs/decision-intelligence/JEV_IMPLEMENTATION_DECISION.md.

-- NOTE: production's live constraint already includes 'dahl' (added by a
-- later migration than the one this repo snapshot shows at
-- 20260713055333_ai_calls_cost_ledger_with_deepseek.sql) — confirmed via
-- pg_get_constraintdef before writing this ALTER, so the widen below is
-- additive to the REAL current set, not a narrowing regression.
ALTER TABLE public.ai_calls
  DROP CONSTRAINT IF EXISTS ai_calls_provider_check;
ALTER TABLE public.ai_calls
  ADD CONSTRAINT ai_calls_provider_check
  CHECK (provider IN ('anthropic', 'lovable_gateway', 'deepseek', 'dahl', 'typesafe_jev', 'quantis_internal_test'));

CREATE TABLE IF NOT EXISTS public.decision_reviews (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id               uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id                   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider                  text NOT NULL CHECK (provider IN ('typesafe_jev', 'quantis_internal_test')),
  provider_model            text,
  review_version            text NOT NULL,
  review_cache_key          text NOT NULL,

  canonical_result_hash     text NOT NULL,
  input_hash                text NOT NULL,
  output_hash               text,

  status                    text NOT NULL CHECK (status IN ('completed', 'unavailable')),
  decision_state            text,
  evidence_sufficiency      text,
  material_contradiction    text,
  human_review_required     text,
  critical_assumption_state text,
  rationale                 text,

  review_payload            jsonb,

  latency_ms                integer NOT NULL DEFAULT 0,
  provider_cost_usd         numeric(10, 6),

  error_code                text,
  error_detail              text,

  created_at                timestamptz NOT NULL DEFAULT now(),
  completed_at              timestamptz
);

-- Idempotency: the same canonical analysis + evidence + review version +
-- model must never invoke the (metered) reviewer twice (contract §10).
CREATE UNIQUE INDEX IF NOT EXISTS decision_reviews_cache_key_idx
  ON public.decision_reviews (review_cache_key);

CREATE INDEX IF NOT EXISTS decision_reviews_analysis_id_idx
  ON public.decision_reviews (analysis_id);
CREATE INDEX IF NOT EXISTS decision_reviews_user_id_idx
  ON public.decision_reviews (user_id);
CREATE INDEX IF NOT EXISTS decision_reviews_created_at_idx
  ON public.decision_reviews (created_at DESC);

ALTER TABLE public.decision_reviews ENABLE ROW LEVEL SECURITY;

-- Users read only their own reviews; browser never creates one directly
-- (no INSERT policy for authenticated/anon) — only the service role,
-- inside the review-decision edge function, writes rows.
DROP POLICY IF EXISTS "users read own decision reviews" ON public.decision_reviews;
CREATE POLICY "users read own decision reviews"
  ON public.decision_reviews FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all decision reviews" ON public.decision_reviews;
CREATE POLICY "admins read all decision reviews"
  ON public.decision_reviews FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'decision_reviews'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: decision_reviews table missing';
  END IF;
END $$;
