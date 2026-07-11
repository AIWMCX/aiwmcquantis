-- =============================================================================
-- Immutable analysis snapshots — Handbook §19 item 9
--
-- One row per completed analysis, capturing exactly what was computed and by
-- which version of the engine — so a support/legal/audit question ("what did
-- this report actually say, and was it internally consistent at the time?")
-- can be answered without re-running the engine against inputs that may have
-- since produced a different output (benchmark data changes, formula fixes,
-- engine version bumps). INSERT-only: no UPDATE policy exists for any role,
-- so a row, once written, cannot be altered — only superseded by a new one.
--
-- ARCHITECTURAL NOTE: analyze-business (the edge function that computes
-- these numbers) never inserts into public.analyses itself — that insert
-- happens later, client-side, via src/services/analysisDb.ts, using a
-- client-generated id. So at snapshot-write time (inside analyze-business,
-- immediately after computing the result) there is no analyses.id yet to
-- reference. correlation_id is generated server-side at that moment and
-- returned to the client in the response; analysis_id stays nullable and is
-- the join key IF a future change threads correlation_id through to the
-- client's analyses insert. That threading is NOT part of this migration —
-- this snapshot is fully self-contained and useful (engine version, hashes,
-- typed payback result) even before that join exists.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analysis_snapshots (
  id                        bigserial PRIMARY KEY,
  created_at                timestamptz NOT NULL DEFAULT now(),
  correlation_id            uuid NOT NULL UNIQUE,
  analysis_id               uuid REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id                   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  engine_version            text NOT NULL,
  formula_registry_version  text NOT NULL,
  dataset_version           text,
  input_hash                text NOT NULL CHECK (char_length(input_hash) = 64),
  numeric_output_hash       text NOT NULL CHECK (char_length(numeric_output_hash) = 64),
  investment_payback        jsonb NOT NULL,
  cac_payback               jsonb,
  validation_status         text NOT NULL CHECK (validation_status IN ('PASS', 'WARN', 'BLOCK')),
  validation_issues         jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.analysis_snapshots IS
  'Immutable per-analysis snapshot (Handbook §19 item 9): engine/formula/dataset versions, input/output hashes, and the typed payback results at the moment of generation. INSERT-only — no UPDATE policy for any role.';
COMMENT ON COLUMN public.analysis_snapshots.input_hash IS
  'SHA-256 hex digest of the normalized user-provided inputs (idea, location, financial_inputs). Lets a later audit confirm two analyses had byte-identical inputs.';
COMMENT ON COLUMN public.analysis_snapshots.numeric_output_hash IS
  'SHA-256 hex digest of the deterministic financial_analysis numeric fields (not narrative text). A hash mismatch on rerun with identical inputs + engine version signals nondeterminism.';
COMMENT ON COLUMN public.analysis_snapshots.investment_payback IS
  'The typed MonthsMetricResult from src/financial/payback.ts (Handbook §19 Wave 1/2) — status, months, formulaId, reasonCode. Never the raw 999 sentinel.';

CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_analysis_id
  ON public.analysis_snapshots (analysis_id)
  WHERE analysis_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_created_at
  ON public.analysis_snapshots (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_snapshots_user_id
  ON public.analysis_snapshots (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.analysis_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can read their own snapshots; admins can read all.
DROP POLICY IF EXISTS analysis_snapshots_read_own ON public.analysis_snapshots;
CREATE POLICY analysis_snapshots_read_own
  ON public.analysis_snapshots
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Only the service role (edge functions) inserts. No UPDATE policy exists for
-- any role — once written, a snapshot cannot be modified, only superseded by
-- a new row from a later analysis run.

GRANT SELECT ON public.analysis_snapshots TO authenticated;
GRANT INSERT, SELECT ON public.analysis_snapshots TO service_role;
