-- Add unique constraint on industry_id for upsert ON CONFLICT to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_industry_benchmarks_industry_id 
ON public.industry_benchmarks (industry_id);