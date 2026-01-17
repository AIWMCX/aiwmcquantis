-- =====================================================
-- COMPREHENSIVE RLS HARDENING FOR PRODUCTION LAUNCH
-- Fixes all 10 security scan findings
-- =====================================================

-- 1. PROFILES TABLE - Block anonymous access completely
DROP POLICY IF EXISTS "Deny anonymous SELECT on profiles" ON public.profiles;
CREATE POLICY "Deny anonymous SELECT on profiles" 
ON public.profiles 
AS RESTRICTIVE
FOR SELECT 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous INSERT on profiles" ON public.profiles;
CREATE POLICY "Deny anonymous INSERT on profiles" 
ON public.profiles 
AS RESTRICTIVE
FOR INSERT 
TO anon 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anonymous UPDATE on profiles" ON public.profiles;
CREATE POLICY "Deny anonymous UPDATE on profiles" 
ON public.profiles 
AS RESTRICTIVE
FOR UPDATE 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous DELETE on profiles" ON public.profiles;
CREATE POLICY "Deny anonymous DELETE on profiles" 
ON public.profiles 
AS RESTRICTIVE
FOR DELETE 
TO anon 
USING (false);

-- 2. SUBSCRIPTIONS TABLE - Block anonymous access completely
DROP POLICY IF EXISTS "Deny anonymous SELECT on subscriptions" ON public.subscriptions;
CREATE POLICY "Deny anonymous SELECT on subscriptions" 
ON public.subscriptions 
AS RESTRICTIVE
FOR SELECT 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous INSERT on subscriptions" ON public.subscriptions;
CREATE POLICY "Deny anonymous INSERT on subscriptions" 
ON public.subscriptions 
AS RESTRICTIVE
FOR INSERT 
TO anon 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anonymous UPDATE on subscriptions" ON public.subscriptions;
CREATE POLICY "Deny anonymous UPDATE on subscriptions" 
ON public.subscriptions 
AS RESTRICTIVE
FOR UPDATE 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous DELETE on subscriptions" ON public.subscriptions;
CREATE POLICY "Deny anonymous DELETE on subscriptions" 
ON public.subscriptions 
AS RESTRICTIVE
FOR DELETE 
TO anon 
USING (false);

-- 3. ANALYSES TABLE - Block anonymous access completely
DROP POLICY IF EXISTS "Deny anonymous SELECT on analyses" ON public.analyses;
CREATE POLICY "Deny anonymous SELECT on analyses" 
ON public.analyses 
AS RESTRICTIVE
FOR SELECT 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous INSERT on analyses" ON public.analyses;
CREATE POLICY "Deny anonymous INSERT on analyses" 
ON public.analyses 
AS RESTRICTIVE
FOR INSERT 
TO anon 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anonymous UPDATE on analyses" ON public.analyses;
CREATE POLICY "Deny anonymous UPDATE on analyses" 
ON public.analyses 
AS RESTRICTIVE
FOR UPDATE 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous DELETE on analyses" ON public.analyses;
CREATE POLICY "Deny anonymous DELETE on analyses" 
ON public.analyses 
AS RESTRICTIVE
FOR DELETE 
TO anon 
USING (false);

-- 4. RATE_LIMITS TABLE - Block all non-service access
DROP POLICY IF EXISTS "Deny anonymous access on rate_limits" ON public.rate_limits;
CREATE POLICY "Deny anonymous access on rate_limits" 
ON public.rate_limits 
AS RESTRICTIVE
FOR ALL 
TO anon 
USING (false);

-- 5. SECURITY_LOGS TABLE - Block all non-service access (admin only via service role)
DROP POLICY IF EXISTS "Deny anonymous access on security_logs" ON public.security_logs;
CREATE POLICY "Deny anonymous access on security_logs" 
ON public.security_logs 
AS RESTRICTIVE
FOR ALL 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on security_logs" ON public.security_logs;
CREATE POLICY "Deny authenticated access on security_logs" 
ON public.security_logs 
AS RESTRICTIVE
FOR ALL 
TO authenticated 
USING (false);

-- 6. USER_ROLES TABLE - Block anonymous access completely
DROP POLICY IF EXISTS "Deny anonymous access on user_roles" ON public.user_roles;
CREATE POLICY "Deny anonymous access on user_roles" 
ON public.user_roles 
AS RESTRICTIVE
FOR ALL 
TO anon 
USING (false);

-- 7. USAGE_TRACKING TABLE - Block anonymous access
DROP POLICY IF EXISTS "Deny anonymous access on usage_tracking" ON public.usage_tracking;
CREATE POLICY "Deny anonymous access on usage_tracking" 
ON public.usage_tracking 
AS RESTRICTIVE
FOR ALL 
TO anon 
USING (false);

-- 8. ANONYMOUS_USAGE TABLE - Already has policies, add restrictive deny
DROP POLICY IF EXISTS "Deny anon select on anonymous_usage" ON public.anonymous_usage;
CREATE POLICY "Deny anon select on anonymous_usage" 
ON public.anonymous_usage 
AS RESTRICTIVE
FOR SELECT 
TO anon, authenticated 
USING (false);

-- 9. INDUSTRY_BENCHMARKS TABLE - This is public read for analysis, but block writes
DROP POLICY IF EXISTS "Deny anonymous write on industry_benchmarks" ON public.industry_benchmarks;
CREATE POLICY "Deny anonymous write on industry_benchmarks" 
ON public.industry_benchmarks 
AS RESTRICTIVE
FOR INSERT 
TO anon 
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anonymous update on industry_benchmarks" ON public.industry_benchmarks;
CREATE POLICY "Deny anonymous update on industry_benchmarks" 
ON public.industry_benchmarks 
AS RESTRICTIVE
FOR UPDATE 
TO anon 
USING (false);

DROP POLICY IF EXISTS "Deny anonymous delete on industry_benchmarks" ON public.industry_benchmarks;
CREATE POLICY "Deny anonymous delete on industry_benchmarks" 
ON public.industry_benchmarks 
AS RESTRICTIVE
FOR DELETE 
TO anon 
USING (false);

-- 10. Ensure FORCE ROW LEVEL SECURITY is enabled on all tables
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analyses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking FORCE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE public.industry_benchmarks FORCE ROW LEVEL SECURITY;