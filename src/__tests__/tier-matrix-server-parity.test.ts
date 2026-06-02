/**
 * SERVER PARITY TEST — Step 2 of the production tier audit.
 *
 * Edge functions cannot import `src/config/tiers.ts`, so the tier matrix is
 * mirrored in `supabase/functions/_shared/entitlements.ts`. This test parses
 * the edge file as text at vitest time and asserts EVERY (tier, feature) and
 * (tier, limit) value matches the client manifest.
 *
 * If anyone edits one side without the other, this test fails and CI blocks.
 * Catches the entire class of "Plus user got Pro feature" / "Pro user got
 * paywalled" bugs at the source.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TIERS, type TierId } from '@/config/tiers';

const ENTITLEMENTS_PATH = resolve(__dirname, '../../supabase/functions/_shared/entitlements.ts');

function loadServerSource(): string {
  return readFileSync(ENTITLEMENTS_PATH, 'utf8');
}

/**
 * Extract a Record<TierId, Record<string, boolean | number>> literal that the
 * server file declares as `const FEATURES` / `const LIMITS`. We deliberately
 * parse instead of importing to avoid Deno-only syntax (npm: / esm.sh:) that
 * blows up under vitest+jsdom.
 */
function extractRecord(
  source: string,
  identifier: 'FEATURES' | 'LIMITS',
): Record<TierId, Record<string, boolean | number>> {
  // Match: const FEATURES: Record<...> = { ... };
  // Block ends at first line containing only "};"
  const re = new RegExp(
    `const\\s+${identifier}\\s*:[^=]*=\\s*(\\{[\\s\\S]*?^\\};)`,
    'm',
  );
  const match = source.match(re);
  if (!match) throw new Error(`Could not find ${identifier} block in entitlements.ts`);

  // Strip trailing semicolon, replace `Infinity` literal with Number.POSITIVE_INFINITY
  // so the JS evaluator handles it, then eval as an expression in a sandboxed Function.
  const literal = match[1]
    .replace(/;$/, '')
    .replace(/\bInfinity\b/g, 'Number.POSITIVE_INFINITY')
    .replace(/(\d)_(\d)/g, '$1$2'); // 95_500 → 95500

  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const evaluated = new Function(`return (${literal});`)();
  return evaluated as Record<TierId, Record<string, boolean | number>>;
}

describe('Tier matrix server↔client parity (entitlements.ts ↔ tiers.ts)', () => {
  const source = loadServerSource();
  const serverFeatures = extractRecord(source, 'FEATURES');
  const serverLimits = extractRecord(source, 'LIMITS');

  const tiers: TierId[] = ['free', 'plus', 'pro'];

  for (const tier of tiers) {
    const clientFeatures = TIERS[tier].features;
    const clientLimits = TIERS[tier].limits;

    describe(`tier=${tier}`, () => {
      it('every server-enforced feature key exists in the client config', () => {
        // The client (config/tiers.ts) may declare additional cosmetic/UX-only
        // feature flags (e.g. sampleSharingEnabled, teamWorkspace) that have no
        // server-side gate in entitlements.ts. We only assert that every key the
        // server enforces is also present on the client — a superset check, not
        // an exact equality check.
        const serverKeys = Object.keys(serverFeatures[tier]);
        const clientKeys = new Set(Object.keys(clientFeatures));
        for (const key of serverKeys) {
          expect(clientKeys.has(key), `server feature '${key}' not found in client config`).toBe(true);
        }
      });

      it('declares the exact same limit keys on both sides', () => {
        expect(Object.keys(serverLimits[tier]).sort()).toEqual(
          Object.keys(clientLimits).sort(),
        );
      });

      for (const key of Object.keys(clientFeatures) as Array<keyof typeof clientFeatures>) {
        it(`feature '${key}' matches server value`, () => {
          expect(serverFeatures[tier][key as string]).toBe(clientFeatures[key]);
        });
      }

      for (const key of Object.keys(clientLimits) as Array<keyof typeof clientLimits>) {
        it(`limit '${key}' matches server value`, () => {
          // Number.POSITIVE_INFINITY equality is fine; use toBe.
          expect(serverLimits[tier][key as string]).toBe(clientLimits[key]);
        });
      }
    });
  }

  it('every tier listed in client is also in server', () => {
    expect(Object.keys(serverFeatures).sort()).toEqual(tiers.slice().sort());
    expect(Object.keys(serverLimits).sort()).toEqual(tiers.slice().sort());
  });
});
