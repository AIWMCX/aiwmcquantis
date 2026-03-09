-- Phase 3 & 4 Master Synthesis: Schema Enhancements
-- Add missing columns, views, functions, and seed data

-- 1. user_realism_feedback - add dimension_scores, business_type, location, engine_version
ALTER TABLE public.user_realism_feedback 
ADD COLUMN IF NOT EXISTS dimension_scores JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT '2.0.0-precision';

-- 2. safety_evaluations - add passed_checks, geo_calibration, engine_version, evaluator
ALTER TABLE public.safety_evaluations
ADD COLUMN IF NOT EXISTS passed_checks JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS geo_calibration JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS engine_version TEXT DEFAULT '2.0.0-precision',
ADD COLUMN IF NOT EXISTS evaluator TEXT DEFAULT 'safety_agent';

-- 3. golden_test_vectors - add vector_code, tolerance_pct, consecutive_passes
ALTER TABLE public.golden_test_vectors
ADD COLUMN IF NOT EXISTS vector_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tolerance_pct DECIMAL(4,2) DEFAULT 15.0,
ADD COLUMN IF NOT EXISTS consecutive_passes INTEGER DEFAULT 0;

-- 4. Create realism_by_industry view for Research Agent calibration monitoring
CREATE OR REPLACE VIEW public.realism_by_industry AS
SELECT 
  business_type,
  COUNT(*) as responses,
  ROUND(AVG(realism_score)::numeric, 2) as avg_score,
  ROUND(STDDEV(realism_score)::numeric, 2) as std_dev,
  COUNT(*) FILTER (WHERE realism_score <= 2) as too_optimistic,
  COUNT(*) FILTER (WHERE realism_score >= 4) as too_pessimistic
FROM public.user_realism_feedback
WHERE business_type IS NOT NULL
GROUP BY business_type
HAVING COUNT(*) >= 5;

-- 5. Create get_latest_audit_timestamp function for LastAuditedBadge
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