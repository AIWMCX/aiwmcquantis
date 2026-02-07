
-- Track document downloads for free-tier rate limiting (1 download/day)
CREATE TABLE public.document_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  template_id text NOT NULL,
  download_format text NOT NULL DEFAULT 'pdf',
  downloaded_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_hash text
);

-- Index for fast lookups by user + date
CREATE INDEX idx_doc_downloads_user_date ON public.document_downloads (user_id, downloaded_at DESC);

-- Enable RLS
ALTER TABLE public.document_downloads ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to document_downloads"
  ON public.document_downloads
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false);

-- Users can view their own download history
CREATE POLICY "Users can view own downloads"
  ON public.document_downloads
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own downloads
CREATE POLICY "Users can log own downloads"
  ON public.document_downloads
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role manages document_downloads"
  ON public.document_downloads
  AS RESTRICTIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Also update doc_templates RLS to allow free users to see free-tier templates
-- Currently only Plus users and service_role can see templates
-- We need authenticated users to see the 3 free templates
CREATE POLICY "Authenticated users can view free-tier templates"
  ON public.doc_templates
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND template_id IN ('professional-invoice', 'quarterly-summary', 'nda-agreement')
  );
