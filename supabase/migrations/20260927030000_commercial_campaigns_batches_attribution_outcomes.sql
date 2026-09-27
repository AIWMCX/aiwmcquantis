-- Commercial Ops workflow, operational layer (2026-09-27): campaign/batch
-- schema, suppression-status column, product<->commercial attribution
-- bridge, and a passive outcome-recording table.
--
-- Additive only -- no existing column/table/enum is dropped, renamed, or
-- narrowed. Reconciled against live schema (information_schema.columns on
-- the AIWMC QUANTIS project) before writing this: commercial_campaigns,
-- commercial_batches, commercial_attributions, commercial_outcomes and the
-- campaign_id/batch_id/suppression_status columns on commercial_prospects
-- do not exist yet under any name.
--
-- Access model: admin_full_access (has_role(auth.uid(),'admin')), matching
-- commercial_prospects/commercial_offers exactly -- same internal-only
-- audience as the rest of Commercial Ops.

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_campaigns
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  segment text,
  offer_id uuid REFERENCES public.commercial_offers(id) ON DELETE SET NULL,
  sender_identity text,
  status text NOT NULL DEFAULT 'draft',
  daily_limit integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,

  CONSTRAINT commercial_campaigns_status_chk CHECK (
    status IN ('draft', 'active', 'paused', 'completed')
  ),
  CONSTRAINT commercial_campaigns_daily_limit_chk CHECK (
    daily_limit IS NULL OR daily_limit > 0
  )
);

ALTER TABLE public.commercial_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_campaigns"
  ON public.commercial_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_campaigns"
  ON public.commercial_campaigns FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_batches
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.commercial_campaigns(id) ON DELETE CASCADE,
  batch_number integer NOT NULL,
  scheduled_date date,
  lead_count integer NOT NULL DEFAULT 0,
  approved_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  reply_count integer NOT NULL DEFAULT 0,
  positive_reply_count integer NOT NULL DEFAULT 0,
  meeting_count integer NOT NULL DEFAULT 0,
  activated_count integer NOT NULL DEFAULT 0,
  paid_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT commercial_batches_status_chk CHECK (
    status IN ('planned', 'approved', 'sending', 'sent', 'completed')
  ),
  CONSTRAINT commercial_batches_counts_non_negative_chk CHECK (
    lead_count >= 0 AND approved_count >= 0 AND sent_count >= 0 AND
    delivered_count >= 0 AND reply_count >= 0 AND positive_reply_count >= 0 AND
    meeting_count >= 0 AND activated_count >= 0 AND paid_count >= 0
  ),
  CONSTRAINT commercial_batches_campaign_batch_number_uniq UNIQUE (campaign_id, batch_number)
);

CREATE INDEX IF NOT EXISTS commercial_batches_campaign_idx
  ON public.commercial_batches (campaign_id, batch_number);

ALTER TABLE public.commercial_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_batches"
  ON public.commercial_batches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_batches"
  ON public.commercial_batches FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_prospects: additive columns for campaign/batch linkage and the
-- deterministic suppression engine (never dropped/renamed anything).
-- suppression_status defaults to 'active' so every existing row (and every
-- row inserted by code that predates this migration) keeps working exactly
-- as before -- the suppression engine treats an absent/'active' status as
-- "not suppressed on this basis" and still runs its other checks.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.commercial_prospects
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.commercial_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suppression_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.commercial_prospects
  ADD CONSTRAINT commercial_prospects_suppression_status_chk CHECK (
    suppression_status IN ('active', 'unsubscribed', 'hard_bounced', 'do_not_contact')
  );

CREATE INDEX IF NOT EXISTS commercial_prospects_campaign_idx
  ON public.commercial_prospects (campaign_id);
CREATE INDEX IF NOT EXISTS commercial_prospects_batch_idx
  ON public.commercial_prospects (batch_id);
-- Supports the suppression engine's dedupe/active-opportunity lookups
-- (company_name + contact_channel), run once per draft_followup call.
CREATE INDEX IF NOT EXISTS commercial_prospects_company_contact_idx
  ON public.commercial_prospects (company_name, contact_channel);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_attributions -- the product<->commercial bridge (spec step 3).
-- Narrow and additive: no FK into any product/user table beyond auth.users
-- itself, so Commercial Ops never gains broad read access to normal product
-- tables through this bridge -- only the one row per (prospect, campaign)
-- conversion touchpoint. decision_id/analysis_id/subscription_id are
-- deliberately soft references (no FK): they point at tables outside this
-- feature's schema/ownership (decision_workflow_schema.sql's decisions,
-- the analyses tables, Stripe-backed subscriptions), so this migration
-- never has to know their exact shape or take on a cross-feature FK
-- coupling risk -- same "soft reference for traceability, not enforcement"
-- idiom already used by commercial_agent_runs.foundation_version.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_id uuid,
  analysis_id uuid,
  subscription_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercial_attributions_prospect_idx
  ON public.commercial_attributions (prospect_id);
CREATE INDEX IF NOT EXISTS commercial_attributions_campaign_idx
  ON public.commercial_attributions (campaign_id);
CREATE INDEX IF NOT EXISTS commercial_attributions_user_idx
  ON public.commercial_attributions (user_id);

ALTER TABLE public.commercial_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_attributions"
  ON public.commercial_attributions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_attributions"
  ON public.commercial_attributions FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────
-- commercial_outcomes -- passive record table only (spec step 4: "do not
-- build any learning/ranking logic against it in this PR"). reply_class is
-- a plain text CHECK, not an enum, because no reply-classification concept
-- exists anywhere in this codebase yet (confirmed via repo search before
-- writing this) -- this is a minimal, reviewable starting vocabulary a
-- future PR can extend additively (ALTER ... DROP CONSTRAINT + ADD
-- CONSTRAINT with a wider list), same low-risk shape as a CHECK vs. a
-- Postgres ENUM elsewhere in this migration.
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.commercial_prospects(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.commercial_campaigns(id) ON DELETE SET NULL,
  segment text,
  offer_id uuid REFERENCES public.commercial_offers(id) ON DELETE SET NULL,
  reply_class text,
  meeting_booked boolean NOT NULL DEFAULT false,
  analysis_started boolean NOT NULL DEFAULT false,
  analysis_completed boolean NOT NULL DEFAULT false,
  activated boolean NOT NULL DEFAULT false,
  strong_activation boolean NOT NULL DEFAULT false,
  subscription_activated boolean NOT NULL DEFAULT false,
  revenue_cents integer,
  lost_reason text,
  recorded_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT commercial_outcomes_reply_class_chk CHECK (
    reply_class IS NULL OR reply_class IN (
      'no_reply', 'positive', 'neutral', 'negative', 'objection',
      'unsubscribe', 'bounce'
    )
  ),
  CONSTRAINT commercial_outcomes_revenue_cents_chk CHECK (
    revenue_cents IS NULL OR revenue_cents >= 0
  )
);

CREATE INDEX IF NOT EXISTS commercial_outcomes_prospect_idx
  ON public.commercial_outcomes (prospect_id);
CREATE INDEX IF NOT EXISTS commercial_outcomes_campaign_idx
  ON public.commercial_outcomes (campaign_id);

ALTER TABLE public.commercial_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_commercial_outcomes"
  ON public.commercial_outcomes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "anon_deny_commercial_outcomes"
  ON public.commercial_outcomes FOR ALL USING (false) WITH CHECK (false);
