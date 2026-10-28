import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { GEO_COEFFICIENTS } from '@/lib/geo-calibrator';
import { GEO_METRO_COUNT, BENCHMARK_DEFINITION } from '@/config/canonical-facts';
import { buildCitation, formatCitationCompact } from '@/lib/benchmark-citations';

// Live audit 2026-10-25. Each rule below is a claim the product made that the
// code cannot back. Comments in source may describe the old claim; rendered
// strings may not repeat it.
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === '__tests__' ? [] : walk(p)) : /\.(tsx?|json)$/.test(f) ? [p] : [];
  });
const codeLines = (p: string) =>
  readFileSync(p, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));

describe('truth pass 2026-10-25', () => {
  const files = walk('src');

  it('no rendered string cites CoStar (we hold no CoStar license)', () => {
    const hits = files.filter((p) => codeLines(p).some((l) => /CoStar/.test(l)));
    expect(hits).toEqual([]);
  });

  it('city coverage matches the geo table, never "50+ cities" as a product capability', () => {
    expect(GEO_COEFFICIENTS.length - 1).toBe(GEO_METRO_COUNT);
    const allowed = new Set(['src/pages/examples/ExamplesIndex.tsx']); // shows the example set's own computed city count (EXAMPLE_COUNTS)
    const hits = files.filter((p) => !allowed.has(p.replace(/\\/g, '/')) && codeLines(p).some((l) => /50\+ cities/.test(l)));
    expect(hits).toEqual([]);
  });

  it('benchmarks are described as modeled cells, not licensed observations', () => {
    expect(BENCHMARK_DEFINITION).not.toMatch(/licensed|observations/);
  });

  it('citations carry no third-party name or invented sample size', () => {
    const c = buildCitation({ industryType: 'coffee_shop', lastUpdated: '2025-02-01', source: 'ibisworld' } as never);
    expect(formatCitationCompact(c)).toBe('Quantis modeled benchmark · Q1 2025');
  });

  it('no "Used by … across 50+ cities" social proof exists', () => {
    expect(files.filter((p) => codeLines(p).some((l) => /Used by: early-stage founders/.test(l)))).toEqual([]);
  });
  it('the result header shows no fixed run time or AI-agreement score', () => {
    const page = readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8');
    expect(page).not.toContain('analysisTime={2.4}');
    expect(page).not.toMatch(/consensus_score \|\| 94/);
    const header = readFileSync('src/components/analysis/PersistentResultsHeader.tsx', 'utf8');
    expect(header).not.toMatch(/analysisTime = 2\.4|consensusScore = 94/);
  });
});
