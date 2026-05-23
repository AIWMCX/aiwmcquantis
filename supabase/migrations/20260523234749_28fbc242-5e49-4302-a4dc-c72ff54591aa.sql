-- 1. Drop raw token column from team_invitations (token_hash remains for verification)
ALTER TABLE public.team_invitations DROP COLUMN IF EXISTS token;

-- 2. Restrict benchmark master tables to authenticated users (no anonymous bulk export)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['benchmark_master_core','benchmark_master_geo','benchmark_master_invoice','benchmark_master_risk','benchmark_master_unit_econ']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Anyone can read %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public read access" ON public.%I', t);
    -- Drop any policy that targets the public role with a permissive USING(true)
    FOR t IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename = t
        AND 'public' = ANY(roles) AND cmd = 'SELECT'
    LOOP NULL; END LOOP;
  END LOOP;
END $$;

-- Replace SELECT policies with authenticated-only versions
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['benchmark_master_core','benchmark_master_geo','benchmark_master_invoice','benchmark_master_risk','benchmark_master_unit_econ']
  LOOP
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename = tbl AND cmd='SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY "Authenticated users can read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)',
      tbl
    );
  END LOOP;
END $$;

-- 3. autoposter_credentials: explicit RESTRICTIVE deny SELECT for non-service roles
DROP POLICY IF EXISTS "Deny SELECT to non-service roles" ON public.autoposter_credentials;
CREATE POLICY "Deny SELECT to non-service roles"
  ON public.autoposter_credentials
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);
