-- GTM-audit item #18 (2026-08-27, Q19): "Is there a live dashboard tracking
-- financial-invariant violations across all analyses right now, or only ad
-- hoc?" scripts/sweep-financial-invariants.ts (PR #93) runs daily via
-- .github/workflows/financial-invariants-sweep.yml, but its results only
-- ever land in a GitHub Actions log -- a human has no at-a-glance history
-- of runs/violations without opening CI. This table gives the sweep script
-- somewhere to record each run's summary so an admin page can read it back.
--
-- The sweep script writes via the Supabase Management API (a personal
-- access token against the database/query endpoint), which runs with full
-- database privileges and is not subject to PostgREST grants/RLS -- so no
-- explicit write path needs to be opened up for it. The RLS policy here
-- exists solely to gate the read path: only admins, via the normal
-- authenticated client the new admin page will use.
CREATE TABLE IF NOT EXISTS public.financial_invariant_sweep_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL CHECK (mode IN ('report-only', 'apply')),
  scanned_count integer NOT NULL DEFAULT 0,
  violation_count integer NOT NULL DEFAULT 0,
  malformed_count integer NOT NULL DEFAULT 0,
  applied_count integer NOT NULL DEFAULT 0,
  violation_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financial_invariant_sweep_runs_run_at_idx
  ON public.financial_invariant_sweep_runs (run_at DESC);

ALTER TABLE public.financial_invariant_sweep_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read sweep run history"
  ON public.financial_invariant_sweep_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.financial_invariant_sweep_runs IS
  'One row per scripts/sweep-financial-invariants.ts run, written via the Supabase Management API (not PostgREST). Read by /admin/invariant-sweeps.';
