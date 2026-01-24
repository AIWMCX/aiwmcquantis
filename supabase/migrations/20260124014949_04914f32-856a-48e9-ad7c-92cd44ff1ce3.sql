
-- ============================================
-- SEC-001 FIX: Migrate PII Encryption Key to Supabase Vault
-- ============================================

-- Phase 1: Create secrets in Vault
-- 1.1 Store the old key for migration (will be deleted after migration)
SELECT vault.create_secret(
  'quantis_pii_encryption_key_v1',
  'pii_encryption_key_v1_deprecated',
  'DEPRECATED: Old hardcoded key for data migration only. DELETE AFTER MIGRATION COMPLETE.'
);

-- 1.2 Create new secure encryption key (256-bit)
SELECT vault.create_secret(
  encode(gen_random_bytes(32), 'base64'),
  'pii_encryption_key_v2',
  'AES-256 encryption key for PII data (phone numbers, emails). Created: 2026-01-24'
);

-- Phase 2: Update encryption functions to use Vault
-- 2.1 New secure encrypt_pii function
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
  
  -- Get key from Vault (never visible in code!)
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets 
  WHERE name = 'pii_encryption_key_v2';
  
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'PII encryption key not found in Vault. Contact administrator.';
  END IF;
  
  RETURN extensions.pgp_sym_encrypt(plain_text::text, v_key);
END;
$$;

-- 2.2 New secure decrypt_pii function with key rotation support
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key_v2 text;
  v_key_v1 text;
  v_result text;
BEGIN
  IF encrypted_data IS NULL THEN 
    RETURN NULL; 
  END IF;
  
  -- Try current key first
  SELECT decrypted_secret INTO v_key_v2
  FROM vault.decrypted_secrets 
  WHERE name = 'pii_encryption_key_v2';
  
  IF v_key_v2 IS NOT NULL THEN
    BEGIN
      v_result := extensions.pgp_sym_decrypt(encrypted_data, v_key_v2);
      RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
      -- Key didn't work, try legacy key
      NULL;
    END;
  END IF;
  
  -- Fallback to deprecated key (for data encrypted before migration)
  SELECT decrypted_secret INTO v_key_v1
  FROM vault.decrypted_secrets 
  WHERE name = 'pii_encryption_key_v1_deprecated';
  
  IF v_key_v1 IS NOT NULL THEN
    BEGIN
      RETURN extensions.pgp_sym_decrypt(encrypted_data, v_key_v1);
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Phase 3: Re-encrypt existing data with new key
-- 3.1 Re-encrypt profiles phone numbers
UPDATE public.profiles
SET phone_encrypted = (
  SELECT extensions.pgp_sym_encrypt(
    extensions.pgp_sym_decrypt(
      phone_encrypted::bytea,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key_v1_deprecated')
    ),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key_v2')
  )
)
WHERE phone_encrypted IS NOT NULL;

-- 3.2 Re-encrypt leads emails
UPDATE public.leads
SET email_encrypted = (
  SELECT extensions.pgp_sym_encrypt(
    extensions.pgp_sym_decrypt(
      email_encrypted::bytea,
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key_v1_deprecated')
    ),
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key_v2')
  )
)
WHERE email_encrypted IS NOT NULL;

-- Phase 4: Create key rotation function for admins
CREATE OR REPLACE FUNCTION public.rotate_pii_encryption_key()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_key_id uuid;
  v_new_key_id uuid;
  v_old_key text;
  v_new_key text;
  v_profiles_migrated integer := 0;
  v_leads_migrated integer := 0;
BEGIN
  -- Only admins can rotate keys
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required for key rotation';
  END IF;
  
  -- Get current key for re-encryption
  SELECT id, decrypted_secret INTO v_old_key_id, v_old_key
  FROM vault.decrypted_secrets 
  WHERE name = 'pii_encryption_key_v2';
  
  IF v_old_key IS NULL THEN
    RAISE EXCEPTION 'Current encryption key not found in Vault';
  END IF;
  
  -- Generate new key
  v_new_key := encode(gen_random_bytes(32), 'base64');
  
  -- Create temporary key entry
  SELECT vault.create_secret(
    v_new_key,
    'pii_encryption_key_v2_new',
    'New rotation key - temporary'
  ) INTO v_new_key_id;
  
  -- Re-encrypt profiles
  UPDATE public.profiles
  SET phone_encrypted = extensions.pgp_sym_encrypt(
    extensions.pgp_sym_decrypt(phone_encrypted::bytea, v_old_key),
    v_new_key
  )
  WHERE phone_encrypted IS NOT NULL;
  GET DIAGNOSTICS v_profiles_migrated = ROW_COUNT;
  
  -- Re-encrypt leads
  UPDATE public.leads
  SET email_encrypted = extensions.pgp_sym_encrypt(
    extensions.pgp_sym_decrypt(email_encrypted::bytea, v_old_key),
    v_new_key
  )
  WHERE email_encrypted IS NOT NULL;
  GET DIAGNOSTICS v_leads_migrated = ROW_COUNT;
  
  -- Delete old key
  DELETE FROM vault.secrets WHERE id = v_old_key_id;
  
  -- Rename new key to production name
  UPDATE vault.secrets 
  SET name = 'pii_encryption_key_v2',
      description = 'AES-256 encryption key for PII data. Rotated: ' || NOW()::text
  WHERE name = 'pii_encryption_key_v2_new';
  
  -- Log the rotation
  PERFORM public.log_sensitive_access(
    'key_rotation',
    'pii_encryption_key',
    NULL,
    jsonb_build_object(
      'profiles_migrated', v_profiles_migrated,
      'leads_migrated', v_leads_migrated,
      'rotated_at', NOW()
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'profiles_migrated', v_profiles_migrated,
    'leads_migrated', v_leads_migrated,
    'rotated_at', NOW()
  );
END;
$$;

-- Restrict rotation function to authenticated users only (admins checked inside)
REVOKE ALL ON FUNCTION public.rotate_pii_encryption_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rotate_pii_encryption_key() FROM anon;
GRANT EXECUTE ON FUNCTION public.rotate_pii_encryption_key() TO authenticated;

-- Phase 5: Add comments for documentation
COMMENT ON FUNCTION public.encrypt_pii(text) IS 'Encrypts PII data using AES-256 key stored in Supabase Vault. Key is never exposed in code.';
COMMENT ON FUNCTION public.decrypt_pii(bytea) IS 'Decrypts PII data. Supports key rotation by trying current key first, then legacy keys.';
COMMENT ON FUNCTION public.rotate_pii_encryption_key() IS 'Admin-only function to rotate PII encryption key. Re-encrypts all existing data with new key.';
