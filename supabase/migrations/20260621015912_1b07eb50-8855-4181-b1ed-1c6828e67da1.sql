
-- Short-lived OAuth state/PKCE storage
CREATE TABLE IF NOT EXISTS public.autoposter_oauth_state (
  state text PRIMARY KEY,
  platform text NOT NULL,
  code_verifier text,
  redirect_uri text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.autoposter_oauth_state TO service_role;
ALTER TABLE public.autoposter_oauth_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only state" ON public.autoposter_oauth_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Store a secret in Vault and return its id
CREATE OR REPLACE FUNCTION public.autoposter_store_token(p_secret text, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = p_name;
  IF v_id IS NULL THEN
    v_id := vault.create_secret(p_secret, p_name);
  ELSE
    PERFORM vault.update_secret(v_id, p_secret);
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.autoposter_store_token(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autoposter_store_token(text, text) TO service_role;

-- Read decrypted secret by id
CREATE OR REPLACE FUNCTION public.autoposter_read_token(p_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = p_id;
  RETURN v_secret;
END;
$$;
REVOKE ALL ON FUNCTION public.autoposter_read_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autoposter_read_token(uuid) TO service_role;
