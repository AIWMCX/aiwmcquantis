
-- user_settings table
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  use_v2_engine BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to user_settings"
  ON public.user_settings AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Users can select own settings"
  ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can select all settings"
  ON public.user_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all settings"
  ON public.user_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- report_outputs table
CREATE TABLE public.report_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  user_id UUID,
  report_json JSONB NOT NULL,
  pdf_url TEXT,
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.report_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anonymous access to report_outputs"
  ON public.report_outputs AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Users can select own report outputs"
  ON public.report_outputs FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own report outputs"
  ON public.report_outputs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can select all report outputs"
  ON public.report_outputs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
