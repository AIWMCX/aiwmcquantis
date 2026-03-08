
-- Table: template_improvement_suggestions
CREATE TABLE public.template_improvement_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  suggestion JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_confidence NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.template_improvement_suggestions ENABLE ROW LEVEL SECURITY;

-- Deny anon
CREATE POLICY "Deny anon access to template_improvement_suggestions"
  ON public.template_improvement_suggestions AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- Admin select
CREATE POLICY "Admins can view template_improvement_suggestions"
  ON public.template_improvement_suggestions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin update
CREATE POLICY "Admins can update template_improvement_suggestions"
  ON public.template_improvement_suggestions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role
CREATE POLICY "Service role manages template_improvement_suggestions"
  ON public.template_improvement_suggestions AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_service_role()) WITH CHECK (is_service_role());

-- Table: template_performance_history
CREATE TABLE public.template_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  performance_score NUMERIC,
  avg_rating NUMERIC,
  total_signals INTEGER DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.template_performance_history ENABLE ROW LEVEL SECURITY;

-- Deny anon
CREATE POLICY "Deny anon access to template_performance_history"
  ON public.template_performance_history AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- Admin select
CREATE POLICY "Admins can view template_performance_history"
  ON public.template_performance_history AS RESTRICTIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role
CREATE POLICY "Service role manages template_performance_history"
  ON public.template_performance_history AS RESTRICTIVE FOR ALL TO authenticated
  USING (is_service_role()) WITH CHECK (is_service_role());
