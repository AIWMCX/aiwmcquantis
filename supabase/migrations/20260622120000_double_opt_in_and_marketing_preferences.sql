-- Double opt-in for lead capture + marketing preferences
-- Task #25: Compliance-ready email capture

-- 1. Add double opt-in columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean DEFAULT true;

-- Unique index on confirmation_token for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_confirmation_token
  ON public.leads(confirmation_token) WHERE confirmation_token IS NOT NULL;

-- Update status CHECK to include new states
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'pending_confirmation', 'confirmed', 'contacted', 'converted'));

-- Backfill: mark all existing leads as confirmed (they opted in before double opt-in existed)
UPDATE public.leads
  SET confirmed_at = created_at,
      status = 'confirmed'
  WHERE confirmed_at IS NULL AND status = 'new';

-- 2. Add marketing opt-in to profiles (for authenticated users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_marketing_opt_in boolean DEFAULT true;

-- 3. Update capture_lead to set pending_confirmation status
CREATE OR REPLACE FUNCTION public.capture_lead(
  p_email text,
  p_source text,
  p_offer text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
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
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  IF length(p_email) > 320 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;

  IF length(p_source) > 100 THEN
    RAISE EXCEPTION 'Source field too long';
  END IF;

  IF length(p_offer) > 200 THEN
    RAISE EXCEPTION 'Offer field too long';
  END IF;

  v_metadata_size := length(p_metadata::text);
  IF v_metadata_size > 10240 THEN
    RAISE EXCEPTION 'Metadata too large (max 10KB)';
  END IF;

  IF p_metadata ? '__proto__' OR p_metadata ? 'constructor' OR p_metadata ? 'prototype' THEN
    RAISE EXCEPTION 'Invalid metadata keys';
  END IF;

  v_email_lower := LOWER(p_email);

  IF EXISTS (
    SELECT 1 FROM public.leads
    WHERE email_hash = encode(extensions.digest(v_email_lower, 'sha256'), 'hex')
    AND source = p_source
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Lead already captured recently';
  END IF;

  INSERT INTO public.leads (
    email_encrypted, email_hash, source, offer, metadata,
    status, confirmation_token
  )
  VALUES (
    public.encrypt_pii(v_email_lower),
    encode(extensions.digest(v_email_lower, 'sha256'), 'hex'),
    p_source,
    p_offer,
    p_metadata,
    'pending_confirmation',
    gen_random_uuid()
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$function$;

-- 4. Function to confirm a lead's email subscription
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

-- 5. Function to unsubscribe a lead by email hash
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

-- 6. Function to resubscribe a lead by email hash
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

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.confirm_lead_email(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_lead(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resubscribe_lead(text) TO anon, authenticated, service_role;
