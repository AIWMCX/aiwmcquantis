
DROP POLICY IF EXISTS "Team admins or invited users can add members" ON public.team_members;

CREATE POLICY "Team admins or invited users can add members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_team_admin(auth.uid(), team_id)
  OR (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.team_id = team_members.team_id
        AND lower(ti.email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
        AND ti.accepted_at IS NULL
        AND ti.expires_at > now()
        AND ti.role = team_members.role
    )
  )
);
