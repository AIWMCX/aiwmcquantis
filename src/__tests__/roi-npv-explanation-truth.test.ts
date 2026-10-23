// R&D finding F04: the ROI explanation said "Profit × 12" while the
// calculator sums a ramp-and-growth Year-1 model. The explanation must
// describe the number it sits next to.
import { describe, expect, it } from 'vitest';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index';
import type { LocationMultiplierResult } from '../../supabase/functions/analyze-business/location-intelligence';

const noLocation: LocationMultiplierResult = {
  overall: 1, salary: 1, rent: 1, utility: 1, marketing: 1,
  matched: false, matchedCity: null, region: 'test', confidence: 0,
};
const bench: IndustryBenchmarks = {
  id: 'test', name: 'Synthetic local service', cogs_percent: 0,
  salaries_fixed: 1000, rent_fixed: 100, utilities_fixed: 50, other_fixed: 50,
  cac_min: 0, cac_max: 10000, cac_typical: 100,
  average_check_min: 0, average_check_max: 10000, orders_per_client: 1,
  client_lifetime_months: 12, ltv_cac_min: 0, ltv_cac_max: 1000,
  net_margin_min: -100, net_margin_max: 100, keywords: [],
};

describe('ROI / NPV explanations match the computed numbers (F04)', () => {
  const r = calculateStrictFinancials(10_000, 20_000, 100, 1_200, 100, bench, noLocation, null, 8_000, 5, 20);
  const roi = r.audit.find((a) => a.formula.startsWith('ROI_year1'))!;
  const npv = r.audit.find((a) => a.formula.startsWith('NPV_3yr'))!;

  it('the ROI explanation names the modeled Year-1 profit that produces the reported ROI', () => {
    expect(roi).toBeDefined();
    const y1 = roi.inputs['Year-1 modeled profit'] as number;
    expect(Math.round((y1 / 20_000) * 100)).toBe(r.roiYear1Percent);
    expect(roi.formula).not.toContain('Profit × 12');
    expect(roi.notes).toContain('not steady-state profit × 12');
  });

  it('the ramp model is not silently equal to steady-state × 12', () => {
    const y1 = roi.inputs['Year-1 modeled profit'] as number;
    expect(y1).not.toBe(r.netProfit * 12);
  });

  it('NPV says it uses steady-state profit as a cash proxy and an assumed 10% rate', () => {
    expect(npv.notes).toContain('assumed 10%');
    expect(npv.notes).toContain('not on the same basis as the Year-1 ROI');
    expect(Object.keys(npv.inputs)).toContain('Assumed annual discount rate %');
  });
});
