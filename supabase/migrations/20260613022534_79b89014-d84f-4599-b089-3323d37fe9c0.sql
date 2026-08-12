
-- CORRECTED 2026-08-11 (E5.5 migration lineage gate): an earlier pass on
-- this branch (2026-08-10) reconstructed a full CREATE TABLE for
-- analysis_self_learning here, inferring its schema from generated
-- TypeScript types. That was wrong to do, and has been removed.
--
-- docs/accuracy/QUANTIS_ACCURACY_STATE.md's 2026-08-02 migration-ledger
-- reconciliation (an independent, authoritative prior investigation that
-- individually checked all 30 files with an untracked/unrecorded
-- production migration-ledger status) already resolved this exact
-- question with direct production evidence: "5 target dead/gone objects,
-- correctly left unrecorded: 20260613022534 (RESTRICTIVE policies on
-- analysis_self_learning/rvce_validation_log -- neither table exists)."
-- Both tables are confirmed absent from production. This migration's
-- original two CREATE POLICY statements never successfully applied there
-- and were correctly never given a schema_migrations ledger entry.
--
-- The correct fix is therefore NOT to invent schema that never existed --
-- doing so would misrepresent this file's own historical lineage exactly
-- as the E5.5 gate exists to prevent. Instead, each policy is now guarded
-- to apply only if its target table happens to exist (so this migration
-- remains a safe no-op on both a fresh replay and the real production
-- database, matching production truth), and does nothing further.
-- Whether analysis_self_learning/rvce_validation_log are still wanted at
-- all is a separate, founder-scoped product decision -- not something
-- this migration should decide by fabricating a schema for it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'analysis_self_learning'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny anon access" ON public.analysis_self_learning AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)';
  ELSE
    RAISE NOTICE 'analysis_self_learning does not exist -- skipping RESTRICTIVE policy (confirmed dead reference, see docs/accuracy/QUANTIS_ACCURACY_STATE.md)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rvce_validation_log'
  ) THEN
    EXECUTE 'CREATE POLICY "Deny anon access" ON public.rvce_validation_log AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)';
  ELSE
    RAISE NOTICE 'rvce_validation_log does not exist -- skipping RESTRICTIVE policy (confirmed dead reference, see docs/accuracy/QUANTIS_ACCURACY_STATE.md)';
  END IF;
END $$;
