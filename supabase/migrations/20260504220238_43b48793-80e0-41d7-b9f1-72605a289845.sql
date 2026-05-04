-- Pro team read-inheritance: allow members of the same Pro team
-- to view (read-only) each other's analyses without granting writes.
CREATE OR REPLACE FUNCTION public.user_in_shared_pro_team(_viewer uuid, _owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm_v
    JOIN public.team_members tm_o ON tm_o.team_id = tm_v.team_id
    JOIN public.teams t ON t.id = tm_v.team_id
    LEFT JOIN public.subscriptions s ON s.user_id = t.owner_id
    WHERE tm_v.user_id = _viewer
      AND tm_o.user_id = _owner
      AND _viewer <> _owner
      AND COALESCE(s.plan_id,'') IN ('pro','enterprise')
      AND COALESCE(s.status,'') IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
$$;

DROP POLICY IF EXISTS "Pro team members read inheritance" ON public.analyses;
CREATE POLICY "Pro team members read inheritance"
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (public.user_in_shared_pro_team(auth.uid(), user_id));

COMMENT ON POLICY "Pro team members read inheritance" ON public.analyses IS
  'Read-only inheritance: members of the same active Pro/Enterprise team can SELECT each other''s analyses. No INSERT/UPDATE/DELETE granted.';