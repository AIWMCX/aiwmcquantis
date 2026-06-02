/**
 * Tier matrix end-to-end test (FREE × PLUS × PRO).
 *
 * Verifies that the SAME source-of-truth (`src/lib/tier-spec.ts`) governs both:
 *  - UI gating decisions (`hasFeature`, `evaluateGate.blocked`)
 *  - Backend enforcement envelopes (HTTP 402 body shape: error code, required_tier, cta)
 *
 * Every (tier × feature) and (tier × endpoint) combination is covered. If
 * anyone changes a row in the manifest without updating both surfaces, this
 * test fails and the build blocks.
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateGate,
  hasFeature,
  ENDPOINTS,
  FEATURE_MANIFEST,
  FEATURE_TIER_REQUIREMENT,
  type FeatureKey,
  type Tier,
} from '@/lib/tier-spec';

const TIERS: Tier[] = ['FREE', 'PLUS', 'PRO'];

const FEATURES: FeatureKey[] = [
  'unlimited_analyses',
  'monte_carlo',
  'pnl_36_month',
  'action_plan',
  'pre_mortem',
  'capacity_check',
  'document_studio',
  'clean_pdf_export',
  'ai_doc_intelligence',
  'history',
  'five_year_model',
  'tam_sam_som',
  'pitch_deck_data',
  'strategic_roadmap',
  'white_label',
  'team_seats',
  'api_access',
];

// Expected matrix: which tiers can access which features.
// Spec §8.1: FREE has no premium features; PLUS has PLUS-tier features;
// PRO inherits all PLUS features and adds PRO-tier features.
const EXPECTED_FEATURE_ACCESS: Record<Tier, Record<FeatureKey, boolean>> = {
  FREE: Object.fromEntries(FEATURES.map((f) => [f, false])) as Record<FeatureKey, boolean>,
  PLUS: Object.fromEntries(
    FEATURES.map((f) => [f, FEATURE_TIER_REQUIREMENT[f] === 'PLUS']),
  ) as Record<FeatureKey, boolean>,
  PRO: Object.fromEntries(FEATURES.map((f) => [f, true])) as Record<FeatureKey, boolean>,
};

describe('Tier matrix — feature access (UI + backend share this logic)', () => {
  for (const tier of TIERS) {
    for (const feature of FEATURES) {
      const expected = EXPECTED_FEATURE_ACCESS[tier][feature];
      it(`${tier} ${expected ? 'CAN' : 'CANNOT'} access ${feature}`, () => {
        expect(hasFeature(tier, feature)).toBe(expected);
      });
    }
  }
});

describe('Tier matrix — endpoint gating (backend 402 enforcement)', () => {
  // (endpoint, allowed-by-tier) — derived from FEATURE_MANIFEST so the test
  // breaks if the manifest changes. We then assert evaluateGate agrees.
  for (const tier of TIERS) {
    const manifest = FEATURE_MANIFEST[tier];

    for (const endpoint of Object.values(ENDPOINTS)) {
      const isAllowed = manifest.allowed_endpoints.includes(endpoint);
      const isBlocked = manifest.blocked_endpoints.includes(endpoint);

      // Manifest invariant: every endpoint is either allowed or blocked, never both, never neither.
      it(`${tier} manifest: ${endpoint} is exactly one of allowed/blocked`, () => {
        expect(isAllowed !== isBlocked).toBe(true);
      });

      it(`${tier} → ${endpoint}: gate ${isAllowed ? 'ALLOWS' : 'BLOCKS'}`, () => {
        const result = evaluateGate({ tier, endpoint, monthlyAnalysesUsed: 0 });
        if (isAllowed) {
          expect(result.blocked).toBe(false);
        } else {
          expect(result.blocked).toBe(true);
          if (result.blocked) {
            // Canonical 402 envelope contract
            expect(result.status).toBe(402);
            expect(result.body.error).toBe('TIER_GATE');
            expect(result.body.required_tier).toMatch(/^(PLUS|PRO)$/);
            expect(result.body.upgrade_url).toMatch(/^https:\/\//);
            expect(typeof result.body.cta).toBe('string');
            expect(result.body.cta.length).toBeGreaterThan(0);
            // FREE→blocked must require at least PLUS; PLUS→blocked must require PRO.
            if (tier === 'PLUS') expect(result.body.required_tier).toBe('PRO');
          }
        }
      });
    }
  }
});

describe('Tier matrix — FREE quota gate on /api/analyse/main', () => {
  it('FREE under quota: ALLOWED', () => {
    const r = evaluateGate({
      tier: 'FREE',
      endpoint: ENDPOINTS.ANALYSE_MAIN,
      monthlyAnalysesUsed: 0,
    });
    expect(r.blocked).toBe(false);
  });

  it('FREE at quota (5 used): BLOCKED with QUOTA_EXCEEDED + resets_at', () => {
    const resets = '2026-05-01T00:00:00.000Z';
    const r = evaluateGate({
      tier: 'FREE',
      endpoint: ENDPOINTS.ANALYSE_MAIN,
      monthlyAnalysesUsed: 5,
      resetsAt: resets,
    });
    expect(r.blocked).toBe(true);
    if (r.blocked) {
      expect(r.status).toBe(402);
      expect(r.body.error).toBe('QUOTA_EXCEEDED');
      expect(r.body.required_tier).toBe('PLUS');
      expect(r.body.resets_at).toBe(resets);
    }
  });

  it('FREE under quota (4 used): ALLOWED', () => {
    const r = evaluateGate({
      tier: 'FREE',
      endpoint: ENDPOINTS.ANALYSE_MAIN,
      monthlyAnalysesUsed: 4,
    });
    expect(r.blocked).toBe(false);
  });

  it('PLUS at high usage: NEVER quota-blocked (unlimited)', () => {
    const r = evaluateGate({
      tier: 'PLUS',
      endpoint: ENDPOINTS.ANALYSE_MAIN,
      monthlyAnalysesUsed: 10_000,
    });
    expect(r.blocked).toBe(false);
  });

  it('PRO at high usage: NEVER quota-blocked (unlimited)', () => {
    const r = evaluateGate({
      tier: 'PRO',
      endpoint: ENDPOINTS.ANALYSE_MAIN,
      monthlyAnalysesUsed: 10_000,
    });
    expect(r.blocked).toBe(false);
  });
});

describe('Tier matrix — manifest invariants (regression catches)', () => {
  it('FREE: monthly_analysis_limit === 5', () => {
    expect(FEATURE_MANIFEST.FREE.monthly_analysis_limit).toBe(5);
  });

  it('PLUS + PRO: monthly_analysis_limit === Infinity', () => {
    expect(FEATURE_MANIFEST.PLUS.monthly_analysis_limit).toBe(Number.POSITIVE_INFINITY);
    expect(FEATURE_MANIFEST.PRO.monthly_analysis_limit).toBe(Number.POSITIVE_INFINITY);
  });

  it('Only PRO has api_access', () => {
    expect(FEATURE_MANIFEST.FREE.api_access).toBe(false);
    expect(FEATURE_MANIFEST.PLUS.api_access).toBe(false);
    expect(FEATURE_MANIFEST.PRO.api_access).toBe(true);
  });

  it('Only PRO has white_label', () => {
    expect(FEATURE_MANIFEST.FREE.white_label).toBe(false);
    expect(FEATURE_MANIFEST.PLUS.white_label).toBe(false);
    expect(FEATURE_MANIFEST.PRO.white_label).toBe(true);
  });

  it('Team seat counts match the product matrix', () => {
    expect(FEATURE_MANIFEST.FREE.team_seats).toBe(0);
    expect(FEATURE_MANIFEST.PLUS.team_seats).toBe(1);
    expect(FEATURE_MANIFEST.PRO.team_seats).toBe(5);
  });

  it('FREE shows watermark; PLUS/PRO do not', () => {
    expect(FEATURE_MANIFEST.FREE.watermark).toBe(true);
    expect(FEATURE_MANIFEST.PLUS.watermark).toBe(false);
    expect(FEATURE_MANIFEST.PRO.watermark).toBe(false);
  });

  it('Endpoint coverage: every ENDPOINTS entry appears in every tier manifest', () => {
    const allEndpoints = Object.values(ENDPOINTS);
    for (const tier of TIERS) {
      const m = FEATURE_MANIFEST[tier];
      const union = new Set([...m.allowed_endpoints, ...m.blocked_endpoints]);
      for (const ep of allEndpoints) {
        expect(union.has(ep), `${tier} missing ${ep}`).toBe(true);
      }
    }
  });
});
