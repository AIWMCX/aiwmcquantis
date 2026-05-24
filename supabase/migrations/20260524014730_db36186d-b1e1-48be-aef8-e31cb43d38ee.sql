CREATE OR REPLACE FUNCTION public.tg_log_analysis_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result      jsonb := COALESCE(NEW.result, '{}'::jsonb);
  v_fa          jsonb := COALESCE(v_result->'financial_analysis', '{}'::jsonb);
  v_scenarios   jsonb := COALESCE(v_fa->'scenarios', '{}'::jsonb);
  v_base        jsonb := COALESCE(v_scenarios->'base', '{}'::jsonb);
  v_unit_econ   jsonb := COALESCE(v_fa->'unit_economics', '{}'::jsonb);
  v_mc          jsonb := COALESCE(v_result->'monte_carlo', '{}'::jsonb);
  v_rvce        jsonb := COALESCE(v_result->'rvce', '{}'::jsonb);
  v_validation  jsonb := COALESCE(v_result->'validation', '{}'::jsonb);
  v_tier        text;
  v_source      text;
  v_status      text;
  v_financial_core jsonb;
  v_pl36        jsonb;
  v_risk        jsonb;
BEGIN
  -- Tier
  v_tier := UPPER(COALESCE(NULLIF(NEW.tier_at_creation,''), 'FREE'));
  IF v_tier NOT IN ('FREE','PLUS','PRO','ENTERPRISE') THEN v_tier := 'FREE'; END IF;

  -- Source
  v_source := CASE
    WHEN NEW.user_id IS NULL AND NEW.anonymous_session_id IS NOT NULL THEN 'landing-demo'
    ELSE 'web-app'
  END;

  v_status := CASE
    WHEN COALESCE((v_validation->>'is_realistic')::boolean, true) THEN 'ready'
    ELSE 'partial'
  END;

  v_financial_core := jsonb_build_object(
    'monthlyRevenue', v_base->'monthly_revenue',
    'monthlyProfit',  to_jsonb(NEW.monthly_profit),
    'grossMargin',    v_base->'gross_margin',
    'netMargin',      v_base->'net_margin',
    'ltv',            v_unit_econ->'ltv',
    'cac',            v_unit_econ->'cac',
    'ltvToCac',       v_unit_econ->'ltv_cac_ratio',
    'cacPaybackMonths', v_unit_econ->'cac_payback_months',
    'projectPaybackMonths', to_jsonb(NEW.payback_months),
    'totalInvestment',to_jsonb(NEW.startup_investment),
    'confidenceScore',to_jsonb(NEW.confidence_score)
  );

  v_pl36 := jsonb_build_object(
    'revenue', COALESCE(v_fa->'revenue_36m', v_fa->'revenue_projection_36m', '[]'::jsonb),
    'profit',  COALESCE(v_fa->'profit_36m',  v_fa->'profit_projection_36m',  '[]'::jsonb),
    'cash',    COALESCE(v_fa->'cash_36m',    v_fa->'cash_projection_36m',    '[]'::jsonb)
  );

  v_risk := jsonb_build_object(
    'verdict',   COALESCE(v_result->'risk_summary'->>'verdict',
                          v_result->>'verdict',
                          'UNDEFINED'),
    'riskCount', COALESCE(jsonb_array_length(v_result->'risks'), 0)
  );

  INSERT INTO public.analysis_run_logs (
    analysis_id, created_at, user_id, tier, source,
    sector, geo, model_type, status, engine_version, rvce_version,
    financial_core, pl36, monte_carlo, rvce, benchmarks, risk_summary,
    input, metadata
  ) VALUES (
    NEW.id::text,
    NEW.created_at,
    NEW.user_id,
    v_tier,
    v_source,
    COALESCE(v_result->>'industry_detected', v_result->>'sector'),
    NEW.location,
    COALESCE(v_result->>'business_model_type', v_result->>'model_type'),
    v_status,
    COALESCE(v_result->>'engine_version', v_result->>'version'),
    v_rvce->>'version',
    v_financial_core,
    v_pl36,
    COALESCE(v_mc, '{}'::jsonb),
    COALESCE(v_rvce, '{}'::jsonb),
    COALESCE(v_result->'benchmarks', '{}'::jsonb),
    v_risk,
    jsonb_build_object(
      'ideaSummary', LEFT(COALESCE(NEW.idea_summary, NEW.idea, ''), 500),
      'sector',      COALESCE(v_result->>'industry_detected', v_result->>'sector'),
      'geo',         NEW.location,
      'modelType',   COALESCE(v_result->>'business_model_type', v_result->>'model_type'),
      'depth',       NEW.depth
    ),
    jsonb_build_object(
      'requestId',     v_result->>'request_id',
      'clientVersion', v_result->>'client_version',
      'runtimeEnv',    'prod',
      'errorCodes',    COALESCE(v_result->'error_codes', '[]'::jsonb),
      'reconciled',    v_validation->'reconciled'
    )
  )
  ON CONFLICT (analysis_id) DO UPDATE SET
    user_id        = EXCLUDED.user_id,
    tier           = EXCLUDED.tier,
    source         = EXCLUDED.source,
    sector         = EXCLUDED.sector,
    geo            = EXCLUDED.geo,
    model_type     = EXCLUDED.model_type,
    status         = EXCLUDED.status,
    engine_version = EXCLUDED.engine_version,
    rvce_version   = EXCLUDED.rvce_version,
    financial_core = EXCLUDED.financial_core,
    pl36           = EXCLUDED.pl36,
    monte_carlo    = EXCLUDED.monte_carlo,
    rvce           = EXCLUDED.rvce,
    benchmarks     = EXCLUDED.benchmarks,
    risk_summary   = EXCLUDED.risk_summary,
    input          = EXCLUDED.input,
    metadata       = EXCLUDED.metadata;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Telemetry must NEVER break analyses
  RAISE WARNING '[tg_log_analysis_run] skipped for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analyses_log_run_ai ON public.analyses;
CREATE TRIGGER analyses_log_run_ai
AFTER INSERT ON public.analyses
FOR EACH ROW EXECUTE FUNCTION public.tg_log_analysis_run();

DROP TRIGGER IF EXISTS analyses_log_run_au ON public.analyses;
CREATE TRIGGER analyses_log_run_au
AFTER UPDATE OF result ON public.analyses
FOR EACH ROW
WHEN (NEW.result IS DISTINCT FROM OLD.result)
EXECUTE FUNCTION public.tg_log_analysis_run();

-- Backfill from 2026-01-18 (idempotent — UNIQUE(analysis_id) prevents duplicates)
DO $backfill$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT * FROM public.analyses
    WHERE created_at >= '2026-01-18'::timestamptz
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Reuse trigger logic by performing a no-op UPDATE on same row,
      -- but cheaper: just call the same INSERT path inline.
      PERFORM public.tg_log_analysis_run_backfill(r);
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'backfill skip % : %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'analysis_run_logs backfill processed % rows', n;
END
$backfill$;