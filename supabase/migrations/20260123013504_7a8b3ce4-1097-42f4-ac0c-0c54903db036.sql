-- Step 1: Add encrypted email column and hash column
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email_encrypted bytea;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email_hash text;

-- Step 2: Create index on email_hash for efficient duplicate checking
CREATE INDEX IF NOT EXISTS idx_leads_email_hash ON public.leads(email_hash);

-- Step 3: Migrate existing plain text emails to encrypted format
UPDATE public.leads
SET 
  email_encrypted = public.encrypt_pii(LOWER(email)),
  email_hash = encode(extensions.digest(LOWER(email), 'sha256'), 'hex')
WHERE email IS NOT NULL AND email_encrypted IS NULL;

-- Step 4: Make email column nullable before dropping
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;

-- Step 5: Clear plain text emails (data is now encrypted)
UPDATE public.leads SET email = NULL WHERE email_encrypted IS NOT NULL;

-- Step 6: Drop plain text email column
ALTER TABLE public.leads DROP COLUMN email;

-- Step 7: Make email_encrypted NOT NULL
ALTER TABLE public.leads ALTER COLUMN email_encrypted SET NOT NULL;

-- Step 8: Update capture_lead function with encryption and validation
CREATE OR REPLACE FUNCTION public.capture_lead(p_email text, p_source text, p_offer text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead_id UUID;
  v_email_lower text;
  v_metadata_size integer;
BEGIN
  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate email length (max 320 chars per RFC 5321)
  IF length(p_email) > 320 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;

  -- Validate source and offer length
  IF length(p_source) > 100 THEN
    RAISE EXCEPTION 'Source field too long';
  END IF;

  IF length(p_offer) > 200 THEN
    RAISE EXCEPTION 'Offer field too long';
  END IF;

  -- Validate metadata size (max 10KB)
  v_metadata_size := length(p_metadata::text);
  IF v_metadata_size > 10240 THEN
    RAISE EXCEPTION 'Metadata too large (max 10KB)';
  END IF;

  -- Sanitize metadata - remove potentially dangerous keys
  IF p_metadata ? '__proto__' OR p_metadata ? 'constructor' OR p_metadata ? 'prototype' THEN
    RAISE EXCEPTION 'Invalid metadata keys';
  END IF;

  v_email_lower := LOWER(p_email);

  -- Check for duplicate within last 24 hours using email hash
  IF EXISTS (
    SELECT 1 FROM public.leads
    WHERE email_hash = encode(extensions.digest(v_email_lower, 'sha256'), 'hex')
    AND source = p_source
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Lead already captured recently';
  END IF;

  -- Insert lead with encrypted email
  INSERT INTO public.leads (email_encrypted, email_hash, source, offer, metadata)
  VALUES (
    public.encrypt_pii(v_email_lower),
    encode(extensions.digest(v_email_lower, 'sha256'), 'hex'),
    p_source, 
    p_offer, 
    p_metadata
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$function$;

-- Step 9: Create function to get decrypted lead email (admin only with rate limiting)
CREATE OR REPLACE FUNCTION public.get_lead_email(p_lead_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  -- Verify admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Rate limit check
  IF NOT public.check_pii_access_rate() THEN
    RAISE EXCEPTION 'Rate limit exceeded for PII access';
  END IF;
  
  SELECT public.decrypt_pii(email_encrypted) INTO v_email
  FROM public.leads
  WHERE id = p_lead_id;
  
  -- Log access
  PERFORM public.log_sensitive_access(
    'lead_email_decrypt',
    'leads.email',
    p_lead_id
  );
  
  RETURN v_email;
END;
$function$;

-- Step 10: Add metadata validation trigger function
CREATE OR REPLACE FUNCTION public.validate_lead_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check metadata size (max 10KB)
  IF length(NEW.metadata::text) > 10240 THEN
    RAISE EXCEPTION 'Metadata too large (max 10KB)';
  END IF;
  
  -- Check for credit card patterns
  IF NEW.metadata::text ~ '\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}' THEN
    RAISE EXCEPTION 'Metadata cannot contain credit card numbers';
  END IF;
  
  -- Check for SSN patterns
  IF NEW.metadata::text ~ '\d{3}[- ]?\d{2}[- ]?\d{4}' THEN
    RAISE EXCEPTION 'Metadata cannot contain SSN patterns';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Step 11: Create trigger for metadata validation
DROP TRIGGER IF EXISTS validate_lead_metadata_trigger ON public.leads;
CREATE TRIGGER validate_lead_metadata_trigger
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.validate_lead_metadata();