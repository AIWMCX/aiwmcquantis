/**
 * Trust-killer regression lock, 2026-08-02.
 *
 * payback-display-no-sentinel-leak.test.ts locks formatPaybackDisplay()'s
 * OWN behavior and its doc comment claims a fixed list of files "confirmed
 * by grep" to route through it. That list went stale: a live production
 * screenshot showed "Payback: 999 mo." in AnalysisHistory.tsx (fixed), and
 * a follow-up manual audit of every payback/cac_payback render site found
 * FIVE MORE real leaks the static comment never covered — BeatMissEngine.tsx,
 * CompetitiveMatrix.tsx, KeyMetricSpotlight.tsx, ScenarioComparison.tsx, and
 * ScenarioLibrary.tsx all built their own ad-hoc "${value} mo" / "Mo.${value}"
 * string next to a raw payback_period_months/cac_payback_months read,
 * independent of formatPaybackDisplay, and all rendered the literal
 * sentinel (999) or a falsely-precise "0 mo" for unprofitable businesses.
 *
 * A static file list cannot prevent the NEXT component from making the same
 * mistake. This test instead LIVE-SCANS the actual source tree on every
 * run: any .tsx file under src/components or src/pages that reads a
 * payback-sentinel-bearing field must also contain a recognized guard
 * (formatPaybackDisplay, or an explicit >=999/>24/>18 threshold check —
 * the two patterns every currently-safe file in the codebase actually
 * uses). A future file that reads the field with no guard fails this test
 * immediately, in CI, before it ever reaches production — not months later
 * in a customer's screenshot.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SCAN_ROOTS = ['src/components', 'src/pages'];
const REPO_ROOT = join(__dirname, '..', '..');

const SENTINEL_FIELD_PATTERN = /\.(payback_period_months|cac_payback_months)\b|getPaybackMonths\(/;

const SAFE_GUARD_PATTERNS = [
  /formatPaybackDisplay/,
  /[<>]=?\s*999/,
  /[<>]=?\s*24/,
  /[<>]=?\s*18/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === 'node_modules') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('no future component may render a payback sentinel unguarded (live scan, not a static list)', () => {
  const files = SCAN_ROOTS.flatMap((root) => walk(join(REPO_ROOT, root)));
  expect(files.length).toBeGreaterThan(50); // sanity: scan actually found the tree

  const filesReadingRawField = files.filter((f) => SENTINEL_FIELD_PATTERN.test(readFileSync(f, 'utf-8')));
  expect(filesReadingRawField.length).toBeGreaterThan(0); // sanity: pattern actually matches known files

  for (const file of filesReadingRawField) {
    it(`${file.slice(REPO_ROOT.length + 1)} guards its payback/cac_payback read`, () => {
      const source = readFileSync(file, 'utf-8');
      const hasGuard = SAFE_GUARD_PATTERNS.some((p) => p.test(source));
      expect(
        hasGuard,
        `${file} reads a payback-sentinel-bearing field (payback_period_months / ` +
          `cac_payback_months / getPaybackMonths) but contains no recognized guard ` +
          `(formatPaybackDisplay, or an explicit >=999/>24/>18 threshold check). ` +
          `This is exactly how "999" leaked into production before — fix the render ` +
          `site, don't add a new guard pattern to this list without confirming it ` +
          `actually excludes 999.`,
      ).toBe(true);
    });
  }
});
