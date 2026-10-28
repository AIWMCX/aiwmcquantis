import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('quick wins 2026-10-25', () => {
  it('changelog is current, so the product does not look abandoned', () => {
    const src = readFileSync('src/pages/Changelog.tsx', 'utf8');
    const first = /date: '([^']+)'/.exec(src)?.[1];
    expect(first).toBe('October 25, 2026');
  });

  it('How It Works example output is labelled and matches /examples', () => {
    const src = readFileSync('src/pages/HowItWorks.tsx', 'utf8');
    expect(src).toContain("example: 'Illustrative (Denver coffee shop example): $4,200/mo profit, 12 months payback'");
    expect(src).not.toContain('168% ROI');
    const ex = readFileSync('src/pages/examples/exampleData.ts', 'utf8');
    const denver = ex.slice(ex.indexOf('Coffee Shop in Denver'), ex.indexOf('Coffee Shop in Denver') + 3000);
    expect(denver).toContain("monthlyProfit: '$4,200'");
    expect(denver).toContain("paybackMonths: '12 months'");
    // #80 (2026-10-27): hand-typed ROI removed; the page derives it from these numbers.
    expect(denver).not.toContain("roi: '");
  });

  it('a result without a city says its costs are US averages', () => {
    const src = readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8');
    expect(src).toContain('data-testid="no-city-note"');
    expect(src).toContain("(!location || location === 'Global')");
  });
});
