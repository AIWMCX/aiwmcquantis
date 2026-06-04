-- RPC + feature-table parity for dmlxrvfyqsakyjomsvdj
-- Idempotent: CREATE OR REPLACE FUNCTION + CREATE TABLE IF NOT EXISTS

-- AUTO-EXTRACTED: missing RPCs + feature tables for dmlxrvfyqsakyjomsvdj parity
-- Tables first (IF NOT EXISTS), then functions (CREATE OR REPLACE).
-- Safe to re-run. plpgsql bodies validate table refs at runtime.
SET check_function_bodies = off;


-- ===== FEATURE TABLES =====
-- TABLE funnel_events
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    text NOT NULL,
  session_id    text NOT NULL,
  user_id       uuid,
  path          text,
  referrer      text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- TABLE leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  offer TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABLE shared_reports
CREATE TABLE IF NOT EXISTS public.shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE export_jobs
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- TABLE quote_gen_usage
CREATE TABLE IF NOT EXISTS public.quote_gen_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL,
  plan_tier_snapshot text NOT NULL DEFAULT 'free',
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_gen_usage_unique_user_month UNIQUE (user_id, month_key),
  CONSTRAINT quote_gen_usage_count_nonneg CHECK (usage_count >= 0)
);

-- TABLE referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code VARCHAR(12) NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_rewards_earned DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_referral UNIQUE(user_id),
  CONSTRAINT unique_referral_code UNIQUE(code)
);

-- TABLE analysis_cases
CREATE TABLE IF NOT EXISTS public.analysis_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID,
  user_id UUID NOT NULL,
  industry_id TEXT NOT NULL,
  location TEXT NOT NULL,
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB NOT NULL,
  engine_version TEXT NOT NULL,
  benchmark_version TEXT,
  assumption_graph JSONB,
  sanity_flags JSONB,
  confidence_score NUMERIC,
  user_corrections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  document_id     UUID,
  invoice_number  TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  client_email    TEXT,
  client_company  TEXT,
  client_address  TEXT,
  line_items      JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC NOT NULL DEFAULT 0,
  tax_rate        NUMERIC NOT NULL DEFAULT 0,
  tax_amount      NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT DEFAULT 'USD',
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  payment_terms   TEXT DEFAULT 'Net 30',
  notes           TEXT,
  status          TEXT DEFAULT 'draft',
  paid_at         TIMESTAMPTZ,
  analysis_ref_id UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ===== FUNCTIONS =====
-- ===== benchmark_lookup =====
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

-- ===== capture_lead =====
CREATE OR REPLACE FUNCTION public.capture_lead(p_email text, p_source text, p_offer text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id UUID;
  v_email_lower text;
  v_metadata_size integer;
BEGIN
  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate email length (max 320 chars per RFC 5321)
  IF length(p_email) > 320 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;

  -- Validate source and offer length
  IF length(p_source) > 100 THEN
    RAISE EXCEPTION 'Source field too long';
  END IF;

  IF length(p_offer) > 200 THEN
    RAISE EXCEPTION 'Offer field too long';
  END IF;

  -- Validate metadata size (max 10KB)
  v_metadata_size := length(p_metadata::text);
  IF v_metadata_size > 10240 THEN
    RAISE EXCEPTION 'Metadata too large (max 10KB)';
  END IF;

  -- Sanitize metadata - remove potentially dangerous keys
  IF p_metadata ? '__proto__' OR p_metadata ? 'constructor' OR p_metadata ? 'prototype' THEN
    RAISE EXCEPTION 'Invalid metadata keys';
  END IF;

  v_email_lower := LOWER(p_email);

  -- Check for duplicate within last 24 hours using email hash
  IF EXISTS (
    SELECT 1 FROM public.leads
    WHERE email_hash = encode(extensions.digest(v_email_lower, 'sha256'), 'hex')
    AND source = p_source
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Lead already captured recently';
  END IF;

  -- Insert lead with encrypted email
  INSERT INTO public.leads (email_encrypted, email_hash, source, offer, metadata)
  VALUES (
    public.encrypt_pii(v_email_lower),
    encode(extensions.digest(v_email_lower, 'sha256'), 'hex'),
    p_source, 
    p_offer, 
    p_metadata
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$function$;

-- ===== claim_anonymous_analysis =====
CREATE OR REPLACE FUNCTION public.claim_anonymous_analysis(p_analysis_id uuid, p_anonymous_session_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_updated int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.analyses
  SET user_id = v_user
  WHERE id = p_analysis_id
    AND user_id IS NULL
    AND anonymous_session_id = p_anonymous_session_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN jsonb_build_object('claimed', v_updated > 0);
END;
$$;

-- ===== complete_referral_signup =====
CREATE OR REPLACE FUNCTION public.complete_referral_signup(
  p_conversion_id UUID,
  p_referred_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code_id UUID;
BEGIN
  -- Update conversion with user ID
  UPDATE public.referral_conversions
  SET 
    referred_user_id = p_referred_user_id,
    signed_up_at = NOW(),
    status = 'qualified'
  WHERE id = p_conversion_id AND referred_user_id IS NULL
  RETURNING referral_code_id INTO v_referral_code_id;
  
  IF v_referral_code_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Increment conversion count
  UPDATE public.referral_codes
  SET total_conversions = total_conversions + 1, updated_at = NOW()
  WHERE id = v_referral_code_id;
  
  RETURN true;
END;
$$;

-- ===== decrement_quote_gen_usage =====
CREATE OR REPLACE FUNCTION public.decrement_quote_gen_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  UPDATE public.quote_gen_usage
     SET usage_count = GREATEST(usage_count - 1, 0),
         updated_at = now()
   WHERE user_id = _uid AND month_key = _month;
END
$$;

-- ===== generate_referral_code =====
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate unique code
  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists OR v_attempts > 10;
  END LOOP;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Could not generate unique referral code';
  END IF;
  
  -- Insert the code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);
  
  RETURN v_code;
END;
$$;

-- ===== get_activation_kpis =====
CREATE OR REPLACE FUNCTION public.get_activation_kpis()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_waf INTEGER;
  v_total_signups INTEGER;
  v_paid_subs INTEGER;
  v_trial_to_paid_pct NUMERIC;
  v_retention_3m NUMERIC;
  v_retention_6m NUMERIC;
  v_retention_12m NUMERIC;
  v_cohort_3m INTEGER;
  v_cohort_6m INTEGER;
  v_cohort_12m INTEGER;
  v_active_3m INTEGER;
  v_active_6m INTEGER;
  v_active_12m INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Weekly Active Founders (distinct users with calculation_completed in last 7 days)
  SELECT COUNT(DISTINCT user_id)::int INTO v_waf
  FROM public.activation_events
  WHERE event_type = 'calculation_completed'
    AND created_at > now() - interval '7 days';

  -- Trial-to-paid conversion (last 90 days)
  SELECT COUNT(*)::int INTO v_total_signups
  FROM auth.users
  WHERE created_at > now() - interval '90 days';

  SELECT COUNT(*)::int INTO v_paid_subs
  FROM public.subscriptions s
  JOIN auth.users u ON u.id = s.user_id
  WHERE u.created_at > now() - interval '90 days'
    AND s.plan_id IN ('plus', 'pro', 'enterprise')
    AND s.status IN ('active', 'trialing');

  v_trial_to_paid_pct := CASE
    WHEN v_total_signups > 0 THEN ROUND((v_paid_subs::numeric / v_total_signups::numeric) * 100, 2)
    ELSE 0
  END;

  -- Retention cohorts: % of users from N months ago who returned in last 30 days
  -- 3-month cohort
  SELECT COUNT(*)::int INTO v_cohort_3m
  FROM auth.users
  WHERE created_at BETWEEN now() - interval '4 months' AND now() - interval '3 months';

  SELECT COUNT(DISTINCT u.id)::int INTO v_active_3m
  FROM auth.users u
  WHERE u.created_at BETWEEN now() - interval '4 months' AND now() - interval '3 months'
    AND EXISTS (
      SELECT 1 FROM public.activation_events e
      WHERE e.user_id = u.id AND e.created_at > now() - interval '30 days'
    );

  v_retention_3m := CASE WHEN v_cohort_3m > 0 THEN ROUND((v_active_3m::numeric / v_cohort_3m::numeric) * 100, 2) ELSE 0 END;

  -- 6-month cohort
  SELECT COUNT(*)::int INTO v_cohort_6m
  FROM auth.users
  WHERE created_at BETWEEN now() - interval '7 months' AND now() - interval '6 months';

  SELECT COUNT(DISTINCT u.id)::int INTO v_active_6m
  FROM auth.users u
  WHERE u.created_at BETWEEN now() - interval '7 months' AND now() - interval '6 months'
    AND EXISTS (
      SELECT 1 FROM public.activation_events e
      WHERE e.user_id = u.id AND e.created_at > now() - interval '30 days'
    );

  v_retention_6m := CASE WHEN v_cohort_6m > 0 THEN ROUND((v_active_6m::numeric / v_cohort_6m::numeric) * 100, 2) ELSE 0 END;

  -- 12-month cohort
  SELECT COUNT(*)::int INTO v_cohort_12m
  FROM auth.users
  WHERE created_at BETWEEN now() - interval '13 months' AND now() - interval '12 months';

  SELECT COUNT(DISTINCT u.id)::int INTO v_active_12m
  FROM auth.users u
  WHERE u.created_at BETWEEN now() - interval '13 months' AND now() - interval '12 months'
    AND EXISTS (
      SELECT 1 FROM public.activation_events e
      WHERE e.user_id = u.id AND e.created_at > now() - interval '30 days'
    );

  v_retention_12m := CASE WHEN v_cohort_12m > 0 THEN ROUND((v_active_12m::numeric / v_cohort_12m::numeric) * 100, 2) ELSE 0 END;

  RETURN jsonb_build_object(
    'waf', v_waf,
    'waf_target', 200,
    'trial_to_paid', jsonb_build_object(
      'percent', v_trial_to_paid_pct,
      'target_percent', 8,
      'signups_90d', v_total_signups,
      'paid_90d', v_paid_subs
    ),
    'retention', jsonb_build_object(
      '3m', jsonb_build_object('percent', v_retention_3m, 'target_percent', 60, 'cohort_size', v_cohort_3m, 'active', v_active_3m),
      '6m', jsonb_build_object('percent', v_retention_6m, 'target_percent', 45, 'cohort_size', v_cohort_6m, 'active', v_active_6m),
      '12m', jsonb_build_object('percent', v_retention_12m, 'target_percent', 30, 'cohort_size', v_cohort_12m, 'active', v_active_12m)
    ),
    'generated_at', now()
  );
END;
$$;

-- ===== get_admin_metrics =====
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE (
  total_users integer,
  total_analyses integer,
  plus_subscribers integer,
  free_users integer,
  monthly_analyses integer,
  weekly_signups integer,
  monthly_signups integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::integer FROM public.profiles) AS total_users,
    (SELECT COUNT(*)::integer FROM public.analyses) AS total_analyses,
    (SELECT COUNT(*)::integer FROM public.subscriptions 
     WHERE status IN ('active', 'trialing') AND plan_id = 'plus') AS plus_subscribers,
    (SELECT COUNT(*)::integer FROM public.subscriptions 
     WHERE status = 'active' AND plan_id = 'free') AS free_users,
    (SELECT COALESCE(SUM(analyses_count), 0)::integer FROM public.usage_tracking 
     WHERE month_year = to_char(now(), 'YYYY-MM')) AS monthly_analyses,
    (SELECT COUNT(*)::integer FROM public.profiles 
     WHERE created_at >= now() - interval '7 days') AS weekly_signups,
    (SELECT COUNT(*)::integer FROM public.profiles 
     WHERE created_at >= now() - interval '30 days') AS monthly_signups;
END;
$$;

-- ===== get_analysis_case_grid =====
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

-- ===== get_analysis_step_funnel =====
CREATE OR REPLACE FUNCTION public.get_analysis_step_funnel(_days integer DEFAULT 30)
RETURNS TABLE (
  step_name text,
  unique_sessions bigint,
  total_events bigint,
  median_ms_from_prev numeric,
  abandon_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH steps AS (
    SELECT
      session_id,
      event_name,
      created_at,
      COALESCE(NULLIF(metadata->>'step',''), event_name) AS step_name,
      LAG(created_at) OVER (PARTITION BY session_id ORDER BY created_at) AS prev_at
    FROM public.funnel_events
    WHERE created_at >= now() - (_days || ' days')::interval
      AND event_name IN ('analysis_view','analysis_start','analysis_step_view','analysis_step_complete','analysis_complete','analysis_abandon')
      AND has_role(auth.uid(), 'admin'::app_role)
  ),
  agg AS (
    SELECT
      step_name,
      COUNT(DISTINCT session_id) AS unique_sessions,
      COUNT(*) AS total_events,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (created_at - prev_at)) * 1000)
        FILTER (WHERE prev_at IS NOT NULL) AS median_ms_from_prev
    FROM steps
    GROUP BY step_name
  ),
  total AS (
    SELECT COUNT(DISTINCT session_id)::numeric AS n
    FROM public.funnel_events
    WHERE created_at >= now() - (_days || ' days')::interval
      AND event_name = 'analysis_view'
  )
  SELECT
    a.step_name,
    a.unique_sessions,
    a.total_events,
    ROUND(a.median_ms_from_prev::numeric, 0) AS median_ms_from_prev,
    CASE WHEN (SELECT n FROM total) > 0
      THEN ROUND(1 - (a.unique_sessions::numeric / (SELECT n FROM total)), 4)
      ELSE NULL END AS abandon_rate
  FROM agg a
  ORDER BY a.unique_sessions DESC;
$$;

-- ===== get_conversion_by_source =====
CREATE OR REPLACE FUNCTION public.get_conversion_by_source(_days integer DEFAULT 30)
RETURNS TABLE (
  utm_source text,
  utm_medium text,
  utm_campaign text,
  event_name text,
  tier text,
  unique_sessions bigint,
  unique_users bigint,
  total_events bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ev AS (
    SELECT
      COALESCE(NULLIF(fe.utm_source, ''), 'direct') AS utm_source,
      COALESCE(NULLIF(fe.utm_medium, ''), '(none)') AS utm_medium,
      COALESCE(NULLIF(fe.utm_campaign, ''), '(none)') AS utm_campaign,
      fe.event_name,
      fe.session_id,
      fe.user_id,
      COALESCE(
        (SELECT s.plan_id FROM public.subscriptions s
          WHERE s.user_id = fe.user_id AND s.status IN ('active','trialing')
          ORDER BY s.updated_at DESC NULLS LAST LIMIT 1),
        CASE WHEN fe.user_id IS NULL THEN 'anonymous' ELSE 'free' END
      ) AS tier
    FROM public.funnel_events fe
    WHERE fe.created_at >= now() - (_days || ' days')::interval
      AND has_role(auth.uid(), 'admin'::app_role)
  )
  SELECT
    utm_source, utm_medium, utm_campaign, event_name, tier,
    COUNT(DISTINCT session_id) AS unique_sessions,
    COUNT(DISTINCT user_id) AS unique_users,
    COUNT(*) AS total_events
  FROM ev
  GROUP BY utm_source, utm_medium, utm_campaign, event_name, tier
  ORDER BY unique_sessions DESC;
$$;

-- ===== get_latest_audit_timestamp =====
CREATE OR REPLACE FUNCTION public.get_latest_audit_timestamp()
RETURNS TIMESTAMP WITH TIME ZONE 
LANGUAGE SQL 
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MAX(evaluated_at) FROM public.safety_evaluations
  WHERE evaluator IN ('safety_agent', 'golden_vector_suite', 'manual');
$$;

-- ===== get_monthly_analyses_stats =====
CREATE OR REPLACE FUNCTION public.get_monthly_analyses_stats(p_months integer DEFAULT 12)
RETURNS TABLE(
  month_start date,
  total_analyses bigint,
  unique_users bigint,
  free_count bigint,
  plus_count bigint,
  pro_count bigint,
  anonymous_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT
    date_trunc('month', a.created_at)::date AS month_start,
    COUNT(*)::bigint AS total_analyses,
    COUNT(DISTINCT a.user_id)::bigint AS unique_users,
    COUNT(*) FILTER (WHERE lower(coalesce(a.tier_at_creation,'free'))='free')::bigint AS free_count,
    COUNT(*) FILTER (WHERE lower(coalesce(a.tier_at_creation,''))='plus')::bigint AS plus_count,
    COUNT(*) FILTER (WHERE lower(coalesce(a.tier_at_creation,''))='pro')::bigint AS pro_count,
    COUNT(*) FILTER (WHERE a.user_id IS NULL)::bigint AS anonymous_count
  FROM public.analyses a
  WHERE a.created_at >= (date_trunc('month', now()) - ((p_months-1) || ' months')::interval)
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;

-- ===== get_next_invoice_number =====
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
BEGIN
  -- Upsert brand profile if not exists, then atomically increment counter
  INSERT INTO public.user_brand_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO UPDATE
    SET invoice_counter = user_brand_profiles.invoice_counter + 1,
        updated_at = now()
  RETURNING invoice_prefix, invoice_counter INTO v_prefix, v_counter;

  RETURN v_prefix || '-' || LPAD(v_counter::TEXT, 6, '0');
END;
$$;

-- ===== get_quote_gen_status =====
CREATE OR REPLACE FUNCTION public.get_quote_gen_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _used int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object(
      'planTier','free','limit',0,'used',0,'remaining',0,
      'isEnabled',false,'isExhausted',true,'monthKey',_month
    );
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _limit := CASE _tier WHEN 'pro' THEN 15 WHEN 'plus' THEN 5 ELSE 5 END;

  SELECT usage_count INTO _used
    FROM public.quote_gen_usage
   WHERE user_id = _uid AND month_key = _month;

  _used := COALESCE(_used, 0);

  RETURN jsonb_build_object(
    'planTier',_tier,
    'limit',_limit,
    'used',_used,
    'remaining',GREATEST(_limit - _used, 0),
    'isEnabled',_limit > 0,
    'isExhausted',_used >= _limit,
    'monthKey',_month
  );
END
$$;

-- ===== get_recent_users =====
CREATE OR REPLACE FUNCTION public.get_recent_users(days_back integer DEFAULT 30)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  plan_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    p.full_name,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(s.plan_id, 'free')::text as plan_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.subscriptions s ON s.user_id = u.id
  WHERE u.created_at > NOW() - (days_back || ' days')::interval
  ORDER BY u.created_at DESC;
END;
$$;

-- ===== get_referral_stats =====
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Ensure user can only get their own stats
  IF auth.uid() != p_user_id AND NOT is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'code', rc.code,
    'total_clicks', rc.total_clicks,
    'total_conversions', rc.total_conversions,
    'total_rewards_earned', rc.total_rewards_earned,
    'is_active', rc.is_active,
    'pending_rewards', (
      SELECT COUNT(*) FROM public.referral_rewards rr
      WHERE rr.user_id = p_user_id AND rr.status = 'pending'
    ),
    'share_url', 'https://aiwmcquantis.com?ref=' || rc.code
  )
  INTO v_result
  FROM public.referral_codes rc
  WHERE rc.user_id = p_user_id;
  
  -- If no code exists, return empty stats
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'code', NULL,
      'total_clicks', 0,
      'total_conversions', 0,
      'total_rewards_earned', 0,
      'is_active', false,
      'pending_rewards', 0,
      'share_url', NULL
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- ===== get_sample_report_funnel =====
CREATE OR REPLACE FUNCTION public.get_sample_report_funnel(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := now() - (p_days || ' days')::interval;
  v_views int;
  v_ctas int;
  v_opens int;
  v_pdfs int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(DISTINCT session_id) INTO v_views
    FROM public.funnel_events WHERE event_name='sample_view' AND created_at >= v_since;
  SELECT COUNT(DISTINCT session_id) INTO v_ctas
    FROM public.funnel_events WHERE event_name='sample_cta_click' AND created_at >= v_since;
  SELECT COUNT(DISTINCT session_id) INTO v_opens
    FROM public.funnel_events WHERE event_name='sample_full_open' AND created_at >= v_since;
  SELECT COUNT(DISTINCT session_id) INTO v_pdfs
    FROM public.funnel_events WHERE event_name='sample_pdf_download' AND created_at >= v_since;

  RETURN jsonb_build_object(
    'window_days', p_days,
    'generated_at', now(),
    'steps', jsonb_build_array(
      jsonb_build_object('key','sample_view','label','Sample view','sessions',v_views,
        'conv_from_prev_pct', null,
        'conv_from_top_pct', 100.0),
      jsonb_build_object('key','sample_cta_click','label','CTA click','sessions',v_ctas,
        'conv_from_prev_pct', CASE WHEN v_views>0 THEN round((v_ctas::numeric/v_views)*100,2) ELSE null END,
        'conv_from_top_pct',  CASE WHEN v_views>0 THEN round((v_ctas::numeric/v_views)*100,2) ELSE null END),
      jsonb_build_object('key','sample_full_open','label','Full sample open','sessions',v_opens,
        'conv_from_prev_pct', CASE WHEN v_ctas>0 THEN round((v_opens::numeric/v_ctas)*100,2) ELSE null END,
        'conv_from_top_pct',  CASE WHEN v_views>0 THEN round((v_opens::numeric/v_views)*100,2) ELSE null END),
      jsonb_build_object('key','sample_pdf_download','label','PDF download','sessions',v_pdfs,
        'conv_from_prev_pct', CASE WHEN v_opens>0 THEN round((v_pdfs::numeric/v_opens)*100,2) ELSE null END,
        'conv_from_top_pct',  CASE WHEN v_views>0 THEN round((v_pdfs::numeric/v_views)*100,2) ELSE null END)
    )
  );
END;
$$;

-- ===== get_subscription_summary =====
CREATE OR REPLACE FUNCTION public.get_subscription_summary(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- If user_id provided, they can only see their own data
  IF p_user_id IS NOT NULL THEN
    -- User can only query their own subscription
    IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Access denied: Cannot view other users subscriptions';
    END IF;
    
    SELECT jsonb_build_object(
      'plan_id', plan_id,
      'status', status,
      'current_period_start', current_period_start,
      'current_period_end', current_period_end
    )
    INTO v_result
    FROM public.subscriptions
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_result, jsonb_build_object('plan_id', 'free', 'status', 'none'));
  END IF;
  
  -- Aggregate stats - admin only
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required for aggregate subscription data';
  END IF;
  
  SELECT jsonb_build_object(
    'total_subscriptions', COUNT(*),
    'active_plus', COUNT(*) FILTER (WHERE plan_id = 'plus' AND status = 'active'),
    'active_free', COUNT(*) FILTER (WHERE plan_id = 'free' AND status = 'active'),
    'trialing', COUNT(*) FILTER (WHERE status = 'trialing')
  )
  INTO v_result
  FROM public.subscriptions;
  
  RETURN v_result;
END;
$$;

-- ===== get_todays_activity =====
CREATE OR REPLACE FUNCTION public.get_todays_activity()
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  is_new_today boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email::text,
    p.full_name,
    u.last_sign_in_at,
    u.created_at,
    (u.created_at::date = CURRENT_DATE) as is_new_today
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.last_sign_in_at::date = CURRENT_DATE
     OR u.created_at::date = CURRENT_DATE
  ORDER BY GREATEST(u.last_sign_in_at, u.created_at) DESC;
END;
$$;

-- ===== get_unique_users_with_analysis =====
CREATE OR REPLACE FUNCTION public.get_unique_users_with_analysis()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT COUNT(DISTINCT user_id)::integer INTO v_count
  FROM public.analyses;

  RETURN v_count;
END;
$function$;

-- ===== get_user_activation_score =====
CREATE OR REPLACE FUNCTION public.get_user_activation_score(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_event_counts JSONB;
  v_band TEXT;
  v_next_step TEXT;
  v_unique_events INTEGER;
BEGIN
  -- Authz: user can read own; admins can read any
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Aggregate counts per event type
  SELECT COALESCE(jsonb_object_agg(event_type, cnt), '{}'::jsonb)
  INTO v_event_counts
  FROM (
    SELECT event_type, COUNT(*)::int AS cnt
    FROM public.activation_events
    WHERE user_id = p_user_id
    GROUP BY event_type
  ) sub;

  -- Compute weighted score (cap each event type's contribution to 3 occurrences)
  v_score :=
    LEAST(3, COALESCE((v_event_counts->>'idea_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'location_entered')::int, 0)) * 10 +
    LEAST(3, COALESCE((v_event_counts->>'calculation_completed')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'pdf_exported')::int, 0)) * 25 +
    LEAST(3, COALESCE((v_event_counts->>'return_visit')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'doc_generated')::int, 0)) * 20 +
    LEAST(3, COALESCE((v_event_counts->>'scenario_edited')::int, 0)) * 15 +
    LEAST(3, COALESCE((v_event_counts->>'invoice_created')::int, 0)) * 25;

  -- Cap at 100
  v_score := LEAST(100, v_score);

  -- Distinct events (used for band logic)
  SELECT COUNT(DISTINCT event_type)::int INTO v_unique_events
  FROM public.activation_events
  WHERE user_id = p_user_id;

  -- Band assignment (matches strategy PDF)
  IF v_score >= 80 THEN
    v_band := 'champion';
    v_next_step := 'Upgrade to Plus and unlock unlimited analyses + investor-ready exports.';
  ELSIF v_score >= 50 THEN
    v_band := 'engaged';
    v_next_step := 'Export your analysis as PDF to see the full investor-ready report.';
  ELSIF v_score >= 25 THEN
    v_band := 'exploring';
    v_next_step := 'Run a full calculation to see your unit economics and verdict.';
  ELSE
    v_band := 'new';
    v_next_step := 'Enter your business idea and location to start your first analysis.';
  END IF;

  RETURN jsonb_build_object(
    'score', v_score,
    'band', v_band,
    'next_step', v_next_step,
    'event_counts', v_event_counts,
    'unique_events', v_unique_events
  );
END;
$$;

-- ===== get_user_engagement_stats =====
CREATE OR REPLACE FUNCTION public.get_user_engagement_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Ensure user can only access their own data
  IF auth.uid() != p_user_id AND NOT is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'current_streak', COALESCE(ue.current_streak, 0),
    'longest_streak', COALESCE(ue.longest_streak, 0),
    'total_analyses', COALESCE(ue.total_analyses, 0),
    'total_exports', COALESCE(ue.total_exports, 0),
    'activity_score', COALESCE(ue.activity_score, 0),
    'engagement_tier', COALESCE(ue.engagement_tier, 'new'),
    'milestones_achieved', COALESCE(ue.milestones_achieved, '[]'::jsonb),
    'email_frequency', COALESCE(ue.email_frequency, 'weekly'),
    'last_active_date', ue.last_active_date
  )
  INTO v_result
  FROM public.user_engagement ue
  WHERE ue.user_id = p_user_id;
  
  -- Return defaults if no engagement record
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'total_analyses', 0,
      'total_exports', 0,
      'activity_score', 0,
      'engagement_tier', 'new',
      'milestones_achieved', '[]'::jsonb,
      'email_frequency', 'weekly',
      'last_active_date', null
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- ===== get_weekly_leaderboard =====
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE(
  rank_position integer,
  industry text,
  location text,
  idea_score integer,
  monthly_profit numeric,
  payback_months integer,
  net_margin numeric,
  share_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY 
      COALESCE((a.result->>'confidence_score')::numeric, 0) DESC,
      COALESCE(a.monthly_profit, 0) DESC
    )::integer as rank_position,
    COALESCE(a.result->>'industry_detected', 'Business') as industry,
    a.location,
    LEAST(10, GREATEST(1, 
      ROUND(
        LEAST(COALESCE((a.result->>'confidence_score')::numeric, 50) / 100.0, 1) * 3 +
        CASE 
          WHEN COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) > 20 THEN 2.5
          WHEN COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) > 10 THEN 1.5
          WHEN COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) > 0 THEN 0.75
          ELSE 0
        END +
        CASE
          WHEN COALESCE((a.result->'financial_analysis'->'unit_economics'->>'ltv_cac_ratio')::numeric, 0) >= 5 THEN 2.5
          WHEN COALESCE((a.result->'financial_analysis'->'unit_economics'->>'ltv_cac_ratio')::numeric, 0) >= 3 THEN 1.75
          WHEN COALESCE((a.result->'financial_analysis'->'unit_economics'->>'ltv_cac_ratio')::numeric, 0) >= 1 THEN 1
          ELSE 0
        END +
        CASE WHEN COALESCE((a.result->'validation'->>'is_realistic')::boolean, false) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE((a.result->'validation'->>'is_profitable')::boolean, false) THEN 1 ELSE 0 END
      )
    ))::integer as idea_score,
    COALESCE(a.monthly_profit, 0) as monthly_profit,
    a.payback_months,
    COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) as net_margin,
    sr.token as share_token
  FROM public.analyses a
  INNER JOIN public.shared_reports sr ON sr.analysis_id = a.id
  WHERE 
    sr.expires_at > NOW()
    AND sr.is_revoked = false
    AND a.monthly_profit IS NOT NULL
    -- Exclude clearly unprofitable/invalid entries from leaderboard
    AND a.monthly_profit > 0
    -- Only show analyses from last 30 days to keep it fresh
    AND sr.created_at > NOW() - INTERVAL '30 days'
  ORDER BY idea_score DESC, monthly_profit DESC
  LIMIT 10;
$$;

-- ===== increment_quote_gen_usage =====
CREATE OR REPLACE FUNCTION public.increment_quote_gen_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _new int;
  _cur int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _limit := CASE _tier WHEN 'pro' THEN 15 WHEN 'plus' THEN 5 ELSE 5 END;

  INSERT INTO public.quote_gen_usage (user_id, month_key, plan_tier_snapshot, usage_count)
    VALUES (_uid, _month, _tier, 0)
    ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.quote_gen_usage
     SET usage_count = usage_count + 1,
         plan_tier_snapshot = _tier,
         updated_at = now()
   WHERE user_id = _uid
     AND month_key = _month
     AND usage_count < _limit
   RETURNING usage_count INTO _new;

  IF _new IS NULL THEN
    SELECT usage_count INTO _cur
      FROM public.quote_gen_usage
     WHERE user_id = _uid AND month_key = _month;

    RETURN jsonb_build_object(
      'ok',false,'reason','quota',
      'planTier',_tier,'limit',_limit,'used',COALESCE(_cur,0),
      'remaining',0,'monthKey',_month
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'planTier',_tier,'limit',_limit,'used',_new,
    'remaining',_limit - _new,'monthKey',_month
  );
END
$$;

-- ===== increment_template_usage =====
CREATE OR REPLACE FUNCTION public.increment_template_usage(p_template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.doc_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$;

-- ===== record_funnel_event =====
CREATE OR REPLACE FUNCTION public.record_funnel_event(
  _event_name   text,
  _session_id   text,
  _path         text DEFAULT NULL,
  _referrer     text DEFAULT NULL,
  _utm_source   text DEFAULT NULL,
  _utm_medium   text DEFAULT NULL,
  _utm_campaign text DEFAULT NULL,
  _metadata     jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _recent_count int;
BEGIN
  SELECT COUNT(*) INTO _recent_count
  FROM public.funnel_events
  WHERE session_id = _session_id
    AND created_at > now() - interval '1 minute';
  IF _recent_count > 60 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.funnel_events (
    event_name, session_id, user_id, path, referrer,
    utm_source, utm_medium, utm_campaign, metadata
  ) VALUES (
    _event_name,
    _session_id,
    auth.uid(),
    _path,
    _referrer,
    _utm_source,
    _utm_medium,
    _utm_campaign,
    COALESCE(_metadata, '{}'::jsonb)
  ) RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- ===== track_referral_click =====
CREATE OR REPLACE FUNCTION public.track_referral_click(
  p_code TEXT,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code_id UUID;
  v_conversion_id UUID;
BEGIN
  -- Find the referral code
  SELECT id INTO v_referral_code_id
  FROM public.referral_codes
  WHERE code = upper(p_code) AND is_active = true;
  
  IF v_referral_code_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create conversion record
  INSERT INTO public.referral_conversions (referral_code_id, ip_hash, user_agent, clicked_at)
  VALUES (v_referral_code_id, p_ip_hash, p_user_agent, NOW())
  RETURNING id INTO v_conversion_id;
  
  -- Increment click count
  UPDATE public.referral_codes
  SET total_clicks = total_clicks + 1, updated_at = NOW()
  WHERE id = v_referral_code_id;
  
  RETURN v_conversion_id;
END;
$$;


-- Grant execute on all public functions to anon + authenticated
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT proname, oidvectortypes(proargtypes) AS args
           FROM pg_proc WHERE pronamespace='public'::regnamespace LOOP
    BEGIN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated', r.proname, r.args);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;

-- Enable RLS + permissive service/owner policies on new feature tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['funnel_events','leads','shared_reports','export_jobs','quote_gen_usage','referral_codes','analysis_cases','invoices'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_svc ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_svc ON public.%I FOR ALL USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Verify: count of the 32 expected RPCs now present
SELECT count(*) AS rpc_count FROM pg_proc WHERE pronamespace='public'::regnamespace
AND proname IN ('benchmark_lookup','capture_lead','claim_anonymous_analysis','complete_referral_signup','decrement_quote_gen_usage','generate_referral_code','get_activation_kpis','get_admin_metrics','get_ai_learning_metrics','get_analysis_case_grid','get_analysis_step_funnel','get_conversion_by_source','get_daily_signups','get_latest_audit_timestamp','get_monthly_analyses','get_monthly_analyses_stats','get_next_invoice_number','get_quote_gen_status','get_recent_users','get_referral_stats','get_sample_report_funnel','get_subscription_summary','get_todays_activity','get_unique_users_with_analysis','get_user_activation_score','get_user_engagement_stats','get_weekly_leaderboard','has_role','increment_quote_gen_usage','increment_template_usage','record_funnel_event','track_referral_click');