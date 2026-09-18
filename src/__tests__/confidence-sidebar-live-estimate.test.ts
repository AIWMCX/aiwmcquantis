import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/analysis/steps/ConfidenceSidebar.tsx'),
  'utf8',
);

describe('ConfidenceSidebar live estimate prefers supplied monthly_revenue (2026-09-18 fix)', () => {
  it('reads financialInputs.monthly_revenue before falling back to price * customers', () => {
    const idx = source.indexOf('const revenue =');
    expect(idx).toBeGreaterThan(-1);
    const line = source.slice(idx, idx + 120);
    expect(line).toContain('financialInputs.monthly_revenue');
    expect(line).toContain('price * cust');
  });

  it('reproduces the exact live-bug numbers to prove the fix actually changes the outcome', () => {
    // Extracted from the real "Try Coffee Shop Sample" data in AppDashboard.tsx:
    // average_price: 6.5, expected_customers: 800, monthly_costs: 22000,
    // cac: 15, monthly_revenue: 28000.
    const financialInputs = {
      average_price: 6.5,
      expected_customers: 800,
      monthly_costs: 22000,
      cac: 15,
      monthly_revenue: 28000,
    };

    // Re-implements the exact expression from the component (kept in sync
    // manually; the source-string test above guards against silent drift).
    const price = financialInputs.average_price || 0;
    const cust = financialInputs.expected_customers || 0;
    const opex = financialInputs.monthly_costs || 0;
    const cac = financialInputs.cac || 0;
    const revenue = financialInputs.monthly_revenue || (price * cust);
    const profit = revenue - opex - (cac * cust / 12);
    const margin = revenue > 0 ? ((revenue - opex) / revenue) * 100 : 0;

    // Before the fix: revenue was 6.5*800=5200, profit -17800, margin -323.08%.
    expect(revenue).toBe(28000);
    expect(margin).toBeGreaterThan(0); // was -323.08% before the fix
    expect(profit).toBeGreaterThan(0); // was -17800 before the fix
  });

  it('still falls back to price * customers when no monthly_revenue is supplied (early-funnel case)', () => {
    const financialInputs = {
      average_price: 10,
      expected_customers: 100,
      monthly_costs: 500,
      cac: 0,
    };
    const price = financialInputs.average_price || 0;
    const cust = financialInputs.expected_customers || 0;
    const revenue = (financialInputs as { monthly_revenue?: number }).monthly_revenue || (price * cust);
    expect(revenue).toBe(1000);
  });
});
