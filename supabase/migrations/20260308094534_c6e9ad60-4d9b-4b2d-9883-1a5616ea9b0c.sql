
-- ============================================
-- Docs Generation Engine: 4 new tables + 1 function
-- ============================================

-- 1. user_brand_profiles — extended brand profile for invoicing
CREATE TABLE public.user_brand_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE,
  company_name    TEXT,
  logo_url        TEXT,
  primary_color   TEXT DEFAULT '#0F172A',
  secondary_color TEXT DEFAULT '#6366F1',
  accent_color    TEXT DEFAULT '#10B981',
  font_preference TEXT DEFAULT 'inter',
  address_line1   TEXT,
  address_line2   TEXT,
  city            TEXT,
  state           TEXT,
  zip             TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  tax_id          TEXT,
  invoice_prefix  TEXT DEFAULT 'INV',
  invoice_counter INTEGER DEFAULT 1000,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_deny_user_brand_profiles" ON public.user_brand_profiles
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "users_crud_own_brand_profile" ON public.user_brand_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. invoices — persistent invoice records
CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  document_id     UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  client_name     TEXT NOT NULL,
  client_email    TEXT,
  client_company  TEXT,
  client_address  TEXT,
  line_items      JSONB NOT NULL DEFAULT '[]',
  subtotal        NUMERIC NOT NULL DEFAULT 0,
  tax_rate        NUMERIC NOT NULL DEFAULT 0,
  tax_amount      NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount    NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT DEFAULT 'USD',
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  payment_terms   TEXT DEFAULT 'Net 30',
  notes           TEXT,
  status          TEXT DEFAULT 'draft',
  paid_at         TIMESTAMPTZ,
  analysis_ref_id UUID,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_deny_invoices" ON public.invoices
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "users_crud_own_invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_invoices_user_id ON public.invoices(user_id, created_at DESC);

-- 3. doc_generation_jobs — async queue for complex documents
CREATE TABLE public.doc_generation_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          TEXT UNIQUE NOT NULL,
  user_id         UUID NOT NULL,
  analysis_id     UUID,
  template_id     TEXT NOT NULL,
  status          TEXT DEFAULT 'queued',
  priority        INTEGER DEFAULT 5,
  input_data      JSONB NOT NULL DEFAULT '{}',
  output_url      TEXT,
  output_size_kb  INTEGER,
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  processing_ms   INTEGER,
  cache_hit       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.doc_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_deny_doc_generation_jobs" ON public.doc_generation_jobs
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "users_read_own_jobs" ON public.doc_generation_jobs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_jobs" ON public.doc_generation_jobs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "service_role_all_jobs" ON public.doc_generation_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_doc_jobs_status ON public.doc_generation_jobs(status, priority, created_at)
  WHERE status IN ('queued', 'processing');
CREATE INDEX idx_doc_jobs_user ON public.doc_generation_jobs(user_id, created_at DESC);

-- Enable realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.doc_generation_jobs;

-- 4. doc_performance_signals — self-improvement tracking
CREATE TABLE public.doc_performance_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  signal_type     TEXT NOT NULL,
  signal_value    INTEGER,
  context         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.doc_performance_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_deny_doc_signals" ON public.doc_performance_signals
  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "users_insert_own_signals" ON public.doc_performance_signals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_select_all_signals" ON public.doc_performance_signals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_doc_signals_document ON public.doc_performance_signals(document_id);
CREATE INDEX idx_doc_signals_type ON public.doc_performance_signals(signal_type, created_at DESC);

-- 5. Atomic invoice number generator function
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix TEXT;
  v_counter INTEGER;
BEGIN
  -- Upsert brand profile if not exists, then atomically increment counter
  INSERT INTO public.user_brand_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO UPDATE
    SET invoice_counter = user_brand_profiles.invoice_counter + 1,
        updated_at = now()
  RETURNING invoice_prefix, invoice_counter INTO v_prefix, v_counter;

  RETURN v_prefix || '-' || LPAD(v_counter::TEXT, 6, '0');
END;
$$;
