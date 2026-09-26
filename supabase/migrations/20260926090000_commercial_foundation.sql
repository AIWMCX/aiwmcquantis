-- Commercial Ops workflow, Phase C (2026-09-26): the Commercial Foundation
-- table only -- the canonical factual source every later stage (Offer,
-- Prospecting, Call Prep, Objection Handling, Follow-up) will cite. Later
-- stages' own tables (commercial_offers, commercial_prospects, etc.) land in
-- their own PRs alongside the logic that uses them, per the phase discipline
-- this implements ("do not create mock architecture disconnected from the
-- application") -- no unused schema sitting ahead of real code.
--
-- Named "commercial_*", not "decision_*" -- an unrelated customer-facing
-- decision_workflow_schema.sql (20260911075212) already owns that name.
-- Two pre-existing, unrelated tables (commercial_analyses,
-- commercial_subscriptions) already use the commercial_ prefix -- confirmed
-- via live schema inspection before writing this; they look like orphaned
-- duplicates of analyses/subscriptions, no relation to this table, no name
-- collision with anything below.
--
-- ACCESS MODEL: has_role(auth.uid(),'admin'), matching activation_events'
-- admin-bypass idiom -- NOT the workspace+members junction-table pattern
-- decision_workspaces uses. This is a solo operator's own internal sales
-- data (spec's stated initial audience: "AIWMC/Quantis internal commercial
-- operations"), not external multi-party collaboration data.

CREATE TABLE IF NOT EXISTS public.commercial_foundations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id),
  version integer NOT NULL,
  is_current boolean NOT NULL DEFAULT true,

  product_name text NOT NULL,
  product_description text NOT NULL,
  target_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  excluded_segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_problems jsonb NOT NULL DEFAULT '[]'::jsonb,
  desired_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Every entry: { text, status: 'FACT'|'ASSUMPTION'|'INFERENCE'|'UNKNOWN',
  -- evidence_ref: text|null }. A FACT with a null evidence_ref is a data
  -- error the application layer should reject on write, not something this
  -- migration can enforce in SQL alone (jsonb has no per-key CHECK) --
  -- enforced instead by the Zod CommercialFoundation contract at the write
  -- boundary (Phase B contracts, ProvenancedClaim).
  verified_capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  prohibited_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  customer_evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  differentiators jsonb NOT NULL DEFAULT '[]'::jsonb,
  call_to_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_references jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most one current version at a time -- upsert_commercial_foundation
-- flips the prior row's is_current to false in the same transaction as
-- inserting the new one (see function below), so this can never trip.
CREATE UNIQUE INDEX IF NOT EXISTS commercial_foundations_one_current
  ON public.commercial_foundations (is_current)
  WHERE is_current;

ALTER TABLE public.commercial_foundations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_foundations"
  ON public.commercial_foundations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_foundations"
  ON public.commercial_foundations
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Read: current version only. Callers needing history can query the table
-- directly (RLS already scopes them to admin) -- this RPC is the common case.
CREATE OR REPLACE FUNCTION public.get_commercial_foundation()
RETURNS public.commercial_foundations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT f.* FROM public.commercial_foundations f
  WHERE f.is_current
  LIMIT 1;
$function$;

-- Write: ALWAYS creates a new version row rather than mutating in place
-- (spec: every downstream claim must be traceable to a specific foundation
-- version). Flips the prior current row's is_current in the same
-- transaction, so the unique partial index above is never violated.
CREATE OR REPLACE FUNCTION public.upsert_commercial_foundation(p jsonb)
RETURNS public.commercial_foundations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_next_version integer;
  v_row public.commercial_foundations;
BEGIN
  IF NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.commercial_foundations;

  UPDATE public.commercial_foundations SET is_current = false WHERE is_current;

  INSERT INTO public.commercial_foundations (
    owner_user_id, version, is_current,
    product_name, product_description, target_segments, excluded_segments,
    customer_problems, desired_outcomes, pricing,
    verified_capabilities, limitations, approved_claims, prohibited_claims,
    evidence, customer_evidence, faq, differentiators, call_to_actions,
    source_references
  ) VALUES (
    v_uid, v_next_version, true,
    p->>'product_name', p->>'product_description',
    COALESCE(p->'target_segments', '[]'::jsonb),
    COALESCE(p->'excluded_segments', '[]'::jsonb),
    COALESCE(p->'customer_problems', '[]'::jsonb),
    COALESCE(p->'desired_outcomes', '[]'::jsonb),
    COALESCE(p->'pricing', '[]'::jsonb),
    COALESCE(p->'verified_capabilities', '[]'::jsonb),
    COALESCE(p->'limitations', '[]'::jsonb),
    COALESCE(p->'approved_claims', '[]'::jsonb),
    COALESCE(p->'prohibited_claims', '[]'::jsonb),
    COALESCE(p->'evidence', '[]'::jsonb),
    COALESCE(p->'customer_evidence', '[]'::jsonb),
    COALESCE(p->'faq', '[]'::jsonb),
    COALESCE(p->'differentiators', '[]'::jsonb),
    COALESCE(p->'call_to_actions', '[]'::jsonb),
    COALESCE(p->'source_references', '[]'::jsonb)
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_commercial_foundation() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_commercial_foundation(jsonb) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Seed: version 1, built ONLY from facts verified against this session's own
-- codebase/live-site inspection (spec section 14: "use verified production
-- configuration/content", never hard-coded generic marketing copy).
-- ----------------------------------------------------------------------------
INSERT INTO public.commercial_foundations (
  version, is_current, product_name, product_description,
  target_segments, customer_problems, desired_outcomes, pricing,
  verified_capabilities, prohibited_claims, approved_claims,
  source_references
) VALUES (
  1, true,
  'AIWMC Quantis',
  'Financial pre-mortem and business decision-support: stress-tests a business idea or operating decision against benchmark data and a deterministic financial engine, returning a profitability verdict, reliability score, and sourced report before capital is committed.',
  '["founders", "consultants", "fractional CFOs", "business advisors", "strategic operators"]'::jsonb,
  '["need to structure assumptions before committing capital", "need to pressure-test a client'' or their own business decision", "need a sourced, defensible financial analysis, not a guess"]'::jsonb,
  '["a clear profitability verdict and reliability score before investing", "a saveable, source-cited report", "a decision they can defend to a partner, investor, or client"]'::jsonb,
  '[{"tier":"free","price_monthly":0,"note":"5 Decision Runs/month, pre-mortem included, no card required -- verified in src/config/tiers.ts"},{"tier":"plus","price_monthly":17,"note":"unlimited analyses, verified in src/config/tiers.ts"},{"tier":"pro","price_monthly":49,"note":"unlimited analyses + investor-grade depth, verified in src/config/tiers.ts"}]'::jsonb,
  '["structure assumptions before modeling", "model business drivers bottom-up (financial-engine.ts)", "compare scenarios side by side", "calculate runway, break-even, and payback", "detect which single assumption is most fragile (sensitivity/required-to-work)", "pre-mortem stress-test an existing business (churn shock, cost spike, customer concentration)", "5 free Decision Runs per month, no credit card required -- verified live on aiwmcquantis.com homepage"]'::jsonb,
  '["audit-grade (as an accuracy/rigor claim about output -- distinct from the unrelated \"RMG\" landing-page CSS aesthetic name, which is not a product claim)", "survive investor scrutiny", "under 90 seconds / 90-second processing time -- explicitly superseded 2026-08-30 per src/config/canonical-facts.ts, confirmed still dead code (unused) but must not be reintroduced", "90% fail -- explicitly replaced 2026-06-22 per src/components/landing/HeroVariants.tsx", "predictive accuracy -- src/pages/Methodology.tsx explicitly and currently disclaims this (\"is never presented as predictive accuracy\")"]'::jsonb,
  '["97,500 benchmark data points informed by SEC filings, World Bank enterprise surveys, and proprietary industry modeling -- verified live on aiwmcquantis.com homepage, 2026-09-26", "no credit card required, first analysis free -- verified live on aiwmcquantis.com homepage, 2026-09-26"]'::jsonb,
  '["src/config/tiers.ts", "src/config/canonical-facts.ts", "src/pages/Methodology.tsx", "src/components/landing/HeroVariants.tsx", "aiwmcquantis.com homepage (live, 2026-09-26)"]'::jsonb
)
ON CONFLICT DO NOTHING;
