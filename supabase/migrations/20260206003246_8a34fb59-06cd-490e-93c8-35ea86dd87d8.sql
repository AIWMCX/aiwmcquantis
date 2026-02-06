-- =============================================
-- REFERRAL SYSTEM TABLES
-- Tracks referral codes, conversions, and rewards
-- =============================================

-- Referral codes table - one per user
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code VARCHAR(12) NOT NULL,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_rewards_earned DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_referral UNIQUE(user_id),
  CONSTRAINT unique_referral_code UNIQUE(code)
);

-- Referral conversions - tracks referred users
CREATE TABLE public.referral_conversions (
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

-- Referral rewards - tracks earned rewards
CREATE TABLE public.referral_rewards (
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

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX idx_referral_conversions_code ON public.referral_conversions(referral_code_id);
CREATE INDEX idx_referral_conversions_user ON public.referral_conversions(referred_user_id);
CREATE INDEX idx_referral_conversions_status ON public.referral_conversions(status);
CREATE INDEX idx_referral_rewards_user ON public.referral_rewards(user_id);
CREATE INDEX idx_referral_rewards_status ON public.referral_rewards(status);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - referral_codes
-- =============================================
-- Deny anonymous access
CREATE POLICY "Deny anonymous access to referral_codes"
  ON public.referral_codes FOR ALL
  TO anon
  USING (false);

-- Users can view their own referral code
CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own referral code
CREATE POLICY "Users can create own referral code"
  ON public.referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role manages referral_codes"
  ON public.referral_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- RLS POLICIES - referral_conversions
-- =============================================
-- Deny anonymous access
CREATE POLICY "Deny anonymous access to referral_conversions"
  ON public.referral_conversions FOR ALL
  TO anon
  USING (false);

-- Users can view conversions for their referral code
CREATE POLICY "Users can view own referral conversions"
  ON public.referral_conversions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referral_codes rc
      WHERE rc.id = referral_code_id AND rc.user_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role manages referral_conversions"
  ON public.referral_conversions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- RLS POLICIES - referral_rewards
-- =============================================
-- Deny anonymous access
CREATE POLICY "Deny anonymous access to referral_rewards"
  ON public.referral_rewards FOR ALL
  TO anon
  USING (false);

-- Users can view their own rewards
CREATE POLICY "Users can view own referral rewards"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role manages referral_rewards"
  ON public.referral_rewards FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Generate unique referral code for user
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate unique code
  LOOP
    v_attempts := v_attempts + 1;
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists OR v_attempts > 10;
  END LOOP;
  
  IF v_exists THEN
    RAISE EXCEPTION 'Could not generate unique referral code';
  END IF;
  
  -- Insert the code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);
  
  RETURN v_code;
END;
$$;

-- Track referral click
CREATE OR REPLACE FUNCTION public.track_referral_click(
  p_code TEXT,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code_id UUID;
  v_conversion_id UUID;
BEGIN
  -- Find the referral code
  SELECT id INTO v_referral_code_id
  FROM public.referral_codes
  WHERE code = upper(p_code) AND is_active = true;
  
  IF v_referral_code_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create conversion record
  INSERT INTO public.referral_conversions (referral_code_id, ip_hash, user_agent, clicked_at)
  VALUES (v_referral_code_id, p_ip_hash, p_user_agent, NOW())
  RETURNING id INTO v_conversion_id;
  
  -- Increment click count
  UPDATE public.referral_codes
  SET total_clicks = total_clicks + 1, updated_at = NOW()
  WHERE id = v_referral_code_id;
  
  RETURN v_conversion_id;
END;
$$;

-- Complete referral signup
CREATE OR REPLACE FUNCTION public.complete_referral_signup(
  p_conversion_id UUID,
  p_referred_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referral_code_id UUID;
BEGIN
  -- Update conversion with user ID
  UPDATE public.referral_conversions
  SET 
    referred_user_id = p_referred_user_id,
    signed_up_at = NOW(),
    status = 'qualified'
  WHERE id = p_conversion_id AND referred_user_id IS NULL
  RETURNING referral_code_id INTO v_referral_code_id;
  
  IF v_referral_code_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Increment conversion count
  UPDATE public.referral_codes
  SET total_conversions = total_conversions + 1, updated_at = NOW()
  WHERE id = v_referral_code_id;
  
  RETURN true;
END;
$$;

-- Get referral stats for user
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Ensure user can only get their own stats
  IF auth.uid() != p_user_id AND NOT is_service_role() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  SELECT jsonb_build_object(
    'code', rc.code,
    'total_clicks', rc.total_clicks,
    'total_conversions', rc.total_conversions,
    'total_rewards_earned', rc.total_rewards_earned,
    'is_active', rc.is_active,
    'pending_rewards', (
      SELECT COUNT(*) FROM public.referral_rewards rr
      WHERE rr.user_id = p_user_id AND rr.status = 'pending'
    ),
    'share_url', 'https://aiwmcquantis.com?ref=' || rc.code
  )
  INTO v_result
  FROM public.referral_codes rc
  WHERE rc.user_id = p_user_id;
  
  -- If no code exists, return empty stats
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'code', NULL,
      'total_clicks', 0,
      'total_conversions', 0,
      'total_rewards_earned', 0,
      'is_active', false,
      'pending_rewards', 0,
      'share_url', NULL
    );
  END IF;
  
  RETURN v_result;
END;
$$;