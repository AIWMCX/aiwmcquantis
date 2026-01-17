-- ============================================================
-- COMPREHENSIVE RLS SECURITY HARDENING MIGRATION
-- Defense-in-depth architecture for production security
-- ============================================================

-- ============================================================
-- PHASE 1: ADD EXPLICIT ANONYMOUS DENY POLICIES
-- ============================================================

-- 1.1 Profiles Table - Deny anonymous access
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false);

-- 1.2 Security Logs Table - Deny all non-service access
CREATE POLICY "Deny anonymous access to security_logs"
ON public.security_logs
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny authenticated access to security_logs"
ON public.security_logs
FOR ALL
TO authenticated
USING (false);

-- 1.3 Rate Limits Table - Deny all non-service access
CREATE POLICY "Deny anonymous access to rate_limits"
ON public.rate_limits
FOR ALL
TO anon
USING (false);

CREATE POLICY "Deny authenticated access to rate_limits"
ON public.rate_limits
FOR ALL
TO authenticated
USING (false);

-- 1.4 Analyses Table - Deny anonymous access
CREATE POLICY "Deny anonymous access to analyses"
ON public.analyses
FOR ALL
TO anon
USING (false);

-- 1.5 User Roles Table - Deny anonymous access
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false);

-- ============================================================
-- PHASE 2: FIX PROFILES DELETE POLICY (public -> authenticated)
-- ============================================================

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ============================================================
-- PHASE 3: FIX USAGE_TRACKING POLICIES (public -> authenticated)
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;

-- Recreate with correct role targeting
CREATE POLICY "Users can insert own usage"
ON public.usage_tracking
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
ON public.usage_tracking
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage"
ON public.usage_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add anonymous deny
CREATE POLICY "Deny anonymous access to usage_tracking"
ON public.usage_tracking
FOR ALL
TO anon
USING (false);

-- ============================================================
-- PHASE 4: SECURE subscriptions_public VIEW
-- ============================================================

DROP VIEW IF EXISTS public.subscriptions_public;

CREATE VIEW public.subscriptions_public
WITH (security_invoker = on)
AS SELECT 
    id,
    user_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
FROM public.subscriptions;

COMMENT ON VIEW public.subscriptions_public IS 'Safe subscription view excluding Stripe IDs - uses security_invoker for RLS enforcement';

-- ============================================================
-- PHASE 5: ENABLE FORCE ROW LEVEL SECURITY (Defense-in-Depth)
-- ============================================================

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking FORCE ROW LEVEL SECURITY;
ALTER TABLE public.analyses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE public.industry_benchmarks FORCE ROW LEVEL SECURITY;

-- ============================================================
-- PHASE 6: CREATE SECURITY AUDIT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.audit_rls_security()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  rls_forced boolean,
  has_anon_deny boolean,
  policy_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text,
    c.relrowsecurity,
    c.relforcerowsecurity,
    EXISTS(
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = c.relname 
      AND p.roles::text LIKE '%anon%'
      AND (p.qual = 'false' OR p.with_check = 'false')
    ),
    (SELECT COUNT(*)::integer FROM pg_policies p WHERE p.tablename = c.relname)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' 
    AND c.relkind = 'r'
  ORDER BY c.relname;
END;
$$;

COMMENT ON FUNCTION public.audit_rls_security IS 'Security audit function to monitor RLS health across all tables';

-- ============================================================
-- GRANT EXECUTE TO AUTHENTICATED USERS FOR AUDIT
-- ============================================================

GRANT EXECUTE ON FUNCTION public.audit_rls_security TO authenticated;