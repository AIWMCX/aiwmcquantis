-- Add unsubscribed_at column to leads table for compliance
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz DEFAULT NULL;

-- Create newsletter_sends table to track sent newsletters
CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  send_date date NOT NULL,
  email_id text, -- Resend email ID for tracking
  week_number integer NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate sends to same lead on same date
  UNIQUE(lead_id, send_date)
);

-- Enable RLS
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to newsletter_sends"
  ON public.newsletter_sends
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Service role can manage newsletter_sends
CREATE POLICY "Service role manages newsletter_sends"
  ON public.newsletter_sends
  AS RESTRICTIVE
  FOR ALL
  TO service_role
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Admins can view newsletter_sends for analytics
CREATE POLICY "Admins can view newsletter_sends"
  ON public.newsletter_sends
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Index for querying unsent recipients
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_date ON public.newsletter_sends(send_date);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_lead ON public.newsletter_sends(lead_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_week ON public.newsletter_sends(year, week_number);