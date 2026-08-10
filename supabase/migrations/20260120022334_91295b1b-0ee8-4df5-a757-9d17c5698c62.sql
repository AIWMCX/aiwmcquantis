-- Assign admin role to user beltovbogdan@gmail.com
-- Fixed 2026-08-10: the original unconditional INSERT assumed this user
-- already exists in auth.users (true in production, where this migration
-- already ran). On any fresh/empty database rebuild -- disaster recovery,
-- a new environment, or this exact isolated CI test -- the raw INSERT fails
-- a foreign-key constraint (23503), because ON CONFLICT only guards against
-- a duplicate row, not a missing referenced user. Rewritten to the same
-- safe existence-check pattern already used by the other 7 migrations that
-- reference this account (e.g. 20260426205448_...sql).
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'beltovbogdan@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Founder user not found - skipping admin role grant';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;