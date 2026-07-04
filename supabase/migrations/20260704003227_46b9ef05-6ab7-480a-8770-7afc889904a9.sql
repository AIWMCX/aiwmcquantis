
-- 1. gsc_verification: explicit admin DELETE policy
CREATE POLICY "gsc_admin_delete" ON public.gsc_verification
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. team_members / team_invitations: constrain roles at DB layer
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_role_check;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('owner','admin','member'));

ALTER TABLE public.team_invitations
  DROP CONSTRAINT IF EXISTS team_invitations_role_check;
ALTER TABLE public.team_invitations
  ADD CONSTRAINT team_invitations_role_check
  CHECK (role IN ('admin','member'));

-- Tighten self-insert on team_members to disallow 'owner' role via crafted invitation
DROP POLICY IF EXISTS "Team admins or invited users can add members" ON public.team_members;
CREATE POLICY "Team admins or invited users can add members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    is_team_admin(auth.uid(), team_id)
    OR (
      auth.uid() = user_id
      AND role IN ('admin','member')
      AND EXISTS (
        SELECT 1 FROM team_invitations ti
        WHERE ti.team_id = team_members.team_id
          AND lower(ti.email) = lower((SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text)
          AND ti.accepted_at IS NULL
          AND ti.expires_at > now()
          AND ti.role = team_members.role
      )
    )
  );

-- 3. user_realism_feedback: require authenticated user, bind to accessible analysis
DROP POLICY IF EXISTS "Users can insert their own realism feedback" ON public.user_realism_feedback;
CREATE POLICY "Users can insert their own realism feedback" ON public.user_realism_feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      analysis_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.analyses a
        WHERE a.id = user_realism_feedback.analysis_id
          AND (a.user_id = auth.uid() OR a.is_public = true)
      )
    )
  );

-- Explicitly deny anonymous inserts
CREATE POLICY "Deny anonymous realism feedback inserts" ON public.user_realism_feedback
  FOR INSERT TO anon
  WITH CHECK (false);
