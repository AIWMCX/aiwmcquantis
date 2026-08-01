import { describe, it, expect } from 'vitest';
import {
  normalizeDelta,
  applyScenarioDelta,
  type DeltaChange,
} from '../../supabase/functions/_shared/scenario-delta.ts';

const BASE = {
  rawMrr: 10000,
  rawInvestment: 50000,
  rawCac: 100,
  rawAvgCheck: 50,
  userProvidedCosts: undefined as number | undefined,
  userProvidedChurnRate: undefined as number | undefined,
  userProvidedCustomers: undefined as number | undefined,
  locationMultipliers: { rent: 1.0 },
};

describe('normalizeDelta', () => {
  it('rejects an unknown assumption_key', () => {
    expect(() =>
      normalizeDelta([{ assumption_key: 'not_a_real_key' as never, operation: 'replace', value: 1 }]),
    ).toThrow(/Unknown assumption_key/);
  });

  it('rejects a non-finite value', () => {
    expect(() =>
      normalizeDelta([{ assumption_key: 'cac', operation: 'replace', value: NaN }]),
    ).toThrow(/Non-finite value/);
  });

  it('rejects a percentage change beyond ±500%', () => {
    expect(() =>
      normalizeDelta([{ assumption_key: 'cac', operation: 'increase_pct', value: 501 }]),
    ).toThrow(/exceeds/);
    expect(() =>
      normalizeDelta([{ assumption_key: 'cac', operation: 'increase_pct', value: 500 }]),
    ).not.toThrow();
  });

  it('rejects a duplicate assumption_key', () => {
    const changes: DeltaChange[] = [
      { assumption_key: 'cac', operation: 'replace', value: 10 },
      { assumption_key: 'cac', operation: 'replace', value: 20 },
    ];
    expect(() => normalizeDelta(changes)).toThrow(/Duplicate/);
  });

  it('sorts changes by assumption_key', () => {
    const changes: DeltaChange[] = [
      { assumption_key: 'rent', operation: 'replace', value: 1 },
      { assumption_key: 'cac', operation: 'replace', value: 1 },
    ];
    const result = normalizeDelta(changes);
    expect(result.map((c) => c.assumption_key)).toEqual(['cac', 'rent']);
  });
});

describe('applyScenarioDelta', () => {
  it('applies replace', () => {
    const effective = applyScenarioDelta(BASE, [{ assumption_key: 'cac', operation: 'replace', value: 200 }]);
    expect(effective.rawCac).toBe(200);
  });

  it('applies increase_pct', () => {
    const effective = applyScenarioDelta(BASE, [{ assumption_key: 'cac', operation: 'increase_pct', value: 20 }]);
    expect(effective.rawCac).toBe(120);
  });

  it('applies decrease_pct', () => {
    const effective = applyScenarioDelta(BASE, [{ assumption_key: 'monthly_revenue', operation: 'decrease_pct', value: 10 }]);
    expect(effective.rawMrr).toBe(9000);
  });

  it('targets locationMultipliers.rent for the rent assumption_key', () => {
    const effective = applyScenarioDelta(BASE, [{ assumption_key: 'rent', operation: 'increase_pct', value: 50 }]);
    expect(effective.locationMultipliers.rent).toBe(1.5);
    // base is not mutated
    expect(BASE.locationMultipliers.rent).toBe(1.0);
  });

  it('never adjusts rawLtv (not in the AssumptionKey catalog)', () => {
    const baseWithLtv = { ...BASE, rawLtv: 999 };
    const effective = applyScenarioDelta(baseWithLtv, [{ assumption_key: 'cac', operation: 'replace', value: 1 }]);
    expect((effective as typeof baseWithLtv).rawLtv).toBe(999);
  });

  it('applies changes to optional fields starting undefined', () => {
    const effective = applyScenarioDelta(BASE, [{ assumption_key: 'churn_rate', operation: 'replace', value: 0.05 }]);
    expect(effective.userProvidedChurnRate).toBe(0.05);
  });

  it('leaves untouched fields unchanged', () => {
    const effective = applyScenarioDelta(BASE, [{ assumption_key: 'cac', operation: 'replace', value: 1 }]);
    expect(effective.rawMrr).toBe(BASE.rawMrr);
    expect(effective.rawInvestment).toBe(BASE.rawInvestment);
    expect(effective.rawAvgCheck).toBe(BASE.rawAvgCheck);
  });
});
