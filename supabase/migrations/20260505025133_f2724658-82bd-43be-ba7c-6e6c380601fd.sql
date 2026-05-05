
-- Helper: returns true if the current user is currently inside their
-- post-cancellation 30-day read-only window.
CREATE OR REPLACE FUNCTION public.is_in_readonly_window()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.subscriptions s
     WHERE s.user_id = auth.uid()
       AND s.history_readonly_until IS NOT NULL
       AND s.history_readonly_until > now()
  );
$$;

-- Block INSERT during readonly window.
DROP POLICY IF EXISTS "Block analyses INSERT during readonly window" ON public.analyses;
CREATE POLICY "Block analyses INSERT during readonly window"
ON public.analyses
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (NOT public.is_in_readonly_window());

-- Block UPDATE during readonly window.
DROP POLICY IF EXISTS "Block analyses UPDATE during readonly window" ON public.analyses;
CREATE POLICY "Block analyses UPDATE during readonly window"
ON public.analyses
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (NOT public.is_in_readonly_window())
WITH CHECK (NOT public.is_in_readonly_window());

-- Block DELETE during readonly window.
DROP POLICY IF EXISTS "Block analyses DELETE during readonly window" ON public.analyses;
CREATE POLICY "Block analyses DELETE during readonly window"
ON public.analyses
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (NOT public.is_in_readonly_window());
