import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { payrollShareFlag } from '../../supabase/functions/analyze-business/financial-calculator';

// #59, live 2026-10-25: "1% payroll ratio" on $1.15M/month revenue passed with no warning.
describe('payroll sanity flag', () => {
  it('flags near-zero payroll on a large business, without changing it', () => {
    const f = payrollShareFlag(1_153_000, 11_500);
    expect(f).not.toBeNull();
    expect(f!.original).toBe(f!.corrected);
    expect(f!.reason).toContain('1.0% of revenue');
  });

  it('stays quiet for small businesses and normal payroll', () => {
    expect(payrollShareFlag(15_000, 0)).toBeNull();
    expect(payrollShareFlag(26_520, 6_000)).toBeNull();
  });

  it('runs on every analysis', () => {
    const src = readFileSync('supabase/functions/analyze-business/financial-calculator.ts', 'utf8');
    expect(src).toContain('const payrollShare = payrollShareFlag(mrr, salaries);');
  });
});
