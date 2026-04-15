-- 1. Remove overly permissive public read on safety_evaluations
DROP POLICY IF EXISTS "Anyone can view safety evaluations" ON public.safety_evaluations;

-- 2. Fix privilege escalation on user_roles: add ownership checks
DROP POLICY IF EXISTS "Block admin role updates" ON public.user_roles;
CREATE POLICY "Authenticated users can update own non-admin roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND role <> 'admin'::app_role)
  WITH CHECK (auth.uid() = user_id AND role <> 'admin'::app_role);

DROP POLICY IF EXISTS "Block direct admin role insertion" ON public.user_roles;
CREATE POLICY "Authenticated users can insert own non-admin roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role <> 'admin'::app_role);

-- 3. Fix security definer view - recreate as security invoker
DROP VIEW IF EXISTS public.realism_by_industry;
CREATE VIEW public.realism_by_industry
  WITH (security_invoker = true)
AS
SELECT business_type,
    count(*) AS responses,
    round(avg(realism_score), 2) AS avg_score,
    round(stddev(realism_score), 2) AS std_dev,
    count(*) FILTER (WHERE realism_score <= 2) AS too_optimistic,
    count(*) FILTER (WHERE realism_score >= 4) AS too_pessimistic
FROM user_realism_feedback
WHERE business_type IS NOT NULL
GROUP BY business_type
HAVING count(*) >= 5;

-- 4. Fix mutable search_path on update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;