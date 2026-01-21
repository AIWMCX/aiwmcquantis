-- Remove overly permissive policy that allows all authenticated users to view benchmarks
DROP POLICY IF EXISTS "Authenticated users can view benchmarks" ON public.industry_benchmarks;

-- Create new policy: Only Plus/Pro subscribers can directly query benchmarks
CREATE POLICY "Plus subscribers can view benchmarks" 
ON public.industry_benchmarks 
FOR SELECT 
TO authenticated
USING (verify_plus_subscription(auth.uid()));

-- Add comment explaining the security model
COMMENT ON TABLE public.industry_benchmarks IS 'Proprietary industry benchmark data. Direct access restricted to Plus/Pro subscribers. Free users access benchmarks indirectly via the analyze-business edge function (service role).';