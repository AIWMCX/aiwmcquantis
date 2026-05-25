CREATE TABLE public.service_job_trades (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  default_overhead_pct numeric NOT NULL,
  default_margin_pct numeric NOT NULL,
  active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.service_job_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_job_trades public read"
  ON public.service_job_trades FOR SELECT USING (true);

CREATE TABLE public.service_job_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id text NOT NULL REFERENCES public.service_job_trades(id),
  code text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL,
  labor_hours_p25 numeric NOT NULL,
  labor_hours_p50 numeric NOT NULL,
  labor_hours_p75 numeric NOT NULL,
  materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, code)
);
CREATE INDEX service_job_assemblies_trade_active_idx
  ON public.service_job_assemblies (trade_id) WHERE active = true;
ALTER TABLE public.service_job_assemblies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_job_assemblies public read"
  ON public.service_job_assemblies FOR SELECT USING (true);

CREATE TABLE public.service_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trade_id text NOT NULL REFERENCES public.service_job_trades(id),
  client_name text,
  site_address text,
  site_zip text,
  building_type text,
  year_built int,
  scope_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  modifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing_profile jsonb NOT NULL,
  quote_result jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','quoted','sent','won','lost','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_jobs_user_created_idx
  ON public.service_jobs (user_id, created_at DESC);
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own service jobs"
  ON public.service_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own service jobs"
  ON public.service_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own service jobs"
  ON public.service_jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own service jobs"
  ON public.service_jobs FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER service_jobs_set_updated_at
  BEFORE UPDATE ON public.service_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_job_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  actual_labor_hours numeric,
  actual_materials_cost numeric,
  actual_total_cost numeric,
  actual_revenue numeric,
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_job_outcomes_job_idx
  ON public.service_job_outcomes (job_id);
ALTER TABLE public.service_job_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view outcomes for their own jobs"
  ON public.service_job_outcomes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.service_jobs j
    WHERE j.id = service_job_outcomes.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users can insert outcomes for their own jobs"
  ON public.service_job_outcomes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_jobs j
    WHERE j.id = service_job_outcomes.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users can update outcomes for their own jobs"
  ON public.service_job_outcomes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.service_jobs j
    WHERE j.id = service_job_outcomes.job_id AND j.user_id = auth.uid()));
CREATE POLICY "Users can delete outcomes for their own jobs"
  ON public.service_job_outcomes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.service_jobs j
    WHERE j.id = service_job_outcomes.job_id AND j.user_id = auth.uid()));

INSERT INTO public.service_job_trades (id, display_name, default_overhead_pct, default_margin_pct, active) VALUES
  ('electrical', 'Electrical', 18, 22, true),
  ('plumbing',   'Plumbing',   18, 22, true),
  ('hvac',       'HVAC',       20, 25, true);