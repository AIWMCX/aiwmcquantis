import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { whyTheseNumbers } from '@/lib/why-these-numbers';
import type { BusinessAnalysisResult } from '@/types/analysis';

const result = (fa: unknown) => ({ financial_analysis: fa } as unknown as BusinessAnalysisResult);

describe('"Why These Numbers?" rows', () => {
  it('uses the matched metro\'s own rent multiplier, never a fixed Denver value', () => {
    const ny = whyTheseNumbers(result({}), 'New York, NY')[0];
    const den = whyTheseNumbers(result({}), 'Denver, CO')[0];
    expect(ny.driver).toContain('New York');
    expect(ny.value).not.toBe(den.value);
    expect(den.value).toBe('×1.15');
  });

  it('says "no local adjustment" when the location is not in the table', () => {
    expect(whyTheseNumbers(result({}), 'Global')[0]).toMatchObject({ value: 'US average' });
  });

  it('omits values the report does not have instead of inventing defaults', () => {
    expect(whyTheseNumbers(result({}), 'Global')).toHaveLength(1);
    const full = whyTheseNumbers(result({ unit_economics: { cac: 120 }, scenarios: { base: { gross_margin: 0.6 } }, inputs: { churn_rate: 0.03 } }), 'Denver, CO');
    expect(full.map((r) => r.value)).toEqual(['×1.15', '$120', '60%', '3.0%']);
  });

  it('cites no data vendor we do not license', () => {
    expect(readFileSync('src/lib/why-these-numbers.ts', 'utf8').replace(/^.*CoStar 2025.*$/m, '')).not.toMatch(/source: '.*CoStar/);
    expect(readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8')).not.toContain('CoStar');
  });
});
