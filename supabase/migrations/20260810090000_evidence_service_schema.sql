-- Quantis Evidence Service — persistence schema (PR E5).
--
-- Design decision, per explicit founder direction: this schema stores
-- QUANTIS-OWNED NORMALIZED records matching the QuantisEvidencePacket
-- contract (supabase/functions/_shared/evidence/types.ts), never a raw
-- provider JSON blob. Every column here corresponds to a typed field in
-- that contract -- there is deliberately no `raw_response jsonb` column
-- anywhere in this file. If a provider's raw response is ever needed for
-- debugging, that's an application-level logging/telemetry concern (the
-- existing ai_calls-style pattern), not something this schema persists as
-- canonical evidence.
--
-- Ownership model: every table carries both analysis_id AND a denormalized
-- user_id column, enforced consistent with the real owner via a write-time
-- trigger (below) rather than trusted by convention.
--
-- Revised 2026-08-10 from the original join-based design (RLS policies
-- doing `EXISTS (SELECT 1 FROM analyses WHERE ... AND user_id = auth.uid())`).
-- That design was proven live-broken by this exact isolated CI replay:
-- `authenticated` reading its OWN evidence_packets row got 42501
-- "permission denied for table subscriptions", because Postgres must
-- evaluate ALL permissive SELECT policies on public.analyses to resolve
-- the EXISTS subquery -- including "Pro team members read inheritance"
-- (migration 20260504220238...sql), an unrelated pre-existing policy
-- whose SECURITY DEFINER function joins to public.subscriptions. That
-- table has its own independent, deliberately-restrictive grant surface,
-- and the resulting permission error surfaced on THIS table's query even
-- though this table has nothing to do with team/subscription features.
--
-- Rather than reach into and modify an orthogonal, already-shipped
-- policy/table to fix a problem in a new feature branch, this schema
-- denormalizes user_id directly onto every evidence_* row and checks
-- `user_id = auth.uid()` with no join at all -- avoiding any dependency
-- on `analyses`' other policies entirely. Consistency between the
-- denormalized user_id and the analysis's real owner is enforced at
-- write time (the only time it can drift, since only service_role ever
-- writes here) by enforce_evidence_user_id_matches_analysis() below,
-- applied to every table, for every role including service_role.
--
-- Security acceptance bar (explicit founder requirement, encoded below
-- and re-verified by src/__tests__/evidence-service-rls.test.ts using
-- real Supabase-issued JWTs, following the exact pattern this branch's
-- earlier P0 remediation work proved out):
--   anonymous SELECT/INSERT/UPDATE/DELETE  -> denied
--   user A reads user A                    -> allowed
--   user A reads user B                    -> denied
--   user A writes user B                   -> denied
--   service role                           -> explicitly granted, not assumed
--   cross-analysis access                  -> denied
--   cross-tenant access                    -> denied
--   public EXECUTE grants                  -> none (no functions defined here)
--
-- Every CREATE TABLE is idempotent (IF NOT EXISTS) per this repo's own
-- established convention -- but these are genuinely new table names with
-- no prior history anywhere in supabase/migrations/, confirmed by grep
-- before writing this file, so no collision is expected on replay.

-- ============================================================
-- evidence_requests -- the compiled EvidenceRequest (request-compiler.ts output)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_class text NOT NULL,
  questions jsonb NOT NULL, -- EvidenceQuestion[]
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_requests_analysis_id_idx ON public.evidence_requests(analysis_id);

-- ============================================================
-- evidence_packets -- the locked QuantisEvidencePacket header
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- = QuantisEvidencePacket.evidencePacketId
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_request_id uuid REFERENCES public.evidence_requests(id) ON DELETE SET NULL,
  query_plan_version text NOT NULL,
  provider_set_version text NOT NULL,
  ranking_version text NOT NULL,
  evidence_schema_version text NOT NULL,
  source_lenses text[] NOT NULL DEFAULT '{}',
  unresolved_questions text[] NOT NULL DEFAULT '{}',
  contradictions text[] NOT NULL DEFAULT '{}',
  degraded boolean NOT NULL DEFAULT false,
  retrieval_latency_ms integer NOT NULL,
  cost_usd numeric(10,6),
  content_hash text NOT NULL, -- SHA-256 hex, see packet.ts::computeEvidencePacketContentHash
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_packets_content_hash_format CHECK (content_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS evidence_packets_analysis_id_idx ON public.evidence_packets(analysis_id);

-- ============================================================
-- evidence_sources -- normalized EvidenceSource
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- = EvidenceSource.sourceId
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,
  canonical_url text NOT NULL,
  publisher text,
  author text,
  published_at timestamptz,
  retrieved_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN (
    'OFFICIAL','GOVERNMENT','FILING','COMPANY','LICENSED','ACADEMIC',
    'NEWS','COMMUNITY','DOCUMENTATION','LOCAL_BUSINESS','OTHER'
  )),
  primary_status text NOT NULL CHECK (primary_status IN ('PRIMARY','SECONDARY','UNKNOWN')),
  independence_cluster text,
  geography text,
  language text,
  freshness text NOT NULL CHECK (freshness IN ('CURRENT','AGING','HISTORICAL','UNKNOWN')),
  storage_policy text NOT NULL CHECK (storage_policy IN ('NO_STORE','METADATA_ONLY','PASSAGE_ALLOWED','FULL_ALLOWED')),
  provider_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_sources_analysis_id_idx ON public.evidence_sources(analysis_id);
CREATE INDEX IF NOT EXISTS evidence_sources_packet_id_idx ON public.evidence_sources(evidence_packet_id);

-- ============================================================
-- evidence_passages -- normalized EvidencePassage
--
-- The `text` column stores the passage body. This is only ever written
-- with content from a source whose storage_policy is PASSAGE_ALLOWED or
-- FULL_ALLOWED -- enforced at the application layer (the pipeline never
-- constructs a passage for a NO_STORE/METADATA_ONLY source in the first
-- place), reinforced here by a trigger rather than trusted purely by
-- convention, since a future write path might not go through the same
-- pipeline code.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- = EvidencePassage.passageId
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_source_id uuid NOT NULL REFERENCES public.evidence_sources(id) ON DELETE CASCADE,
  text text NOT NULL,
  heading text,
  page integer,
  anchor text,
  extracted_at timestamptz NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_passages_analysis_id_idx ON public.evidence_passages(analysis_id);
CREATE INDEX IF NOT EXISTS evidence_passages_source_id_idx ON public.evidence_passages(evidence_source_id);

CREATE OR REPLACE FUNCTION public.enforce_evidence_passage_storage_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy text;
BEGIN
  SELECT storage_policy INTO v_policy
  FROM public.evidence_sources
  WHERE id = NEW.evidence_source_id;

  IF v_policy IS NULL THEN
    RAISE EXCEPTION 'evidence_passages: referenced evidence_source_id % does not exist', NEW.evidence_source_id;
  END IF;

  IF v_policy NOT IN ('PASSAGE_ALLOWED', 'FULL_ALLOWED') THEN
    RAISE EXCEPTION 'evidence_passages: refusing to store passage text for a source with storage_policy=%; only PASSAGE_ALLOWED/FULL_ALLOWED sources may have passage text persisted', v_policy;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evidence_passages_storage_policy_guard ON public.evidence_passages;
CREATE TRIGGER evidence_passages_storage_policy_guard
  BEFORE INSERT OR UPDATE ON public.evidence_passages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_evidence_passage_storage_policy();

-- ============================================================
-- evidence_claims -- normalized EvidenceClaim
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- = EvidenceClaim.claimId
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,
  statement text NOT NULL,
  support jsonb NOT NULL, -- EvidenceClaimSupport[]
  status text NOT NULL CHECK (status IN ('SUPPORTED','CONTESTED','SINGLE_SOURCE','STALE','INFERRED','UNSUPPORTED')),
  freshness text NOT NULL CHECK (freshness IN ('CURRENT','AGING','HISTORICAL','UNKNOWN')),
  source_independence_count integer NOT NULL CHECK (source_independence_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_claims_analysis_id_idx ON public.evidence_claims(analysis_id);
CREATE INDEX IF NOT EXISTS evidence_claims_packet_id_idx ON public.evidence_claims(evidence_packet_id);

-- ============================================================
-- numeric_observations -- normalized NumericObservation
-- ============================================================
CREATE TABLE IF NOT EXISTS public.numeric_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- = NumericObservation.observationId
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,
  evidence_source_id uuid NOT NULL REFERENCES public.evidence_sources(id) ON DELETE CASCADE,
  evidence_passage_id uuid NOT NULL REFERENCES public.evidence_passages(id) ON DELETE CASCADE,
  value text NOT NULL,
  unit text NOT NULL,
  currency text,
  period text,
  geography text,
  statistic_type text,
  transformation_ids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('OBSERVED','TRANSFORMED','ESTIMATE')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS numeric_observations_analysis_id_idx ON public.numeric_observations(analysis_id);
CREATE INDEX IF NOT EXISTS numeric_observations_packet_id_idx ON public.numeric_observations(evidence_packet_id);

-- ============================================================
-- evidence_evaluations -- retrieval/quality evaluation results (master
-- prompt section 27/28) -- populated by a future evaluation harness (E8),
-- schema exists now so E8 has a real, reviewed target rather than
-- inventing persistence at that point too.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evidence_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_evaluations_analysis_id_idx ON public.evidence_evaluations(analysis_id);
CREATE INDEX IF NOT EXISTS evidence_evaluations_packet_id_idx ON public.evidence_evaluations(evidence_packet_id);

-- ============================================================
-- Write-time integrity guard -- every evidence_* row's denormalized
-- user_id must match its analysis_id's real owner. Applied to ALL roles
-- including service_role (the only writer), since this is a data
-- integrity invariant, not an access-control boundary -- it must hold
-- regardless of who is writing.
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_evidence_user_id_matches_analysis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.analyses WHERE id = NEW.analysis_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION '%: referenced analysis_id % does not exist', TG_TABLE_NAME, NEW.analysis_id;
  END IF;

  IF NEW.user_id IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION '%: user_id % does not match analysis % owner %', TG_TABLE_NAME, NEW.user_id, NEW.analysis_id, v_owner;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'evidence_requests', 'evidence_packets', 'evidence_sources',
    'evidence_passages', 'evidence_claims', 'numeric_observations',
    'evidence_evaluations'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_user_id_guard ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER %I_user_id_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_evidence_user_id_matches_analysis()',
      tbl, tbl
    );
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I_user_id_idx ON public.%I(user_id)', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- Row Level Security -- deny-by-default, owner-scoped via denormalized
-- user_id (no join to public.analyses -- see design-decision note at the
-- top of this file for why), explicit service_role grants (never assumed
-- from bypassrls -- this session's own P0 remediation work proved
-- bypassrls does NOT imply table-level GRANTs, a separate Postgres
-- mechanism entirely).
-- ============================================================

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'evidence_requests', 'evidence_packets', 'evidence_sources',
    'evidence_passages', 'evidence_claims', 'numeric_observations',
    'evidence_evaluations'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    -- Deny-by-default: explicitly revoke from PUBLIC/anon/authenticated
    -- first so this migration is correct even if a future default-
    -- privileges change would otherwise grant something implicitly.
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
    -- authenticated needs SELECT for the owner-scoped policy below to be
    -- reachable at all (a policy restricts rows, it does not itself grant
    -- table privilege -- the exact BLOCKER 1 lesson from this branch's P0
    -- migration).
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', tbl);
    -- service_role is the only writer (edge functions), granted
    -- explicitly and completely.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', tbl);
  END LOOP;
END $$;

-- evidence_requests
DROP POLICY IF EXISTS evidence_requests_owner_select ON public.evidence_requests;
CREATE POLICY evidence_requests_owner_select ON public.evidence_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_requests_service_all ON public.evidence_requests;
CREATE POLICY evidence_requests_service_all ON public.evidence_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- evidence_packets
DROP POLICY IF EXISTS evidence_packets_owner_select ON public.evidence_packets;
CREATE POLICY evidence_packets_owner_select ON public.evidence_packets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_packets_service_all ON public.evidence_packets;
CREATE POLICY evidence_packets_service_all ON public.evidence_packets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- evidence_sources
DROP POLICY IF EXISTS evidence_sources_owner_select ON public.evidence_sources;
CREATE POLICY evidence_sources_owner_select ON public.evidence_sources
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_sources_service_all ON public.evidence_sources;
CREATE POLICY evidence_sources_service_all ON public.evidence_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- evidence_passages
DROP POLICY IF EXISTS evidence_passages_owner_select ON public.evidence_passages;
CREATE POLICY evidence_passages_owner_select ON public.evidence_passages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_passages_service_all ON public.evidence_passages;
CREATE POLICY evidence_passages_service_all ON public.evidence_passages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- evidence_claims
DROP POLICY IF EXISTS evidence_claims_owner_select ON public.evidence_claims;
CREATE POLICY evidence_claims_owner_select ON public.evidence_claims
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_claims_service_all ON public.evidence_claims;
CREATE POLICY evidence_claims_service_all ON public.evidence_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- numeric_observations
DROP POLICY IF EXISTS numeric_observations_owner_select ON public.numeric_observations;
CREATE POLICY numeric_observations_owner_select ON public.numeric_observations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS numeric_observations_service_all ON public.numeric_observations;
CREATE POLICY numeric_observations_service_all ON public.numeric_observations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- evidence_evaluations
DROP POLICY IF EXISTS evidence_evaluations_owner_select ON public.evidence_evaluations;
CREATE POLICY evidence_evaluations_owner_select ON public.evidence_evaluations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_evaluations_service_all ON public.evidence_evaluations;
CREATE POLICY evidence_evaluations_service_all ON public.evidence_evaluations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- No EXECUTE grants of any kind are made in this migration -- both
-- functions defined here (enforce_evidence_passage_storage_policy,
-- enforce_evidence_user_id_matches_analysis) are trigger functions,
-- invoked internally by the executor, never callable directly via SQL by
-- any role; neither receives an explicit GRANT EXECUTE to
-- anon/authenticated/PUBLIC/service_role.
