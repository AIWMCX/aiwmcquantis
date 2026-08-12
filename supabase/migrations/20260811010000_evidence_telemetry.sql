-- Quantis Evidence Service — pipeline observability persistence (PR E7).
--
-- One row per evidence_packets row, holding the derived metrics
-- supabase/functions/_shared/evidence/evidence-telemetry.ts computes.
-- Purely additive/observational -- never read by the pipeline itself,
-- never affects a customer-facing response. Exists so /admin/evidence
-- (E10, not built yet) has real per-run numbers to query once it exists,
-- rather than needing to recompute metrics from evidence_sources/
-- evidence_claims on every dashboard load.
--
-- Same ownership/RLS design as the rest of the E5 schema (denormalized
-- user_id, checked directly against auth.uid() with no join to
-- public.analyses -- see 20260810090000_evidence_service_schema.sql's own
-- header for why: joining to analyses' other permissive policies caused a
-- real, already-fixed production-access failure earlier in this branch).

CREATE TABLE IF NOT EXISTS public.evidence_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,

  provider_call_count integer NOT NULL DEFAULT 0,
  provider_success_count integer NOT NULL DEFAULT 0,
  provider_degraded_count integer NOT NULL DEFAULT 0,
  provider_failed_count integer NOT NULL DEFAULT 0,

  source_count integer NOT NULL DEFAULT 0,
  independent_source_count integer NOT NULL DEFAULT 0,
  duplicate_source_count integer NOT NULL DEFAULT 0,
  primary_source_count integer NOT NULL DEFAULT 0,
  stale_source_count integer NOT NULL DEFAULT 0,

  claim_count integer NOT NULL DEFAULT 0,
  supported_claim_count integer NOT NULL DEFAULT 0,
  single_source_claim_count integer NOT NULL DEFAULT 0,
  contested_claim_count integer NOT NULL DEFAULT 0,
  unsupported_claim_count integer NOT NULL DEFAULT 0,

  contradiction_count integer NOT NULL DEFAULT 0,
  unresolved_question_count integer NOT NULL DEFAULT 0,
  numeric_observation_count integer NOT NULL DEFAULT 0,

  retrieval_latency_ms integer NOT NULL,
  cost_usd numeric(10,6),
  degraded boolean NOT NULL DEFAULT false,

  pipeline_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS evidence_telemetry_packet_id_uidx ON public.evidence_telemetry(evidence_packet_id);
CREATE INDEX IF NOT EXISTS evidence_telemetry_analysis_id_idx ON public.evidence_telemetry(analysis_id);
CREATE INDEX IF NOT EXISTS evidence_telemetry_user_id_idx ON public.evidence_telemetry(user_id);
CREATE INDEX IF NOT EXISTS evidence_telemetry_created_at_idx ON public.evidence_telemetry(created_at DESC);

ALTER TABLE public.evidence_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_telemetry FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.evidence_telemetry FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.evidence_telemetry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evidence_telemetry TO service_role;

DROP POLICY IF EXISTS evidence_telemetry_owner_select ON public.evidence_telemetry;
CREATE POLICY evidence_telemetry_owner_select ON public.evidence_telemetry
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS evidence_telemetry_service_all ON public.evidence_telemetry;
CREATE POLICY evidence_telemetry_service_all ON public.evidence_telemetry
  FOR ALL TO service_role USING (true) WITH CHECK (true);
