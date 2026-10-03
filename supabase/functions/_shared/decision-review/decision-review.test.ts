/**
 * Run: deno test --allow-env supabase/functions/_shared/decision-review/decision-review.test.ts
 *
 * Covers contract §22's required unit coverage: packet builder, hash/
 * idempotency, consensus-irrelevant failure semantics, and PII
 * minimization — plus the fixture provider's deterministic outcomes
 * (agreement / disagreement / insufficient evidence / contradiction /
 * timeout / rate-limited / malformed), standing in for the JEV contract
 * tests that need a real vendor response to run against the live API.
 */
import assertMod from 'node:assert/strict';
const assert = (cond: unknown, msg?: string) => assertMod(Boolean(cond), msg);
const assertEquals = (a: unknown, b: unknown, msg?: string) => assertMod.deepStrictEqual(a, b, msg);
const assertNotEquals = (a: unknown, b: unknown, msg?: string) => assertMod.notDeepStrictEqual(a, b, msg);
import { buildDecisionPacket, extractMetrics } from './packet-builder.ts';
import { computeCanonicalResultHash, computeEvidenceHash, computeReviewCacheKey } from './hashes.ts';
import { QuantisInternalTestProvider } from './quantis-internal-test-provider.ts';
import { DECISION_PACKET_SCHEMA_VERSION } from './contracts.ts';

const SAMPLE_RESULT = {
  metadata: { idea: 'A second coffee shop location downtown', location: '123 Main St, Springfield', generated_at: '2026-01-01' },
  financial_analysis: {
    mrr: 18000,
    scenarios: {
      pessimistic: { net_profit: -500, mrr: 14000 },
      base: { net_profit: 1200, mrr: 18000 },
      optimistic: { net_profit: 4000, mrr: 22000 },
    },
    unit_economics: { contribution_margin: 5, contribution_margin_ratio: 0.4, cac: 120, cac_payback_months: 3, ltv: 900, ltv_cac_ratio: 7.5 },
    breakeven: { breakeven_units: 1000, breakeven_revenue: 15000, breakeven_months: 8 },
    returns: { payback_period_months: 14 },
    startup_investment: { total: 85000, breakdown: {}, reasoning: 'x' },
  },
  actionable_insights: {
    summary: {},
    insights: [
      { id: 'a1', metric_name: 'expected_customers', current_value: 214, target_value: 287, gap: 73, priority: 'critical', status: 'danger', headline: 'Monthly customers below decision threshold' },
      { id: 'a2', metric_name: 'cac', current_value: 120, target_value: 90, gap: 30, priority: 'low', status: 'warning', headline: 'CAC slightly elevated' },
    ],
    generated_at: '2026-01-01',
  },
  confidence_score: 72,
  data_sources: ['benchmark_v2', 'rvce_web_evidence'],
  limitations: [],
  sanity_flags: [],
};

Deno.test('packet builder: extracts canonical metrics with correct units', () => {
  const metrics = extractMetrics(SAMPLE_RESULT.financial_analysis);
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m]));
  assertEquals(byKey.mrr.value, 18000);
  assertEquals(byKey.mrr.unit, 'usd_per_month');
  assertEquals(byKey.net_profit_monthly.value, 1200);
  assertEquals(byKey.ltv_cac_ratio.value, 7.5);
  assertEquals(byKey.startup_investment_total.value, 85000);
});

Deno.test('packet builder: never includes email, name, or location', async () => {
  const hash = await computeCanonicalResultHash('analysis-1', extractMetrics(SAMPLE_RESULT.financial_analysis));
  const packet = buildDecisionPacket({ canonicalResultHash: hash, result: SAMPLE_RESULT });
  const serialized = JSON.stringify(packet);
  assert(!serialized.includes('Main St'), 'location must not be sent to the reviewer');
  assert(!serialized.includes('@'), 'no email-shaped string should appear in the packet');
  assertEquals(packet.decision.description, SAMPLE_RESULT.metadata.idea);
});

Deno.test('packet builder: never sends the Quantis verdict (no verdict/recommendation field exists on the packet type)', async () => {
  const hash = await computeCanonicalResultHash('analysis-1', extractMetrics(SAMPLE_RESULT.financial_analysis));
  const packet = buildDecisionPacket({ canonicalResultHash: hash, result: SAMPLE_RESULT });
  // deno-lint-ignore no-explicit-any
  const anyPacket = packet as any;
  assertEquals(anyPacket.verdict, undefined);
  assertEquals(anyPacket.recommendation, undefined);
  assertEquals(packet.schemaVersion, DECISION_PACKET_SCHEMA_VERSION);
});

Deno.test('packet builder: critical assumptions prefer actionable_insights sorted by priority', async () => {
  const hash = await computeCanonicalResultHash('analysis-1', extractMetrics(SAMPLE_RESULT.financial_analysis));
  const packet = buildDecisionPacket({ canonicalResultHash: hash, result: SAMPLE_RESULT });
  assertEquals(packet.criticalAssumptions[0]?.key, 'expected_customers');
});

Deno.test('hashing: identical canonical inputs produce identical hashes (idempotency key stability)', async () => {
  const metrics = extractMetrics(SAMPLE_RESULT.financial_analysis);
  const h1 = await computeCanonicalResultHash('analysis-1', metrics);
  const h2 = await computeCanonicalResultHash('analysis-1', metrics);
  assertEquals(h1, h2);

  const evidenceHash = await computeEvidenceHash([]);
  const key1 = await computeReviewCacheKey({ canonicalResultHash: h1, evidenceHash, reviewVersion: '1.0', reviewerModel: 'fixture-v1' });
  const key2 = await computeReviewCacheKey({ canonicalResultHash: h2, evidenceHash, reviewVersion: '1.0', reviewerModel: 'fixture-v1' });
  assertEquals(key1, key2);
});

Deno.test('hashing: a changed canonical metric produces a different cache key (new assumption => new review permitted)', async () => {
  const metricsBefore = extractMetrics(SAMPLE_RESULT.financial_analysis);
  const metricsAfter = extractMetrics({ ...SAMPLE_RESULT.financial_analysis, mrr: 19000 });
  const hBefore = await computeCanonicalResultHash('analysis-1', metricsBefore);
  const hAfter = await computeCanonicalResultHash('analysis-1', metricsAfter);
  assertNotEquals(hBefore, hAfter);
});

Deno.test('fixture provider: agree', async () => {
  const provider = new QuantisInternalTestProvider({ kind: 'agree' });
  const hash = await computeCanonicalResultHash('analysis-1', extractMetrics(SAMPLE_RESULT.financial_analysis));
  const packet = buildDecisionPacket({ canonicalResultHash: hash, result: SAMPLE_RESULT });
  const outcome = await provider.review(packet);
  assert(outcome.status === 'completed');
  if (outcome.status === 'completed') {
    assertEquals(outcome.review.recommendedState, 'proceed');
  }
});

Deno.test('fixture provider: disagreement, insufficient evidence, contradiction, and failure modes are all distinct', async () => {
  const hash = await computeCanonicalResultHash('analysis-1', extractMetrics(SAMPLE_RESULT.financial_analysis));
  const packet = buildDecisionPacket({ canonicalResultHash: hash, result: SAMPLE_RESULT });

  const disagree = await new QuantisInternalTestProvider({ kind: 'disagree' }).review(packet);
  assert(disagree.status === 'completed' && disagree.review.recommendedState === 'do_not_proceed');

  const insufficient = await new QuantisInternalTestProvider({ kind: 'insufficient_evidence' }).review(packet);
  assert(insufficient.status === 'completed' && insufficient.review.evidenceSufficiency === 'insufficient');

  const contradiction = await new QuantisInternalTestProvider({ kind: 'material_contradiction' }).review(packet);
  assert(contradiction.status === 'completed' && contradiction.review.materialContradiction === 'yes');

  const timeout = await new QuantisInternalTestProvider({ kind: 'timeout' }).review(packet);
  assertEquals(timeout.status, 'unavailable');
  assert(timeout.status === 'unavailable' && timeout.reason === 'timeout');

  const rateLimited = await new QuantisInternalTestProvider({ kind: 'rate_limited' }).review(packet);
  assert(rateLimited.status === 'unavailable' && rateLimited.reason === 'rate_limited');

  const malformed = await new QuantisInternalTestProvider({ kind: 'malformed' }).review(packet);
  assert(malformed.status === 'unavailable' && malformed.reason === 'invalid_response');
});

Deno.test('financial non-interference: building a packet and reviewing it never mutates the input result object', async () => {
  const before = JSON.stringify(SAMPLE_RESULT);
  const hash = await computeCanonicalResultHash('analysis-1', extractMetrics(SAMPLE_RESULT.financial_analysis));
  const packet = buildDecisionPacket({ canonicalResultHash: hash, result: SAMPLE_RESULT });
  await new QuantisInternalTestProvider({ kind: 'agree' }).review(packet);
  const after = JSON.stringify(SAMPLE_RESULT);
  assertEquals(before, after, 'canonical result must be byte-for-byte unchanged after a review');
});
