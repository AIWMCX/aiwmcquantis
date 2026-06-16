-- ============================================================================
-- plan_entitlements — server-side mirror of src/config/tiers.ts TIERS const
-- ============================================================================
-- Co-located with the webhook + entitlement guard so DB-backed checks become
-- possible without bundling client code. A CI drift test (vitest) asserts
-- this seed stays byte-identical to TIERS.

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  tier              TEXT PRIMARY KEY,
  label             TEXT NOT NULL,
  price_monthly     NUMERIC NOT NULL DEFAULT 0,
  price_annual      NUMERIC NOT NULL DEFAULT 0,
  monthly_analyses  INTEGER NOT NULL DEFAULT 0,   -- -1 sentinel = unlimited
  features          JSONB  NOT NULL DEFAULT '{}'::jsonb,
  limits            JSONB  NOT NULL DEFAULT '{}'::jsonb,
  stripe_price_ids  JSONB  NOT NULL DEFAULT '[]'::jsonb,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_entitlements TO anon;
GRANT SELECT ON public.plan_entitlements TO authenticated;
GRANT ALL    ON public.plan_entitlements TO service_role;

ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_entitlements public read" ON public.plan_entitlements;
CREATE POLICY "plan_entitlements public read"
  ON public.plan_entitlements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "plan_entitlements service write" ON public.plan_entitlements;
CREATE POLICY "plan_entitlements service write"
  ON public.plan_entitlements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Seed (idempotent — ON CONFLICT updates existing rows so re-running this
-- migration after a TIERS change brings the DB row up to date).
INSERT INTO public.plan_entitlements
  (tier, label, price_monthly, price_annual, monthly_analyses, features, limits, stripe_price_ids)
VALUES
  ('free', 'Free', 0, 0, 5,
    '{"depthQuick":true,"depthFull":false,"depthPro":false,"preMortem":false,"invoiceCapacity":false,"documentStudio":false,"aiDocIntelligence":false,"customBranding":false,"whiteLabel":false,"unlimitedHistory":false,"watermarkFree":false,"apiAccess":false,"tamSamSom":false,"pitchDeck":false,"strategicRoadmap":false,"fiveYearModel":false,"actionPlan":false}'::jsonb,
    '{"analysesPerMonth":5,"downloadsPerDay":5,"projectionMonths":0,"monteCarloScenarios":0,"teamSeats":0,"templates":0}'::jsonb,
    '[]'::jsonb),
  ('plus', 'Plus', 17, 168, -1,
    '{"depthQuick":true,"depthFull":true,"depthPro":false,"preMortem":true,"invoiceCapacity":true,"documentStudio":true,"aiDocIntelligence":true,"customBranding":true,"whiteLabel":false,"unlimitedHistory":true,"watermarkFree":true,"apiAccess":false,"tamSamSom":true,"pitchDeck":false,"strategicRoadmap":false,"fiveYearModel":false,"actionPlan":true}'::jsonb,
    '{"analysesPerMonth":-1,"downloadsPerDay":-1,"projectionMonths":36,"monteCarloScenarios":95500,"teamSeats":1,"templates":12}'::jsonb,
    '["price_1TKemwLKMhSmZURCw1AwGYX2","price_1TKenYLKMhSmZURCEqUTfJDM"]'::jsonb),
  ('pro', 'Pro', 49, 492, -1,
    '{"depthQuick":true,"depthFull":true,"depthPro":true,"preMortem":true,"invoiceCapacity":true,"documentStudio":true,"aiDocIntelligence":true,"customBranding":true,"whiteLabel":true,"unlimitedHistory":true,"watermarkFree":true,"apiAccess":true,"tamSamSom":true,"pitchDeck":true,"strategicRoadmap":true,"fiveYearModel":true,"actionPlan":true}'::jsonb,
    '{"analysesPerMonth":-1,"downloadsPerDay":-1,"projectionMonths":60,"monteCarloScenarios":95500,"teamSeats":3,"templates":12}'::jsonb,
    '["price_1TNnKkLKMhSmZURCWyQTblmg","price_1TNnUbLKMhSmZURC3DetuKsA"]'::jsonb)
ON CONFLICT (tier) DO UPDATE SET
  label = EXCLUDED.label,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  monthly_analyses = EXCLUDED.monthly_analyses,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  stripe_price_ids = EXCLUDED.stripe_price_ids,
  updated_at = now();