-- ============================================================
-- FIX: benchmark_lookup() RPC returned "none" for every metric
-- ============================================================
-- Symptom (live, 2026-06-17): the Benchmark Citations card showed
-- "Estimated · No direct benchmark · Engine fallback" for ALL metrics, and
-- benchmarks-query returned match_type:"none" plus the Postgres error
-- 'record "v_row" is not assigned yet'. The 95,500-row tables are fully
-- populated with correct values — the RPC itself was broken three ways:
--
--   1. SCHEMA MISMATCH (primary): the function SELECTed source, sample_size,
--      data_version, data_date — columns that do NOT exist on the
--      benchmark_master_* tables (the CSV-imported schema omits them). Every
--      dynamic query raised 42703 (undefined_column) → caught → no match.
--   2. PARAMETER COUNT: every fallback level bound 6 USING params, but the
--      broader levels' SQL referenced fewer placeholders (no_city: $1..$3,
--      sector_only: $1) → "too many parameters specified for EXECUTE".
--   3. UNASSIGNED RECORD: `EXCEPTION WHEN OTHERS THEN v_row := NULL` is a no-op
--      on a RECORD, so a later `IF v_row IS NOT NULL` threw
--      'record "v_row" is not assigned yet'.
--
-- This rewrite: SELECTs only columns that exist (the p25/p50/p75 triples);
-- supplies provenance (source/version/date) as constants and sample_size as
-- NULL (we never fabricate a per-row sample count); binds all 6 params at
-- every level via NULL-wildcard predicates so broadening is correct and the
-- placeholder/param counts always match; and uses FOUND instead of testing the
-- record. Idempotent: CREATE OR REPLACE, additive, no data touched.

CREATE OR REPLACE FUNCTION public.benchmark_lookup(
  p_metric TEXT,
  p_sector TEXT DEFAULT NULL,
  p_business_model TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_city_tier TEXT DEFAULT NULL,
  p_stage TEXT DEFAULT NULL,
  p_size TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table TEXT;
  v_p25 TEXT; v_p50 TEXT; v_p75 TEXT;
  v_sql TEXT;
  v_row RECORD;
  v_found BOOLEAN;
  v_match_level TEXT;
  v_bm TEXT; v_co TEXT; v_ct TEXT; v_st TEXT; v_sz TEXT;
BEGIN
  CASE p_metric
    WHEN 'gross_margin'         THEN v_table:='benchmark_master_core';      v_p25:='gm_margin_p25';          v_p50:='gm_margin_p50';          v_p75:='gm_margin_p75';
    WHEN 'operating_margin'     THEN v_table:='benchmark_master_core';      v_p25:='op_margin_p50';          v_p50:='op_margin_p50';          v_p75:='op_margin_p50';
    WHEN 'ebitda_margin'        THEN v_table:='benchmark_master_core';      v_p25:='ebitda_margin_p50';      v_p50:='ebitda_margin_p50';      v_p75:='ebitda_margin_p50';
    WHEN 'revenue_growth_yoy'   THEN v_table:='benchmark_master_core';      v_p25:='revenue_growth_yoy_p50'; v_p50:='revenue_growth_yoy_p50'; v_p75:='revenue_growth_yoy_p50';
    WHEN 'rent_pct_rev'         THEN v_table:='benchmark_master_core';      v_p25:='rent_pct_rev_p50';       v_p50:='rent_pct_rev_p50';       v_p75:='rent_pct_rev_p50';
    WHEN 'payroll_pct_rev'      THEN v_table:='benchmark_master_core';      v_p25:='payroll_pct_rev_p50';    v_p50:='payroll_pct_rev_p50';    v_p75:='payroll_pct_rev_p50';
    WHEN 'marketing_pct_rev'    THEN v_table:='benchmark_master_core';      v_p25:='marketing_pct_rev_p50';  v_p50:='marketing_pct_rev_p50';  v_p75:='marketing_pct_rev_p50';
    WHEN 'cac'                  THEN v_table:='benchmark_master_unit_econ'; v_p25:='cac_p25';                v_p50:='cac_p50';                v_p75:='cac_p75';
    WHEN 'ltv'                  THEN v_table:='benchmark_master_unit_econ'; v_p25:='ltv_p25';                v_p50:='ltv_p50';                v_p75:='ltv_p75';
    WHEN 'ltv_cac_ratio'        THEN v_table:='benchmark_master_unit_econ'; v_p25:='ltv_cac_ratio_p25';      v_p50:='ltv_cac_ratio_p50';      v_p75:='ltv_cac_ratio_p75';
    WHEN 'cac_payback'          THEN v_table:='benchmark_master_unit_econ'; v_p25:='cac_payback_p25';        v_p50:='cac_payback_p50';        v_p75:='cac_payback_p75';
    WHEN 'churn_monthly'        THEN v_table:='benchmark_master_unit_econ'; v_p25:='churn_monthly_p25';      v_p50:='churn_monthly_p50';      v_p75:='churn_monthly_p75';
    WHEN 'retention_12m'        THEN v_table:='benchmark_master_unit_econ'; v_p25:='retention_12m';          v_p50:='retention_12m';          v_p75:='retention_12m';
    WHEN 'arpu'                 THEN v_table:='benchmark_master_unit_econ'; v_p25:='arpu_median';            v_p50:='arpu_median';            v_p75:='arpu_median';
    WHEN 'wage_multiplier'      THEN v_table:='benchmark_master_geo';       v_p25:='wage_multiplier';        v_p50:='wage_multiplier';        v_p75:='wage_multiplier';
    WHEN 'rent_multiplier'      THEN v_table:='benchmark_master_geo';       v_p25:='rent_multiplier';        v_p50:='rent_multiplier';        v_p75:='rent_multiplier';
    WHEN 'cost_of_living_index' THEN v_table:='benchmark_master_geo';       v_p25:='cost_of_living_index';   v_p50:='cost_of_living_index';   v_p75:='cost_of_living_index';
    WHEN 'survival_years'       THEN v_table:='benchmark_master_risk';      v_p25:='median_survival_years';  v_p50:='median_survival_years';  v_p75:='median_survival_years';
    WHEN 'invoice_terms_days'   THEN v_table:='benchmark_master_invoice';   v_p25:='avg_invoice_terms_days'; v_p50:='avg_invoice_terms_days'; v_p75:='avg_invoice_terms_days';
    WHEN 'late_payment_rate'    THEN v_table:='benchmark_master_invoice';   v_p25:='late_payment_rate';      v_p50:='late_payment_rate';      v_p75:='late_payment_rate';
    WHEN 'bad_debt_pct_rev'     THEN v_table:='benchmark_master_invoice';   v_p25:='bad_debt_pct_rev';       v_p50:='bad_debt_pct_rev';       v_p75:='bad_debt_pct_rev';
    ELSE
      RETURN jsonb_build_object('matched', false, 'reason', 'unknown_metric', 'metric', p_metric);
  END CASE;

  -- Fallback ladder: exact → drop size → drop city/stage → sector+model → sector only.
  -- Each level NULLs the dropped dimensions; the WHERE uses NULL-wildcard
  -- predicates so all 6 params are always bound (no count mismatch).
  FOREACH v_match_level IN ARRAY ARRAY['exact','no_size','no_city','sector_model','sector_only']
  LOOP
    v_bm := p_business_model; v_co := p_country; v_ct := p_city_tier; v_st := p_stage; v_sz := p_size;
    IF v_match_level = 'no_size'      THEN v_sz := NULL; END IF;
    IF v_match_level = 'no_city'      THEN v_sz := NULL; v_ct := NULL; v_st := NULL; END IF;
    IF v_match_level = 'sector_model' THEN v_sz := NULL; v_ct := NULL; v_st := NULL; v_co := NULL; END IF;
    IF v_match_level = 'sector_only'  THEN v_sz := NULL; v_ct := NULL; v_st := NULL; v_co := NULL; v_bm := NULL; END IF;

    v_sql := format(
      'SELECT %I AS p25, %I AS p50, %I AS p75 FROM public.%I
         WHERE sector_level1 = $1
           AND ($2 IS NULL OR business_model  IS NOT DISTINCT FROM $2)
           AND ($3 IS NULL OR country         IS NOT DISTINCT FROM $3)
           AND ($4 IS NULL OR city_tier       IS NOT DISTINCT FROM $4)
           AND ($5 IS NULL OR company_stage   IS NOT DISTINCT FROM $5)
           AND ($6 IS NULL OR size_bucket     IS NOT DISTINCT FROM $6)
         LIMIT 1',
      v_p25, v_p50, v_p75, v_table);

    v_found := FALSE;
    BEGIN
      EXECUTE v_sql INTO v_row USING p_sector, v_bm, v_co, v_ct, v_st, v_sz;
      v_found := FOUND;
    EXCEPTION WHEN OTHERS THEN
      v_found := FALSE;
    END;

    IF v_found AND v_row.p50 IS NOT NULL THEN
      RETURN jsonb_build_object(
        'matched', true,
        'metric', p_metric,
        'match_level', v_match_level,
        'p25', v_row.p25, 'p50', v_row.p50, 'p75', v_row.p75,
        'source', 'AIWMC Quantis Benchmark Master',
        'sample_size', NULL,
        'data_version', 'v2.0',
        'data_date', '2026-06-01',
        'normalized_sector', p_sector);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('matched', false, 'metric', p_metric, 'reason', 'no_data');
END $$;

GRANT EXECUTE ON FUNCTION public.benchmark_lookup(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;
