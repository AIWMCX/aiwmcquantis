-- Phase D: scenario workspace — base-input denormalization + scenario-set quota RPC.
-- analysis_snapshots only stores a hash of the original input, so it cannot be
-- used to reconstruct calculateStrictFinancials' raw arguments for a scenario
-- re-run. We denormalize the exact bundle used at analysis time instead.

ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS scenario_base_input jsonb;

COMMENT ON COLUMN public.analyses.scenario_base_input IS
  'Frozen bundle of raw calculateStrictFinancials inputs (rawMrr, rawInvestment, '
  'rawCac, rawLtv, rawAvgCheck, benchmarks, locationMultipliers, subIndustry, '
  'userProvidedCosts/ChurnRate/Customers, engineVersion, formulaRegistryVersion, '
  'datasetVersion) captured at analysis time. NULL for analyses saved before '
  'this column existed — those must be re-run to enable scenario modeling. '
  'Never re-derived via detection re-run (drift risk from a changing benchmark '
  'dataset over time) — Phase D scenario_sets/run-scenario read this verbatim.';

-- ---------- Atomic scenario-set creation + quota RPC ---------------------
-- Unlike consume_analysis_quota/consume_download_quota (which increment a
-- counter row), this RPC performs the count-check AND the scenario_sets
-- INSERT in one transaction (serialized via advisory xact lock scoped to the
-- user+analysis pair) so concurrent callers can never create more sets than
-- the tier's scenarioSetsPerAnalysis limit allows.
CREATE OR REPLACE FUNCTION public.consume_scenario_set_quota(
  p_user_id uuid,
  p_analysis_id uuid,
  p_limit int,
  p_name text,
  p_base_snapshot_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_used int;
  v_new_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_analysis_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_user');
  END IF;

  -- Serialize concurrent callers for the same (user, analysis) pair.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_analysis_id::text, 0));

  SELECT count(*) INTO v_used
  FROM public.scenario_sets
  WHERE user_id = p_user_id
    AND analysis_id = p_analysis_id
    AND archived_at IS NULL;

  IF p_limit IS NULL OR p_limit <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'used', v_used, 'limit', COALESCE(p_limit, 0));
  END IF;

  IF v_used >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'used', v_used, 'limit', p_limit);
  END IF;

  INSERT INTO public.scenario_sets (analysis_id, user_id, base_snapshot_id, name)
  VALUES (p_analysis_id, p_user_id, p_base_snapshot_id, COALESCE(NULLIF(p_name, ''), 'Scenario Set'))
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('allowed', true, 'used', v_used + 1, 'limit', p_limit, 'scenario_set_id', v_new_id);
END;
$$;
