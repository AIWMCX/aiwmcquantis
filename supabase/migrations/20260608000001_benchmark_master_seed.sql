-- ============================================================
-- BENCHMARK MASTER — Full schema + seed data
-- Run this migration on a fresh project to enable the
-- Live Benchmark Block and benchmark_lookup() RPC.
--
-- Covers all sector_level1 values used by analyze-business/
-- benchmark-engine-v2.ts SECTOR_KEYWORDS map.
-- ============================================================

-- Step 1: Create tables (idempotent)
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
  sector_level1 TEXT,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bmm_core_lookup ON public.benchmark_master_core(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_ue_lookup   ON public.benchmark_master_unit_econ(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_geo_lookup  ON public.benchmark_master_geo(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_risk_lookup ON public.benchmark_master_risk(sector_level1, business_model, country, city_tier, company_stage, size_bucket);
CREATE INDEX IF NOT EXISTS idx_bmm_inv_lookup  ON public.benchmark_master_invoice(sector_level1, business_model, country, city_tier, company_stage, size_bucket);

-- RLS
ALTER TABLE public.benchmark_master_core    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_unit_econ ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_geo     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_risk    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_master_invoice ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['benchmark_master_core','benchmark_master_unit_econ','benchmark_master_geo','benchmark_master_risk','benchmark_master_invoice'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
  END LOOP;
END $$;

-- Step 2: benchmark_lookup RPC
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
  CASE p_metric
    WHEN 'gross_margin'        THEN v_table:='benchmark_master_core';      v_p25:='gm_margin_p25';         v_p50:='gm_margin_p50';         v_p75:='gm_margin_p75';
    WHEN 'operating_margin'    THEN v_table:='benchmark_master_core';      v_p25:='op_margin_p50';         v_p50:='op_margin_p50';         v_p75:='op_margin_p50';
    WHEN 'ebitda_margin'       THEN v_table:='benchmark_master_core';      v_p25:='ebitda_margin_p50';     v_p50:='ebitda_margin_p50';     v_p75:='ebitda_margin_p50';
    WHEN 'revenue_growth_yoy'  THEN v_table:='benchmark_master_core';      v_p25:='revenue_growth_yoy_p50';v_p50:='revenue_growth_yoy_p50';v_p75:='revenue_growth_yoy_p50';
    WHEN 'rent_pct_rev'        THEN v_table:='benchmark_master_core';      v_p25:='rent_pct_rev_p50';      v_p50:='rent_pct_rev_p50';      v_p75:='rent_pct_rev_p50';
    WHEN 'payroll_pct_rev'     THEN v_table:='benchmark_master_core';      v_p25:='payroll_pct_rev_p50';   v_p50:='payroll_pct_rev_p50';   v_p75:='payroll_pct_rev_p50';
    WHEN 'marketing_pct_rev'   THEN v_table:='benchmark_master_core';      v_p25:='marketing_pct_rev_p50'; v_p50:='marketing_pct_rev_p50'; v_p75:='marketing_pct_rev_p50';
    WHEN 'cac'                 THEN v_table:='benchmark_master_unit_econ'; v_p25:='cac_p25';               v_p50:='cac_p50';               v_p75:='cac_p75';
    WHEN 'ltv'                 THEN v_table:='benchmark_master_unit_econ'; v_p25:='ltv_p25';               v_p50:='ltv_p50';               v_p75:='ltv_p75';
    WHEN 'ltv_cac_ratio'       THEN v_table:='benchmark_master_unit_econ'; v_p25:='ltv_cac_ratio_p25';     v_p50:='ltv_cac_ratio_p50';     v_p75:='ltv_cac_ratio_p75';
    WHEN 'cac_payback'         THEN v_table:='benchmark_master_unit_econ'; v_p25:='cac_payback_p25';       v_p50:='cac_payback_p50';       v_p75:='cac_payback_p75';
    WHEN 'churn_monthly'       THEN v_table:='benchmark_master_unit_econ'; v_p25:='churn_monthly_p25';     v_p50:='churn_monthly_p50';     v_p75:='churn_monthly_p75';
    WHEN 'retention_12m'       THEN v_table:='benchmark_master_unit_econ'; v_p25:='retention_12m';         v_p50:='retention_12m';         v_p75:='retention_12m';
    WHEN 'arpu'                THEN v_table:='benchmark_master_unit_econ'; v_p25:='arpu_median';           v_p50:='arpu_median';           v_p75:='arpu_median';
    WHEN 'wage_multiplier'     THEN v_table:='benchmark_master_geo';       v_p25:='wage_multiplier';       v_p50:='wage_multiplier';       v_p75:='wage_multiplier';
    WHEN 'rent_multiplier'     THEN v_table:='benchmark_master_geo';       v_p25:='rent_multiplier';       v_p50:='rent_multiplier';       v_p75:='rent_multiplier';
    WHEN 'cost_of_living_index' THEN v_table:='benchmark_master_geo';      v_p25:='cost_of_living_index';  v_p50:='cost_of_living_index';  v_p75:='cost_of_living_index';
    WHEN 'survival_years'      THEN v_table:='benchmark_master_risk';      v_p25:='median_survival_years'; v_p50:='median_survival_years'; v_p75:='median_survival_years';
    WHEN 'invoice_terms_days'  THEN v_table:='benchmark_master_invoice';   v_p25:='avg_invoice_terms_days';v_p50:='avg_invoice_terms_days';v_p75:='avg_invoice_terms_days';
    WHEN 'late_payment_rate'   THEN v_table:='benchmark_master_invoice';   v_p25:='late_payment_rate';     v_p50:='late_payment_rate';     v_p75:='late_payment_rate';
    WHEN 'bad_debt_pct_rev'    THEN v_table:='benchmark_master_invoice';   v_p25:='bad_debt_pct_rev';      v_p50:='bad_debt_pct_rev';      v_p75:='bad_debt_pct_rev';
    ELSE
      RETURN jsonb_build_object('matched', false, 'reason', 'unknown_metric', 'metric', p_metric);
  END CASE;

  FOR v_match_level, v_sql IN
    SELECT 'exact',        format('SELECT %I AS p25,%I AS p50,%I AS p75,source,sample_size,data_version,data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 AND company_stage IS NOT DISTINCT FROM $5 AND size_bucket IS NOT DISTINCT FROM $6 LIMIT 1',v_p25,v_p50,v_p75,v_table)
    UNION ALL SELECT 'no_size',   format('SELECT %I AS p25,%I AS p50,%I AS p75,source,sample_size,data_version,data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 AND company_stage IS NOT DISTINCT FROM $5 LIMIT 1',v_p25,v_p50,v_p75,v_table)
    UNION ALL SELECT 'no_city',   format('SELECT %I AS p25,%I AS p50,%I AS p75,source,sample_size,data_version,data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 LIMIT 1',v_p25,v_p50,v_p75,v_table)
    UNION ALL SELECT 'sector_model', format('SELECT %I AS p25,%I AS p50,%I AS p75,source,sample_size,data_version,data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 LIMIT 1',v_p25,v_p50,v_p75,v_table)
    UNION ALL SELECT 'sector_only', format('SELECT %I AS p25,%I AS p50,%I AS p75,source,sample_size,data_version,data_date FROM public.%I WHERE sector_level1=$1 LIMIT 1',v_p25,v_p50,v_p75,v_table)
  LOOP
    BEGIN
      EXECUTE v_sql INTO v_row USING p_sector,p_business_model,p_country,p_city_tier,p_stage,p_size;
    EXCEPTION WHEN OTHERS THEN v_row := NULL;
    END;
    IF v_row IS NOT NULL AND v_row.p50 IS NOT NULL THEN
      RETURN jsonb_build_object('matched',true,'metric',p_metric,'match_level',v_match_level,
        'p25',v_row.p25,'p50',v_row.p50,'p75',v_row.p75,
        'source',v_row.source,'sample_size',v_row.sample_size,
        'data_version',v_row.data_version,'data_date',v_row.data_date,
        'normalized_sector',p_sector,'match_level',v_match_level);
    END IF;
  END LOOP;
  RETURN jsonb_build_object('matched',false,'metric',p_metric,'reason','no_data');
END $$;

GRANT EXECUTE ON FUNCTION public.benchmark_lookup(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated;

-- ============================================================
-- Step 3: SEED — benchmark_master_core
-- gm_margin in decimal (0.65 = 65%), op/ebitda same, growth same
-- rent/payroll/marketing as % of revenue (decimal)
-- ============================================================
INSERT INTO public.benchmark_master_core
  (sector_level1, business_model, gm_margin_p25, gm_margin_p50, gm_margin_p75,
   op_margin_p50, ebitda_margin_p50, revenue_growth_yoy_p50, revenue_volatility,
   rent_pct_rev_p50, payroll_pct_rev_p50, marketing_pct_rev_p50,
   days_receivable, days_payable, sample_size)
VALUES
-- Food & Beverage
('Food & Beverage', 'transactional',   0.55, 0.65, 0.72,  0.12, 0.15,  0.08, 0.18,  0.12, 0.32, 0.04,  5,  30, 8200),
-- SaaS
('SaaS',            'subscription',    0.65, 0.74, 0.82,  0.15, 0.18,  0.25, 0.30,  0.02, 0.28, 0.18,  30, 45, 12400),
-- Services
('Services',        'transactional',   0.40, 0.52, 0.65,  0.14, 0.16,  0.12, 0.22,  0.03, 0.52, 0.06,  45, 30, 9100),
('Services',        'subscription',    0.55, 0.65, 0.75,  0.18, 0.22,  0.15, 0.20,  0.02, 0.45, 0.08,  30, 30, 4200),
-- Retail
('Retail',          'transactional',   0.35, 0.48, 0.58,  0.08, 0.10,  0.06, 0.15,  0.08, 0.18, 0.06,  10, 45, 7800),
-- Healthcare
('Healthcare',      'transactional',   0.42, 0.55, 0.68,  0.12, 0.15,  0.08, 0.14,  0.06, 0.45, 0.04,  30, 30, 5600),
-- Beauty & Wellness
('Beauty & Wellness','subscription',   0.58, 0.68, 0.78,  0.16, 0.20,  0.12, 0.18,  0.08, 0.35, 0.08,  5,  15, 4100),
('Beauty & Wellness','transactional',  0.52, 0.62, 0.72,  0.12, 0.15,  0.08, 0.16,  0.09, 0.38, 0.06,  5,  15, 3900),
-- Construction
('Construction',    'transactional',   0.25, 0.35, 0.48,  0.08, 0.10,  0.10, 0.20,  0.01, 0.38, 0.03,  45, 30, 6200),
-- Education
('Education',       'hybrid',          0.55, 0.68, 0.80,  0.18, 0.22,  0.20, 0.28,  0.02, 0.22, 0.15,  14, 30, 3800),
-- Fintech
('Fintech',         'transactional',   0.55, 0.68, 0.78,  0.15, 0.18,  0.35, 0.45,  0.25, 0.05, 0.20,  15, 30, 2900),
-- Logistics
('Logistics',       'transactional',   0.18, 0.28, 0.38,  0.05, 0.07,  0.08, 0.15,  0.02, 0.35, 0.03,  30, 30, 4500),
-- Manufacturing
('Manufacturing',   'transactional',   0.22, 0.32, 0.45,  0.07, 0.09,  0.06, 0.12,  0.04, 0.28, 0.03,  45, 60, 5100),
-- Agriculture
('Agriculture',     'subscription',    0.45, 0.58, 0.70,  0.12, 0.15,  0.18, 0.25,  0.08, 0.15, 0.10,  30, 45, 1800),
-- Non-profit
('Non-profit',      'hybrid',          0.70, 0.80, 0.88,  0.05, 0.06,  0.10, 0.20,  0.02, 0.12, 0.12,  30, 30, 2100),
-- Transportation
('Transportation',  'transactional',   0.25, 0.35, 0.48,  0.07, 0.09,  0.08, 0.15,  0.02, 0.42, 0.04,  20, 30, 3200)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 4: SEED — benchmark_master_unit_econ
-- CAC/LTV in USD, ratios as x, payback in months, churn/retention as decimal
-- ============================================================
INSERT INTO public.benchmark_master_unit_econ
  (sector_level1, business_model,
   cac_p25, cac_p50, cac_p75,
   ltv_p25, ltv_p50, ltv_p75,
   ltv_cac_ratio_p25, ltv_cac_ratio_p50, ltv_cac_ratio_p75,
   cac_payback_p25, cac_payback_p50, cac_payback_p75,
   churn_monthly_p25, churn_monthly_p50, churn_monthly_p75,
   retention_12m, arpu_median, sample_size)
VALUES
('Food & Beverage', 'transactional',    8,   15,   28,    45,   85,  150,  3.0, 5.5, 9.0,   1.0, 2.0, 3.5,  0.06, 0.10, 0.18,  0.35,  8.50,  8200),
('SaaS',            'subscription',   180,  420,  950,  1200, 3800, 9500,  4.0, 8.5,16.0,   6.0,12.0,24.0,  0.02, 0.04, 0.08,  0.62, 85.00, 12400),
('Services',        'transactional',  250,  650, 1800,  2500, 7500,22000,  4.5, 9.0,18.0,   2.0, 4.0, 8.0,  0.03, 0.05, 0.09,  0.58,480.00,  9100),
('Services',        'subscription',   120,  280,  650,  1800, 4500,12000,  5.5,12.0,22.0,   3.0, 6.0,12.0,  0.02, 0.035,0.06,  0.66,220.00,  4200),
('Retail',          'transactional',   12,   28,   65,    38,  110,  280,  2.5, 4.5, 8.0,   1.5, 3.0, 6.0,  0.08, 0.14, 0.22,  0.30, 42.00,  7800),
('Healthcare',      'transactional',   45,  120,  380,   350, 1200, 4500,  5.0,10.0,18.0,   2.0, 4.0, 8.0,  0.02, 0.04, 0.07,  0.62,180.00,  5600),
('Beauty & Wellness','subscription',   35,   75,  180,   280,  750, 2200,  5.0, 9.5,16.0,   2.0, 4.0, 8.0,  0.05, 0.08, 0.14,  0.45, 75.00,  4100),
('Beauty & Wellness','transactional',  18,   42,  110,   120,  360, 1100,  4.0, 8.0,14.0,   1.5, 3.0, 6.0,  0.06, 0.10, 0.18,  0.38, 55.00,  3900),
('Construction',    'transactional',  150,  380,  950,  1500, 4500,14000,  5.5,10.0,18.0,   2.0, 4.0, 8.0,  0.02, 0.04, 0.07,  0.60,3500.00, 6200),
('Education',       'hybrid',          35,   95,  280,   180, 680,  2200,  4.0, 8.0,14.0,   2.0, 5.0,10.0,  0.05, 0.08, 0.15,  0.48, 95.00,  3800),
('Fintech',         'transactional',  120,  350,  950,   480, 1800, 6500,  3.5, 7.5,14.0,   3.0, 8.0,18.0,  0.03, 0.06, 0.12,  0.52,180.00,  2900),
('Logistics',       'transactional',   45,  120,  350,   350, 1100, 3500,  4.0, 8.0,14.0,   2.0, 5.0,10.0,  0.03, 0.06, 0.11,  0.55,280.00,  4500),
('Manufacturing',   'transactional',  350,  950, 2800,  3500,12000,38000,  5.0,10.0,18.0,   3.0, 6.0,12.0,  0.02, 0.035,0.06,  0.65,2800.00, 5100),
('Agriculture',     'subscription',    85,  220,  580,   650, 2200, 7500,  5.0,10.0,18.0,   3.0, 6.0,12.0,  0.02, 0.04, 0.08,  0.62,180.00,  1800),
('Non-profit',      'hybrid',          15,   38,   95,   120,  380, 1200,  4.0, 9.0,16.0,   1.0, 3.0, 6.0,  0.04, 0.07, 0.13,  0.45, 55.00,  2100),
('Transportation',  'transactional',   28,   75,  220,   180,  650, 2200,  4.0, 8.0,14.0,   1.5, 3.5, 7.0,  0.04, 0.07, 0.13,  0.48,120.00,  3200)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 5: SEED — benchmark_master_risk
-- survival in years, risk scores 0-1
-- ============================================================
INSERT INTO public.benchmark_master_risk
  (sector_level1, business_model,
   risk_market_volatility, risk_regulatory, risk_operational, risk_customer_concentration,
   median_survival_years,
   failure_mode_1, failure_mode_2, failure_mode_3, sample_size)
VALUES
('Food & Beverage',  'transactional',  0.65, 0.28, 0.72, 0.25,  3.0, 'Cash flow / undercapitalization',     'Rising food & labor costs',           'Location dependency',        8200),
('SaaS',             'subscription',   0.55, 0.35, 0.42, 0.35,  5.5, 'Churn > LTV/CAC ratio collapses',     'Competitive commoditization',         'Premature scaling',          12400),
('Services',         'transactional',  0.42, 0.25, 0.55, 0.65,  6.0, 'Key-person dependency',               'Client concentration (>30% one client)','Scope creep / margin erosion',9100),
('Services',         'subscription',   0.38, 0.25, 0.48, 0.55,  6.5, 'Churn above 5% monthly',              'Key-person dependency',               'Pricing pressure from competitors',4200),
('Retail',           'transactional',  0.62, 0.32, 0.58, 0.28,  4.0, 'Inventory mismanagement',             'E-commerce disruption',               'Lease / location costs',     7800),
('Healthcare',       'transactional',  0.35, 0.75, 0.52, 0.45,  7.5, 'Regulatory / compliance failure',     'Reimbursement rate cuts',             'Staffing shortages',         5600),
('Beauty & Wellness','subscription',   0.55, 0.22, 0.52, 0.38,  4.5, 'High stylist/trainer turnover',       'Lease cost spike',                    'Oversaturation in local market',4100),
('Beauty & Wellness','transactional',  0.58, 0.22, 0.55, 0.35,  4.0, 'Stylist walkout taking clients',      'Rent spike',                          'Local competition',          3900),
('Construction',     'transactional',  0.52, 0.55, 0.72, 0.58,  5.5, 'Project delays / cost overruns',      'Subcontractor dependency',            'Liability / insurance gaps', 6200),
('Education',        'hybrid',         0.48, 0.42, 0.45, 0.32,  5.0, 'Low completion/retention rates',      'Regulatory accreditation risk',       'Platform competition (Coursera)',3800),
('Fintech',          'transactional',  0.75, 0.85, 0.55, 0.42,  4.5, 'Regulatory shutdown / licensing',     'Fraud / credit risk',                 'Big bank competitive response',2900),
('Logistics',        'transactional',  0.58, 0.38, 0.68, 0.45,  5.0, 'Driver / capacity shortage',          'Fuel cost volatility',                'Amazon / platform disintermediation',4500),
('Manufacturing',    'transactional',  0.52, 0.42, 0.65, 0.38,  6.5, 'Supply chain disruption',             'Equipment failure / capex overrun',   'Customer concentration',     5100),
('Agriculture',      'subscription',   0.62, 0.52, 0.58, 0.42,  5.5, 'Climate / weather dependency',        'Commodity price volatility',          'Regulatory / pesticide compliance',1800),
('Non-profit',       'hybrid',         0.42, 0.45, 0.38, 0.28,  8.0, 'Donor concentration',                 'Grant dependency',                    'Mission drift under funding pressure',2100),
('Transportation',   'transactional',  0.55, 0.45, 0.62, 0.35,  5.0, 'Fuel cost spike',                     'Driver shortage / turnover',          'Regulatory compliance (DOT)',  3200)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 6: SEED — benchmark_master_geo (US regions)
-- Fixed 2026-08-10: this table's sector_level1 column is TEXT NOT NULL with
-- no default (confirmed against the real live schema via generated types,
-- src/integrations/supabase/types.ts -- Row/Insert both show
-- `sector_level1: string`, never nullable, never optional), but this
-- INSERT's own column list never included it -- every row here is a pure
-- geography multiplier with no sector dimension by design. As originally
-- written this statement would violate the NOT NULL constraint against
-- production too, not just this CI replay -- flagged separately as a real
-- open question (does benchmark_master_geo actually have rows in
-- production right now?), not just a replay-safety issue. Added the
-- 'ALL' sentinel (this table's only sensible cross-sector value, since
-- every row is intentionally sector-agnostic) so the insert can succeed;
-- confirm this matches whatever value (if any) production's real rows use.
INSERT INTO public.benchmark_master_geo
  (sector_level1, geo_region, country, city_tier,
   cost_of_living_index, wage_multiplier, rent_multiplier, consumer_spend_index, sample_size)
VALUES
('ALL', 'North America', 'US', 'tier1',   1.35, 1.28, 1.65, 1.22, 18500),
('ALL', 'North America', 'US', 'tier2',   1.10, 1.08, 1.20, 1.08, 14200),
('ALL', 'North America', 'US', 'tier3',   0.88, 0.92, 0.85, 0.92,  8900),
('ALL', 'North America', 'US', NULL,      1.00, 1.00, 1.00, 1.00, 22000),
('ALL', 'North America', 'CA', NULL,      1.05, 0.95, 1.10, 0.98,  6200),
('ALL', 'Europe',        'GB', 'tier1',   1.25, 1.18, 1.55, 1.15,  7800),
('ALL', 'Europe',        'GB', NULL,      1.05, 1.02, 1.10, 1.02,  5400),
('ALL', 'Europe',        'DE', NULL,      1.00, 1.05, 1.08, 1.00,  4900),
('ALL', 'Europe',        'FR', NULL,      1.05, 1.02, 1.15, 1.02,  3800),
('ALL', 'Asia Pacific',  'AU', NULL,      1.10, 1.08, 1.20, 1.05,  3200),
('ALL', 'Asia Pacific',  'SG', NULL,      1.30, 1.22, 1.45, 1.18,  2800)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 7: SEED — benchmark_master_invoice
-- terms in days, rates as decimals
-- ============================================================
INSERT INTO public.benchmark_master_invoice
  (sector_level1, business_model,
   avg_invoice_terms_days, late_payment_rate, bad_debt_pct_rev,
   safe_dscr_threshold, max_safe_invoice_to_rev_ratio, sample_size)
VALUES
('Food & Beverage',  'transactional',  7,   0.08, 0.005, 1.25, 0.15,  8200),
('SaaS',             'subscription',   30,  0.04, 0.008, 1.20, 0.25, 12400),
('Services',         'transactional',  45,  0.18, 0.025, 1.25, 0.40,  9100),
('Services',         'subscription',   30,  0.08, 0.012, 1.20, 0.30,  4200),
('Retail',           'transactional',  7,   0.05, 0.008, 1.20, 0.10,  7800),
('Healthcare',       'transactional',  45,  0.22, 0.035, 1.30, 0.45,  5600),
('Beauty & Wellness','subscription',   30,  0.06, 0.010, 1.20, 0.20,  4100),
('Beauty & Wellness','transactional',  0,   0.03, 0.005, 1.15, 0.10,  3900),
('Construction',     'transactional',  45,  0.28, 0.040, 1.30, 0.55,  6200),
('Education',        'hybrid',         30,  0.10, 0.015, 1.20, 0.25,  3800),
('Fintech',          'transactional',  30,  0.08, 0.020, 1.25, 0.30,  2900),
('Logistics',        'transactional',  30,  0.15, 0.022, 1.25, 0.35,  4500),
('Manufacturing',    'transactional',  60,  0.20, 0.030, 1.30, 0.50,  5100),
('Agriculture',      'subscription',   45,  0.12, 0.018, 1.25, 0.35,  1800),
('Non-profit',       'hybrid',         30,  0.06, 0.008, 1.15, 0.20,  2100),
('Transportation',   'transactional',  30,  0.14, 0.020, 1.25, 0.35,  3200)
ON CONFLICT DO NOTHING;

-- Verify
DO $$
DECLARE
  core_count INT; ue_count INT; risk_count INT; geo_count INT; inv_count INT;
BEGIN
  SELECT COUNT(*) INTO core_count FROM public.benchmark_master_core;
  SELECT COUNT(*) INTO ue_count   FROM public.benchmark_master_unit_econ;
  SELECT COUNT(*) INTO risk_count FROM public.benchmark_master_risk;
  SELECT COUNT(*) INTO geo_count  FROM public.benchmark_master_geo;
  SELECT COUNT(*) INTO inv_count  FROM public.benchmark_master_invoice;
  RAISE NOTICE 'Benchmark seed complete: core=%, unit_econ=%, risk=%, geo=%, invoice=%',
    core_count, ue_count, risk_count, geo_count, inv_count;
END $$;
