// Truth audit 2026-10-23: public copy and report output must not name data
// sources Quantis never ingests, nor carry unbacked value claims.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('public claims truth', () => {
  it('analysis report data_sources names only real inputs', () => {
    const src = read('supabase/functions/analyze-business/index.ts');
    const block = src.slice(src.indexOf('data_sources: ['), src.indexOf('...documents', src.indexOf('data_sources: [')));
    for (const bad of ['IBISWorld', 'Bureau of Labor Statistics', 'Small Business Administration', 'GAAP', 'Verified sample']) {
      expect(block).not.toContain(bad);
    }
    expect(block).toContain('BENCHMARK_SOURCES_DISPLAY');
  });

  it('LLM prompt forbids inventing named-source citations', () => {
    const p = read('supabase/functions/_shared/prompts.ts');
    expect(p).not.toContain('"per IBISWorld"');
    expect(p).toContain('[ESTIMATE]');
  });

  it.each([
    'src/pages/vs/vsData.ts', 'src/pages/vs/VsComparePage.tsx', 'src/components/landing/PricingCard.tsx',
    'src/components/landing/PricingSection.tsx', 'src/pages/Pricing.tsx', 'src/config/tiers.ts', 'src/pages/UseCases.tsx',
  ])('%s carries no unbacked claims', (file) => {
    const s = read(file);
    for (const bad of [/cited sources?/i, /SBA \/ IBISWorld/, /Worth \$2,000\+/, /1\/200th/, /any PDF or Excel/]) {
      expect(s).not.toMatch(bad);
    }
  });

  it("report shows flagged inputs next to reconciliation and claims no real-time calibration", () => {
    const r = read('src/components/analysis/AccuracyTransparentResults.tsx');
    expect(r).not.toMatch(/real-time calibration/);
    expect(r).toContain('<ReconciliationPassLabel flagged=');
    expect(r).toContain("inputs'} to check");
  });
});
