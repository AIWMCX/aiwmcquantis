-- ============================================================
-- Migration: Subscription upsert reliability fix
-- Created: 2026-06-08
-- Purpose:
--   1. Ensure subscriptions table has correct unique constraint
--      for the upsert(onConflict:"user_id") call in stripe-webhook.
--   2. Add helper RPC `admin_fix_subscription` for one-off
--      manual tier corrections (e.g. after webhook misfire).
--   3. Backfill: ensure any subscription with trialing status
--      and a future trial_ends_at is correctly reflected.
-- ============================================================

-- ── 1. Ensure unique constraint exists on user_id ──────────────────────────
-- stripe-webhook does: upsert(data, { onConflict: "user_id" })
-- This requires a unique index or constraint on user_id.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'u'
      AND conname ILIKE '%user_id%'
  ) THEN
    -- Add unique constraint only if not already present
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
    RAISE NOTICE 'Added unique constraint on subscriptions.user_id';
  ELSE
    RAISE NOTICE 'unique constraint on subscriptions.user_id already exists — skipping';
  END IF;
END $$;

-- ── 2. Helper RPC for admin manual tier fix ────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_fix_subscription(
  p_email       TEXT,
  p_plan_id     TEXT DEFAULT 'plus',
  p_status      TEXT DEFAULT 'trialing',
  p_trial_days  INT  DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_trial_end TIMESTAMPTZ;
BEGIN
  -- Resolve user id from email (auth.users)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found', 'email', p_email);
  END IF;

  v_trial_end := NOW() + (p_trial_days || ' days')::INTERVAL;

  INSERT INTO public.subscriptions (
    user_id, plan_id, status, trial_ends_at,
    current_period_start, current_period_end,
    updated_at
  ) VALUES (
    v_user_id, p_plan_id, p_status, v_trial_end,
    NOW(), v_trial_end,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id          = EXCLUDED.plan_id,
    status           = EXCLUDED.status,
    trial_ends_at    = EXCLUDED.trial_ends_at,
    current_period_end = EXCLUDED.current_period_end,
    updated_at       = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'plan_id', p_plan_id,
    'status', p_status,
    'trial_ends_at', v_trial_end
  );
END $$;

-- Grant execution only to service_role (not anon/authenticated)
REVOKE ALL ON FUNCTION public.admin_fix_subscription FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_fix_subscription TO service_role;

-- ── 3. Backfill: fix any trialing rows where trial_ends_at is NULL ─────────
UPDATE public.subscriptions
SET
  trial_ends_at = NOW() + INTERVAL '14 days',
  updated_at    = NOW()
WHERE
  status = 'trialing'
  AND trial_ends_at IS NULL;

-- Fixed 2026-08-10: RAISE is PL/pgSQL-only and is invalid as bare top-level
-- SQL (42601, "syntax error at or near RAISE") -- must be inside a DO block
-- or function body. Since Postgres runs each migration file in one
-- transaction by default, this syntax error would have aborted the ENTIRE
-- migration on production too, not just this trailing log line -- meaning
-- the unique constraint (step 1) and admin_fix_subscription RPC (step 2)
-- above may never have actually taken effect there either. Worth confirming
-- directly once DB access is available (SELECT conname FROM pg_constraint
-- WHERE conrelid='public.subscriptions'::regclass AND contype='u'; and
-- checking whether admin_fix_subscription exists).
DO $$
BEGIN
  RAISE NOTICE 'subscription_upsert_fix migration complete';
END $$;
