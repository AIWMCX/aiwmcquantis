-- =============================================
-- COMPLETE SECURITY HARDENING MIGRATION
-- =============================================

-- Phase 1: Create all missing functions first
-- =============================================

-- Rate limiting for PII access
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

-- Log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_event_type text,
  p_accessed_resource text,
  p_resource_id uuid DEFAULT NULL,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    event_data
  ) VALUES (
    auth.uid(),
    p_event_type,
    jsonb_build_object(
      'resource', p_accessed_resource,
      'resource_id', p_resource_id,
      'timestamp', NOW()
    ) || p_additional_data
  );
END;
$$;

-- Encryption function
CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text text)
RETURNS bytea
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN 
    RETURN NULL; 
  END IF;
  RETURN extensions.pgp_sym_encrypt(
    plain_text::text, 
    'quantis_pii_encryption_key_v1'::text
  );
END;
$$;

-- Decryption function
CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF encrypted_data IS NULL THEN 
    RETURN NULL; 
  END IF;
  RETURN extensions.pgp_sym_decrypt(
    encrypted_data, 
    'quantis_pii_encryption_key_v1'::text
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- Secure phone retrieval with logging
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_phone text;
BEGIN
  IF NOT public.check_pii_access_rate() THEN
    RAISE EXCEPTION 'Rate limit exceeded for PII access';
  END IF;
  
  SELECT public.decrypt_pii(phone_encrypted) INTO v_phone
  FROM public.profiles
  WHERE id = auth.uid();
  
  PERFORM public.log_sensitive_access(
    'pii_decrypt',
    'profiles.phone',
    auth.uid()
  );
  
  RETURN v_phone;
END;
$$;

-- Can access PII function
CREATE OR REPLACE FUNCTION public.can_access_pii(target_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    auth.uid() = target_user_id 
    AND auth.uid() IS NOT NULL
    AND public.check_pii_access_rate();
$$;

-- Phone encryption trigger
CREATE OR REPLACE FUNCTION public.encrypt_profile_phone()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    NEW.phone_encrypted := public.encrypt_pii(NEW.phone);
    NEW.phone := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Phase 2: Create trigger
-- =============================================
DROP TRIGGER IF EXISTS encrypt_phone_trigger ON public.profiles;
CREATE TRIGGER encrypt_phone_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_profile_phone();

-- Phase 3: Migrate existing data
-- =============================================
UPDATE public.profiles 
SET phone_encrypted = public.encrypt_pii(phone),
    phone = NULL
WHERE phone IS NOT NULL AND phone != '' AND phone_encrypted IS NULL;

-- Phase 4: Create secure view
-- =============================================
DROP VIEW IF EXISTS public.profiles_secure;
CREATE VIEW public.profiles_secure 
WITH (security_invoker = on) AS
SELECT 
  id,
  full_name,
  CASE 
    WHEN auth.uid() = id THEN public.decrypt_pii(phone_encrypted)
    ELSE NULL
  END as phone,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_secure TO authenticated;
REVOKE ALL ON public.profiles_secure FROM anon;

-- Phase 5: Add index and grants
-- =============================================
CREATE INDEX IF NOT EXISTS idx_security_logs_user_event_time 
ON public.security_logs (user_id, event_type, created_at DESC);

REVOKE ALL ON FUNCTION public.encrypt_pii FROM anon;
REVOKE ALL ON FUNCTION public.decrypt_pii FROM anon;
REVOKE ALL ON FUNCTION public.get_my_phone FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone TO authenticated;