-- Phase 7 follow-up (2026-08-30): the paid_engagements admin page needs to
-- (a) load the linked analysis's full stored result to generate a Decision
-- Memo PDF for someone else's analysis, and (b) check ANY user's analyses
-- table to compute measured-return-usage (did this user come back for
-- another analysis after their paid engagement). Neither is possible today:
-- public.analyses has no admin-read policy at all (confirmed via a search
-- across every migration for an admin policy on this table -- none exists),
-- so an admin's own RLS-scoped client call would return zero rows for any
-- analysis they don't personally own.
--
-- This adds exactly one narrow, additive, SELECT-only admin policy,
-- following the same pattern already used for ai_calls
-- ("Admins can read all ai_calls", 20260713055333). It does not touch or
-- weaken the existing owner-scoped policies -- those remain the only path
-- for non-admin users.

DROP POLICY IF EXISTS "Admins can read all analyses" ON public.analyses;
CREATE POLICY "Admins can read all analyses"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'analyses'
      AND policyname = 'Admins can read all analyses'
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: admin read policy on analyses was not created';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: admins can now SELECT any row in public.analyses';
END $$;
