-- Reconciliation: register the gsc_verification repair as a real, versioned
-- migration file. This fix was applied to production directly (via Supabase
-- MCP execute_sql) during this session's earlier CI-migration-pipeline
-- repair work, before the migration control plane existed -- so its ledger
-- row (originally named "20260514200426_gsc_verification_repair", itself a
-- second instance of the apply_migration auto-generated-version bug) had no
-- corresponding git file at all: a LEDGER_ONLY entry, found live by
-- scripts/verify-migration-ledger.mjs while validating the control plane
-- against real data. This file closes that gap per the "close the manual-
-- ledger-repair loop" requirement -- written to match gsc_verification's
-- actual current live shape (introspected via information_schema/pg_catalog),
-- not a guess, and applied idempotently so replaying it is a safe no-op.
--
-- Note: this file is versioned 20260818050000 (today), NOT 20260514200426 --
-- that earlier version is already taken by a different, unrelated migration
-- (20260514200426_158157e4-....sql), a collision only discovered because
-- the phantom ledger row's name happened to embed the wrong date. A forward
-- reconciliation migration takes today's date, per "production converges
-- forward" -- it does not need to match whatever date the original fix
-- happened to be conceptually "for".
--
-- Also folds in a small hardening pass while reconciling this table, matching
-- the "current pattern" established elsewhere this session (explicit
-- anon-deny policy + explicit REVOKE/GRANT, not reliance on RLS default-deny
-- alone) and closing a genuinely missing admin DELETE policy that
-- 20260704003227's own (partially-applied, never ledger-registered) intent
-- called for but which was never actually created.

CREATE TABLE IF NOT EXISTS public.gsc_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_url text NOT NULL UNIQUE,
  verification_token text,
  verification_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.gsc_verification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anonymous access to gsc_verification" ON public.gsc_verification;
CREATE POLICY "Deny anonymous access to gsc_verification"
  ON public.gsc_verification FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "gsc_admin_select" ON public.gsc_verification;
CREATE POLICY "gsc_admin_select"
  ON public.gsc_verification FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "gsc_admin_insert" ON public.gsc_verification;
CREATE POLICY "gsc_admin_insert"
  ON public.gsc_verification FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "gsc_admin_update" ON public.gsc_verification;
CREATE POLICY "gsc_admin_update"
  ON public.gsc_verification FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- The genuinely-missing policy: 20260704003227's own header said "explicit
-- admin DELETE policy" was intended, but this exact CREATE POLICY statement
-- never actually landed live (confirmed via pg_policies before writing this).
DROP POLICY IF EXISTS "gsc_admin_delete" ON public.gsc_verification;
CREATE POLICY "gsc_admin_delete"
  ON public.gsc_verification FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manages gsc_verification" ON public.gsc_verification;
CREATE POLICY "Service role manages gsc_verification"
  ON public.gsc_verification FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Table-level grants: anon currently holds broad ambient grants (SELECT/
-- INSERT/UPDATE/DELETE) that RLS's default-deny neutralizes today (no
-- anon-targeting policy exists), but this session's established discipline
-- is explicit REVOKE + narrow GRANT rather than relying on RLS alone as the
-- only layer (same gap class as the 10-table exposure fix).
REVOKE ALL ON TABLE public.gsc_verification FROM anon;
REVOKE ALL ON TABLE public.gsc_verification FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gsc_verification TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gsc_verification TO service_role;

DO $$
BEGIN
  IF to_regclass('public.gsc_verification') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.gsc_verification still does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gsc_verification' AND policyname = 'gsc_admin_delete') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: gsc_admin_delete policy was not created';
  END IF;
  IF has_table_privilege('anon', 'public.gsc_verification', 'SELECT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can still read gsc_verification';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: gsc_verification reconciled, admin delete policy present, anon denied';
END $$;
