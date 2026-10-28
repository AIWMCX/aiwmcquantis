import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeProfitRange } from '@/lib/profit-range';

// Register #82 (2026-10-27): homepage sample page 9 showed a P10–P90 payback
// distribution the product never produces. It now shows the real profit-range
// engine's output on page 7's steady-state P&L.
const src = readFileSync('src/data/sampleReport.ts', 'utf8');
const round100 = (n: number) => `$${(Math.round(n / 100) * 100).toLocaleString('en-US')}`;

describe('sample report page 9', () => {
  it('no longer shows a payback distribution', () => {
    expect(src).not.toContain('Payback distribution');
    expect(src).not.toMatch(/P25 = \d+mo/);
  });

  it('matches the engine on page 7 numbers', async () => {
    expect(src).toContain("['Total monthly revenue', '$28,400']");
    // Costs on page 7: 4,000 + 9,400 + 2,700 + 500
    const r = await computeProfitRange({ monthlyRevenue: 28_400, monthlyCosts: 16_600, seedKey: 'sample-report-austin-cowork-cafe' });
    expect(r).not.toBeNull();
    for (const [label, v] of [['P10 (low month)', r!.p10], ['P25', r!.p25], ['Median', r!.median], ['P75', r!.p75], ['P90 (high month)', r!.p90]] as const) {
      expect(src).toContain(`{ label: '${label}', value: '${round100(v)}' }`);
    }
    expect(src).toContain(`{ label: 'Profitable months', value: '${Math.round(r!.probabilityPositive)}%' }`);
  });
});
