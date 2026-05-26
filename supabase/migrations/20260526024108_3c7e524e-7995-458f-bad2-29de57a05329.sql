
-- Fix 1: analysis_logs INSERT
DROP POLICY IF EXISTS analysis_logs_insert_own ON public.analysis_logs;
CREATE POLICY analysis_logs_insert_own
ON public.analysis_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.analyses a
    WHERE a.id = analysis_logs.analysis_id
      AND a.user_id = auth.uid()
  )
);

-- Fix 2: encrypt autoposter tokens via Vault
DROP VIEW IF EXISTS public.autoposter_credentials_safe;

ALTER TABLE public.autoposter_credentials
  DROP COLUMN IF EXISTS access_token,
  DROP COLUMN IF EXISTS refresh_token;

ALTER TABLE public.autoposter_credentials
  ADD COLUMN IF NOT EXISTS access_token_secret_id  uuid,
  ADD COLUMN IF NOT EXISTS refresh_token_secret_id uuid;

CREATE VIEW public.autoposter_credentials_safe
WITH (security_invoker = true)
AS
SELECT
  id, platform, token_expires, page_id, account_id, is_active, last_tested, updated_at,
  (access_token_secret_id IS NOT NULL)  AS has_access_token,
  (refresh_token_secret_id IS NOT NULL) AS has_refresh_token
FROM public.autoposter_credentials;

CREATE OR REPLACE FUNCTION public.set_autoposter_credentials(
  _platform      text,
  _access_token  text,
  _refresh_token text DEFAULT NULL,
  _token_expires timestamptz DEFAULT NULL,
  _page_id       text DEFAULT NULL,
  _account_id    text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_access_id  uuid;
  v_refresh_id uuid;
  v_existing   public.autoposter_credentials%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;
  IF _access_token IS NULL OR length(_access_token) = 0 THEN
    RAISE EXCEPTION 'access_token required';
  END IF;

  SELECT * INTO v_existing FROM public.autoposter_credentials WHERE platform = _platform;

  IF v_existing.access_token_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing.access_token_secret_id, _access_token);
    v_access_id := v_existing.access_token_secret_id;
  ELSE
    v_access_id := vault.create_secret(
      _access_token,
      'autoposter_access_' || _platform || '_' || gen_random_uuid()::text,
      'Autoposter access token for ' || _platform
    );
  END IF;

  IF _refresh_token IS NOT NULL AND length(_refresh_token) > 0 THEN
    IF v_existing.refresh_token_secret_id IS NOT NULL THEN
      PERFORM vault.update_secret(v_existing.refresh_token_secret_id, _refresh_token);
      v_refresh_id := v_existing.refresh_token_secret_id;
    ELSE
      v_refresh_id := vault.create_secret(
        _refresh_token,
        'autoposter_refresh_' || _platform || '_' || gen_random_uuid()::text,
        'Autoposter refresh token for ' || _platform
      );
    END IF;
  ELSE
    v_refresh_id := v_existing.refresh_token_secret_id;
  END IF;

  INSERT INTO public.autoposter_credentials (
    platform, access_token_secret_id, refresh_token_secret_id,
    token_expires, page_id, account_id, is_active, updated_at
  )
  VALUES (_platform, v_access_id, v_refresh_id, _token_expires, _page_id, _account_id, true, now())
  ON CONFLICT (platform) DO UPDATE SET
    access_token_secret_id  = EXCLUDED.access_token_secret_id,
    refresh_token_secret_id = EXCLUDED.refresh_token_secret_id,
    token_expires           = COALESCE(EXCLUDED.token_expires, public.autoposter_credentials.token_expires),
    page_id                 = COALESCE(EXCLUDED.page_id, public.autoposter_credentials.page_id),
    account_id              = COALESCE(EXCLUDED.account_id, public.autoposter_credentials.account_id),
    is_active               = true,
    updated_at              = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_autoposter_credentials(text,text,text,timestamptz,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_autoposter_credentials(text,text,text,timestamptz,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_active_autoposter_credentials()
RETURNS TABLE (
  platform text, access_token text, refresh_token text,
  token_expires timestamptz, page_id text, account_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
BEGIN
  IF NOT public.is_service_role() THEN
    RAISE EXCEPTION 'forbidden: service role required';
  END IF;
  RETURN QUERY
  SELECT
    c.platform,
    (SELECT s.decrypted_secret FROM vault.decrypted_secrets s WHERE s.id = c.access_token_secret_id)::text,
    (SELECT s.decrypted_secret FROM vault.decrypted_secrets s WHERE s.id = c.refresh_token_secret_id)::text,
    c.token_expires, c.page_id, c.account_id
  FROM public.autoposter_credentials c
  WHERE c.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_autoposter_credentials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_autoposter_credentials() TO service_role;
