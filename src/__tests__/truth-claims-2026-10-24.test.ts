import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

// Claims found on the live site 2026-10-24 that the product does not do:
// - the Monte Carlo simulates revenue and costs only (src/lib/profit-range.ts), not 12 variables;
// - a second model reviews a run only when rule-based red flags trigger (hybrid-validator.ts);
// - /examples are hand-written illustrative reports, not real analyses.
const FILES = [
  'src/components/landing/ReportFirstHero.tsx',
  'src/components/landing/HeroSingleInput.tsx',
  'src/data/sampleReport.ts',
  'src/components/layout/ExploreMoreGrid.tsx',
  'src/pages/examples/ExamplesIndex.tsx',
  'src/pages/vs/vsData.ts',
];

describe('truth pass 2026-10-24', () => {
  it.each(FILES)('%s makes none of the retired claims', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/12-variable Monte Carlo|Monte Carlo \(12 variables|P10\/P50\/P90 across 12 variables/);
    expect(src).not.toContain('Multi-model cross-checked');
    expect(src).not.toContain('Cross-validating with second AI model');
    expect(src).not.toMatch(/real analyses across|Real financial reports/);
  });

  it('example breadcrumbs use the canonical www host', () => {
    for (const f of ['src/pages/examples/ExamplesIndex.tsx', 'src/pages/examples/ExampleAnalysis.tsx']) {
      expect(read(f)).not.toContain('"https://aiwmcquantis.com');
    }
  });

  it('the consultant comparison shows the full paid range from TIERS', () => {
    expect(read('src/components/landing/ValueAnchor.tsx')).toContain('$${TIERS.pro.priceMonthly}/mo');
  });
});
