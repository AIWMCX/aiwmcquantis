-- Follow-up to 20261023220000 (verified live 2026-10-23): with the column in
-- place, an anonymous insert still fails with 42501 'new row violates
-- row-level security policy "Deny anonymous INSERT on analyses"'.
-- 20260117123719 added that RESTRICTIVE policy (WITH CHECK (false)) for the
-- anon role; restrictive policies AND with every permissive one, so the
-- May 2026 anonymous-save design could never work.
--
-- Narrow it instead of dropping it: anon may insert ONLY an unowned row
-- carrying a session id (the same shape the permissive policy allows), and
-- can never insert a row attributed to a user. Anon still has no SELECT,
-- UPDATE or DELETE on analyses.

DROP POLICY IF EXISTS "Deny anonymous INSERT on analyses" ON public.analyses;
CREATE POLICY "Deny anonymous INSERT on analyses"
  ON public.analyses
  AS RESTRICTIVE
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND anonymous_session_id IS NOT NULL
    AND length(anonymous_session_id) BETWEEN 8 AND 128
  );
