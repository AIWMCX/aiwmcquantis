
DROP TABLE IF EXISTS public.analysis_edge_cases CASCADE;
CREATE TABLE public.analysis_edge_cases (
  case_id TEXT PRIMARY KEY,
  "business_idea" TEXT, "city" TEXT, "industry" TEXT,
  "initial_inv" NUMERIC, "unit_price" NUMERIC, "mo_customers" NUMERIC,
  "mo_revenue" NUMERIC, "mo_op_costs" NUMERIC, "cac" NUMERIC, "churn_mo" NUMERIC,
  "gross_margin" NUMERIC, "opex_rev" NUMERIC, "mo_gross_profit" NUMERIC,
  "mo_ebitda" NUMERIC, "net_margin" NUMERIC, "ltv" NUMERIC, "ltv_cac" NUMERIC,
  "cac_payback_mo" NUMERIC, "tam_b" NUMERIC, "edge_case_note" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500,
  data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_unit_economics CASCADE;
CREATE TABLE public.analysis_unit_economics (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "arpu" NUMERIC, "cac" NUMERIC, "gm" NUMERIC,
  "monthly_churn" NUMERIC, "annual_churn" NUMERIC, "n_12mo_retention" NUMERIC,
  "ltv" NUMERIC, "ltv_cac" NUMERIC, "cac_payback_mo" NUMERIC, "payback_ok" NUMERIC,
  "nrr_net_rev_ret" NUMERIC, "magic_number" NUMERIC, "rule_of_40" NUMERIC,
  "health_signal" TEXT, "ltv_tier" TEXT,
  "cohort_ltv_m3" NUMERIC, "cohort_ltv_m6" NUMERIC, "cohort_ltv_m12" NUMERIC,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_monte_carlo CASCADE;
CREATE TABLE public.analysis_monte_carlo (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "mo_rev_base" NUMERIC, "growth_rate" NUMERIC, "volatility" NUMERIC,
  "p10_mo1" NUMERIC, "p50_mo1" NUMERIC, "p90_mo1" NUMERIC,
  "p10_mo6" NUMERIC, "p50_mo6" NUMERIC, "p90_mo6" NUMERIC,
  "p10_mo12" NUMERIC, "p50_mo12" NUMERIC, "p90_mo12" NUMERIC,
  "rev_at_risk_p10_p50" NUMERIC, "var" NUMERIC, "quantis_signal" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_tam_sam_som CASCADE;
CREATE TABLE public.analysis_tam_sam_som (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "industry" TEXT,
  "tam_b" NUMERIC, "sam_m" NUMERIC, "som_yr1_m" NUMERIC, "som_yr3_m" NUMERIC,
  "sam_tam" NUMERIC, "som_sam_yr1" NUMERIC, "som_sam_yr3" NUMERIC,
  "bottoms_up_rev_yr1_m" NUMERIC, "bottoms_up_rev_yr3_m" NUMERIC,
  "tb_vs_bu_gap" TEXT, "market_growth_yr" NUMERIC,
  "total_users_in_tam" NUMERIC, "arpu_implied" NUMERIC,
  "penetration_needed" NUMERIC, "market_signal" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_break_even CASCADE;
CREATE TABLE public.analysis_break_even (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "price" NUMERIC, "variable_cost" NUMERIC,
  "contribution_margin" NUMERIC, "cm_ratio" NUMERIC,
  "fixed_costs_mo" NUMERIC, "d_a_mo" NUMERIC, "interest_mo" NUMERIC,
  "total_fixed_mo" NUMERIC, "break_even_units" NUMERIC, "break_even_revenue" NUMERIC,
  "current_units" NUMERIC, "current_revenue" NUMERIC,
  "units_above_be" NUMERIC, "safety_margin" NUMERIC,
  "months_to_be_from_launch" NUMERIC, "be_signal" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_scenario CASCADE;
CREATE TABLE public.analysis_scenario (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "wacc" NUMERIC,
  "bear_rev_yr5" NUMERIC, "bear_ebitda_yr5" NUMERIC, "bear_npv" NUMERIC, "bear_irr" NUMERIC,
  "base_rev_yr5" NUMERIC, "base_ebitda_yr5" NUMERIC, "base_npv" NUMERIC, "base_irr" NUMERIC,
  "bull_rev_yr5" NUMERIC, "bull_ebitda_yr5" NUMERIC, "bull_npv" NUMERIC, "bull_irr" NUMERIC,
  "npv_range" NUMERIC, "upside_downside" NUMERIC, "scenario_grade" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_cash_flow CASCADE;
CREATE TABLE public.analysis_cash_flow (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "mo_ebitda" NUMERIC, "dso_days" NUMERIC, "working_cap" NUMERIC,
  "op_cf_mo" NUMERIC, "capex_mo" NUMERIC, "free_cf_mo" NUMERIC,
  "debt_service_mo" NUMERIC, "net_cf_mo" NUMERIC,
  "cumul_cf_m6" NUMERIC, "cumul_cf_m12" NUMERIC,
  "months_to_fcf" NUMERIC, "annual_fcf" NUMERIC, "fcf_yield" NUMERIC, "cash_signal" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_dcf CASCADE;
CREATE TABLE public.analysis_dcf (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "wacc" NUMERIC, "term_growth_g" NUMERIC,
  "fcf_yr1" NUMERIC, "fcf_yr2" NUMERIC, "fcf_yr3" NUMERIC, "fcf_yr4" NUMERIC, "fcf_yr5" NUMERIC,
  "pv_fcfs" NUMERIC, "terminal_value" NUMERIC, "enterprise_value" NUMERIC,
  "current_revenue" NUMERIC, "ev_rev" NUMERIC, "ev_ebitda" NUMERIC,
  "debt" NUMERIC, "equity_value" NUMERIC, "valuation_grade" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_dscr_credit CASCADE;
CREATE TABLE public.analysis_dscr_credit (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "annual_noi" NUMERIC, "annual_debt_svc" NUMERIC,
  "dscr" NUMERIC, "dscr_vs_1_25_min" NUMERIC,
  "max_safe_debt" NUMERIC, "current_debt" NUMERIC,
  "debt_equity" NUMERIC, "current_ratio" NUMERIC,
  "invoice_terms_days" NUMERIC, "max_safe_ar" NUMERIC, "bad_debt_rev" NUMERIC,
  "effective_tax_rate" NUMERIC, "dscr_after_tax" NUMERIC,
  "credit_tier" TEXT, "lender_signal" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_burn_runway CASCADE;
CREATE TABLE public.analysis_burn_runway (
  case_id TEXT PRIMARY KEY,
  "business" TEXT, "initial_cash" NUMERIC, "gross_burn_mo" NUMERIC,
  "revenue_mo" NUMERIC, "net_burn_mo" NUMERIC,
  "runway_months" TEXT, "runway_ok" TEXT,
  "months_to_breakeven" NUMERIC, "funding_need" NUMERIC,
  "pre_money_val_est" NUMERIC, "dilution_seed" NUMERIC,
  "death_date_months" NUMERIC, "survival_score" NUMERIC, "efficiency_score" NUMERIC,
  "cash_at_12mo" NUMERIC, "cash_at_24mo" NUMERIC, "runway_grade" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

DROP TABLE IF EXISTS public.analysis_pre_mortem CASCADE;
CREATE TABLE public.analysis_pre_mortem (
  case_id TEXT PRIMARY KEY,
  "business" TEXT,
  "failure_mode_1" TEXT, "p1" NUMERIC, "i1" NUMERIC, "score1" NUMERIC,
  "failure_mode_2" TEXT, "p2" NUMERIC, "i2" NUMERIC, "score2" NUMERIC,
  "failure_mode_3" TEXT, "p3" NUMERIC, "i3" NUMERIC, "score3" NUMERIC,
  "composite_risk" NUMERIC, "survival_prob" NUMERIC,
  "time_horizon" TEXT, "mitigation_priority" TEXT,
  source TEXT NOT NULL DEFAULT 'AIWMC Quantis 2026 Complete Analysis Dataset',
  sample_size INT NOT NULL DEFAULT 95500, data_version TEXT NOT NULL DEFAULT '2026.v1',
  data_date DATE NOT NULL DEFAULT '2026-01-01'
);

-- RLS: public read on all 11 reference tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'analysis_edge_cases','analysis_unit_economics','analysis_monte_carlo',
    'analysis_tam_sam_som','analysis_break_even','analysis_scenario',
    'analysis_cash_flow','analysis_dcf','analysis_dscr_credit',
    'analysis_burn_runway','analysis_pre_mortem'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
  END LOOP;
END $$;

-- Aggregator: returns full multi-analysis grid for a representative case
CREATE OR REPLACE FUNCTION public.get_analysis_case_grid(p_case_id TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'case_id', p_case_id,
    'edge_case', (SELECT to_jsonb(t) FROM public.analysis_edge_cases t WHERE case_id=p_case_id),
    'unit_economics', (SELECT to_jsonb(t) FROM public.analysis_unit_economics t WHERE case_id=p_case_id),
    'monte_carlo', (SELECT to_jsonb(t) FROM public.analysis_monte_carlo t WHERE case_id=p_case_id),
    'tam_sam_som', (SELECT to_jsonb(t) FROM public.analysis_tam_sam_som t WHERE case_id=p_case_id),
    'break_even', (SELECT to_jsonb(t) FROM public.analysis_break_even t WHERE case_id=p_case_id),
    'scenario', (SELECT to_jsonb(t) FROM public.analysis_scenario t WHERE case_id=p_case_id),
    'cash_flow', (SELECT to_jsonb(t) FROM public.analysis_cash_flow t WHERE case_id=p_case_id),
    'dcf', (SELECT to_jsonb(t) FROM public.analysis_dcf t WHERE case_id=p_case_id),
    'dscr_credit', (SELECT to_jsonb(t) FROM public.analysis_dscr_credit t WHERE case_id=p_case_id),
    'burn_runway', (SELECT to_jsonb(t) FROM public.analysis_burn_runway t WHERE case_id=p_case_id),
    'pre_mortem', (SELECT to_jsonb(t) FROM public.analysis_pre_mortem t WHERE case_id=p_case_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_analysis_case_grid(TEXT) TO anon, authenticated;
