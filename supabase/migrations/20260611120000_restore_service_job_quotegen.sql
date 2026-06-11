-- Restore the Service Job Quoting / "Instant Quotes" (QuoteGen) engine.
--
-- This feature's frontend (src/pages/quote/*, src/lib/service-job/*,
-- src/services/serviceJob.ts) was deleted from the repo on 2026-06-06 along
-- with a large cleanup commit, but its backing tables/RPCs were never created
-- in the production database (project dmlxrvfyqsakyjomsvdj). This migration
-- creates the schema the restored frontend expects.
--
-- Tables: service_job_trades, service_job_assemblies, service_jobs,
--         service_job_outcomes, quote_gen_usage
-- RPCs:   get_quote_gen_status(), increment_quote_gen_usage(),
--         decrement_quote_gen_usage()

-- ============================================================
-- service_job_trades — public read-only reference table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_job_trades (
  id                    text PRIMARY KEY,
  display_name          text NOT NULL,
  default_overhead_pct  numeric NOT NULL DEFAULT 0.18,
  default_margin_pct    numeric NOT NULL DEFAULT 0.25,
  active                boolean NOT NULL DEFAULT true
);

ALTER TABLE public.service_job_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active trades" ON public.service_job_trades;
CREATE POLICY "Anyone can read active trades"
  ON public.service_job_trades FOR SELECT
  USING (active = true);

GRANT SELECT ON public.service_job_trades TO anon, authenticated;

INSERT INTO public.service_job_trades (id, display_name, default_overhead_pct, default_margin_pct, active) VALUES
  ('electrical', 'Electrical', 0.18, 0.25, true),
  ('plumbing',   'Plumbing',   0.18, 0.25, true),
  ('hvac',       'HVAC',       0.20, 0.25, false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- service_job_assemblies — public read-only pricing reference
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_job_assemblies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id          text NOT NULL REFERENCES public.service_job_trades(id),
  code              text NOT NULL,
  name              text NOT NULL,
  unit              text NOT NULL DEFAULT 'each',
  labor_hours_p25   numeric NOT NULL,
  labor_hours_p50   numeric NOT NULL,
  labor_hours_p75   numeric NOT NULL,
  materials         jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes             text,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, code)
);

ALTER TABLE public.service_job_assemblies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active assemblies" ON public.service_job_assemblies;
CREATE POLICY "Anyone can read active assemblies"
  ON public.service_job_assemblies FOR SELECT
  USING (active = true);

GRANT SELECT ON public.service_job_assemblies TO anon, authenticated;

INSERT INTO public.service_job_assemblies (trade_id, code, name, unit, labor_hours_p25, labor_hours_p50, labor_hours_p75, materials, notes) VALUES
  ('electrical', 'EL-OUTLET-STD', 'Standard 120V outlet (replace/add)', 'each', 0.5, 0.75, 1.25,
    '[{"name":"Duplex receptacle","quantity_per_unit":1,"unit_cost":3.5},{"name":"Wire (14/2 NM-B, ft)","quantity_per_unit":15,"unit_cost":0.6},{"name":"Wall plate","quantity_per_unit":1,"unit_cost":1.25}]'::jsonb,
    'Assumes accessible wall cavity; add access_difficulty modifier for finished walls.'),
  ('electrical', 'EL-PANEL-200A', '200A panel upgrade', 'each', 8, 12, 18,
    '[{"name":"200A panel","quantity_per_unit":1,"unit_cost":350},{"name":"Main breaker 200A","quantity_per_unit":1,"unit_cost":85},{"name":"Ground rod kit","quantity_per_unit":1,"unit_cost":40},{"name":"Misc. conduit & fittings","quantity_per_unit":1,"unit_cost":120}]'::jsonb,
    'Requires permit and utility coordination — set permit_required modifier.'),
  ('electrical', 'EL-LIGHT-FIXTURE', 'Light fixture install/replace', 'each', 0.5, 1, 1.5,
    '[{"name":"Mounting hardware kit","quantity_per_unit":1,"unit_cost":8},{"name":"Wire nuts (pack)","quantity_per_unit":1,"unit_cost":2}]'::jsonb,
    'Customer-supplied fixture assumed unless noted.'),
  ('electrical', 'EL-CIRCUIT-NEW', 'New 20A dedicated circuit', 'each', 2, 3, 5,
    '[{"name":"20A breaker","quantity_per_unit":1,"unit_cost":12},{"name":"Wire (12/2 NM-B, ft)","quantity_per_unit":40,"unit_cost":0.85},{"name":"Receptacle/connection hardware","quantity_per_unit":1,"unit_cost":15}]'::jsonb,
    'Run length varies by site; difficulty_factor should reflect attic/crawlspace access.'),
  ('electrical', 'EL-EV-CHARGER', 'EV charger circuit + mount (Level 2)', 'each', 4, 6, 9,
    '[{"name":"50A breaker","quantity_per_unit":1,"unit_cost":35},{"name":"Wire (6/3 NM-B, ft)","quantity_per_unit":40,"unit_cost":2.4},{"name":"NEMA 14-50 receptacle","quantity_per_unit":1,"unit_cost":25}]'::jsonb,
    'Permit typically required.'),

  ('plumbing', 'PL-FIXTURE-TOILET', 'Toilet replacement', 'each', 1, 1.5, 2.5,
    '[{"name":"Wax ring kit","quantity_per_unit":1,"unit_cost":6},{"name":"Supply line","quantity_per_unit":1,"unit_cost":8},{"name":"Mounting bolts","quantity_per_unit":1,"unit_cost":4}]'::jsonb,
    'Customer-supplied toilet assumed.'),
  ('plumbing', 'PL-FIXTURE-FAUCET', 'Faucet replacement (kitchen/bath)', 'each', 0.75, 1.25, 2,
    '[{"name":"Supply lines (pair)","quantity_per_unit":1,"unit_cost":12},{"name":"Plumber''s putty/sealant","quantity_per_unit":1,"unit_cost":5}]'::jsonb,
    'Add difficulty_factor for tight cabinet access.'),
  ('plumbing', 'PL-WATER-HEATER', 'Water heater replacement (40-50 gal, like-for-like)', 'each', 3, 4.5, 7,
    '[{"name":"Water heater unit","quantity_per_unit":1,"unit_cost":650},{"name":"Flex connectors","quantity_per_unit":2,"unit_cost":15},{"name":"Expansion tank","quantity_per_unit":1,"unit_cost":45},{"name":"Misc. fittings","quantity_per_unit":1,"unit_cost":25}]'::jsonb,
    'Permit required in most jurisdictions.'),
  ('plumbing', 'PL-DRAIN-CLEAR', 'Drain clearing / snaking', 'each', 0.5, 1, 2,
    '[{"name":"Disposable trap parts (as needed)","quantity_per_unit":1,"unit_cost":10}]'::jsonb,
    'Severity varies — set difficulty_factor higher for main-line clogs.'),
  ('plumbing', 'PL-REPIPE-BATH', 'Repipe single bathroom (supply lines)', 'job', 8, 14, 24,
    '[{"name":"PEX pipe (ft)","quantity_per_unit":80,"unit_cost":0.65},{"name":"Fittings & manifold","quantity_per_unit":1,"unit_cost":120},{"name":"Shutoff valves","quantity_per_unit":3,"unit_cost":12}]'::jsonb,
    'Significant scope — recommend on-site assessment before quoting.')
ON CONFLICT (trade_id, code) DO NOTHING;

-- ============================================================
-- service_jobs — per-user draft/quoted jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id        text NOT NULL REFERENCES public.service_job_trades(id),
  client_name     text,
  site_address    text,
  site_zip        text,
  building_type   text,
  year_built      int,
  scope_items     jsonb NOT NULL DEFAULT '[]'::jsonb,
  modifiers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  pricing_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  quote_result    jsonb,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','quoted','sent','won','lost','completed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_jobs_user ON public.service_jobs(user_id, created_at DESC);

ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own service jobs" ON public.service_jobs;
CREATE POLICY "Users manage own service jobs"
  ON public.service_jobs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_jobs TO authenticated;

CREATE OR REPLACE FUNCTION public.set_service_job_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_jobs_updated_at ON public.service_jobs;
CREATE TRIGGER trg_service_jobs_updated_at
  BEFORE UPDATE ON public.service_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_service_job_updated_at();

-- ============================================================
-- service_job_outcomes — actuals recorded after job completion
-- ============================================================
CREATE TABLE IF NOT EXISTS public.service_job_outcomes (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                  uuid NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
  actual_labor_hours      numeric,
  actual_materials_cost   numeric,
  actual_total_cost       numeric,
  actual_revenue          numeric,
  notes                   text,
  recorded_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_job_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage outcomes for own jobs" ON public.service_job_outcomes;
CREATE POLICY "Users manage outcomes for own jobs"
  ON public.service_job_outcomes FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_jobs j WHERE j.id = job_id AND j.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.service_jobs j WHERE j.id = job_id AND j.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_job_outcomes TO authenticated;

-- ============================================================
-- quote_gen_usage — monthly QuoteGen quota ledger (Free = 5/mo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quote_gen_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_key     text NOT NULL, -- 'YYYY-MM'
  used          int NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_key)
);

ALTER TABLE public.quote_gen_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own quote_gen_usage" ON public.quote_gen_usage;
CREATE POLICY "Users read own quote_gen_usage"
  ON public.quote_gen_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.quote_gen_usage TO authenticated;
GRANT ALL ON public.quote_gen_usage TO service_role;

-- ============================================================
-- Helper: resolve the caller's plan tier from `subscriptions`
-- ============================================================
CREATE OR REPLACE FUNCTION public._quote_gen_plan_tier(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
       WHERE user_id = p_user_id
         AND status IN ('active','trialing')
         AND plan_id IN ('pro','enterprise')
    ) THEN 'pro'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions
       WHERE user_id = p_user_id
         AND status IN ('active','trialing')
         AND plan_id = 'plus'
    ) THEN 'plus'
    ELSE 'free'
  END;
$$;

-- ============================================================
-- get_quote_gen_status — read-only status for the UI
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_quote_gen_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user   uuid := auth.uid();
  v_tier   text;
  v_month  text := to_char(now(), 'YYYY-MM');
  v_used   int := 0;
  v_limit  int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object(
      'planTier', 'free', 'limit', 0, 'used', 0, 'remaining', 0,
      'isEnabled', false, 'isExhausted', true, 'isUnlimited', false, 'monthKey', v_month
    );
  END IF;

  v_tier := public._quote_gen_plan_tier(v_user);
  v_limit := CASE v_tier WHEN 'free' THEN 5 ELSE NULL END;

  SELECT used INTO v_used
    FROM public.quote_gen_usage
   WHERE user_id = v_user AND month_key = v_month;
  v_used := COALESCE(v_used, 0);

  RETURN jsonb_build_object(
    'planTier', v_tier,
    'limit', v_limit,
    'used', v_used,
    'remaining', CASE WHEN v_limit IS NULL THEN NULL ELSE GREATEST(v_limit - v_used, 0) END,
    'isEnabled', true,
    'isExhausted', CASE WHEN v_limit IS NULL THEN false ELSE v_used >= v_limit END,
    'isUnlimited', v_limit IS NULL,
    'monthKey', v_month
  );
END
$$;

REVOKE ALL ON FUNCTION public.get_quote_gen_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quote_gen_status() TO authenticated;

-- ============================================================
-- increment_quote_gen_usage — atomic check + consume
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_quote_gen_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_tier  text;
  v_month text := to_char(now(), 'YYYY-MM');
  v_used  int;
  v_limit int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'plan_tier', 'planTier', 'free',
      'limit', 0, 'used', 0, 'remaining', 0, 'monthKey', v_month);
  END IF;

  v_tier := public._quote_gen_plan_tier(v_user);
  v_limit := CASE v_tier WHEN 'free' THEN 5 ELSE NULL END;

  IF v_limit IS NULL THEN
    -- Unlimited plans: track usage for analytics but never block.
    INSERT INTO public.quote_gen_usage (user_id, month_key, used)
      VALUES (v_user, v_month, 1)
      ON CONFLICT (user_id, month_key) DO UPDATE
        SET used = quote_gen_usage.used + 1, updated_at = now();
    RETURN jsonb_build_object('ok', true, 'planTier', v_tier, 'limit', NULL,
      'used', NULL, 'remaining', NULL, 'isUnlimited', true, 'monthKey', v_month);
  END IF;

  INSERT INTO public.quote_gen_usage (user_id, month_key, used)
    VALUES (v_user, v_month, 0)
    ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.quote_gen_usage
     SET used = used + 1, updated_at = now()
   WHERE user_id = v_user AND month_key = v_month AND used < v_limit
  RETURNING used INTO v_used;

  IF v_used IS NULL THEN
    SELECT used INTO v_used FROM public.quote_gen_usage
     WHERE user_id = v_user AND month_key = v_month;
    RETURN jsonb_build_object('ok', false, 'reason', 'quota', 'planTier', v_tier,
      'limit', v_limit, 'used', v_used, 'remaining', 0, 'monthKey', v_month);
  END IF;

  RETURN jsonb_build_object('ok', true, 'planTier', v_tier, 'limit', v_limit,
    'used', v_used, 'remaining', GREATEST(v_limit - v_used, 0),
    'isUnlimited', false, 'monthKey', v_month);
END
$$;

REVOKE ALL ON FUNCTION public.increment_quote_gen_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_quote_gen_usage() TO authenticated;

-- ============================================================
-- decrement_quote_gen_usage — refund on compute failure
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_quote_gen_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid := auth.uid();
  v_month text := to_char(now(), 'YYYY-MM');
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  UPDATE public.quote_gen_usage
     SET used = GREATEST(used - 1, 0), updated_at = now()
   WHERE user_id = v_user AND month_key = v_month;
END
$$;

REVOKE ALL ON FUNCTION public.decrement_quote_gen_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_quote_gen_usage() TO authenticated;
