-- Phase D step 7 (spec: AIWMC_Quantis_Scenario_Evidence_System_Spec.md §9): a
-- promoted scenario must create a real Analysis v2, never silently overwrite
-- the original. These columns give the new analysis row explicit lineage
-- back to its parent and the scenario run that produced it.

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS parent_analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_scenario_run_id uuid REFERENCES public.scenario_runs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS analyses_parent_analysis_id_idx ON public.analyses(parent_analysis_id);

COMMENT ON COLUMN public.analyses.parent_analysis_id IS
  'Set only on analyses created via promote-scenario-to-analysis. The parent row is never mutated when a child is created.';
COMMENT ON COLUMN public.analyses.origin_scenario_run_id IS
  'The scenario_runs row whose output became this analysis''s financial_analysis at promotion time.';
