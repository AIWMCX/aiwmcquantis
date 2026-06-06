-- Migration: idea generation quota tracking
-- Adds idea_gen_count to usage_tracking + atomic consume RPC
-- Free tier: 5 idea generations per month; Plus/Pro: unlimited (not tracked)

-- 1. Add column (idempotent)
ALTER TABLE usage_tracking
  ADD COLUMN IF NOT EXISTS idea_gen_count INTEGER NOT NULL DEFAULT 0;

-- 2. Atomic consume-and-check RPC (race-safe)
CREATE OR REPLACE FUNCTION consume_idea_gen_quota(
  p_user_id   UUID,
  p_limit     INTEGER,
  p_month_year TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Upsert the usage row, incrementing idea_gen_count atomically
  INSERT INTO usage_tracking (user_id, month_year, analyses_count, idea_gen_count)
  VALUES (p_user_id, p_month_year, 0, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET idea_gen_count = usage_tracking.idea_gen_count + 1;

  -- Read back the updated count
  SELECT idea_gen_count INTO v_used
  FROM usage_tracking
  WHERE user_id = p_user_id AND month_year = p_month_year;

  v_allowed := v_used <= p_limit;

  -- If over limit, roll back the increment we just did
  IF NOT v_allowed THEN
    UPDATE usage_tracking
    SET idea_gen_count = idea_gen_count - 1
    WHERE user_id = p_user_id AND month_year = p_month_year;

    -- Re-read post-rollback
    SELECT idea_gen_count INTO v_used
    FROM usage_tracking
    WHERE user_id = p_user_id AND month_year = p_month_year;
  END IF;

  RETURN json_build_object(
    'allowed', v_allowed,
    'used',    v_used,
    'limit',   p_limit
  );
END;
$$;

-- Grant execute to service_role (edge functions run as service_role)
GRANT EXECUTE ON FUNCTION consume_idea_gen_quota(UUID, INTEGER, TEXT) TO service_role;

COMMENT ON FUNCTION consume_idea_gen_quota IS
  'Atomically increments idea_gen_count and returns {allowed, used, limit}. Rolls back if over limit.';
