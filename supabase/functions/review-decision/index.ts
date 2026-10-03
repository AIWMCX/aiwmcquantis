/**
 * review-decision — Phase B, shadow mode only.
 *
 * Runs an independent, bounded decision review (JEV, or the internal test
 * fixture) against a canonical, already-completed analysis. Deliberately
 * NOT wired into analyze-business's hot path (contract §11: JEV must never
 * become a blocking dependency for time-to-first-value) — this function is
 * invoked separately, by a caller that already has the analysis_id. No
 * production caller invokes this automatically yet; see
 * docs/decision-intelligence/JEV_IMPLEMENTATION_DECISION.md for why
 * (TYPESAFE_API_KEY not yet provisioned) and what "shadow mode" means here.
 *
 * Follows scenario-breakpoint/index.ts's auth/ownership/CORS/health pattern.
 *
 * Gated by DECISION_REVIEW_ENABLED (feature flag; contract §23 names it
 * decision_review_v1 / decision_review_shadow_v1 — implemented here as a
 * single env var since this repo has no existing flags table/service, see
 * JEV_IMPLEMENTATION_DECISION.md). Defaults OFF: an operator must
 * explicitly set it before this function will ever call a paid vendor.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import type { DecisionReviewProvider } from '../_shared/decision-review/contracts.ts';
import { DECISION_REVIEW_VERSION } from '../_shared/decision-review/contracts.ts';
import { buildDecisionPacket, extractMetrics } from '../_shared/decision-review/packet-builder.ts';
import { computeCanonicalResultHash, computeEvidenceHash, computeReviewCacheKey } from '../_shared/decision-review/hashes.ts';
import { TypesafeJevProvider } from '../_shared/decision-review/jev-provider.ts';
import { QuantisInternalTestProvider, type FixtureBehavior } from '../_shared/decision-review/quantis-internal-test-provider.ts';
import { logDecisionReviewEvent } from '../_shared/decision-review/telemetry.ts';

const FUNCTION_NAME = 'review-decision';
const FUNCTION_VERSION = '1.0.0';

interface ReviewDecisionRequest {
  analysis_id: string;
  provider?: DecisionReviewProvider;
  /** quantis_internal_test only — never honored for the real typesafe_jev provider. */
  fixture_behavior?: FixtureBehavior['kind'];
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger(FUNCTION_NAME, reqId);
  const corsHeaders = corsHeadersFor(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return jsonResponse({ error: 'Invalid token' }, 401, corsHeaders);
    }
    const userId = claimsData.user.id;

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body: ReviewDecisionRequest = await req.json();
    const { analysis_id, fixture_behavior } = body;
    const provider: DecisionReviewProvider = body.provider ?? 'typesafe_jev';

    if (!analysis_id) {
      return jsonResponse({ error: 'analysis_id is required' }, 400, corsHeaders);
    }

    // Fail-open feature gate: disabled is a valid, non-error outcome — the
    // UI must render "Independent review temporarily unavailable," never a
    // broken analysis (contract §5).
    const enabled = (Deno.env.get('DECISION_REVIEW_ENABLED') ?? '').toLowerCase() === 'true';
    if (!enabled && provider === 'typesafe_jev') {
      return jsonResponse(
        { status: 'unavailable', reason: 'feature_disabled', detail: 'decision_review_v1 is not enabled' },
        200,
        corsHeaders,
      );
    }

    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, result')
      .eq('id', analysis_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (analysisError || !analysis || !analysis.result) {
      return jsonResponse({ error: 'Analysis not found', code: 'ANALYSIS_UNAVAILABLE' }, 422, corsHeaders);
    }

    const result = analysis.result as Record<string, unknown>;
    const fa = (result?.financial_analysis as Record<string, unknown>) ?? {};
    const metrics = extractMetrics(fa);
    const canonicalResultHash = await computeCanonicalResultHash(analysis_id, metrics);
    const packet = buildDecisionPacket({ canonicalResultHash, result });
    const evidenceHash = await computeEvidenceHash(packet.evidence);

    const reviewerModelLabel = provider === 'typesafe_jev' ? 'typesafe-jev-systemone' : 'fixture-v1';
    const reviewCacheKey = await computeReviewCacheKey({
      canonicalResultHash,
      evidenceHash,
      reviewVersion: DECISION_REVIEW_VERSION,
      reviewerModel: reviewerModelLabel,
    });

    // Idempotency: never re-invoke the (metered) reviewer for an unchanged
    // canonical analysis + evidence set (contract §10).
    const { data: existing } = await adminClient
      .from('decision_reviews')
      .select('*')
      .eq('review_cache_key', reviewCacheKey)
      .maybeSingle();

    if (existing) {
      await logDecisionReviewEvent(adminClient, {
        event: 'decision_review_cache_hit',
        userId,
        analysisId: analysis_id,
        provider,
        latencyMs: 0,
        ok: true,
      });
      return jsonResponse({ cached: true, review: existing }, 200, corsHeaders);
    }

    await logDecisionReviewEvent(adminClient, {
      event: 'decision_review_requested',
      userId,
      analysisId: analysis_id,
      provider,
      latencyMs: 0,
      ok: true,
    });

    const reviewer =
      provider === 'typesafe_jev'
        ? new TypesafeJevProvider(Deno.env.get('TYPESAFE_API_KEY') ?? '')
        : new QuantisInternalTestProvider({ kind: fixture_behavior ?? 'agree' });

    if (provider === 'typesafe_jev' && !Deno.env.get('TYPESAFE_API_KEY')) {
      return jsonResponse(
        { status: 'unavailable', reason: 'not_configured', detail: 'TYPESAFE_API_KEY is not provisioned' },
        200,
        corsHeaders,
      );
    }

    const outcome = await reviewer.review(packet);

    if (outcome.status === 'unavailable') {
      await logDecisionReviewEvent(adminClient, {
        event: 'decision_review_failed',
        userId,
        analysisId: analysis_id,
        provider,
        latencyMs: 0,
        ok: false,
        error: `${outcome.reason}: ${outcome.detail}`,
      });

      await adminClient.from('decision_reviews').insert({
        analysis_id,
        user_id: userId,
        provider,
        provider_model: reviewerModelLabel,
        review_version: DECISION_REVIEW_VERSION,
        review_cache_key: reviewCacheKey,
        canonical_result_hash: canonicalResultHash,
        input_hash: canonicalResultHash,
        status: 'unavailable',
        error_code: outcome.reason,
        error_detail: outcome.detail,
      });

      log.info(`Decision review unavailable for analysis=${analysis_id}: ${outcome.reason}`);
      return jsonResponse({ status: 'unavailable', reason: outcome.reason, detail: outcome.detail }, 200, corsHeaders);
    }

    const review = outcome.review;
    const { data: inserted, error: insertError } = await adminClient
      .from('decision_reviews')
      .insert({
        analysis_id,
        user_id: userId,
        provider,
        provider_model: review.providerModel,
        review_version: review.schemaVersion,
        review_cache_key: reviewCacheKey,
        canonical_result_hash: canonicalResultHash,
        input_hash: review.inputHash,
        output_hash: review.outputHash,
        status: 'completed',
        decision_state: review.recommendedState,
        evidence_sufficiency: review.evidenceSufficiency,
        material_contradiction: review.materialContradiction,
        human_review_required: review.humanReviewRequired,
        critical_assumption_state: review.criticalAssumptionSupported,
        rationale: review.rationale,
        review_payload: review,
        latency_ms: review.latencyMs,
        provider_cost_usd: review.costUsd,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      log.error('Failed to persist decision review:', insertError);
    }

    await logDecisionReviewEvent(adminClient, {
      event: 'decision_review_completed',
      userId,
      analysisId: analysis_id,
      provider,
      latencyMs: review.latencyMs,
      ok: true,
      costUsd: review.costUsd,
    });

    log.info(`Decision review completed for analysis=${analysis_id}: ${review.recommendedState}`);
    return jsonResponse({ cached: false, review: inserted ?? review }, 200, corsHeaders);
  } catch (error) {
    log.error('review-decision error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500, corsHeadersFor(req));
  }
});
