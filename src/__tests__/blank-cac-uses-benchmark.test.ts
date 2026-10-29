import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { classifyAssumptionOrigins } from '../../supabase/functions/_shared/assumption-origin';

// 2026-10-29 live run: a blank CAC took the AI's estimate (~$4,400 for a
// 12-client bookkeeping firm), so acquisition spend exceeded revenue and the
// same inputs gave different numbers per run. Blank CAC = industry benchmark.
describe('blank CAC uses the industry benchmark, never the AI estimate', () => {
  it('engine input chain skips fa.cac / mp.cac', () => {
    const src = readFileSync('supabase/functions/analyze-business/index.ts', 'utf8');
    expect(src).toMatch(/const rawCac = userInputs\?\.cac \?\? benchmarks\.cac_typical;/);
    expect(src).not.toMatch(/const rawCac = [^\n]*fa\.cac/);
  });

  it('assumption register labels it a benchmark even when the AI produced a CAC', () => {
    const base = {
      fa: { cac: 4400 },
      mp: { cac: 3900 },
      benchmarks: { cac_typical: 400, cac_min: 100, cac_max: 1000, average_check_min: 500, average_check_max: 5000 },
      locationMultipliers: { confidence: 60 },
      subIndustry: null,
    } as unknown as Parameters<typeof classifyAssumptionOrigins>[0];
    expect(classifyAssumptionOrigins({ ...base, userInputs: {} }).cac.origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(classifyAssumptionOrigins({ ...base, userInputs: { cac: 250 } }).cac.origin).toBe('USER_ACTUAL');
    expect(classifyAssumptionOrigins({ ...base, userInputs: { cac: 0 } }).cac.origin).toBe('USER_ACTUAL');
  });
});

describe('required financial fields never say "leave it blank"', () => {
  it('capital, price and customers are marked required; the field shows Required instead', () => {
    const step = readFileSync('src/components/analysis/steps/FinancialsStep.tsx', 'utf8');
    for (const key of ['startup_investment', 'average_price', 'expected_customers']) {
      expect(step.includes(`updateField('${key}', v)} required`)).toBe(true);
    }
    const field = readFileSync('src/components/analysis/steps/FinancialField.tsx', 'utf8');
    expect(field).toMatch(/!hasValue && required &&/);
    expect(field).toMatch(/!hasValue && !required && benchmarkMin/);
  });
});
