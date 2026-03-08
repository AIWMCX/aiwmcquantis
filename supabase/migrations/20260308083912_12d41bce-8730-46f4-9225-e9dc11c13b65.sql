
CREATE TABLE public.reconciliation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID,
  user_id UUID,
  run_id TEXT NOT NULL,
  reconciled BOOLEAN NOT NULL DEFAULT false,
  checks_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own rows
CREATE POLICY "Users can insert own reconciliation logs"
  ON public.reconciliation_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can select their own rows
CREATE POLICY "Users can select own reconciliation logs"
  ON public.reconciliation_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can select all
CREATE POLICY "Admins can select all reconciliation logs"
  ON public.reconciliation_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Block anonymous access
CREATE POLICY "Deny anonymous access to reconciliation_log"
  ON public.reconciliation_log
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
