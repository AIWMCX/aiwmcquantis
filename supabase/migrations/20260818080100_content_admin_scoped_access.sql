-- Scoped Content Studio / Autoposter access role — 2026-08-18, part 2/2.
--
-- Explicit user request: AIWMCSRM@gmail.com and jjbalaganvasya@gmail.com
-- must always have full Content Studio/Autoposter access in production, no
-- matter what -- but NOT full system admin (billing, security, user
-- management, production health). jeltovbogdan@gmail.com already has full
-- admin via the existing is_admin_allowlisted() allowlist (20260621020649)
-- and therefore already has Content Studio/Autoposter access as a subset
-- of that; deliberately not added to the narrower list below (redundant).
--
-- Design: a separate allowlist function (is_content_admin_allowlisted(),
-- distinct from is_admin_allowlisted() which continues to gate real
-- 'admin'), the SAME protect_admin_role() trigger extended to also
-- validate 'content_admin' assignment (one protective trigger for both
-- privileged roles, not a second untested code path), and a claim-on-login
-- RPC mirroring claim_admin_if_allowlisted(). Every RLS policy currently
-- gating Autoposter/Content Studio tables on
-- has_role(auth.uid(),'admin') is extended to
-- OR has_role(auth.uid(),'content_admin'), so existing full-admin access
-- is unchanged and the two scoped accounts gain exactly this surface.

CREATE OR REPLACE FUNCTION public.is_content_admin_allowlisted(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT lower(_email) = ANY (ARRAY[
    'aiwmcsrm@gmail.com',
    'jjbalaganvasya@gmail.com'
  ]);
$$;

-- Extend the existing protective trigger (was admin-only) to also guard
-- 'content_admin' role assignment against its own allowlist.
CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  IF NEW.role = 'admin'::public.app_role THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS NULL OR NOT public.is_admin_allowlisted(v_email) THEN
      RAISE EXCEPTION 'Admin role assignment is restricted. Contact system administrator.';
    END IF;
  ELSIF NEW.role = 'content_admin'::public.app_role THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;
    IF v_email IS NULL OR NOT (public.is_content_admin_allowlisted(v_email) OR public.is_admin_allowlisted(v_email)) THEN
      RAISE EXCEPTION 'Content Studio/Autoposter admin role assignment is restricted. Contact system administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_content_admin_if_allowlisted()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR NOT public.is_content_admin_allowlisted(v_email) THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'content_admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_content_admin_if_allowlisted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_content_admin_if_allowlisted() TO authenticated;

-- Backfill: any already-registered allowlisted account gets the role now,
-- not only on next login (matches "always, no matter what").
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'content_admin'::public.app_role
FROM auth.users u
WHERE public.is_content_admin_allowlisted(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

-- Extend every Autoposter/Content Studio RLS policy that currently checks
-- has_role(auth.uid(),'admin') alone to also accept 'content_admin'.
-- autoposter_oauth_state is intentionally left service-role-only (raw
-- OAuth token exchange state, never read by any authenticated-role client
-- regardless of admin/content_admin -- unchanged, not a Content
-- Studio/Autoposter *feature* surface).

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_analytics_weekly;
CREATE POLICY "admin_all" ON public.autoposter_analytics_weekly
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_credentials;
CREATE POLICY "admin_all" ON public.autoposter_credentials
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_post_analytics;
CREATE POLICY "admin_all" ON public.autoposter_post_analytics
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_post_platforms;
CREATE POLICY "admin_all" ON public.autoposter_post_platforms
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_posts;
CREATE POLICY "admin_all" ON public.autoposter_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admin_all" ON public.autoposter_publishing_logs;
CREATE POLICY "admin_all" ON public.autoposter_publishing_logs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "Deny non-admin access to content_studio_generations" ON public.content_studio_generations;
CREATE POLICY "Deny non-admin access to content_studio_generations" ON public.content_studio_generations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admins read content studio" ON public.content_studio_generations;
CREATE POLICY "admins read content studio" ON public.content_studio_generations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admins write content studio" ON public.content_studio_generations;
CREATE POLICY "admins write content studio" ON public.content_studio_generations
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role)) AND created_by = auth.uid());

DROP POLICY IF EXISTS "admins update content studio" ON public.content_studio_generations;
CREATE POLICY "admins update content studio" ON public.content_studio_generations
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DROP POLICY IF EXISTS "admins delete content studio" ON public.content_studio_generations;
CREATE POLICY "admins delete content studio" ON public.content_studio_generations
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'content_admin'::app_role));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_content_admin_allowlisted') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: is_content_admin_allowlisted missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'claim_content_admin_if_allowlisted') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: claim_content_admin_if_allowlisted missing';
  END IF;
  IF NOT public.is_content_admin_allowlisted('AIWMCSRM@gmail.com') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: AIWMCSRM@gmail.com not allowlisted';
  END IF;
  IF NOT public.is_content_admin_allowlisted('jjbalaganvasya@gmail.com') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: jjbalaganvasya@gmail.com not allowlisted';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN auth.users u ON u.id = ur.user_id
    WHERE lower(u.email) = 'jjbalaganvasya@gmail.com' AND ur.role = 'content_admin'::public.app_role
  ) THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: jjbalaganvasya@gmail.com backfill did not apply';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: content_admin scoped role wired and backfilled';
END $$;
