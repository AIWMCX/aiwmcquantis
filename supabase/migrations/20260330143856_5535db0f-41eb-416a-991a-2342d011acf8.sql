
-- ============================================================
-- BENCHMARKS V2: 5 tables for 97K benchmark dataset
-- ============================================================

-- 1. Core benchmarks (margins, cost structure, working capital)
CREATE TABLE public.benchmarks_v2_core (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT NOT NULL,
  business_model TEXT NOT NULL,
  geo_region TEXT NOT NULL,
  country TEXT NOT NULL,
  city_tier TEXT NOT NULL,
  company_stage TEXT NOT NULL,
  size_bucket TEXT NOT NULL,
  gm_margin_p25 NUMERIC,
  gm_margin_p50 NUMERIC,
  gm_margin_p75 NUMERIC,
  op_margin_p50 NUMERIC,
  ebitda_margin_p50 NUMERIC,
  revenue_growth_yoy_p50 NUMERIC,
  revenue_volatility NUMERIC,
  rent_pct_rev_p50 NUMERIC,
  payroll_pct_rev_p50 NUMERIC,
  marketing_pct_rev_p50 NUMERIC,
  days_receivable NUMERIC,
  days_payable NUMERIC,
  inventory_turnover NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sector_level1, sector_level2, business_model, geo_region, country, city_tier, company_stage, size_bucket)
);

CREATE INDEX idx_bv2_core_lookup ON public.benchmarks_v2_core (sector_level1, sector_level2, geo_region, country, city_tier, company_stage, size_bucket);

-- 2. Unit economics (CAC, LTV, payback, churn)
CREATE TABLE public.benchmarks_v2_unit_econ (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT NOT NULL,
  business_model TEXT NOT NULL,
  geo_region TEXT NOT NULL,
  country TEXT NOT NULL,
  city_tier TEXT NOT NULL,
  company_stage TEXT NOT NULL,
  size_bucket TEXT NOT NULL,
  cac_p25 NUMERIC,
  cac_p50 NUMERIC,
  cac_p75 NUMERIC,
  ltv_p25 NUMERIC,
  ltv_p50 NUMERIC,
  ltv_p75 NUMERIC,
  ltv_cac_ratio_p25 NUMERIC,
  ltv_cac_ratio_p50 NUMERIC,
  ltv_cac_ratio_p75 NUMERIC,
  cac_payback_p25 NUMERIC,
  cac_payback_p50 NUMERIC,
  cac_payback_p75 NUMERIC,
  churn_monthly_p25 NUMERIC,
  churn_monthly_p50 NUMERIC,
  churn_monthly_p75 NUMERIC,
  retention_12m NUMERIC,
  arpu_median NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sector_level1, sector_level2, business_model, geo_region, country, city_tier, company_stage, size_bucket)
);

CREATE INDEX idx_bv2_ue_lookup ON public.benchmarks_v2_unit_econ (sector_level1, sector_level2, geo_region, country, city_tier, company_stage, size_bucket);

-- 3. Geographic adjustments
CREATE TABLE public.benchmarks_v2_geo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT NOT NULL,
  business_model TEXT NOT NULL,
  geo_region TEXT NOT NULL,
  country TEXT NOT NULL,
  city_tier TEXT NOT NULL,
  company_stage TEXT NOT NULL,
  size_bucket TEXT NOT NULL,
  cost_of_living_index NUMERIC,
  wage_multiplier NUMERIC,
  rent_multiplier NUMERIC,
  consumer_spend_index NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sector_level1, sector_level2, business_model, geo_region, country, city_tier, company_stage, size_bucket)
);

CREATE INDEX idx_bv2_geo_lookup ON public.benchmarks_v2_geo (sector_level1, sector_level2, geo_region, country, city_tier, company_stage, size_bucket);

-- 4. Risk profiles
CREATE TABLE public.benchmarks_v2_risk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT NOT NULL,
  business_model TEXT NOT NULL,
  geo_region TEXT NOT NULL,
  country TEXT NOT NULL,
  city_tier TEXT NOT NULL,
  company_stage TEXT NOT NULL,
  size_bucket TEXT NOT NULL,
  risk_market_volatility NUMERIC,
  risk_regulatory NUMERIC,
  risk_operational NUMERIC,
  risk_customer_concentration NUMERIC,
  median_survival_years NUMERIC,
  failure_mode_1 TEXT,
  failure_mode_2 TEXT,
  failure_mode_3 TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sector_level1, sector_level2, business_model, geo_region, country, city_tier, company_stage, size_bucket)
);

CREATE INDEX idx_bv2_risk_lookup ON public.benchmarks_v2_risk (sector_level1, sector_level2, geo_region, country, city_tier, company_stage, size_bucket);

-- 5. Invoice / credit capacity
CREATE TABLE public.benchmarks_v2_invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_level1 TEXT NOT NULL,
  sector_level2 TEXT NOT NULL,
  business_model TEXT NOT NULL,
  geo_region TEXT NOT NULL,
  country TEXT NOT NULL,
  city_tier TEXT NOT NULL,
  company_stage TEXT NOT NULL,
  size_bucket TEXT NOT NULL,
  avg_invoice_terms_days NUMERIC,
  late_payment_rate NUMERIC,
  bad_debt_pct_rev NUMERIC,
  safe_dscr_threshold NUMERIC,
  max_safe_invoice_to_rev_ratio NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (sector_level1, sector_level2, business_model, geo_region, country, city_tier, company_stage, size_bucket)
);

CREATE INDEX idx_bv2_inv_lookup ON public.benchmarks_v2_invoice (sector_level1, sector_level2, geo_region, country, city_tier, company_stage, size_bucket);

-- RLS: Public read access for all benchmark tables
ALTER TABLE public.benchmarks_v2_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks_v2_unit_econ ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks_v2_geo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks_v2_risk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks_v2_invoice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.benchmarks_v2_core FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.benchmarks_v2_unit_econ FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.benchmarks_v2_geo FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.benchmarks_v2_risk FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON public.benchmarks_v2_invoice FOR SELECT TO anon, authenticated USING (true);

-- Service role insert/update for ingestion
CREATE POLICY "Service role write" ON public.benchmarks_v2_core FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role write" ON public.benchmarks_v2_unit_econ FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role write" ON public.benchmarks_v2_geo FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role write" ON public.benchmarks_v2_risk FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role write" ON public.benchmarks_v2_invoice FOR ALL TO service_role USING (true) WITH CHECK (true);
