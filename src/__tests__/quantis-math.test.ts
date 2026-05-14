/**
 * QUANTIS MATH + FORMULA REGISTRY TEST SUITE
 * 
 * Tests:
 * 1. QuantisMath precision (no float drift)
 * 2. Input sanitization (NaN, Infinity, null handling)
 * 3. All registered formulas via FormulaRegistry
 * 4. Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest';
import { QuantisMath, Decimal } from '@/lib/quantis-math';
import { FormulaRegistry } from '@/lib/formula-registry';

// ========== QUANTIS MATH CORE ==========

describe('QuantisMath — Core Arithmetic', () => {
  it('adds without float drift (0.1 + 0.2 = 0.3 exactly)', () => {
    const result = QuantisMath.add(0.1, 0.2);
    expect(result.eq(new Decimal('0.3'))).toBe(true);
  });

  it('subtracts precisely', () => {
    const result = QuantisMath.subtract(1.0, 0.7);
    expect(result.eq(new Decimal('0.3'))).toBe(true);
  });

  it('multiplies precisely', () => {
    const result = QuantisMath.multiply(0.1, 0.2);
    expect(result.eq(new Decimal('0.02'))).toBe(true);
  });

  it('divides with zero-guard', () => {
    expect(QuantisMath.divide(100, 0).eq(0)).toBe(true);
    expect(QuantisMath.divide(100, 3).toNumber()).toBeCloseTo(33.333, 2);
  });
});

describe('QuantisMath — Input Sanitization', () => {
  it('handles NaN → 0', () => {
    expect(QuantisMath.add(NaN, 5).toNumber()).toBe(5);
  });

  it('handles Infinity → 0', () => {
    expect(QuantisMath.multiply(Infinity, 5).toNumber()).toBe(0);
  });

  it('handles null/undefined → 0', () => {
    expect(QuantisMath.from(null).toNumber()).toBe(0);
    expect(QuantisMath.from(undefined).toNumber()).toBe(0);
  });

  it('handles empty string → 0', () => {
    expect(QuantisMath.from('').toNumber()).toBe(0);
  });

  it('handles valid string numbers', () => {
    expect(QuantisMath.from('123.45').toNumber()).toBe(123.45);
  });
});

describe('QuantisMath — Financial Operations', () => {
  it('calculates percentage correctly', () => {
    expect(QuantisMath.toNumber(QuantisMath.percentage(25, 100))).toBe(25);
    expect(QuantisMath.toNumber(QuantisMath.percentage(0, 0))).toBe(0); // zero-safe
  });

  it('calculates compound growth', () => {
    // $1000 at 5% for 12 periods
    const result = QuantisMath.compound(1000, 0.05, 12);
    expect(QuantisMath.toNumber(result)).toBeCloseTo(1795.86, 0);
  });

  it('calculates monthly discount rate from annual', () => {
    const monthly = QuantisMath.monthlyDiscountRate(0.10);
    // (1.10)^(1/12) - 1 ≈ 0.007974
    expect(QuantisMath.toNumber(monthly, 6)).toBeCloseTo(0.007974, 4);
  });

  it('calculates NPV correctly', () => {
    // $50k investment, $5k/mo profit, 36 months, 10% annual rate
    const npv = QuantisMath.npv(50000, 5000, 36, 0.10);
    expect(QuantisMath.round(npv)).toBeGreaterThan(100000);
  });

  it('calculates payback months', () => {
    expect(QuantisMath.round(QuantisMath.paybackMonths(50000, 5000))).toBe(10);
    expect(QuantisMath.round(QuantisMath.paybackMonths(50000, -1000))).toBe(999);
    expect(QuantisMath.round(QuantisMath.paybackMonths(0, 5000))).toBe(0);
  });

  it('calculates LTV (margin-adjusted)', () => {
    // $200 avg check, 80% margin, 1 order/mo, 24 months
    const ltv = QuantisMath.ltv(200, 0.8, 1, 24);
    expect(QuantisMath.round(ltv)).toBe(3840);
  });

  it('calculates break-even revenue', () => {
    const ber = QuantisMath.breakEvenRevenue(10000, 0.6);
    expect(QuantisMath.round(ber)).toBeCloseTo(16667, 0);
  });
});

describe('QuantisMath — Statistical Operations', () => {
  it('calculates weighted average', () => {
    const result = QuantisMath.weightedAverage([80, 90, 70], [1, 2, 1]);
    expect(QuantisMath.toNumber(result)).toBe(82.5);
  });

  it('calculates standard deviation', () => {
    const stdDev = QuantisMath.standardDeviation([10, 20, 30, 40, 50]);
    expect(QuantisMath.toNumber(stdDev, 2)).toBeCloseTo(15.81, 1);
  });

  it('calculates confidence interval', () => {
    const [lower, upper] = QuantisMath.confidenceInterval(100, 10, 25);
    expect(QuantisMath.toNumber(lower)).toBeCloseTo(96.08, 0);
    expect(QuantisMath.toNumber(upper)).toBeCloseTo(103.92, 0);
  });

  it('normalizes values to 0-1 scale', () => {
    expect(QuantisMath.toNumber(QuantisMath.normalize(50, 0, 100))).toBe(0.5);
    expect(QuantisMath.toNumber(QuantisMath.normalize(0, 0, 100))).toBe(0);
    expect(QuantisMath.toNumber(QuantisMath.normalize(100, 0, 100))).toBe(1);
  });

  it('clamps values', () => {
    expect(QuantisMath.toNumber(QuantisMath.clamp(150, 0, 100))).toBe(100);
    expect(QuantisMath.toNumber(QuantisMath.clamp(-10, 0, 100))).toBe(0);
    expect(QuantisMath.toNumber(QuantisMath.clamp(50, 0, 100))).toBe(50);
  });
});

describe('QuantisMath — Equality & Comparison', () => {
  it('equals within tolerance', () => {
    expect(QuantisMath.equals(1.0001, 1.0002, 0.001)).toBe(true);
    expect(QuantisMath.equals(1.0, 2.0, 0.001)).toBe(false);
  });

  it('max and min work', () => {
    expect(QuantisMath.toNumber(QuantisMath.max(5, 10))).toBe(10);
    expect(QuantisMath.toNumber(QuantisMath.min(5, 10))).toBe(5);
  });
});

// ========== FORMULA REGISTRY ==========

describe('FormulaRegistry — All Formulas Pass Test Cases', () => {
  it('has at least 15 registered formulas', () => {
    expect(FormulaRegistry.size).toBeGreaterThanOrEqual(15);
  });

  it('all formulas pass their built-in test cases', () => {
    const results = FormulaRegistry.testAll();
    
    // Build a detailed failure list so Vitest's assertion message surfaces it
    // without needing a raw console.error.
    const failures: string[] = [];
    if (results.totalFailed > 0) {
      for (const [id, result] of Object.entries(results.results)) {
        for (const tc of result.results) {
          if (!tc.passed) {
            failures.push(`${id} / ${tc.name} — expected ${tc.expected}, got ${tc.actual}`);
          }
        }
      }
    }

    expect(results.totalFailed, `Formula failures:\n${failures.join('\n')}`).toBe(0);
    expect(results.totalPassed).toBeGreaterThan(0);
  });
});

describe('FormulaRegistry — Execution', () => {
  it('executes LTV formula correctly', () => {
    const result = FormulaRegistry.execute('ltv', 200, 0.8, 1, 24);
    expect(result.output).toBe(3840);
    expect(result.isValid).toBe(true);
    expect(result.confidence).toBe(95);
  });

  it('executes payback formula correctly', () => {
    const result = FormulaRegistry.execute('payback_months', 50000, 5000);
    expect(result.output).toBe(10);
    expect(result.isValid).toBe(true);
  });

  it('flags invalid inputs with warnings', () => {
    const result = FormulaRegistry.execute('ltv', -100, 0.8, 1, 24);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('throws on unknown formula', () => {
    expect(() => FormulaRegistry.execute('nonexistent')).toThrow();
  });

  it('returns audit trail string', () => {
    const result = FormulaRegistry.execute('net_profit', 15000, 10000);
    expect(result.auditTrail).toContain('Net_Profit');
    expect(result.output).toBe(5000);
  });
});

describe('FormulaRegistry — Categories', () => {
  it('filters by category', () => {
    const unitEcon = FormulaRegistry.byCategory('unit_economics');
    expect(unitEcon.length).toBeGreaterThanOrEqual(3);
    
    const profitability = FormulaRegistry.byCategory('profitability');
    expect(profitability.length).toBeGreaterThanOrEqual(4);
  });
});

// ========== PRECISION STRESS TESTS ==========

describe('Precision — No Float Drift at Scale', () => {
  it('summing 0.1 one thousand times equals 100.0', () => {
    let sum = new Decimal(0);
    for (let i = 0; i < 1000; i++) {
      sum = sum.plus(new Decimal('0.1'));
    }
    expect(sum.eq(100)).toBe(true);
  });

  it('chained multiplications stay precise', () => {
    // 1.1^10 = 2.5937424601 (exact to 10 decimals)
    let value = new Decimal(1);
    for (let i = 0; i < 10; i++) {
      value = value.times(new Decimal('1.1'));
    }
    expect(value.toDecimalPlaces(10).toString()).toBe('2.5937424601');
  });

  it('large financial calculation stays precise', () => {
    // $12,345,678.90 × 0.0325 / 12 = $33,435.97...
    const principal = new Decimal('12345678.90');
    const rate = new Decimal('0.0325');
    const monthly = principal.times(rate).dividedBy(12);
    expect(monthly.toDecimalPlaces(2).toString()).toBe('33436.21');
  });
});
