
-- 1. Restrict analysis subtype reference tables to authenticated users (block anon enumeration)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'analysis_break_even','analysis_burn_runway','analysis_cash_flow','analysis_dcf',
    'analysis_dscr_credit','analysis_edge_cases','analysis_monte_carlo','analysis_pre_mortem',
    'analysis_scenario','analysis_tam_sam_som','analysis_unit_economics'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Public read ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'Authenticated read ' || t, t
    );
  END LOOP;
END $$;

-- 2. autoposter_credentials: split admin_all so admins cannot SELECT raw tokens.
--    Service role retains full access (bypasses RLS). Admins can manage non-secret columns
--    via INSERT/UPDATE/DELETE; SELECT goes through a sanitized view.
DROP POLICY IF EXISTS admin_all ON public.autoposter_credentials;

CREATE POLICY autoposter_credentials_admin_insert
  ON public.autoposter_credentials
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY autoposter_credentials_admin_update
  ON public.autoposter_credentials
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY autoposter_credentials_admin_delete
  ON public.autoposter_credentials
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Revoke direct token column reads from non-service-role clients
REVOKE SELECT ON public.autoposter_credentials FROM authenticated, anon;
REVOKE SELECT (access_token, refresh_token) ON public.autoposter_credentials FROM authenticated, anon, PUBLIC;

-- Sanitized view for admin UI (no token columns)
CREATE OR REPLACE VIEW public.autoposter_credentials_safe
WITH (security_invoker = true) AS
SELECT id, platform, token_expires, page_id, account_id, is_active, last_tested, updated_at,
       (access_token IS NOT NULL AND length(access_token) > 0) AS has_access_token,
       (refresh_token IS NOT NULL AND length(refresh_token) > 0) AS has_refresh_token
FROM public.autoposter_credentials;

GRANT SELECT ON public.autoposter_credentials_safe TO authenticated;

-- 3. team_invitations: prevent admins from reading the raw token column.
--    Clients should use token_hash; raw token only flows to invitee via email at creation.
REVOKE SELECT (token) ON public.team_invitations FROM authenticated, anon, PUBLIC;
