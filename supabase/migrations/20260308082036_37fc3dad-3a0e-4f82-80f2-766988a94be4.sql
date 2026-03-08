
-- Scenarios table
CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  scenario_type TEXT NOT NULL DEFAULT 'custom',
  params JSONB NOT NULL,
  output JSONB,
  monte_carlo_result JSONB,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_pinned BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own scenarios"
  ON public.scenarios FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deny anon scenarios"
  ON public.scenarios FOR ALL TO anon
  USING (false) WITH CHECK (false);

-- Scenario comparisons table
CREATE TABLE public.scenario_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenario_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own comparisons"
  ON public.scenario_comparisons FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deny anon comparisons"
  ON public.scenario_comparisons FOR ALL TO anon
  USING (false) WITH CHECK (false);
