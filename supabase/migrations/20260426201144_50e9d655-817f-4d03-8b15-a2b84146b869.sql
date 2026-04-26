-- 1) Server-side enforcement: only PRO/Enterprise users may set hide_quantis_branding=true.
-- We use the existing verify_pro_subscription() helper.
CREATE OR REPLACE FUNCTION public.enforce_white_label_pro()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.hide_quantis_branding, false) = true THEN
    IF NOT public.verify_pro_subscription(NEW.user_id) THEN
      RAISE EXCEPTION 'White-label branding requires a PRO subscription'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_white_label_pro ON public.branding_settings;
CREATE TRIGGER trg_enforce_white_label_pro
BEFORE INSERT OR UPDATE OF hide_quantis_branding ON public.branding_settings
FOR EACH ROW EXECUTE FUNCTION public.enforce_white_label_pro();

-- 2) Team invitations table (if not already present).
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  inviter_user_id uuid NOT NULL,
  invitee_email text NOT NULL,
  invitation_token text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'member',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team admins manage invitations" ON public.team_invitations;
CREATE POLICY "Team admins manage invitations"
ON public.team_invitations
FOR ALL
TO authenticated
USING (public.is_team_admin(auth.uid(), team_id))
WITH CHECK (public.is_team_admin(auth.uid(), team_id));

-- 3) Server-side seat enforcement on team_members insert (max 3 active members per team for PRO).
CREATE OR REPLACE FUNCTION public.enforce_team_seat_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.teams WHERE id = NEW.team_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  -- Owner must hold PRO/Enterprise.
  IF NOT public.verify_pro_subscription(v_owner) THEN
    RAISE EXCEPTION 'Team seats require team owner to hold a PRO subscription'
      USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.team_members WHERE team_id = NEW.team_id;
  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Team seat cap (3) reached. Remove a member or upgrade plan.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_team_seat_cap ON public.team_members;
CREATE TRIGGER trg_enforce_team_seat_cap
BEFORE INSERT ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_seat_cap();