/**
 * Q6 (2026-11-03): planted-error tests for the tightened narrative check.
 * Each "catches" case was let through before this change; each "accepts"
 * case is honest prose that must not trigger a replacement.
 */
import { describe, expect, it } from 'vitest';
import {
  buildSafeExecutiveSummary,
  enforceNarrativeIntegrity,
  moneyMentions,
  narrativeMismatch,
  narrativeMismatches,
  scrubNarrativeField,
  WITHHELD_SUMMARY,
  type NarrativeIntegrityCalc,
} from '../../supabase/functions/analyze-business/ai-safety-guardrails.ts';

const calc: NarrativeIntegrityCalc = {
  mrr: 20000,
  netProfit: 4000,
  cac: 120,
  ltv: 2200,
  ltvCacRatio: 18.3,
  startupInvestment: 62000,
  paybackMonths: 16,
  breakEvenRevenue: 14000,
  grossProfit: 12400,
  isProfitable: true,
  averageCheck: 18,
  totalExpenses: 16000,
  grossMarginPercent: 62,
  netMarginPercent: 20,
  breakEvenMonths: 4,
  cacPaybackMonths: 1.2,
  expenses: { cogs: 7600, salaries: 5000, rent: 2000, utilities: 300, marketing: 900, other: 200 },
};
const log = { warn: () => {} };

describe('money: 1% instead of 10%', () => {
  it('catches $21,500 net revenue when the engine says $20,000 (7.5% off; passed before)', () => {
    expect(narrativeMismatch('Monthly revenue is $21,500.', calc)).toBe('unanchored_dollar:$21,500');
  });
  it('accepts the exact figure and a 1%-rounded one', () => {
    expect(narrativeMismatch('Monthly revenue is $20,000, or about $19,900 after refunds.', calc)).toBeNull();
  });
  it('reads suffixes: $62K and $0.06M are the startup investment; $80K is not', () => {
    expect(narrativeMismatch('A $62K build-out.', calc)).toBeNull();
    expect(narrativeMismatch('A $0.06M build-out.', calc)).toBeNull();
    expect(narrativeMismatch('A $80K build-out.', calc)).toBe('unanchored_dollar:$80K');
  });
  it('does not let a coarse suffix hide a large error ($1M for $620,000)', () => {
    const big = { ...calc, startupInvestment: 620000 };
    expect(narrativeMismatch('The $1M investment.', big)).toBe('unanchored_dollar:$1M');
    expect(narrativeMismatch('The $0.62M investment.', big)).toBeNull();
  });
  it('checks small figures: CAC $90 against an engine CAC of $120', () => {
    expect(narrativeMismatch('Customers cost $90 to acquire.', calc)).toBe('unanchored_dollar:$90');
    expect(narrativeMismatch('Customers cost $120 to acquire.', calc)).toBeNull();
  });
  it('accepts a loss written as a positive amount', () => {
    const losing = { ...calc, netProfit: -3100, isProfitable: false };
    expect(narrativeMismatch('The business loses $3,100 a month.', losing)).toBeNull();
  });
  it('accepts a narrow range around an engine figure, rejects a wide one', () => {
    expect(narrativeMismatch('Revenue of $19,500–$20,500 a month.', calc)).toBeNull();
    expect(narrativeMismatch('Revenue of $5,000 to $90,000 a month.', calc)).not.toBeNull();
  });
  it('parses money mentions with display precision', () => {
    const [a, b] = moneyMentions('$1.2M and $80K');
    expect(a.value).toBe(1_200_000);
    expect(a.halfUnit).toBeCloseTo(50_000);
    expect(b.value).toBe(80_000);
    expect(b.halfUnit).toBe(500);
  });
});

describe('percentages, months and ratios are now checked', () => {
  it('gross margin: catches 70% when the engine says 62%', () => {
    expect(narrativeMismatch('Gross margin of 70% leaves room to grow.', calc)).toMatch(/^mismatched_percent:gross margin/);
    expect(narrativeMismatch('Gross margin of 62% leaves room to grow.', calc)).toBeNull();
    expect(narrativeMismatch('A healthy 62% gross margin.', calc)).toBeNull();
  });
  it('net margin: catches 35%, accepts 20%, and reads "negative"', () => {
    expect(narrativeMismatch('Net margin is 35%.', calc)).toMatch(/^mismatched_percent:net margin/);
    expect(narrativeMismatch('Net margin is 20%.', calc)).toBeNull();
    const losing = { ...calc, netMarginPercent: -15 };
    expect(narrativeMismatch('A negative net margin of 15%.', losing)).toBeNull();
    expect(narrativeMismatch('A net margin of 15%.', losing)).toMatch(/^mismatched_percent/);
  });
  it('skips industry and target figures: they are not claims about this business', () => {
    expect(narrativeMismatch('The industry shows typical net margins of 8%-15%.', calc)).toBeNull();
    expect(narrativeMismatch('With a target LTV:CAC ratio of 3x.', calc)).toBeNull();
  });
  it('payback: catches "payback in 8 months" when the engine says 16', () => {
    expect(narrativeMismatch('The investment pays back in 8 months.', calc)).toMatch(/^mismatched_months:payback/);
    expect(narrativeMismatch('Payback period of 16 months.', calc)).toBeNull();
    expect(narrativeMismatch('A 16-month payback.', calc)).toBeNull();
    expect(narrativeMismatch('Payback within 14-18 months.', calc)).toBeNull();
  });
  it('break-even: month numbers and years are read', () => {
    expect(narrativeMismatch('It breaks even by month 4.', calc)).toBeNull();
    expect(narrativeMismatch('It breaks even by month 9.', calc)).toMatch(/^mismatched_months/);
    expect(narrativeMismatch('Payback in about 1.3 years.', calc)).toBeNull();
    expect(narrativeMismatch('Payback in about 3 years.', calc)).toMatch(/^mismatched_months/);
  });
  it('a launch duration in the same sentence is not mistaken for payback', () => {
    expect(narrativeMismatch('Launch takes 3 months and the business breaks even by month 4.', calc)).toBeNull();
  });
  it('CAC payback is checked against CAC payback, not investment payback', () => {
    expect(narrativeMismatch('CAC payback of 1 month.', calc)).toBeNull();
    expect(narrativeMismatch('CAC payback of 6 months.', calc)).toMatch(/^mismatched_months:CAC payback/);
  });
  it('a payback claim when the engine says it is not achievable is a contradiction', () => {
    const never = { ...calc, paybackMonths: 999, breakEvenMonths: Infinity, isProfitable: false, netProfit: -500 };
    expect(narrativeMismatch('Payback in 14 months.', never)).toMatch(/^months_claim_but_not_achievable/);
  });
  it('LTV:CAC: catches 32.8x when the engine says 18.3x', () => {
    expect(narrativeMismatch('An LTV:CAC ratio of 32.8x.', calc)).toMatch(/^mismatched_ratio:LTV:CAC/);
    expect(narrativeMismatch('An LTV:CAC ratio of 18.3x.', calc)).toBeNull();
    expect(narrativeMismatch('An 18.3x LTV:CAC ratio.', calc)).toBeNull();
  });
  it('reports every mismatch, not only the first', () => {
    expect(narrativeMismatches('Revenue is $30,000 with a gross margin of 80%.', calc)).toHaveLength(2);
  });
});

describe('the deterministic summary passes its own check', () => {
  it('for a profitable and an unprofitable case', () => {
    expect(narrativeMismatch(buildSafeExecutiveSummary(calc, 'Cafe', 'Denver, CO'), calc)).toBeNull();
    const losing = { ...calc, netProfit: -3100, isProfitable: false, paybackMonths: 999, breakEvenMonths: Infinity };
    expect(narrativeMismatch(buildSafeExecutiveSummary(losing, 'Cafe', 'Denver, CO'), losing)).toBeNull();
  });
  it('on a host whose default locale is not en-US (ru-RU groups digits with U+00A0)', () => {
    const original = Number.prototype.toLocaleString;
    Number.prototype.toLocaleString = function (this: number, locales?: string | string[], options?: Intl.NumberFormatOptions) {
      return original.call(this, locales ?? 'ru-RU', options);
    };
    try {
      const summary = buildSafeExecutiveSummary(calc, 'Cafe', 'Denver, CO');
      expect(summary).toContain('$4,000 against $20,000');
      expect(narrativeMismatch(summary, calc)).toBeNull();
    } finally {
      Number.prototype.toLocaleString = original;
    }
  });
});

describe('fail closed', () => {
  it('withholds the AI text when the check itself throws', () => {
    const broken = { ...calc, expenses: undefined } as unknown as NarrativeIntegrityCalc;
    const r = enforceNarrativeIntegrity('Revenue is $20,000.', broken, 'Cafe', 'Denver, CO', log);
    expect(r.wasModified).toBe(true);
    expect(r.reason).toBe('check_error');
    expect(r.executiveSummary).not.toContain('Revenue is $20,000.');
  });
  it('ships the fixed notice when even the safe summary cannot be built', () => {
    const broken = { expenses: undefined } as unknown as NarrativeIntegrityCalc;
    const r = enforceNarrativeIntegrity('Revenue is $20,000.', broken, 'Cafe', 'Denver, CO', log);
    expect(r.executiveSummary).toBe(WITHHELD_SUMMARY);
  });
});

describe('other prose fields: only contradicting sentences are removed', () => {
  it('removes the wrong sentence and keeps the rest', () => {
    const text = 'We serve busy commuters. Our gross margin of 75% beats rivals. Staff are trained in-house.';
    const r = scrubNarrativeField('operations', text, calc);
    expect(r.text).toBe('We serve busy commuters. Staff are trained in-house.');
    expect(r.removed).toEqual([expect.stringMatching(/^operations:mismatched_percent:gross margin/)]);
  });
  it('leaves non-financial dollar figures alone (audience income)', () => {
    const text = 'Households earning $75,000+ within two miles.';
    expect(scrubNarrativeField('target_audience', text, calc)).toEqual({ text, removed: [] });
  });
  it('checks dollar figures in financial sentences', () => {
    const r = scrubNarrativeField('product_description', 'Each order brings revenue of $45.', calc);
    expect(r.text).toBe('');
    expect(r.removed).toEqual(['product_description:unanchored_dollar:$45']);
  });
  it('returns an empty field unchanged', () => {
    expect(scrubNarrativeField('operations', undefined, calc)).toEqual({ text: '', removed: [] });
  });
});
