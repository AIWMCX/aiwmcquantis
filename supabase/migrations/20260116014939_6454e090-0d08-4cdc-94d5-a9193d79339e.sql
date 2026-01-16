-- Phase 1: GDPR Compliance - Enable profile deletion
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- Phase 2: Phone Number Validation
CREATE OR REPLACE FUNCTION public.validate_phone_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL phone numbers
  IF NEW.phone IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Validate phone format (E.164 or common formats: 7-15 digits, optional + prefix)
  IF NEW.phone !~ '^\+?[0-9]{7,15}$' THEN
    RAISE EXCEPTION 'Invalid phone number format. Use 7-15 digits with optional + prefix.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_phone_before_insert_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_phone_number();

-- Phase 3: Security Audit Logging Table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Only service role can access security logs
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages security logs"
  ON public.security_logs
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Indexes for fast security log queries
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at DESC);

-- Cleanup function for old security logs (retention: 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.security_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;