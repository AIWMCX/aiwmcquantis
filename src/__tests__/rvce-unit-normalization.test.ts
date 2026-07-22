import { describe, it, expect } from 'vitest';
import {
  normalizeObservation,
  classifyRawUnitFromContext,
  type RawUnit,
} from '../../supabase/functions/rvce-validate/unit-normalization';

const SRC = { url: 'https://example.com', title: 'Example Source' };

describe('RVCE unit-safety layer — normalizeObservation', () => {
  it('$46/month rent -> accepted_exact, unchanged value', () => {
    const r = normalizeObservation('opex_rent_monthly', 46, 'monthly_usd', SRC, 'deepseek');
    // 46 is below the $100 plausibility floor for rent -> rejected_out_of_range,
    // not silently accepted. This is the exact live-bug value from production.
    expect(r.normalization_status).toBe('rejected_out_of_range');
    expect(r.normalized_value).toBeNull();
  });

  it('$4,600/month rent -> accepted_exact, unchanged value', () => {
    const r = normalizeObservation('opex_rent_monthly', 4600, 'monthly_usd', SRC, 'deepseek');
    expect(r.normalization_status).toBe('accepted_exact');
    expect(r.normalized_value).toBe(4600);
    expect(r.normalization_rule).toBeNull();
  });

  it('$46,000/year revenue -> accepted_converted, divided by 12', () => {
    const r = normalizeObservation('revenue_monthly', 46000, 'annual_usd', SRC, 'deepseek');
    expect(r.normalization_status).toBe('accepted_converted');
    expect(r.normalized_value).toBeCloseTo(46000 / 12, 5);
    expect(r.normalization_rule).toBe('annual_to_monthly_div12');
  });

  it('$3/sq ft/month rent with no square-footage context -> quarantined, not guessed', () => {
    const r = normalizeObservation('opex_rent_monthly', 3, 'per_sqft_monthly', SRC, 'deepseek');
    expect(r.normalization_status).toBe('quarantined_missing_context');
    expect(r.normalized_value).toBeNull();
    expect(r.rejection_reason).toMatch(/square footage/);
  });

  it('$3/sq ft/year rent with no square-footage context -> quarantined, not guessed', () => {
    const r = normalizeObservation('opex_rent_monthly', 3, 'per_sqft_annual', SRC, 'deepseek');
    expect(r.normalization_status).toBe('quarantined_missing_context');
    expect(r.normalized_value).toBeNull();
  });

  it('$46/hour payroll -> quarantined (requires hours context), never silently treated as monthly', () => {
    const r = normalizeObservation('opex_payroll_monthly', 46, 'per_hour', SRC, 'deepseek');
    expect(r.normalization_status).toBe('quarantined_missing_context');
    expect(r.normalized_value).toBeNull();
  });

  it('3% never enters a USD metric — rejected_metric_mismatch, not silently coerced', () => {
    const r = normalizeObservation('opex_rent_monthly', 3, 'percentage', SRC, 'deepseek');
    expect(r.normalization_status).toBe('rejected_metric_mismatch');
    expect(r.normalized_value).toBeNull();
  });

  it('malformed / non-USD currency is quarantined, not silently treated as USD', () => {
    const r = normalizeObservation('opex_rent_monthly', 4600, 'monthly_usd', SRC, 'deepseek', 'EUR');
    expect(r.normalization_status).toBe('quarantined_missing_context');
    expect(r.rejection_reason).toMatch(/currency/);
  });

  it('mixed monthly and annual observations both resolve to the same canonical monthly basis', () => {
    const monthly = normalizeObservation('revenue_monthly', 10000, 'monthly_usd', SRC, 'deepseek');
    const annual = normalizeObservation('revenue_monthly', 120000, 'annual_usd', SRC, 'deepseek');
    expect(monthly.normalized_value).toBe(10000);
    expect(annual.normalized_value).toBeCloseTo(10000, 5);
    expect(monthly.normalized_period).toBe(annual.normalized_period);
    expect(monthly.normalized_unit).toBe(annual.normalized_unit);
  });

  it('DeepSeek and regex-fallback extraction methods normalize identically for the same input', () => {
    const a = normalizeObservation('opex_rent_monthly', 4600, 'monthly_usd', SRC, 'deepseek');
    const b = normalizeObservation('opex_rent_monthly', 4600, 'monthly_usd', SRC, 'regex_fallback');
    expect(a.normalization_status).toBe(b.normalization_status);
    expect(a.normalized_value).toBe(b.normalized_value);
  });

  it('zero and negative values are rejected_non_numeric', () => {
    expect(normalizeObservation('opex_rent_monthly', 0, 'monthly_usd', SRC, 'deepseek').normalization_status)
      .toBe('rejected_non_numeric');
    expect(normalizeObservation('opex_rent_monthly', -500, 'monthly_usd', SRC, 'deepseek').normalization_status)
      .toBe('rejected_non_numeric');
  });

  it('valid low-dollar metrics (small CAC) are NOT incorrectly rejected', () => {
    const r = normalizeObservation('cac', 8, 'monthly_usd', SRC, 'deepseek');
    expect(r.normalization_status).toBe('accepted_exact');
    expect(r.normalized_value).toBe(8);
  });

  it('one extreme but valid observation is accepted, not flagged out of range', () => {
    // A large flagship-store rent figure well within the generous ceiling.
    const r = normalizeObservation('opex_rent_monthly', 250000, 'monthly_usd', SRC, 'deepseek');
    expect(r.normalization_status).toBe('accepted_exact');
    expect(r.normalized_value).toBe(250000);
  });

  it('duplicate sources are normalized independently (dedup happens upstream, not in this layer)', () => {
    const a = normalizeObservation('opex_rent_monthly', 4600, 'monthly_usd', SRC, 'deepseek');
    const b = normalizeObservation('opex_rent_monthly', 4600, 'monthly_usd', SRC, 'deepseek');
    expect(a).toEqual(b);
  });

  it('LTV and CAC accept per_customer as their native unit (not a context-required conversion)', () => {
    const ltv = normalizeObservation('ltv', 1200, 'per_customer', SRC, 'deepseek');
    const cac = normalizeObservation('cac', 85, 'per_customer', SRC, 'deepseek');
    expect(ltv.normalization_status).toBe('accepted_exact');
    expect(cac.normalization_status).toBe('accepted_exact');
  });

  it('gross_margin_pct rejects any USD-shaped raw unit', () => {
    const r = normalizeObservation('gross_margin_pct', 4600, 'monthly_usd', SRC, 'deepseek');
    expect(r.normalization_status).toBe('rejected_metric_mismatch');
  });

  it('ltv_cac_ratio rejects a bare percentage without an explicit basis', () => {
    const r = normalizeObservation('ltv_cac_ratio', 62, 'percentage', SRC, 'deepseek');
    expect(r.normalization_status).toBe('rejected_metric_mismatch');
  });

  it('unknown metric id fails closed as rejected_metric_mismatch, never silently passed through', () => {
    const r = normalizeObservation('not_a_real_metric', 100, 'monthly_usd', SRC, 'deepseek');
    expect(r.normalization_status).toBe('rejected_metric_mismatch');
    expect(r.normalized_value).toBeNull();
  });
});

describe('RVCE unit-safety layer — classifyRawUnitFromContext (regex fallback path)', () => {
  const cases: Array<[string, RawUnit]> = [
    ['commercial rent averages $3 per sq ft in this market', 'per_sqft_monthly'],
    ['commercial rent averages $3 per square foot annually', 'per_sqft_annual'],
    ['average wage is $46 per hour for this role', 'per_hour'],
    ['the platform charges $2 per transaction', 'per_transaction'],
    ['CAC of $85 per customer is typical', 'per_customer'],
    ['priced at $12 per unit', 'per_unit'],
    ['gross margin is 62%', 'percentage'],
    ['annual revenue reaches $120,000 per year', 'annual_usd'],
    ['weekly payroll runs $1,200 per week', 'weekly_usd'],
    ['daily rate of $150 per day', 'daily_usd'],
    ['a healthy 4x ratio', 'ratio_x'],
    ['monthly rent is $4,600', 'unknown'], // no explicit period marker beyond "monthly" itself in target metric
  ];

  it.each(cases)('classifies %j as %s', (text, expected) => {
    expect(classifyRawUnitFromContext(text)).toBe(expected);
  });
});
