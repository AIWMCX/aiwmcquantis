-- Create secure table to store industry benchmark datasets
-- This table stores industry performance data for improving analysis accuracy

CREATE TABLE public.industry_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_id TEXT NOT NULL,
  industry_name TEXT NOT NULL,
  region TEXT DEFAULT 'global',
  
  -- Financial Metrics
  cogs_percent_min NUMERIC(5,2),
  cogs_percent_max NUMERIC(5,2),
  cogs_percent_avg NUMERIC(5,2),
  
  gross_margin_min NUMERIC(5,2),
  gross_margin_max NUMERIC(5,2),
  gross_margin_avg NUMERIC(5,2),
  
  net_margin_min NUMERIC(5,2),
  net_margin_max NUMERIC(5,2),
  net_margin_avg NUMERIC(5,2),
  
  -- Customer Acquisition
  cac_min NUMERIC(10,2),
  cac_max NUMERIC(10,2),
  cac_typical NUMERIC(10,2),
  
  ltv_min NUMERIC(10,2),
  ltv_max NUMERIC(10,2),
  ltv_typical NUMERIC(10,2),
  
  ltv_cac_ratio_min NUMERIC(5,2),
  ltv_cac_ratio_max NUMERIC(5,2),
  
  -- Revenue Metrics
  average_check_min NUMERIC(10,2),
  average_check_max NUMERIC(10,2),
  orders_per_client NUMERIC(5,2),
  client_lifetime_months INTEGER,
  
  -- Fixed Costs
  salaries_fixed NUMERIC(10,2),
  rent_fixed NUMERIC(10,2),
  utilities_fixed NUMERIC(10,2),
  other_fixed NUMERIC(10,2),
  
  -- Market Data
  market_size_usd NUMERIC(15,2),
  growth_rate_percent NUMERIC(5,2),
  competition_level TEXT CHECK (competition_level IN ('low', 'medium', 'high', 'very_high')),
  
  -- Metadata
  source TEXT DEFAULT 'kerry_dataset',
  confidence_score INTEGER DEFAULT 80,
  sample_size INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Keywords for matching
  keywords TEXT[],
  
  -- Extra data as JSON for flexibility
  additional_metrics JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast industry lookups
CREATE INDEX idx_industry_benchmarks_industry_id ON public.industry_benchmarks(industry_id);
CREATE INDEX idx_industry_benchmarks_industry_name ON public.industry_benchmarks(industry_name);
CREATE INDEX idx_industry_benchmarks_keywords ON public.industry_benchmarks USING GIN(keywords);

-- Enable RLS for security
ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to READ benchmarks (read-only public data)
CREATE POLICY "Authenticated users can view benchmarks"
  ON public.industry_benchmarks
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can INSERT/UPDATE/DELETE (admin-only operations)
CREATE POLICY "Only service role can manage benchmarks"
  ON public.industry_benchmarks
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Deny anonymous access entirely
CREATE POLICY "Deny anonymous access to benchmarks"
  ON public.industry_benchmarks
  FOR ALL
  TO anon
  USING (false);

-- Add table comment for documentation
COMMENT ON TABLE public.industry_benchmarks IS 'Secure storage for industry benchmark data. Read-only for authenticated users, admin-managed.';
