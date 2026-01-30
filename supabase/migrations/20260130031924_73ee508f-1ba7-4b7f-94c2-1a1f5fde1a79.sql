-- Add lead scoring and conversion tracking columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS converted_at timestamptz,
ADD COLUMN IF NOT EXISTS conversion_type text;

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_leads_source_offer ON public.leads(source, offer);
CREATE INDEX IF NOT EXISTS idx_leads_score ON public.leads(score DESC) WHERE converted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- Add comment for scoring logic documentation
COMMENT ON COLUMN public.leads.score IS 'Lead score: +10 captured, +20 email opened, +50 account created, +100 trial started, +200 paid conversion';
COMMENT ON COLUMN public.leads.converted_at IS 'Timestamp when lead converted to user';
COMMENT ON COLUMN public.leads.conversion_type IS 'Type of conversion: signup, trial, paid';