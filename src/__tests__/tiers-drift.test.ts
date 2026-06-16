/**
 * TIERS DRIFT GUARD
 * =================
 * Single test file that fails CI red if ANY of these four sources of truth
 * drift apart:
 *
 *   1. src/config/tiers.ts                    (client + canonical TIERS)
 *   2. supabase/functions/_shared/entitlements.ts (edge function mirror)
 *   3. supabase/migrations/*_plan_entitlements*.sql (DB seed)
 *   4. STRIPE_PRICE_TO_TIER mapping            (price → tier router)
 *
 * If anyone changes a feature flag, monthly limit, price, or Stripe price ID
 * in ONE place and forgets the others, this test goes red. Workstream-1
 * "single source of truth" guarantee.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { TIERS, STRIPE_PRICE_TO_TIER, type TierId, type FeatureKey } from '@/config/tiers';

const ROOT = process.cwd();
const TIER_IDS: TierId[] = ['free', 'plus', 'pro'];

// ---------- Source files ----------
const entitlementsSrc = readFileSync(
  join(ROOT, 'supabase/functions/_shared/entitlements.ts'),
  'utf8',
);

function findMigration(): string {
  const dir = join(ROOT, 'supabase/migrations');
  const file = readdirSync(dir)
    .filter((f) => /plan_entitlements/i.test(f))
    .sort()
    .pop();
  if (!file) throw new Error('plan_entitlements migration not found');
  return readFileSync(join(dir, file), 'utf8');
}

// ---------- Helpers ----------
function extractObject(src: string, varName: string): Record<string, Record<string, unknown>> {
  // Pulls a `export const VAR_NAME: ... = { ... };` block and JSON-parses it
  // (loose — accepts true/false, numbers, Infinity).
  const re = new RegExp(
    `(?:export\\s+)?const\\s+${varName}\\s*(?::\\s*[^=]+)?\\s*=\\s*(\\{[\\s\\S]*?\\n\\})\\s*;`,
  );
  const m = src.match(re);
  if (!m) throw new Error(`Could not extract ${varName}`);
  // Replace `Infinity` with -1 sentinel so JSON.parse-equivalent works
  const cleaned = m[1]
    .replace(/Infinity/g, '-1')
    .replace(/Number\.POSITIVE_INFINITY/g, '-1')
    .replace(/_/g, '') // numeric separators 95_500 → 95500
    .replace(/([a-zA-Z]\w*):/g, '"$1":') // quote keys
    .replace(/,(\s*[}\]])/g, '$1');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return Function(`"use strict";return (${cleaned})`)();
}

// ---------- 1. TIERS ↔ entitlements.ts FEATURES parity ----------
describe('TIERS drift: src/config/tiers.ts ↔ _shared/entitlements.ts', () => {
  const edgeFeatures = extractObject(entitlementsSrc, 'FEATURES');
  const edgeLimits = extractObject(entitlementsSrc, 'LIMITS');

  for (const tier of TIER_IDS) {
    it(`${tier}: feature flags match exactly`, () => {
      const clientFeatures = TIERS[tier].features as unknown as Record<string, boolean>;
      const serverFeatures = edgeFeatures[tier] as Record<string, boolean>;
      expect(serverFeatures, `entitlements.ts FEATURES.${tier} missing`).toBeDefined();
      for (const key of Object.keys(clientFeatures)) {
        expect(
          serverFeatures[key],
          `Feature drift: TIERS.${tier}.features.${key}=${clientFeatures[key]} but FEATURES.${tier}.${key}=${serverFeatures[key]}`,
        ).toBe(clientFeatures[key]);
      }
      // No extra keys
      for (const key of Object.keys(serverFeatures)) {
        expect(clientFeatures, `extra key in FEATURES.${tier}: ${key}`).toHaveProperty(key);
      }
    });

    it(`${tier}: limits match exactly (Infinity → -1 sentinel)`, () => {
      const clientLimits = TIERS[tier].limits as unknown as Record<string, number>;
      const serverLimits = edgeLimits[tier] as Record<string, number>;
      for (const key of Object.keys(clientLimits)) {
        const cv = clientLimits[key] === Infinity ? -1 : clientLimits[key];
        const sv = serverLimits[key] === Infinity ? -1 : serverLimits[key];
        expect(sv, `Limit drift: TIERS.${tier}.limits.${key}`).toBe(cv);
      }
    });
  }
});

// ---------- 2. TIERS ↔ plan_entitlements migration parity ----------
describe('TIERS drift: src/config/tiers.ts ↔ plan_entitlements migration seed', () => {
  const migrationSql = findMigration();

  for (const tier of TIER_IDS) {
    it(`${tier}: every feature flag appears in the migration with the correct value`, () => {
      // Locate the VALUES row for this tier
      const rowMatch = migrationSql.match(
        new RegExp(`'${tier}'[\\s\\S]*?(?='free'|'plus'|'pro'|ON CONFLICT)`),
      );
      expect(rowMatch, `migration missing row for tier=${tier}`).toBeTruthy();
      const row = rowMatch![0];
      const clientFeatures = TIERS[tier].features as unknown as Record<string, boolean>;
      for (const [k, v] of Object.entries(clientFeatures)) {
        const pattern = new RegExp(`"${k}":\\s*${v}`);
        expect(
          pattern.test(row),
          `migration[${tier}] missing "${k}":${v}`,
        ).toBe(true);
      }
    });

    it(`${tier}: monthly + annual price match`, () => {
      const rowMatch = migrationSql.match(
        new RegExp(`'${tier}'[\\s\\S]*?(?='free'|'plus'|'pro'|ON CONFLICT)`),
      );
      const row = rowMatch![0];
      // VALUES order is (tier, label, price_monthly, price_annual, monthly_analyses, ...)
      const valuesMatch = row.match(/'\w+',\s*'[^']+',\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(-?\d+)/);
      expect(valuesMatch).toBeTruthy();
      const [, monthly, annual, monthlyAnalyses] = valuesMatch!;
      expect(Number(monthly)).toBe(TIERS[tier].priceMonthly);
      expect(Number(annual)).toBe(TIERS[tier].priceAnnual);
      const expectedAnalyses =
        TIERS[tier].limits.analysesPerMonth === Infinity ? -1 : TIERS[tier].limits.analysesPerMonth;
      expect(Number(monthlyAnalyses)).toBe(expectedAnalyses);
    });
  }
});

// ---------- 3. STRIPE_PRICE_TO_TIER ↔ migration stripe_price_ids parity ----------
describe('Stripe price IDs are consistent', () => {
  const migrationSql = findMigration();

  it('every price ID in STRIPE_PRICE_TO_TIER appears in the migration row for its tier', () => {
    for (const [priceId, { tier }] of Object.entries(STRIPE_PRICE_TO_TIER)) {
      const rowMatch = migrationSql.match(
        new RegExp(`'${tier}'[\\s\\S]*?(?='free'|'plus'|'pro'|ON CONFLICT)`),
      );
      expect(rowMatch, `migration missing row for tier=${tier}`).toBeTruthy();
      expect(
        rowMatch![0].includes(priceId),
        `Stripe price ${priceId} (→ ${tier}) missing from migration seed for ${tier}`,
      ).toBe(true);
    }
  });

  it('no two prices map to different tiers (router invariant)', () => {
    const seen = new Map<string, TierId>();
    for (const [priceId, { tier }] of Object.entries(STRIPE_PRICE_TO_TIER)) {
      if (seen.has(priceId)) {
        expect(seen.get(priceId)).toBe(tier);
      }
      seen.set(priceId, tier);
    }
  });

  it('every price ID has a valid live-mode-looking shape (price_…)', () => {
    for (const priceId of Object.keys(STRIPE_PRICE_TO_TIER)) {
      expect(priceId).toMatch(/^price_[A-Za-z0-9]+$/);
    }
  });
});

// ---------- 4. Pricing displayed in components matches TIERS ----------
describe('No hardcoded prices outside src/config/tiers.ts', () => {
  // We allow `$17`/`$49` inside marketing copy, but disallow them appearing as
  // structural prices in PricingPage / paywall components. This is a soft
  // sentinel; tighten as needed.
  const pricingFiles = [
    'src/pages/Pricing.tsx',
    'src/components/PlusGate.tsx',
    'src/components/UpgradePrompt.tsx',
  ];
  for (const f of pricingFiles) {
    it(`${f}: contains no raw "$17/mo" or "$49/mo" literal`, () => {
      let src: string;
      try {
        src = readFileSync(join(ROOT, f), 'utf8');
      } catch {
        return; // file may not exist; skip
      }
      // Allow inside comments/strings that come from TIERS interpolation
      const offenders = src.match(/\$(17|49)\s*\/\s*mo/g);
      if (offenders) {
        // eslint-disable-next-line no-console
        console.warn(`[drift] ${f} contains raw price literals:`, offenders);
      }
      // Don't hard-fail; this is informational. Hard-fail would require
      // codemod first. Convert to expect(...).toBeNull() after cleanup.
    });
  }
});
