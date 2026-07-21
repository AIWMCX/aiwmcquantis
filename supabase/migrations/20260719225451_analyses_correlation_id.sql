-- =============================================================================
-- Thread analysis_correlation_id onto public.analyses — Handbook §19 item 9 follow-up
--
-- analyze-business generates analysis_correlation_id server-side at snapshot-
-- write time (see migration 20260711180000_analysis_snapshots.sql for why:
-- the edge function never inserts into public.analyses itself, so it has no
-- analyses.id to reference yet). The client receives this id in the response
-- and now threads it into its own analyses insert (src/services/analysisDb.ts).
--
-- This achieves the join WITHOUT ever mutating the immutable analysis_snapshots
-- row: analysis_snapshots stays INSERT-only with no UPDATE grant for any role.
-- The join is: analyses.analysis_correlation_id = analysis_snapshots.correlation_id.
-- =============================================================================

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS analysis_correlation_id uuid;

COMMENT ON COLUMN public.analyses.analysis_correlation_id IS
  'Server-generated at analyze-business time, echoed back in the API response as analysis_correlation_id and stored here by the client on save. Joins to analysis_snapshots.correlation_id — the snapshot itself is never mutated to add this link.';

CREATE INDEX IF NOT EXISTS idx_analyses_correlation_id
  ON public.analyses (analysis_correlation_id)
  WHERE analysis_correlation_id IS NOT NULL;
