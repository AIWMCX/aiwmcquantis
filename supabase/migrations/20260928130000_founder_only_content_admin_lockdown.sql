-- Founder-only lockdown for Commercial Ops, Content Studio and Autoposter.
--
-- Explicit request, 2026-09-28: these three surfaces must be visible to
-- nobody but jeltovbogdan@gmail.com (and the founder's own admin-allowlisted
-- aliases: beltovbogdan@gmail.com, legal@aiwmcquantis.com). Commercial Ops
-- already required is_admin_allowlisted() alone. This migration closes the
-- narrower content_admin allowlist that 20260818080100 opened for two named
-- third parties (aiwmcsrm@gmail.com, jjbalaganvasya@gmail.com), and revokes
-- the role they already hold, so the app-layer gates (now admin-only in
-- App.tsx/ContentStudio.tsx/AppSidebar.tsx) and the edge functions
-- (content-studio-generate, autoposter-generate-content,
-- content-plan-import — now admin-only) match a DB layer that can never
-- grant content_admin to anyone again.
--
-- The content_admin role, its table column and the RLS "OR content_admin"
-- clauses are left in place deliberately (removing them touches many
-- policies for no security benefit once the allowlist is empty and the
-- role is unheld) — this is a closed door, not a demolished one, so it can
-- be reopened for a specific new hire later by editing the allowlist below.

CREATE OR REPLACE FUNCTION public.is_content_admin_allowlisted(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT lower(_email) = ANY (ARRAY[]::text[]);
$$;

DELETE FROM public.user_roles
WHERE role = 'content_admin'::public.app_role
  AND user_id IN (
    SELECT id FROM auth.users
    WHERE lower(email) IN ('aiwmcsrm@gmail.com', 'jjbalaganvasya@gmail.com')
  );

DO $$
BEGIN
  IF public.is_content_admin_allowlisted('aiwmcsrm@gmail.com')
     OR public.is_content_admin_allowlisted('jjbalaganvasya@gmail.com') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: content_admin allowlist not closed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id
    WHERE lower(u.email) IN ('aiwmcsrm@gmail.com', 'jjbalaganvasya@gmail.com')
      AND ur.role = 'content_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: content_admin role not revoked';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: Commercial Ops / Content Studio / Autoposter are founder-only';
END $$;
