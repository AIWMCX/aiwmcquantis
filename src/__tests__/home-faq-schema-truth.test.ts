import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Truth pass 2026-10-25 (#316) removed "multi-model cross-checked" and the
// 12-variable Monte Carlo from visible copy, but the homepage FAQ JSON-LD and a
// comparison row still said them. Monte Carlo varies revenue (80-120%) and
// costs (90-115%) into a monthly profit range; it does not span 12 variables.
describe('homepage FAQ schema and vs rows say only what is true', () => {
  const landing = readFileSync('src/pages/Landing.tsx', 'utf8');
  const vs = readFileSync('src/pages/vs/vsData.ts', 'utf8');

  it('no multi-model consensus claim and no guaranteed outcome', () => {
    expect(landing).not.toMatch(/multi-model consensus|cross-checked by/i);
    expect(landing).not.toMatch(/guarantees losses/);
  });

  it('no Monte Carlo range "across 12 financial variables"', () => {
    expect(landing).not.toMatch(/stress-tests 12 financial variables/);
    expect(vs).not.toMatch(/P10\/P50\/P90 across 12 financial variables/);
  });
});
