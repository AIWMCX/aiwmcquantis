-- =============================================
-- KNOWLEDGE BASE TABLES FOR AIWMC QUANTIS
-- =============================================

-- 1. LOCATION DATA TABLE
-- Stores city-level cost indices and business environment data
CREATE TABLE public.location_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('north_america', 'europe', 'asia_pacific', 'middle_east', 'latin_america', 'africa', 'cis')),
  
  -- Cost indices (1.0 = US average)
  overall_cost_index NUMERIC NOT NULL DEFAULT 1.0,
  salary_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  rent_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  utility_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  
  -- Business environment
  tax_burden NUMERIC CHECK (tax_burden >= 0 AND tax_burden <= 1),
  regulatory_complexity INTEGER CHECK (regulatory_complexity >= 1 AND regulatory_complexity <= 5),
  market_maturity INTEGER CHECK (market_maturity >= 1 AND market_maturity <= 5),
  
  -- Locale information
  currency_code TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  locale_code TEXT NOT NULL DEFAULT 'en-US',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  primary_language TEXT NOT NULL DEFAULT 'English',
  
  -- Metadata
  keywords TEXT[] DEFAULT '{}',
  confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  source TEXT DEFAULT 'proprietary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. SCENARIO LIBRARY TABLE
-- AI training scenarios derived from Kerry dataset
CREATE TABLE public.scenario_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scenario_id TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('financial_planning', 'growth_strategy', 'operations', 'marketing', 'product')),
  subcategory TEXT,
  business_type TEXT NOT NULL,
  
  -- Business context (JSONB for flexibility)
  business_context JSONB NOT NULL DEFAULT '{}',
  
  -- Query and analysis
  user_query TEXT NOT NULL,
  expert_analysis JSONB NOT NULL DEFAULT '{}',
  
  -- Recommendations array
  recommendations JSONB NOT NULL DEFAULT '[]',
  
  -- Industry benchmarks reference
  industry_benchmarks JSONB NOT NULL DEFAULT '{}',
  
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  
  -- Metadata
  confidence_score INTEGER DEFAULT 80,
  source TEXT DEFAULT 'kerry_dataset',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. RISK FACTORS TABLE
-- Business risk templates with mitigation strategies
CREATE TABLE public.risk_factors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id TEXT NOT NULL UNIQUE,
  risk_category TEXT NOT NULL CHECK (risk_category IN ('market', 'financial', 'operational', 'regulatory', 'competitive', 'technology')),
  risk_name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Applicability (which industries/stages/regions)
  applicable_industries TEXT[] DEFAULT '{all}',
  applicable_stages TEXT[] DEFAULT '{pre_seed,seed,growth,mature}',
  applicable_regions TEXT[] DEFAULT '{global}',
  
  -- Impact assessment
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  financial_impact TEXT CHECK (financial_impact IN ('low', 'medium', 'high', 'critical')),
  time_to_materialize TEXT CHECK (time_to_materialize IN ('immediate', 'short_term', 'medium_term', 'long_term')),
  
  -- Mitigation strategies (JSONB array)
  mitigation_strategies JSONB NOT NULL DEFAULT '[]',
  
  -- Warning signs and related risks
  warning_signs TEXT[] DEFAULT '{}',
  related_risks TEXT[] DEFAULT '{}',
  
  -- Metadata
  confidence_score INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. LAUNCH CHECKLISTS TABLE
-- Industry-specific launch requirements
CREATE TABLE public.launch_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id TEXT NOT NULL UNIQUE,
  industry_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  
  -- Phases with tasks (JSONB array)
  phases JSONB NOT NULL DEFAULT '[]',
  
  -- Region-specific requirements
  region_requirements JSONB NOT NULL DEFAULT '{}',
  
  -- Totals
  total_estimated_cost NUMERIC,
  total_estimated_weeks INTEGER,
  
  -- Metadata
  confidence_score INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. MARKETING CHANNELS TABLE
-- Channel performance benchmarks by industry
CREATE TABLE public.marketing_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL UNIQUE,
  channel_name TEXT NOT NULL,
  channel_category TEXT NOT NULL CHECK (channel_category IN ('paid', 'organic', 'referral', 'partnerships', 'outbound')),
  
  -- Industry-specific benchmarks (JSONB array)
  benchmarks_by_industry JSONB NOT NULL DEFAULT '[]',
  
  -- Best practices and common mistakes
  best_practices TEXT[] DEFAULT '{}',
  common_mistakes TEXT[] DEFAULT '{}',
  tools_recommended TEXT[] DEFAULT '{}',
  
  -- Metadata
  confidence_score INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Location data indexes
CREATE INDEX idx_location_data_city_id ON public.location_data(city_id);
CREATE INDEX idx_location_data_region ON public.location_data(region);
CREATE INDEX idx_location_data_country ON public.location_data(country);
CREATE INDEX idx_location_data_keywords ON public.location_data USING GIN(keywords);

-- Scenario library indexes
CREATE INDEX idx_scenario_library_category ON public.scenario_library(category);
CREATE INDEX idx_scenario_library_business_type ON public.scenario_library(business_type);
CREATE INDEX idx_scenario_library_tags ON public.scenario_library USING GIN(tags);

-- Risk factors indexes
CREATE INDEX idx_risk_factors_category ON public.risk_factors(risk_category);
CREATE INDEX idx_risk_factors_industries ON public.risk_factors USING GIN(applicable_industries);

-- Launch checklists indexes
CREATE INDEX idx_launch_checklists_industry ON public.launch_checklists(industry_id);

-- Marketing channels indexes
CREATE INDEX idx_marketing_channels_category ON public.marketing_channels(channel_category);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.location_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_channels ENABLE ROW LEVEL SECURITY;

-- Anonymous users cannot access (RESTRICTIVE)
CREATE POLICY "Deny anonymous access to location_data" ON public.location_data
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Deny anonymous access to scenario_library" ON public.scenario_library
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Deny anonymous access to risk_factors" ON public.risk_factors
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Deny anonymous access to launch_checklists" ON public.launch_checklists
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "Deny anonymous access to marketing_channels" ON public.marketing_channels
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- Service role can manage all data
CREATE POLICY "Service role manages location_data" ON public.location_data
  AS RESTRICTIVE FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE POLICY "Service role manages scenario_library" ON public.scenario_library
  AS RESTRICTIVE FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE POLICY "Service role manages risk_factors" ON public.risk_factors
  AS RESTRICTIVE FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE POLICY "Service role manages launch_checklists" ON public.launch_checklists
  AS RESTRICTIVE FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

CREATE POLICY "Service role manages marketing_channels" ON public.marketing_channels
  AS RESTRICTIVE FOR ALL USING (is_service_role()) WITH CHECK (is_service_role());

-- Plus subscribers can read knowledge base data
CREATE POLICY "Plus users can view location_data" ON public.location_data
  AS RESTRICTIVE FOR SELECT USING (verify_plus_subscription(auth.uid()));

CREATE POLICY "Plus users can view scenario_library" ON public.scenario_library
  AS RESTRICTIVE FOR SELECT USING (verify_plus_subscription(auth.uid()));

CREATE POLICY "Plus users can view risk_factors" ON public.risk_factors
  AS RESTRICTIVE FOR SELECT USING (verify_plus_subscription(auth.uid()));

CREATE POLICY "Plus users can view launch_checklists" ON public.launch_checklists
  AS RESTRICTIVE FOR SELECT USING (verify_plus_subscription(auth.uid()));

CREATE POLICY "Plus users can view marketing_channels" ON public.marketing_channels
  AS RESTRICTIVE FOR SELECT USING (verify_plus_subscription(auth.uid()));