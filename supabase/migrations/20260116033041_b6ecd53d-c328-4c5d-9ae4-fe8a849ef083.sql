-- Add unique constraint on industry_id for ON CONFLICT to work
ALTER TABLE public.industry_benchmarks
ADD CONSTRAINT industry_benchmarks_industry_id_key UNIQUE (industry_id);