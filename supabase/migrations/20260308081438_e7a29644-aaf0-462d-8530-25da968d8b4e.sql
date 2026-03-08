CREATE TABLE public.user_validation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL,
  completed_actions text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);

ALTER TABLE public.user_validation_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
  ON public.user_validation_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Deny anon access"
  ON public.user_validation_progress
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);