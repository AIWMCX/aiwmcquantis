-- Migration-ledger drift recovery, Slice 1 (referral commercial path) — 2026-08-17
--
-- PR #41 found 26 tables that live code queries but which don't exist in
-- production, despite their creating migrations being marked "applied" in
-- the tracked ledger. This restores two of them: public.referral_conversions
-- and public.referral_rewards, both originally defined in
-- 20260206003246_8a34fb59-....sql alongside public.referral_codes.
--
-- Why only these two, and not a blind replay of that whole file: verified
-- directly against live production before writing this file that
-- public.referral_codes already exists with a schema byte-for-byte
-- identical to that original migration's definition (confirmed via
-- information_schema.columns) -- so referral_codes was never the problem.
-- Its CREATE TABLE has no IF NOT EXISTS guard; if it had already existed
-- when this migration first "ran," the statement would have errored and
-- (since Supabase applies each migration file as one transaction) the
-- whole file -- including this file's two other tables -- would have
-- rolled back together. That is consistent with what's live today:
-- referral_codes present, referral_conversions/referral_rewards absent.
--
-- Live impact confirmed before writing this: public.get_referral_stats(uuid)
-- (SECURITY DEFINER, access-hardened three days ago in Track A,
-- 20260814120000) contains a subquery against referral_rewards --
-- `SELECT COUNT(*) FROM public.referral_rewards rr WHERE ...` -- which means
-- the ENTIRE function has been raising 42P01 (relation does not exist) for
-- every call, not just returning a zero count. Track A correctly fixed WHO
-- can call this function; it apparently was never able to return real data
-- for anyone. public.track_referral_click(text,text,text) (anon-callable)
-- INSERTs into referral_conversions and has been failing the same way, and
-- public.complete_referral_signup(uuid,uuid) UPDATEs the same table.
--
-- Current-product check before restoring (per the explicit instruction not
-- to assume RESTORE_SCHEMA): grepped the full src/ tree. useReferral() (the
-- only caller of these RPCs/tables client-side) is invoked exclusively by
-- src/components/referral/ReferralBanner.tsx and ReferralDashboard.tsx --
-- and NEITHER of those components is imported/rendered anywhere in the
-- app's routes or dashboard (confirmed via repo-wide grep for both names
-- outside src/components/referral/ -- zero matches). The referral feature
-- is currently unreachable by any real user through the product UI. This is
-- NOT currently an active user-facing break -- but the RPC surface remains
-- live and externally callable (track_referral_click still grants EXECUTE
-- to anon), and Track A's own recent access-control work treated this as a
-- real, current, security-relevant surface worth hardening. Restoring the
-- schema is the smallest correct action either way: it makes the already-
-- exposed, already-secured RPC surface functionally correct instead of
-- silently broken, without deciding (which is a separate product call, not
-- made here) whether/when to route the dormant UI back into the app.
--
-- Schema replayed verbatim from the original migration for these two
-- tables specifically, because their RLS design already matches this
-- session's current-pattern standard for referral_codes (owner SELECT-only,
-- service_role ALL, no direct client INSERT/UPDATE -- all mutation goes
-- through the SECURITY DEFINER RPCs) -- confirmed these two tables' policies
-- were never touched by the later 10-table hardening pass (20260816010000),
-- because they were never live to touch. Table-level GRANTs added
-- explicitly (RLS bypass does not confer table-level privilege -- same gap
-- class found and fixed across every table in the 10-table exposure fix),
-- matching referral_codes' current live grant set exactly (authenticated:
-- SELECT only; service_role: full CRUD) rather than assuming ambient
-- defaults.
--
-- Additive and idempotent: IF NOT EXISTS / DROP POLICY IF EXISTS + CREATE,
-- REVOKE is a no-op if the privilege isn't held. No existing table, column,
-- or row is altered.

CREATE TABLE IF NOT EXISTS public.referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, qualified, rewarded, expired
  ip_hash VARCHAR(64), -- For fraud prevention
  user_agent TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  signed_up_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  reward_applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversion_id UUID REFERENCES public.referral_conversions(id) ON DELETE SET NULL,
  reward_type VARCHAR(50) NOT NULL, -- 'discount_percent', 'credit', 'free_month'
  reward_value DECIMAL(10,2) NOT NULL,
  stripe_coupon_id VARCHAR(100),
  stripe_promotion_code VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending', -- pending, applied, expired
  expires_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_conversions_code ON public.referral_conversions(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_user ON public.referral_conversions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_status ON public.referral_conversions(status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_status ON public.referral_rewards(status);

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- referral_conversions: deny anon, owner-scoped SELECT via the referral_codes
-- ownership chain (matches useReferral.ts's fetchConversions -- filters by
-- referral_code_id, which the client already looked up via its own owned
-- referral_codes row), service_role ALL. No authenticated INSERT/UPDATE --
-- track_referral_click/complete_referral_signup (SECURITY DEFINER) own all
-- mutation.
DROP POLICY IF EXISTS "Deny anonymous access to referral_conversions" ON public.referral_conversions;
CREATE POLICY "Deny anonymous access to referral_conversions"
  ON public.referral_conversions FOR ALL
  TO anon
  USING (false);

DROP POLICY IF EXISTS "Users can view own referral conversions" ON public.referral_conversions;
CREATE POLICY "Users can view own referral conversions"
  ON public.referral_conversions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referral_codes rc
      WHERE rc.id = referral_code_id AND rc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages referral_conversions" ON public.referral_conversions;
CREATE POLICY "Service role manages referral_conversions"
  ON public.referral_conversions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- referral_rewards: deny anon, owner-scoped SELECT, service_role ALL.
DROP POLICY IF EXISTS "Deny anonymous access to referral_rewards" ON public.referral_rewards;
CREATE POLICY "Deny anonymous access to referral_rewards"
  ON public.referral_rewards FOR ALL
  TO anon
  USING (false);

DROP POLICY IF EXISTS "Users can view own referral rewards" ON public.referral_rewards;
CREATE POLICY "Users can view own referral rewards"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role manages referral_rewards" ON public.referral_rewards;
CREATE POLICY "Service role manages referral_rewards"
  ON public.referral_rewards FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Table-level grants (RLS bypass does not confer table-level privilege) --
-- matching referral_codes' current live grant set exactly.
REVOKE ALL ON TABLE public.referral_conversions FROM anon, authenticated;
GRANT SELECT ON TABLE public.referral_conversions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.referral_conversions TO service_role;

REVOKE ALL ON TABLE public.referral_rewards FROM anon, authenticated;
GRANT SELECT ON TABLE public.referral_rewards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.referral_rewards TO service_role;

-- POSTCONDITION -- fail loudly rather than silently no-op, matching this
-- session's established pattern.
DO $$
BEGIN
  IF to_regclass('public.referral_conversions') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.referral_conversions still does not exist';
  END IF;
  IF to_regclass('public.referral_rewards') IS NULL THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: public.referral_rewards still does not exist';
  END IF;
  IF has_table_privilege('anon', 'public.referral_conversions', 'SELECT')
     OR has_table_privilege('anon', 'public.referral_rewards', 'SELECT') THEN
    RAISE EXCEPTION 'POSTCONDITION FAILED: anon can read referral_conversions/referral_rewards';
  END IF;
  RAISE NOTICE 'POSTCONDITION PASSED: referral_conversions and referral_rewards restored, anon denied';
END $$;
