-- Add churn rate and seasonality columns to industry_benchmarks
-- This enables more accurate projections based on industry-specific churn patterns

ALTER TABLE public.industry_benchmarks 
ADD COLUMN IF NOT EXISTS churn_rate_monthly NUMERIC DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS churn_rate_annual NUMERIC DEFAULT 0.40,
ADD COLUMN IF NOT EXISTS seasonality_coefficients JSONB DEFAULT '{"jan":1.0,"feb":1.0,"mar":1.0,"apr":1.0,"may":1.0,"jun":1.0,"jul":1.0,"aug":1.0,"sep":1.0,"oct":1.0,"nov":1.0,"dec":1.0}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.industry_benchmarks.churn_rate_monthly IS 'Monthly churn rate as decimal (0.05 = 5%). Used for client retention calculations.';
COMMENT ON COLUMN public.industry_benchmarks.churn_rate_annual IS 'Annual churn rate as decimal. Should equal ~1-(1-monthly)^12';
COMMENT ON COLUMN public.industry_benchmarks.seasonality_coefficients IS 'Monthly revenue multipliers. 1.0 = average, 1.5 = 50% above average, 0.7 = 30% below';

-- Update industry-specific churn rates based on Kerry dataset research
-- SaaS industries (low churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.03,
  churn_rate_annual = 0.30
WHERE industry_id IN ('saas_startup', 'b2b_saas', 'enterprise_software');

-- E-commerce (medium-high churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.12,
  churn_rate_annual = 0.80,
  seasonality_coefficients = '{"jan":0.7,"feb":0.75,"mar":0.85,"apr":0.9,"may":0.95,"jun":0.9,"jul":0.85,"aug":0.9,"sep":1.0,"oct":1.1,"nov":1.4,"dec":1.6}'::jsonb
WHERE industry_id IN ('ecommerce_retail', 'dropshipping', 'online_store');

-- Fitness (high seasonal, medium churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.08,
  churn_rate_annual = 0.65,
  seasonality_coefficients = '{"jan":1.6,"feb":1.4,"mar":1.2,"apr":1.0,"may":0.9,"jun":0.8,"jul":0.75,"aug":0.8,"sep":1.0,"oct":0.95,"nov":0.9,"dec":0.7}'::jsonb
WHERE industry_id IN ('gym_fitness', 'yoga_pilates', 'fitness');

-- Restaurant/Food (high seasonal, high churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.15,
  churn_rate_annual = 0.85,
  seasonality_coefficients = '{"jan":0.7,"feb":0.75,"mar":0.85,"apr":0.95,"may":1.05,"jun":1.1,"jul":1.15,"aug":1.1,"sep":1.0,"oct":0.95,"nov":1.0,"dec":1.3}'::jsonb
WHERE industry_id IN ('restaurant', 'cafe_bakery', 'food_delivery', 'food_service');

-- Consulting/Agency (low churn, B2B)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.02,
  churn_rate_annual = 0.22
WHERE industry_id IN ('consulting', 'agency', 'professional_services');

-- Education (seasonal, medium churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.06,
  churn_rate_annual = 0.52,
  seasonality_coefficients = '{"jan":1.3,"feb":1.1,"mar":1.0,"apr":0.9,"may":0.8,"jun":0.6,"jul":0.5,"aug":0.7,"sep":1.4,"oct":1.2,"nov":1.0,"dec":0.8}'::jsonb
WHERE industry_id IN ('online_education', 'coaching', 'edtech');

-- Fintech (low churn due to switching costs)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.025,
  churn_rate_annual = 0.26
WHERE industry_id IN ('fintech', 'financial_services', 'neobank');

-- Real Estate (very low churn, long cycles)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.01,
  churn_rate_annual = 0.12,
  seasonality_coefficients = '{"jan":0.7,"feb":0.75,"mar":0.9,"apr":1.1,"may":1.2,"jun":1.25,"jul":1.2,"aug":1.1,"sep":1.0,"oct":0.9,"nov":0.8,"dec":0.65}'::jsonb
WHERE industry_id IN ('real_estate', 'property', 'proptech');

-- Healthcare (low churn, steady)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.02,
  churn_rate_annual = 0.22
WHERE industry_id IN ('healthcare', 'medical', 'healthtech', 'telehealth');

-- Media/Content (high churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.10,
  churn_rate_annual = 0.72
WHERE industry_id IN ('media', 'content', 'streaming', 'newsletter');

-- Marketplace (medium churn)
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.07,
  churn_rate_annual = 0.58
WHERE industry_id IN ('marketplace', 'platform');

-- General/fallback
UPDATE public.industry_benchmarks SET 
  churn_rate_monthly = 0.05,
  churn_rate_annual = 0.46
WHERE churn_rate_monthly IS NULL OR churn_rate_monthly = 0.05;