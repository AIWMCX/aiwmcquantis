import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXAMPLE_COUNTS, EXAMPLE_LIST } from '@/pages/examples/exampleData';

// SEO audit 2026-10-27: /examples claimed "50+ cities" (real: 44) and called
// illustrative examples "Real AI Reports". Copy now uses computed counts.
describe('/examples counts', () => {
  it('counts cities without online/remote examples', () => {
    expect(EXAMPLE_COUNTS.examples).toBe(EXAMPLE_LIST.length);
    expect(EXAMPLE_COUNTS.cities).toBeLessThan(EXAMPLE_LIST.length);
    expect(EXAMPLE_COUNTS.cities).toBe(new Set(EXAMPLE_LIST.map((e) => e.location).filter((l) => !/online|remote/i.test(l))).size);
  });

  it('page copy has no hard-coded counts or "real reports"', () => {
    const src = readFileSync('src/pages/examples/ExamplesIndex.tsx', 'utf8');
    expect(src).not.toMatch(/50\+|Real AI Reports/);
  });
});
