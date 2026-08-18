-- Migration-ledger drift recovery — Activation/Feedback Slice (PR #41) — 2026-08-18
--
-- Restores public.user_realism_feedback, missing from production despite
-- three migrations (20260309013800 origin, 20260309020804 column additions,
-- 20260704003227 RLS hardening) all being marked applied in the ledger --
-- consistent with the whole-transaction-rollback pattern documented
-- throughout this session's PR #41 recovery work.
--
-- Investigation before restoring (per the explicit "do not restore a table
-- simply because a widget exists in source" instruction):
--   - RealismFeedbackWidget IS mounted and reachable: it renders inside
--     AccuracyTransparentResults.tsx, the same component that fires the
--     real, currently-live verdict_viewed/scenario_compared funnel_events
--     (confirmed via production data: 27 verdict_viewed, 11 scenario_compared
--     rows in the last 30 days from this exact component).
--   - It is write-only: a full-repo grep found no consumer that reads
--     user_realism_feedback back into prompts, benchmarks, or the financial
--     engine. It asks "too optimistic / about right / too conservative"
--     (1-5 scale) plus optional per-dimension scores and free text -- a
--     USER_FEEDBACK_SIGNAL, never a CANONICAL_FINANCIAL_INPUT. No code
--     change was needed to satisfy that constraint; it was already true by
--     construction.
--   - Current-pattern check: 20260704003227 tightened the original (looser)
--     INSERT policy to authenticated-only, bound to an analysis the user
--     owns or that is public, with an explicit anon-deny policy. That is
--     the pattern replayed here, not the original migration's looser one --
--     confirmed no live policy exists yet (table is absent), so there is
--     no "current live version" to diff against; the most recent migration
--     intent is treated as canonical per this session's established rule.
--
-- Schema combines the origin CREATE TABLE with 20260309020804's four
-- ADD COLUMNs (dimension_scores, business_type, location, engine_version)
-- -- all four are written by the live widget code today.
--
-- Deviation from 20260704003227's own text: that migration's INSERT policy
-- referenced `a.is_public = true` on public.analyses. Confirmed via
-- information_schema against the CURRENT live schema that no `is_public`
-- (or any public/share-flag) column exists on analyses at all -- so that
-- migration's own policy, had it ever actually run, would have failed with
-- `column a.is_public does not exist`. This is a second, independent piece
-- of evidence that 20260704003227 never truly executed end-to-end (on top
-- of the LEDGER_ONLY/GIT_ONLY findings already documented in
-- docs/MIGRATION_CONTROL_PLANE.md). Dropped the is_public clause here --
-- ownership-only (`a.user_id = auth.uid()`) is the correct current-schema
-- equivalent; verified against live schema before writing this, not
-- replayed blindly.
--
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.user_realism_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  realism_score INTEGER NOT NULL CHECK (realism_score >= 1 AND realism_score <= 5),
  feedback_text TEXT,
  dimension_scores JSONB DEFAULT NULL,
  business_type TEXT DEFAULT NULL,
  location TEXT DEFAULT NULL,
  engine_version TEXT DEFAULT '2.0.0-precision',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_realism_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own realism feedback" ON public.user_realism_feedback;
CREATE POLICY "Users can view their own realism feedback"
  ON public.user_realism_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own realism feedback" ON public.user_realism_feedback;
CREATE POLICY "Users can insert their own realism feedback"
  ON public.user_realism_feedback FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      analysis_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.analyses a
        WHERE a.id = user_realism_feedback.analysis_id
          AND a.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Deny anonymous realism feedback inserts" ON public.user_realism_feedback;
CREATE POLICY "Deny anonymous realism feedback inserts"
  ON public.user_realism_feedback FOR INSERT TO anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anonymous access to user_realism_feedback" ON public.user_realism_feedback;
CREATE POLICY "Deny anonymous access to user_realism_feedback"
  ON public.user_realism_feedback FOR SELECT TO anon
  USING (false);

DROP POLICY IF EXISTS "Service role manages user_realism_feedback" ON public.user_realism_feedback;
CREATE POLICY "Service role manages user_realism_feedback"
  ON public.user_realism_feedback FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.user_realism_feedback FROM anon;
REVOKE ALL ON TABLE public.user_realism_feedback FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.user_realism_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_realism_feedback TO service_role;

DO $$
BEGIN
  IF to_regclass('public.user_realism_feedback') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.user_realism_feedback still does not exist';
  END IF;
  IF has_table_privilege('anon', 'public.user_realism_feedback', 'SELECT')
     OR has_table_privilege('anon', 'public.user_realism_feedback', 'INSERT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can access user_realism_feedback';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: user_realism_feedback restored, anon denied';
END $$;
