-- =============================================
-- DOCS STUDIO: Database Schema
-- =============================================

-- Библиотека шаблонов документов
CREATE TABLE public.doc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Метаданные
  template_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'plus')),
  icon TEXT,
  
  -- Структура шаблона
  template_json JSONB NOT NULL,
  
  -- Использование
  usage_count INTEGER DEFAULT 0,
  
  -- Версионирование
  version TEXT DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Метаданные
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Созданные документы
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Связь с шаблоном и анализом
  template_id UUID REFERENCES public.doc_templates(id),
  analysis_id UUID REFERENCES public.analyses(id),
  
  -- Содержимое
  title TEXT NOT NULL,
  document_json JSONB NOT NULL,
  variables_data JSONB DEFAULT '{}',
  
  -- Статус
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final')),
  
  -- Версионирование
  version INTEGER DEFAULT 1,
  
  -- Совместный доступ
  is_shared BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  share_expires_at TIMESTAMPTZ,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- История версий документов
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  version_number INTEGER NOT NULL,
  snapshot_json JSONB NOT NULL,
  
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  change_description TEXT,
  
  UNIQUE(document_id, version_number)
);

-- Экспорты документов
CREATE TABLE public.document_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'md', 'html')),
  file_url TEXT,
  file_size_bytes BIGINT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_doc_templates_category ON public.doc_templates(category) WHERE is_active = TRUE;
CREATE INDEX idx_doc_templates_tier ON public.doc_templates(tier) WHERE is_active = TRUE;
CREATE INDEX idx_documents_user ON public.documents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_analysis ON public.documents(analysis_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_versions_doc ON public.document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_exports_user ON public.document_exports(user_id);
CREATE INDEX idx_document_exports_status ON public.document_exports(status) WHERE status IN ('pending', 'processing');

-- =============================================
-- RLS Policies
-- =============================================

-- doc_templates
ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to doc_templates"
  ON public.doc_templates FOR ALL TO anon
  USING (false);

CREATE POLICY "Authenticated users can view free templates"
  ON public.doc_templates FOR SELECT TO authenticated
  USING (is_active = TRUE AND tier = 'free');

CREATE POLICY "Plus users can view plus templates"
  ON public.doc_templates FOR SELECT TO authenticated
  USING (is_active = TRUE AND tier = 'plus' AND public.verify_plus_subscription(auth.uid()));

CREATE POLICY "Service role manages doc_templates"
  ON public.doc_templates FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to documents"
  ON public.documents FOR ALL TO anon
  USING (false);

CREATE POLICY "Users can view own documents"
  ON public.documents FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can soft delete own documents"
  ON public.documents FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages documents"
  ON public.documents FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to document_versions"
  ON public.document_versions FOR ALL TO anon
  USING (false);

CREATE POLICY "Users can view versions of own documents"
  ON public.document_versions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_id AND d.user_id = auth.uid()
  ));

CREATE POLICY "Users can create versions for own documents"
  ON public.document_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_id AND d.user_id = auth.uid()
  ));

CREATE POLICY "Service role manages document_versions"
  ON public.document_versions FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- document_exports
ALTER TABLE public.document_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to document_exports"
  ON public.document_exports FOR ALL TO anon
  USING (false);

CREATE POLICY "Users can view own exports"
  ON public.document_exports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create exports for own documents"
  ON public.document_exports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Service role manages document_exports"
  ON public.document_exports FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- =============================================
-- Helper Functions
-- =============================================

-- Increment template usage count
CREATE OR REPLACE FUNCTION public.increment_template_usage(p_template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.doc_templates
  SET usage_count = usage_count + 1
  WHERE id = p_template_id;
END;
$$;

-- Auto-update updated_at trigger
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doc_templates_updated_at
  BEFORE UPDATE ON public.doc_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();