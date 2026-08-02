-- Reconciles migration 20260611033232_02bae100-385d-4a33-bf17-5080c83cafba.sql,
-- which has been silently failing on every `supabase db push --include-all`
-- since it was written: its second statement (CREATE POLICY "Users can read
-- their own entitlement denials" ON entitlement_denials) fails with
-- "already exists" because that policy was created some other way, and
-- since both statements run in one transaction, the FIRST statement (this
-- restrictive deny-anon policy on analysis_jobs) was rolled back with it and
-- has never actually existed in production. Verified via pg_policies before
-- writing this: entitlement_denials already has the policy, analysis_jobs
-- does not have this one. Applying only the missing half here; the
-- migration-history row for 20260611033232 is reconciled separately (direct
-- insert into supabase_migrations.schema_migrations, matching what
-- `supabase migration repair --status applied` does) so future
-- `db push --include-all` runs stop trying (and failing) to replay it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_jobs'
      AND policyname = 'Deny anon select on analysis_jobs'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny anon select on analysis_jobs" ON public.analysis_jobs AS RESTRICTIVE FOR SELECT TO anon USING (false)';
  END IF;
END $$;
