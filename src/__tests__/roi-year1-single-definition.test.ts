// Founder decision 2026-10-22: Year-1 ROI = ramp model, one definition everywhere.
// Expected values derived independently with Python Decimal (prec 40).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { year1ModeledProfit, roiYear1Percent } from '../../supabase/functions/analyze-business/roi-year1';
import { FormulaRegistry } from '@/lib/formula-registry';

describe('roi-year1 (ramp model)', () => {
  it('matches the independent Decimal oracle', () => {
    expect(year1ModeledProfit(10000, 8000)).toBeCloseTo(17440.6434, 3);
    expect(year1ModeledProfit(50000, 15000)).toBeCloseTo(380888.9705, 3);
    expect(year1ModeledProfit(3402, 7200)).toBeCloseTo(-46676.3843, 3);
    expect(roiYear1Percent(10000, 8000, 20000)).toBe(87);
    expect(roiYear1Percent(50000, 15000, 47500)).toBe(802);
    expect(roiYear1Percent(3402, 7200, 47500)).toBe(-98);
  });
  it('is 0 without positive investment and is not steady-state x 12', () => {
    expect(roiYear1Percent(10000, 8000, 0)).toBe(0);
    expect(year1ModeledProfit(10000, 8000)).not.toBeCloseTo(24000, 0);
  });
  it('the client registry uses the same definition', () => {
    expect(FormulaRegistry.execute('roi_year1', 10000, 8000, 20000).output).toBe(87);
  });
  it('no Year-1 ROI implementation describes or computes profit x 12 any more', () => {
    for (const f of [
      'supabase/functions/analyze-business/financial-calculator.ts',
      'supabase/functions/analyze-business/quantis-engine.ts',
      'supabase/functions/analyze-business/financial-engine.ts',
      'src/lib/formula-registry.ts',
    ]) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/ROI_?Y(ear)?1\s*=\s*\(Net_Profit × 12/);
      expect(s, f).not.toContain('QMath.roi(netProfit, startupInvestment, 12)');
      // the Year-1 ROI loop is not re-implemented inline (payback has its own loop; out of scope)
      expect(s, f).not.toMatch(/y(ear)?1Profit \+=/);
    }
  });
});
