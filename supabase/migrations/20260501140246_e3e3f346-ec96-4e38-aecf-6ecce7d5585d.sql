DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;

CREATE POLICY "Users can insert own analyses"
  ON public.analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
        AND s.history_readonly_until IS NOT NULL
        AND s.history_readonly_until > now()
    )
  );

COMMENT ON POLICY "Users can insert own analyses" ON public.analyses IS
  'ISSUE-010: Owners may insert only when not in the post-cancel readonly window.';