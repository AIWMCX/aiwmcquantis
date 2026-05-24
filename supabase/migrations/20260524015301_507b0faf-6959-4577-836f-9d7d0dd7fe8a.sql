-- ============================================================
-- 1. analysis_self_learning
-- ============================================================
CREATE TABLE public.analysis_self_learning (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id              text NOT NULL UNIQUE,
  user_id                  uuid NULL,
  evaluated_at             timestamptz NOT NULL DEFAULT now(),
  numeric_consistency      numeric,
  benchmark_alignment      numeric,
  rvce_agreement           numeric,
  mc_stability             numeric,
  pl36_coherence           numeric,
  global_status            text NOT NULL DEFAULT 'partial',
  issues                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  adjustments              jsonb NOT NULL DEFAULT '{}'::jsonb,
  learning_config_version  bigint NULL
);

CREATE INDEX idx_asl_evaluated_at ON public.analysis_self_learning (evaluated_at DESC);
CREATE INDEX idx_asl_user_id      ON public.analysis_self_learning (user_id);
CREATE INDEX idx_asl_status       ON public.analysis_self_learning (global_status);

ALTER TABLE public.analysis_self_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own self-learning rows"
  ON public.analysis_self_learning FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin reads all self-learning rows"
  ON public.analysis_self_learning FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. quantis_learning_config (versioned priors)
-- ============================================================
CREATE TABLE public.quantis_learning_config (
  version          bigserial PRIMARY KEY,
  created_at       timestamptz NOT NULL DEFAULT now(),
  is_active        boolean NOT NULL DEFAULT false,
  created_by       text NOT NULL DEFAULT 'system',
  segments_count   int NOT NULL DEFAULT 0,
  priors           jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_hints     jsonb NOT NULL DEFAULT '{}'::jsonb,
  quality_metrics  jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes            text
);

CREATE UNIQUE INDEX uniq_qlc_one_active
  ON public.quantis_learning_config (is_active)
  WHERE is_active = true;

ALTER TABLE public.quantis_learning_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads learning config"
  ON public.quantis_learning_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. validate_analysis_run(p_analysis_id text)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_analysis_run(p_analysis_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r              record;
  fc             jsonb;
  pl             jsonb;
  mc             jsonb;
  rv             jsonb;
  bm             jsonb;
  issues         jsonb := '[]'::jsonb;
  s_numeric      numeric;
  s_benchmark    numeric;
  s_mc           numeric;
  s_pl           numeric;
  s_rvce         numeric;
  status_out     text;
  rev            numeric;
  prof           numeric;
  net_margin     numeric;
  ltv            numeric;
  cac            numeric;
  ltv_cac        numeric;
  cac_payback    numeric;
  conf           numeric;
  pl_profit_y1   numeric;
  mc_p50_y1      numeric;
  bm_lookup      jsonb;
  bm_hits        int := 0;
  bm_in_band     int := 0;
  cfg_version    bigint;
BEGIN
  SELECT * INTO r FROM public.analysis_run_logs WHERE analysis_id = p_analysis_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'run_not_found');
  END IF;

  fc := COALESCE(r.financial_core, '{}'::jsonb);
  pl := COALESCE(r.pl36,           '{}'::jsonb);
  mc := COALESCE(r.monte_carlo,    '{}'::jsonb);
  rv := COALESCE(r.rvce,           '{}'::jsonb);
  bm := COALESCE(r.benchmarks,     '{}'::jsonb);

  rev         := NULLIF(fc->>'monthlyRevenue','')::numeric;
  prof        := NULLIF(fc->>'monthlyProfit','')::numeric;
  net_margin  := NULLIF(fc->>'netMargin','')::numeric;
  ltv         := NULLIF(fc->>'ltv','')::numeric;
  cac         := NULLIF(fc->>'cac','')::numeric;
  ltv_cac     := NULLIF(fc->>'ltvToCac','')::numeric;
  cac_payback := NULLIF(fc->>'cacPaybackMonths','')::numeric;
  conf        := NULLIF(fc->>'confidenceScore','')::numeric;

  ---------- 1) NUMERIC CONSISTENCY ----------
  DECLARE
    checks int := 0;
    passes int := 0;
  BEGIN
    -- profit ≈ revenue * netMargin (margin may be % or fraction)
    IF rev IS NOT NULL AND prof IS NOT NULL AND net_margin IS NOT NULL AND rev <> 0 THEN
      checks := checks + 1;
      DECLARE m numeric := CASE WHEN abs(net_margin) > 1.5 THEN net_margin/100.0 ELSE net_margin END;
      BEGIN
        IF abs(prof - rev*m) <= GREATEST(abs(rev*m)*0.10, 50) THEN
          passes := passes + 1;
        ELSE
          issues := issues || jsonb_build_array(jsonb_build_object(
            'code','NUM_PROFIT_MISMATCH','severity','warning','field','monthlyProfit',
            'expected', rev*m, 'actual', prof,
            'message','Profit not consistent with revenue × net margin'));
        END IF;
      END;
    END IF;

    -- ltv_cac ≈ ltv / cac
    IF ltv IS NOT NULL AND cac IS NOT NULL AND cac > 0 AND ltv_cac IS NOT NULL THEN
      checks := checks + 1;
      IF abs(ltv_cac - ltv/cac) <= GREATEST(abs(ltv/cac)*0.10, 0.1) THEN
        passes := passes + 1;
      ELSE
        issues := issues || jsonb_build_array(jsonb_build_object(
          'code','NUM_LTV_CAC_MISMATCH','severity','warning','field','ltvToCac',
          'expected', ltv/cac, 'actual', ltv_cac,
          'message','LTV:CAC ratio inconsistent with LTV/CAC'));
      END IF;
    END IF;

    -- payback bounded
    IF cac_payback IS NOT NULL THEN
      checks := checks + 1;
      IF cac_payback > 0 AND cac_payback < 60 THEN
        passes := passes + 1;
      ELSE
        issues := issues || jsonb_build_array(jsonb_build_object(
          'code','NUM_PAYBACK_OUT_OF_RANGE','severity','warning','field','cacPaybackMonths',
          'actual', cac_payback,
          'message','CAC payback outside [0, 60] months'));
      END IF;
    END IF;

    -- confidence in [0,100]
    IF conf IS NOT NULL THEN
      checks := checks + 1;
      IF conf >= 0 AND conf <= 100 THEN passes := passes + 1;
      ELSE
        issues := issues || jsonb_build_array(jsonb_build_object(
          'code','NUM_CONF_OUT_OF_RANGE','severity','critical','field','confidenceScore',
          'actual', conf,'message','Confidence score outside [0,100]'));
      END IF;
    END IF;

    s_numeric := CASE WHEN checks = 0 THEN NULL ELSE passes::numeric / checks END;
  END;

  ---------- 2) MC ↔ PL36 COHERENCE ----------
  DECLARE
    pl_arr jsonb := pl->'profit';
  BEGIN
    IF jsonb_typeof(pl_arr) = 'array' AND jsonb_array_length(pl_arr) >= 12 THEN
      pl_profit_y1 := 0;
      FOR i IN 0..11 LOOP
        pl_profit_y1 := pl_profit_y1 + COALESCE(NULLIF(pl_arr->>i,'')::numeric, 0);
      END LOOP;
    ELSIF prof IS NOT NULL THEN
      pl_profit_y1 := prof * 12;
    END IF;

    mc_p50_y1 := COALESCE(
      NULLIF(mc->>'mo12ProfitP50','')::numeric,
      NULLIF(mc->'percentiles'->>'p50','')::numeric
    );

    IF pl_profit_y1 IS NOT NULL AND mc_p50_y1 IS NOT NULL AND pl_profit_y1 <> 0 THEN
      IF abs(mc_p50_y1 - pl_profit_y1) <= abs(pl_profit_y1) * 0.30 THEN
        s_mc := 1.0;
      ELSE
        s_mc := GREATEST(0, 1 - (abs(mc_p50_y1 - pl_profit_y1) / abs(pl_profit_y1)));
        issues := issues || jsonb_build_array(jsonb_build_object(
          'code','MC_DEVIATES_FROM_PL36','severity','warning','field','monte_carlo.mo12ProfitP50',
          'expected', pl_profit_y1, 'actual', mc_p50_y1,
          'message','Monte Carlo P50 deviates >30% from PL36 yr-1 profit'));
      END IF;
    END IF;

    s_pl := CASE WHEN pl_profit_y1 IS NULL THEN NULL ELSE 1.0 END;
  END;

  ---------- 3) BENCHMARK ALIGNMENT ----------
  DECLARE
    sector text := r.sector;
  BEGIN
    -- gross margin
    IF sector IS NOT NULL AND fc ? 'grossMargin' THEN
      bm_lookup := public.benchmark_lookup('gross_margin', sector);
      IF (bm_lookup->>'matched')::boolean THEN
        bm_hits := bm_hits + 1;
        DECLARE
          v numeric := NULLIF(fc->>'grossMargin','')::numeric;
          p25 numeric := NULLIF(bm_lookup->>'p25','')::numeric;
          p75 numeric := NULLIF(bm_lookup->>'p75','')::numeric;
        BEGIN
          IF v IS NOT NULL AND p25 IS NOT NULL AND p75 IS NOT NULL THEN
            IF abs(v) > 1.5 THEN v := v/100.0; END IF;
            IF v BETWEEN p25*0.8 AND p75*1.2 THEN bm_in_band := bm_in_band + 1;
            ELSE
              issues := issues || jsonb_build_array(jsonb_build_object(
                'code','BM_GROSS_MARGIN_OUTLIER','severity','warning','field','grossMargin',
                'expected_p25', p25, 'expected_p75', p75, 'actual', v,
                'message','Gross margin outside P25–P75 band by >20%'));
            END IF;
          END IF;
        END;
      END IF;
    END IF;

    -- ltv_cac_ratio
    IF sector IS NOT NULL AND ltv_cac IS NOT NULL THEN
      bm_lookup := public.benchmark_lookup('ltv_cac_ratio', sector);
      IF (bm_lookup->>'matched')::boolean THEN
        bm_hits := bm_hits + 1;
        DECLARE
          p25 numeric := NULLIF(bm_lookup->>'p25','')::numeric;
          p75 numeric := NULLIF(bm_lookup->>'p75','')::numeric;
        BEGIN
          IF p25 IS NOT NULL AND p75 IS NOT NULL THEN
            IF ltv_cac BETWEEN p25*0.7 AND p75*1.3 THEN bm_in_band := bm_in_band + 1;
            ELSE
              issues := issues || jsonb_build_array(jsonb_build_object(
                'code','BM_LTV_CAC_OUTLIER','severity','warning','field','ltvToCac',
                'expected_p25', p25, 'expected_p75', p75, 'actual', ltv_cac,
                'message','LTV:CAC outside P25–P75 band'));
            END IF;
          END IF;
        END;
      END IF;
    END IF;

    -- cac_payback
    IF sector IS NOT NULL AND cac_payback IS NOT NULL THEN
      bm_lookup := public.benchmark_lookup('cac_payback', sector);
      IF (bm_lookup->>'matched')::boolean THEN
        bm_hits := bm_hits + 1;
        DECLARE
          p25 numeric := NULLIF(bm_lookup->>'p25','')::numeric;
          p75 numeric := NULLIF(bm_lookup->>'p75','')::numeric;
        BEGIN
          IF p25 IS NOT NULL AND p75 IS NOT NULL THEN
            IF cac_payback BETWEEN p25*0.7 AND p75*1.3 THEN bm_in_band := bm_in_band + 1;
            ELSE
              issues := issues || jsonb_build_array(jsonb_build_object(
                'code','BM_CAC_PAYBACK_OUTLIER','severity','warning','field','cacPaybackMonths',
                'expected_p25', p25, 'expected_p75', p75, 'actual', cac_payback,
                'message','CAC payback outside P25–P75 band'));
            END IF;
          END IF;
        END;
      END IF;
    END IF;

    s_benchmark := CASE WHEN bm_hits = 0 THEN NULL ELSE bm_in_band::numeric / bm_hits END;
  END;

  ---------- 4) RVCE ----------
  s_rvce := NULLIF(rv->>'agreementScore','')::numeric;
  IF s_rvce IS NOT NULL AND s_rvce > 1.0 THEN s_rvce := s_rvce/100.0; END IF;

  ---------- 5) GLOBAL STATUS ----------
  status_out := 'ok';
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(issues) e WHERE e->>'severity' = 'critical') THEN
    status_out := 'suspect';
  ELSIF (s_numeric    IS NOT NULL AND s_numeric    < 0.5)
     OR (s_benchmark  IS NOT NULL AND s_benchmark  < 0.5)
     OR (s_mc         IS NOT NULL AND s_mc         < 0.5)
     OR (s_rvce       IS NOT NULL AND s_rvce       < 0.5) THEN
    status_out := 'suspect';
  ELSIF (s_numeric    IS NOT NULL AND s_numeric    < 0.8)
     OR (s_benchmark  IS NOT NULL AND s_benchmark  < 0.8)
     OR (s_mc         IS NOT NULL AND s_mc         < 0.8)
     OR (s_rvce       IS NOT NULL AND s_rvce       < 0.8) THEN
    status_out := 'partial';
  END IF;

  -- which learning config was active at run time (if any)
  SELECT version INTO cfg_version
  FROM public.quantis_learning_config WHERE is_active = true LIMIT 1;

  ---------- WRITE ----------
  INSERT INTO public.analysis_self_learning (
    analysis_id, user_id, evaluated_at,
    numeric_consistency, benchmark_alignment, rvce_agreement,
    mc_stability, pl36_coherence, global_status, issues, adjustments,
    learning_config_version
  ) VALUES (
    p_analysis_id, r.user_id, now(),
    s_numeric, s_benchmark, s_rvce, s_mc, s_pl,
    status_out, issues,
    jsonb_build_object(
      'sector', r.sector, 'geo', r.geo, 'model_type', r.model_type
    ),
    cfg_version
  )
  ON CONFLICT (analysis_id) DO UPDATE SET
    evaluated_at        = EXCLUDED.evaluated_at,
    numeric_consistency = EXCLUDED.numeric_consistency,
    benchmark_alignment = EXCLUDED.benchmark_alignment,
    rvce_agreement      = EXCLUDED.rvce_agreement,
    mc_stability        = EXCLUDED.mc_stability,
    pl36_coherence      = EXCLUDED.pl36_coherence,
    global_status       = EXCLUDED.global_status,
    issues              = EXCLUDED.issues,
    adjustments         = EXCLUDED.adjustments,
    learning_config_version = EXCLUDED.learning_config_version;

  RETURN jsonb_build_object(
    'ok', true,
    'analysis_id', p_analysis_id,
    'global_status', status_out,
    'numeric_consistency', s_numeric,
    'benchmark_alignment', s_benchmark,
    'rvce_agreement', s_rvce,
    'mc_stability', s_mc,
    'pl36_coherence', s_pl,
    'issues_count', jsonb_array_length(issues)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[validate_analysis_run] failed for %: %', p_analysis_id, SQLERRM;
  RETURN jsonb_build_object('ok', false, 'reason', SQLERRM);
END;
$$;

-- ============================================================
-- 4. Trigger on analysis_run_logs (auto-validate on every new log)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tg_run_log_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.validate_analysis_run(NEW.analysis_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[tg_run_log_validate] skipped %: %', NEW.analysis_id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS analysis_run_logs_validate_ai ON public.analysis_run_logs;
CREATE TRIGGER analysis_run_logs_validate_ai
AFTER INSERT OR UPDATE ON public.analysis_run_logs
FOR EACH ROW EXECUTE FUNCTION public.tg_run_log_validate();

-- ============================================================
-- 5. Backfill existing 44 rows
-- ============================================================
DO $$
DECLARE
  rec record;
  n int := 0;
BEGIN
  FOR rec IN SELECT analysis_id FROM public.analysis_run_logs LOOP
    PERFORM public.validate_analysis_run(rec.analysis_id);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'self-learning backfill: % rows', n;
END $$;