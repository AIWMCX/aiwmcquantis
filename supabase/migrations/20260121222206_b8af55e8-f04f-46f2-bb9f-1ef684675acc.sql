-- ==========================================
-- LEADS TABLE FOR EXIT INTENT POPUP
-- ==========================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  offer TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_source ON public.leads(source);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Deny anonymous direct access
CREATE POLICY "Deny anonymous access to leads"
ON public.leads FOR ALL
TO anon
USING (false);

-- Admins can view all leads
CREATE POLICY "Admins can view leads"
ON public.leads FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update leads
CREATE POLICY "Admins can update leads"
ON public.leads FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role full access
CREATE POLICY "Service role manages leads"
ON public.leads FOR ALL
USING (public.is_service_role())
WITH CHECK (public.is_service_role());

-- Public capture function (for anonymous users)
CREATE OR REPLACE FUNCTION public.capture_lead(
  p_email TEXT,
  p_source TEXT,
  p_offer TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  -- Validate email format
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Check for duplicate within last 24 hours
  IF EXISTS (
    SELECT 1 FROM public.leads
    WHERE email = LOWER(p_email)
    AND source = p_source
    AND created_at > NOW() - INTERVAL '24 hours'
  ) THEN
    RAISE EXCEPTION 'Lead already captured recently';
  END IF;

  -- Insert lead with lowercase email
  INSERT INTO public.leads (email, source, offer, metadata)
  VALUES (LOWER(p_email), p_source, p_offer, p_metadata)
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();