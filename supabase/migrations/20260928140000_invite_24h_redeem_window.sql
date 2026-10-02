-- Invite activation window: 24 hours, not 30 days (2026-09-28).
--
-- Explicit commercial requirement: a Pro invite link is a "claim it now"
-- offer, not something that can sit unredeemed for a month. If the
-- invitee doesn't sign in within 24 hours of the link being created, the
-- link must die -- nobody, including the original recipient, can see or
-- activate it after that, and the founder has to issue a fresh one.
--
-- Enforcement is already correct and needs no change: preview_plan_invite
-- and redeem_plan_invite (20260928120000_plan_invites.sql) both compare
-- redeem_by < now() and return 'expired' with no plan/grant details
-- leaked either way. This migration only tightens the DEFAULT so any
-- insert that doesn't set redeem_by explicitly gets the 24h window
-- instead of the old 30-day one. The app layer (InvitesPanel.tsx) sets
-- it explicitly too, as the single source of truth for the number, but
-- the column default is kept in lockstep so there is no path -- app bug,
-- direct SQL, future admin tool -- that can accidentally hand out a
-- month-long activation window again.
--
-- duration_days (how much free Pro the invite grants once activated) is
-- untouched -- that's a separate, unrelated field.

ALTER TABLE public.plan_invites
  ALTER COLUMN redeem_by SET DEFAULT (now() + interval '24 hours');

DO $$
DECLARE v_default text;
BEGIN
  SELECT column_default INTO v_default FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'plan_invites' AND column_name = 'redeem_by';
  IF v_default IS NULL OR v_default LIKE '%30 days%' THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: plan_invites.redeem_by default still % (expected a 24h interval)', v_default;
  END IF;
END $$;
