import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { planKillers } from '@/lib/plan-killers';
import type { ActionableInsight } from '@/types/analysis';

const ins = (id: string, status: ActionableInsight['status']) => ({ id, status, headline: id } as ActionableInsight);

describe('"What Kills This Plan" lists real risks only (#58)', () => {
  it('drops optimisation notes and puts dangers first', () => {
    const out = planKillers([ins('ltv_cac_high', 'warning'), ins('payback_moderate', 'warning'), ins('low_margin', 'warning'), ins('profitability_loss', 'danger')]);
    expect(out.map((i) => i.id)).toEqual(['profitability_loss', 'low_margin']);
  });

  it('is empty for the 2026-10-25 grooming run, whose only "risks" were optimisation notes', () => {
    expect(planKillers([ins('ltv_cac_high', 'warning'), ins('payback_moderate', 'warning')])).toEqual([]);
  });

  it('the result page uses it and keeps a sensible caution line when none remain', () => {
    const src = readFileSync('src/components/analysis/AccuracyTransparentResults.tsx', 'utf8');
    expect(src).toContain('const fatalAssumptions = planKillers(insights);');
    expect(src).toContain("'Check the assumptions on the Model tab before committing capital.'");
  });
});
