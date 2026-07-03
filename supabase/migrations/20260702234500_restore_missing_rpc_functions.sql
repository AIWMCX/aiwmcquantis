-- Restore RPC functions that were recorded as applied in schema_migrations
-- but never actually took effect against the live database (project
-- dmlxrvfyqsakyjomsvdj), root-caused to CI never having had
-- SUPABASE_DB_PASSWORD configured, compounded by a migration-history
-- repair that stamped versions as applied without executing them.
--
-- Scope: only the dependency chain needed for the 7 missing functions
-- audited on 2026-07-02: confirm_lead_email, get_lead_email,
-- resubscribe_lead, unsubscribe_lead, autoposter_read_token,
-- autoposter_store_token, claim_admin_if_allowlisted. This intentionally
-- does not replay the full historical migration set (Jan-Jun 2026) since
-- schema_migrations cannot be trusted as ground truth for what already
-- ran; a full drift audit is tracked separately.
--
-- capture_lead (already live) references public.encrypt_pii,
-- public.leads.email_encrypted and public.leads.email_hash that do not
-- exist yet -- every lead-capture call has been failing in production.
-- This migration fixes that as a side effect.

-- ============================================================
-- 1. PII encryption (Vault-backed, matches the intended Jan-2026 design)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'pii_encryption_key_v2') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'base64'),
      'pii_encryption_key_v2',
      'AES-256 encryption key for PII data (phone numbers, emails). Created: 2026-07-02'
    );
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key_v2';

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in Vault. Contact administrator.';
  END IF;

  RETURN extensions.pgp_sym_encrypt(plain_text::text, v_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key_v2';

  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN extensions.pgp_sym_decrypt(encrypted_data, v_key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decrypt_pii(bytea) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(bytea) TO authenticated, service_role;

-- ============================================================
-- 2. PII access rate limiting (dependency of get_lead_email)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_pii_access_rate(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recent_access_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO recent_access_count
  FROM public.security_logs
  WHERE user_id = p_user_id
    AND event_type IN ('profile_access', 'pii_decrypt')
    AND created_at > NOW() - INTERVAL '1 minute';

  RETURN recent_access_count < 20;
END;
$$;

REVOKE ALL ON FUNCTION public.check_pii_access_rate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_pii_access_rate(uuid) TO authenticated, service_role;

-- ============================================================
-- 3. leads table: bring schema up to what capture_lead already expects,
--    plus the double-opt-in / unsubscribe columns. Plaintext `email`
--    column is left in place (not dropped) -- out of scope here.
-- ============================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email_encrypted bytea,
  ADD COLUMN IF NOT EXISTS email_hash text,
  ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_confirmation_token
  ON public.leads(confirmation_token) WHERE confirmation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_email_hash ON public.leads(email_hash);

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'pending_confirmation', 'confirmed', 'contacted', 'converted'));

-- Backfill email_hash/email_encrypted for existing plaintext rows so
-- unsubscribe/resubscribe/get_lead_email work for leads captured before
-- this fix. Existing rows are treated as already-confirmed (they opted
-- in before double opt-in existed).
UPDATE public.leads
SET email_hash = encode(extensions.digest(LOWER(email), 'sha256'), 'hex'),
    email_encrypted = public.encrypt_pii(LOWER(email)),
    confirmed_at = COALESCE(confirmed_at, created_at),
    status = CASE WHEN status = 'new' THEN 'confirmed' ELSE status END
WHERE email IS NOT NULL AND email_hash IS NULL;

-- ============================================================
-- 4. Lead compliance RPCs
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_lead_email(p_token uuid)
RETURNS TABLE(lead_id uuid, email_hash text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.leads
  SET confirmed_at = NOW(),
      status = 'confirmed',
      updated_at = NOW()
  WHERE confirmation_token = p_token
    AND confirmed_at IS NULL
  RETURNING id, leads.email_hash;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unsubscribe_lead(p_email_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.leads
  SET unsubscribed_at = NOW(),
      marketing_opt_in = false,
      updated_at = NOW()
  WHERE email_hash = p_email_hash
    AND unsubscribed_at IS NULL;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resubscribe_lead(p_email_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.leads
  SET unsubscribed_at = NULL,
      marketing_opt_in = true,
      updated_at = NOW()
  WHERE email_hash = p_email_hash
    AND unsubscribed_at IS NOT NULL;

  RETURN FOUND;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.confirm_lead_email(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_lead(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resubscribe_lead(text) TO anon, authenticated, service_role;

-- ============================================================
-- 5. get_lead_email (admin-only decrypted read, rate limited)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_lead_email(p_lead_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  IF NOT public.check_pii_access_rate() THEN
    RAISE EXCEPTION 'Rate limit exceeded for PII access';
  END IF;

  SELECT public.decrypt_pii(email_encrypted) INTO v_email
  FROM public.leads
  WHERE id = p_lead_id;

  RETURN v_email;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_lead_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lead_email(uuid) TO authenticated, service_role;

-- ============================================================
-- 6. Autoposter Vault-backed OAuth token storage
-- ============================================================
CREATE TABLE IF NOT EXISTS public.autoposter_oauth_state (
  state text PRIMARY KEY,
  platform text NOT NULL,
  code_verifier text,
  redirect_uri text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.autoposter_oauth_state TO service_role;
ALTER TABLE public.autoposter_oauth_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only state" ON public.autoposter_oauth_state;
CREATE POLICY "service role only state" ON public.autoposter_oauth_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

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

-- ============================================================
-- 7. Admin allowlist auto-claim
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_allowlisted(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT lower(_email) = ANY (ARRAY[
    'beltovbogdan@gmail.com',
    'jeltovbogdan@gmail.com',
    'legal@aiwmcquantis.com'
  ]);
$$;

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
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_admin_if_allowlisted()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR NOT public.is_admin_allowlisted(v_email) THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_admin_if_allowlisted() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_allowlisted() TO authenticated;

-- Backfill: grant admin to already-allowlisted users who signed up while
-- this function was missing.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE public.is_admin_allowlisted(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

NOTIFY pgrst, 'reload schema';
