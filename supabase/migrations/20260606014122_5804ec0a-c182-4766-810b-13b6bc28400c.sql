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
  v_sector_input text := lower(trim(coalesce(p_sector, '')));
  v_sector text;
  v_model_input text := lower(trim(coalesce(p_business_model, '')));
  v_model text;
  v_stage text := p_stage;
BEGIN
  v_sector := CASE
    WHEN v_sector_input IN ('saas','software','software as a service','technology','tech','ai','micro saas','micro-saas') THEN 'SaaS'
    WHEN v_sector_input IN ('coffee_shop','coffee shop','restaurant','food_truck','food truck','food','food and beverage','food & beverage','cafe','café','bar','ghost kitchen') THEN 'Food & Beverage'
    WHEN v_sector_input IN ('ecommerce','e-commerce','retail','dropshipping','shopify','store','marketplace retail') THEN 'Retail'
    WHEN v_sector_input IN ('consulting','coaching','digital_agency','digital agency','agency','professional services','home_services','home services','services') THEN 'Services'
    WHEN v_sector_input IN ('health','healthcare','medical','clinic') THEN 'Healthcare'
    WHEN v_sector_input IN ('fitness','wellness','health_wellness','health wellness','beauty','spa') THEN 'Beauty & Wellness'
    WHEN v_sector_input IN ('education','online_course','online course','course','school','tutoring') THEN 'Education'
    WHEN v_sector_input IN ('real_estate','real estate','property') THEN 'Real Estate'
    WHEN v_sector_input IN ('fintech','finance','financial services') THEN 'Fintech'
    WHEN v_sector_input IN ('manufacturing','factory','production') THEN 'Manufacturing'
    WHEN v_sector_input IN ('logistics','supply chain','shipping') THEN 'Logistics'
    WHEN v_sector_input IN ('transportation','mobility') THEN 'Transportation'
    WHEN v_sector_input IN ('media','content_creation','content creation','photography','creative') THEN 'Media'
    WHEN v_sector_input IN ('construction','contractor','trades') THEN 'Construction'
    WHEN v_sector_input IN ('marketplace') THEN 'Marketplace'
    WHEN v_sector_input IN ('agriculture','farm') THEN 'Agriculture'
    WHEN v_sector_input IN ('non-profit','nonprofit') THEN 'Non-profit'
    ELSE NULLIF(p_sector, '')
  END;

  v_model := CASE
    WHEN v_model_input IN ('subscription','saas','recurring') THEN 'subscription'
    WHEN v_model_input IN ('marketplace','two-sided marketplace','two sided') THEN 'marketplace'
    WHEN v_model_input IN ('usage','usage_based','usage-based','pay as you go') THEN 'usage_based'
    WHEN v_model_input IN ('hybrid','mixed') THEN 'hybrid'
    WHEN v_model_input IN ('transactional','retail','services','service','b2c','b2b','') THEN 'transactional'
    ELSE p_business_model
  END;

  v_stage := CASE lower(trim(coalesce(p_stage, '')))
    WHEN 'idea' THEN 'idea'
    WHEN 'pre-revenue' THEN 'pre_launch'
    WHEN 'pre_launch' THEN 'pre_launch'
    WHEN 'early' THEN 'early_0_1y'
    WHEN 'early_0_1y' THEN 'early_0_1y'
    WHEN 'growth' THEN 'scaling_1_3y'
    WHEN 'scaling' THEN 'scaling_1_3y'
    WHEN 'scaling_1_3y' THEN 'scaling_1_3y'
    WHEN 'established' THEN 'mature_3y_plus'
    WHEN 'mature' THEN 'mature_3y_plus'
    WHEN 'mature_3y_plus' THEN 'mature_3y_plus'
    ELSE p_stage
  END;

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

  FOR v_match_level, v_sql IN
    SELECT 'exact', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 AND company_stage IS NOT DISTINCT FROM $5 AND size_bucket IS NOT DISTINCT FROM $6 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'no_size', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 AND company_stage IS NOT DISTINCT FROM $5 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'no_stage', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 AND city_tier IS NOT DISTINCT FROM $4 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'no_city', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 AND country IS NOT DISTINCT FROM $3 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'sector_model', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 AND business_model IS NOT DISTINCT FROM $2 LIMIT 1', v_p25, v_p50, v_p75, v_table)
    UNION ALL SELECT 'sector_only', format('SELECT %I AS p25, %I AS p50, %I AS p75, source, sample_size, data_version, data_date FROM public.%I WHERE sector_level1=$1 LIMIT 1', v_p25, v_p50, v_p75, v_table)
  LOOP
    BEGIN
      EXECUTE v_sql INTO v_row USING v_sector, v_model, p_country, p_city_tier, v_stage, p_size;
    EXCEPTION WHEN OTHERS THEN
      v_row := NULL;
    END;
    IF v_row IS NOT NULL AND v_row.p50 IS NOT NULL THEN
      RETURN jsonb_build_object(
        'matched', true,
        'metric', p_metric,
        'match_level', v_match_level,
        'normalized_sector', v_sector,
        'normalized_business_model', v_model,
        'p25', v_row.p25, 'p50', v_row.p50, 'p75', v_row.p75,
        'source', v_row.source,
        'sample_size', v_row.sample_size,
        'data_version', v_row.data_version,
        'data_date', v_row.data_date
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('matched', false, 'metric', p_metric, 'reason', 'no_data', 'normalized_sector', v_sector, 'normalized_business_model', v_model);
END $$;

GRANT EXECUTE ON FUNCTION public.benchmark_lookup(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO anon, authenticated, service_role;