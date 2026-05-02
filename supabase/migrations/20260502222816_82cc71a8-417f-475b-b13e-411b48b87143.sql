
-- ===== Benchmark Master tables =====
CREATE TABLE IF NOT EXISTS public.benchmark_master_core (
  id BIGSERIAL PRIMARY KEY,
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT,
  business_model TEXT,
  geo_region TEXT,
  country TEXT,
  city_tier TEXT,
  company_stage TEXT,
  size_bucket TEXT,
  gm_margin_p25 NUMERIC, gm_margin_p50 NUMERIC, gm_margin_p75 NUMERIC,
  op_margin_p50 NUMERIC, ebitda_margin_p50 NUMERIC,
  revenue_growth_yoy_p50 NUMERIC, revenue_volatility NUMERIC,
  rent_pct_rev_p50 NUMERIC, payroll_pct_rev_p50 NUMERIC, marketing_pct_rev_p50 NUMERIC,
  days_receivable NUMERIC, days_payable NUMERIC, inventory_turnover NUMERIC,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis Benchmark Master v2.0',
  sample_size INT NOT NULL DEFAULT 19500,
  data_version TEXT NOT NULL DEFAULT 'v2.0',
  data_date DATE NOT NULL DEFAULT '2025-04-01'
);

CREATE TABLE IF NOT EXISTS public.benchmark_master_unit_econ (
  id BIGSERIAL PRIMARY KEY,
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT,
  business_model TEXT,
  geo_region TEXT,
  country TEXT,
  city_tier TEXT,
  company_stage TEXT,
  size_bucket TEXT,
  cac_p25 NUMERIC, cac_p50 NUMERIC, cac_p75 NUMERIC,
  ltv_p25 NUMERIC, ltv_p50 NUMERIC, ltv_p75 NUMERIC,
  ltv_cac_ratio_p25 NUMERIC, ltv_cac_ratio_p50 NUMERIC, ltv_cac_ratio_p75 NUMERIC,
  cac_payback_p25 NUMERIC, cac_payback_p50 NUMERIC, cac_payback_p75 NUMERIC,
  churn_monthly_p25 NUMERIC, churn_monthly_p50 NUMERIC, churn_monthly_p75 NUMERIC,
  retention_12m NUMERIC, arpu_median NUMERIC,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis Benchmark Master v2.0',
  sample_size INT NOT NULL DEFAULT 19500,
  data_version TEXT NOT NULL DEFAULT 'v2.0',
  data_date DATE NOT NULL DEFAULT '2025-04-01'
);

CREATE TABLE IF NOT EXISTS public.benchmark_master_geo (
  id BIGSERIAL PRIMARY KEY,
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT,
  business_model TEXT,
  geo_region TEXT,
  country TEXT,
  city_tier TEXT,
  company_stage TEXT,
  size_bucket TEXT,
  cost_of_living_index NUMERIC,
  wage_multiplier NUMERIC,
  rent_multiplier NUMERIC,
  consumer_spend_index NUMERIC,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis Benchmark Master v2.0',
  sample_size INT NOT NULL DEFAULT 19500,
  data_version TEXT NOT NULL DEFAULT 'v2.0',
  data_date DATE NOT NULL DEFAULT '2025-04-01'
);

CREATE TABLE IF NOT EXISTS public.benchmark_master_risk (
  id BIGSERIAL PRIMARY KEY,
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT,
  business_model TEXT,
  geo_region TEXT,
  country TEXT,
  city_tier TEXT,
  company_stage TEXT,
  size_bucket TEXT,
  risk_market_volatility NUMERIC,
  risk_regulatory NUMERIC,
  risk_operational NUMERIC,
  risk_customer_concentration NUMERIC,
  median_survival_years NUMERIC,
  failure_mode_1 TEXT,
  failure_mode_2 TEXT,
  failure_mode_3 TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis Benchmark Master v2.0',
  sample_size INT NOT NULL DEFAULT 19500,
  data_version TEXT NOT NULL DEFAULT 'v2.0',
  data_date DATE NOT NULL DEFAULT '2025-04-01'
);

CREATE TABLE IF NOT EXISTS public.benchmark_master_invoice (
  id BIGSERIAL PRIMARY KEY,
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT,
  business_model TEXT,
  geo_region TEXT,
  country TEXT,
  city_tier TEXT,
  company_stage TEXT,
  size_bucket TEXT,
  avg_invoice_terms_days NUMERIC,
  late_payment_rate NUMERIC,
  bad_debt_pct_rev NUMERIC,
  safe_dscr_threshold NUMERIC,
  max_safe_invoice_to_rev_ratio NUMERIC,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis Benchmark Master v2.0',
  sample_size INT NOT NULL DEFAULT 19500,
  data_version TEXT NOT NULL DEFAULT 'v2.0',
  data_date DATE NOT NULL DEFAULT '2025-04-01'
);

-- Composite indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_bmm_core_lookup ON public.benchmark_master_core(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_ue_lookup   ON public.benchmark_master_unit_econ(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_geo_lookup  ON public.benchmark_master_geo(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_risk_lookup ON public.benchmark_master_risk(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_inv_lookup  ON public.benchmark_master_invoice(sector_level1, business_model, country, city_tier, company_stage, size_bucket);

-- RLS: public read, admin write
ALTER TABLE public.benchmark_master_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_unit_econ ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_geo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_invoice ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['benchmark_master_core','benchmark_master_unit_econ','benchmark_master_geo','benchmark_master_risk','benchmark_master_invoice'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
  END LOOP;
END $$;

-- ===== Lookup function =====
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
  v_match_level TEXT;
BEGIN
  -- Map metric -> (table, column triplet)
  CASE p_metric
    WHEN 'gross_margin' THEN v_table := 'benchmark_master_core'; v_p25:='gm_margin_p25'; v_p50:='gm_margin_p50'; v_p75:='gm_margin_p75';
    WHEN 'operating_margin' THEN v_table := 'benchmark_master_core'; v_p25:='op_margin_p50'; v_p50:='op_margin_p50'; v_p75:='op_margin_p50';
    WHEN 'ebitda_margin' THEN v_table := 'benchmark_master_core'; v_p25:='ebitda_margin_p50'; v_p50:='ebitda_margin_p50'; v_p75:='ebitda_margin_p50';
    WHEN 'revenue_growth_yoy' THEN v_table := 'benchmark_master_core'; v_p25:='revenue_growth_yoy_p50'; v_p50:='revenue_growth_yoy_p50'; v_p75:='revenue_growth_yoy_p50';
    WHEN 'rent_pct_rev' THEN v_table := 'benchmark_master_core'; v_p25:='rent_pct_rev_p50'; v_p50:='rent_pct_rev_p50'; v_p75:='rent_pct_rev_p50';
    WHEN 'payroll_pct_rev' THEN v_table := 'benchmark_master_core'; v_p25:='payroll_pct_rev_p50'; v_p50:='payroll_pct_rev_p50'; v_p75:='payroll_pct_rev_p50';
    WHEN 'marketing_pct_rev' THEN v_table := 'benchmark_master_core'; v_p25:='marketing_pct_rev_p50'; v_p50:='marketing_pct_rev_p50'; v_p75:='marketing_pct_rev_p50';
    WHEN 'cac' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='cac_p25'; v_p50:='cac_p50'; v_p75:='cac_p75';
    WHEN 'ltv' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='ltv_p25'; v_p50:='ltv_p50'; v_p75:='ltv_p75';
    WHEN 'ltv_cac_ratio' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='ltv_cac_ratio_p25'; v_p50:='ltv_cac_ratio_p50'; v_p75:='ltv_cac_ratio_p75';
    WHEN 'cac_payback' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='cac_payback_p25'; v_p50:='cac_payback_p50'; v_p75:='cac_payback_p75';
    WHEN 'churn_monthly' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='churn_monthly_p25'; v_p50:='churn_monthly_p50'; v_p75:='churn_monthly_p75';
    WHEN 'retention_12m' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='retention_12m'; v_p50:='retention_12m'; v_p75:='retention_12m';
    WHEN 'arpu' THEN v_table := 'benchmark_master_unit_econ'; v_p25:='arpu_median'; v_p50:='arpu_median'; v_p75:='arpu_median';
    WHEN 'wage_multiplier' THEN v_table := 'benchmark_master_geo'; v_p25:='wage_multiplier'; v_p50:='wage_multiplier'; v_p75:='wage_multiplier';
    WHEN 'rent_multiplier' THEN v_table := 'benchmark_master_geo'; v_p25:='rent_multiplier'; v_p50:='rent_multiplier'; v_p75:='rent_multiplier';
    WHEN 'cost_of_living_index' THEN v_table := 'benchmark_master_geo'; v_p25:='cost_of_living_index'; v_p50:='cost_of_living_index'; v_p75:='cost_of_living_index';
    WHEN 'survival_years' THEN v_table := 'benchmark_master_risk'; v_p25:='median_survival_years'; v_p50:='median_survival_years'; v_p75:='median_survival_years';
    WHEN 'invoice_terms_days' THEN v_table := 'benchmark_master_invoice'; v_p25:='avg_invoice_terms_days'; v_p50:='avg_invoice_terms_days'; v_p75:='avg_invoice_terms_days';
    WHEN 'late_payment_rate' THEN v_table := 'benchmark_master_invoice'; v_p25:='late_payment_rate'; v_p50:='late_payment_rate'; v_p75:='late_payment_rate';
    WHEN 'bad_debt_pct_rev' THEN v_table := 'benchmark_master_invoice'; v_p25:='bad_debt_pct_rev'; v_p50:='bad_debt_pct_rev'; v_p75:='bad_debt_pct_rev';
    ELSE
      RETURN jsonb_build_object('matched', false, 'reason', 'unknown_metric', 'metric', p_metric);
  END CASE;

  -- Try full match -> drop city_tier -> drop country -> drop business_model -> sector only
  FOR v_match_level, v_sql IN
    SELECT 'exact', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 AND company_stage IS NOT DISTINCT FROM $5 AND size_bucket IS NOT DISTINCT FROM $6 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'no_size', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 AND company_stage IS NOT DISTINCT FROM $5 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'no_city', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'sector_model', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'sector_only', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 LIMIT 1', v_p25, v_p50, v_p75, v_table)
  LOOP
    BEGIN
      EXECUTE v_sql INTO v_row USING p_sector, p_business_model, p_country, p_city_tier, p_stage, p_size;
    EXCEPTION WHEN OTHERS THEN
      v_row := NULL;
    END;
    IF v_row IS NOT NULL AND v_row.p50 IS NOT NULL THEN
      RETURN jsonb_build_object(
        'matched', true,
        'metric', p_metric,
        'match_level', v_match_level,
        'p25', v_row.p25, 'p50', v_row.p50, 'p75', v_row.p75,
        'source', v_row.source,
        'sample_size', v_row.sample_size,
        'data_version', v_row.data_version,
        'data_date', v_row.data_date
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('matched', false, 'metric', p_metric, 'reason', 'no_data');
END $$;

GRANT EXECUTE ON FUNCTION public.benchmark_lookup(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;
