/**
 * QUANTIS PRECISION MATH LIBRARY
 * 
 * Wraps decimal.js to eliminate floating-point drift in all financial calculations.
 * Every arithmetic operation in Quantis must go through this class.
 * 
 * Rules:
 * - No raw JS math (+, -, *, /) on financial values
 * - All intermediate values stored as Decimal
 * - Final outputs rounded to specified precision
 * - Division-by-zero always returns Decimal(0), never throws
 * 
 * @module QuantisMath
 * @version 1.0.0
 */

import Decimal from 'decimal.js';

// Configure decimal.js for financial precision
Decimal.set({
  precision: 20,        // 20 significant digits
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -9,
  toExpPos: 15,
});

export type DecimalInput = Decimal | number | string;

/**
 * Sanitize input: reject NaN, Infinity, undefined, null.
 * Returns a safe Decimal or Decimal(0) for invalid inputs.
 */
function sanitize(value: DecimalInput | null | undefined, fallback: DecimalInput = 0): Decimal {
  if (value === null || value === undefined) return new Decimal(fallback);
  
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return new Decimal(fallback);
    return new Decimal(value);
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'NaN' || trimmed === 'Infinity' || trimmed === '-Infinity') {
      return new Decimal(fallback);
    }
  }
  
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(fallback);
  }
}

export class QuantisMath {
  // ========== CORE ARITHMETIC ==========

  /** Lossless addition */
  static add(a: DecimalInput, b: DecimalInput): Decimal {
    return sanitize(a).plus(sanitize(b));
  }

  /** Lossless subtraction */
  static subtract(a: DecimalInput, b: DecimalInput): Decimal {
    return sanitize(a).minus(sanitize(b));
  }

  /** Lossless multiplication */
  static multiply(a: DecimalInput, b: DecimalInput): Decimal {
    return sanitize(a).times(sanitize(b));
  }

  /** Division with zero-guard — returns 0 if divisor is 0 */
  static divide(a: DecimalInput, b: DecimalInput): Decimal {
    const divisor = sanitize(b);
    if (divisor.isZero()) return new Decimal(0);
    return sanitize(a).dividedBy(divisor);
  }

  // ========== FINANCIAL OPERATIONS ==========

  /** Safe percentage: (value / total) * 100 */
  static percentage(value: DecimalInput, total: DecimalInput): Decimal {
    const t = sanitize(total);
    if (t.isZero()) return new Decimal(0);
    return sanitize(value).dividedBy(t).times(100);
  }

  /** Compound growth: principal × (1 + rate)^periods */
  static compound(principal: DecimalInput, rate: DecimalInput, periods: number): Decimal {
    const r = sanitize(rate);
    const base = new Decimal(1).plus(r);
    return sanitize(principal).times(base.pow(periods));
  }

  /** Monthly discount rate from annual: (1 + annual)^(1/12) - 1 */
  static monthlyDiscountRate(annualRate: DecimalInput): Decimal {
    const annual = sanitize(annualRate);
    const base = new Decimal(1).plus(annual);
    // (1 + r)^(1/12) - 1
    return base.pow(new Decimal(1).dividedBy(12)).minus(1);
  }

  /** Net Present Value: -investment + Σ(cashFlow / (1 + monthlyRate)^month) for months 1..n */
  static npv(investment: DecimalInput, monthlyCashFlow: DecimalInput, months: number, annualRate: DecimalInput): Decimal {
    const inv = sanitize(investment);
    const cf = sanitize(monthlyCashFlow);
    const monthlyRate = this.monthlyDiscountRate(annualRate);
    
    let sum = inv.negated();
    for (let m = 1; m <= months; m++) {
      const discountFactor = new Decimal(1).plus(monthlyRate).pow(m);
      sum = sum.plus(cf.dividedBy(discountFactor));
    }
    return sum;
  }

  /** ROI: ((gain - cost) / cost) × 100 */
  static roi(gain: DecimalInput, cost: DecimalInput): Decimal {
    const c = sanitize(cost);
    if (c.isZero()) return new Decimal(0);
    return sanitize(gain).minus(c).dividedBy(c).times(100);
  }

  /** Payback months: investment / monthlyProfit (capped at 999 if non-positive profit) */
  static paybackMonths(investment: DecimalInput, monthlyProfit: DecimalInput): Decimal {
    const profit = sanitize(monthlyProfit);
    if (profit.lte(0)) return new Decimal(999);
    const inv = sanitize(investment);
    if (inv.lte(0)) return new Decimal(0);
    return inv.dividedBy(profit).ceil();
  }

  /** LTV: avgCheck × grossMarginFraction × ordersPerMonth × lifetimeMonths */
  static ltv(
    avgCheck: DecimalInput,
    grossMarginFraction: DecimalInput,
    ordersPerMonth: DecimalInput,
    lifetimeMonths: DecimalInput
  ): Decimal {
    return sanitize(avgCheck)
      .times(sanitize(grossMarginFraction))
      .times(sanitize(ordersPerMonth))
      .times(sanitize(lifetimeMonths));
  }

  /** LTV:CAC ratio */
  static ltvCacRatio(ltv: DecimalInput, cac: DecimalInput): Decimal {
    return this.divide(ltv, cac);
  }

  /** Break-even revenue: fixedCosts / contributionMargin */
  static breakEvenRevenue(fixedCosts: DecimalInput, contributionMargin: DecimalInput): Decimal {
    const cm = sanitize(contributionMargin);
    if (cm.lte(new Decimal('0.01'))) return new Decimal(0);
    return sanitize(fixedCosts).dividedBy(cm);
  }

  // ========== STATISTICAL OPERATIONS ==========

  /** Weighted average */
  static weightedAverage(values: DecimalInput[], weights: DecimalInput[]): Decimal {
    if (values.length === 0 || values.length !== weights.length) return new Decimal(0);
    
    let sumProduct = new Decimal(0);
    let sumWeights = new Decimal(0);
    
    for (let i = 0; i < values.length; i++) {
      const v = sanitize(values[i]);
      const w = sanitize(weights[i]);
      sumProduct = sumProduct.plus(v.times(w));
      sumWeights = sumWeights.plus(w);
    }
    
    if (sumWeights.isZero()) return new Decimal(0);
    return sumProduct.dividedBy(sumWeights);
  }

  /** Standard deviation */
  static standardDeviation(dataset: DecimalInput[]): Decimal {
    if (dataset.length < 2) return new Decimal(0);
    
    const values = dataset.map(d => sanitize(d));
    const n = values.length;
    
    // Mean
    let sum = new Decimal(0);
    for (const v of values) sum = sum.plus(v);
    const mean = sum.dividedBy(n);
    
    // Variance (sample)
    let varianceSum = new Decimal(0);
    for (const v of values) {
      const diff = v.minus(mean);
      varianceSum = varianceSum.plus(diff.times(diff));
    }
    const variance = varianceSum.dividedBy(n - 1);
    
    return variance.sqrt();
  }

  /** Confidence interval (mean ± z * stdDev / √n) at 95% by default */
  static confidenceInterval(
    mean: DecimalInput, 
    stdDev: DecimalInput, 
    n: number, 
    zScore: DecimalInput = 1.96
  ): [Decimal, Decimal] {
    if (n <= 0) return [sanitize(mean), sanitize(mean)];
    
    const m = sanitize(mean);
    const s = sanitize(stdDev);
    const z = sanitize(zScore);
    
    const marginOfError = z.times(s).dividedBy(new Decimal(n).sqrt());
    
    return [m.minus(marginOfError), m.plus(marginOfError)];
  }

  /** Normalize value to 0–1 scale */
  static normalize(value: DecimalInput, min: DecimalInput, max: DecimalInput): Decimal {
    const range = sanitize(max).minus(sanitize(min));
    if (range.isZero()) return new Decimal(0);
    return sanitize(value).minus(sanitize(min)).dividedBy(range);
  }

  /** Clamp value between min and max */
  static clamp(value: DecimalInput, min: DecimalInput, max: DecimalInput): Decimal {
    const v = sanitize(value);
    const lo = sanitize(min);
    const hi = sanitize(max);
    if (v.lt(lo)) return lo;
    if (v.gt(hi)) return hi;
    return v;
  }

  // ========== CONVERSION HELPERS ==========

  /** Convert Decimal to number, rounded to specified decimal places */
  static toNumber(value: Decimal, decimalPlaces: number = 2): number {
    return value.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
  }

  /** Round to integer (Math.round equivalent) */
  static round(value: DecimalInput): number {
    return sanitize(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  }

  /** Round up (Math.ceil equivalent) */
  static ceil(value: DecimalInput): number {
    return sanitize(value).ceil().toNumber();
  }

  /** Round down (Math.floor equivalent) */
  static floor(value: DecimalInput): number {
    return sanitize(value).floor().toNumber();
  }

  /** Create a Decimal from any input (sanitized) */
  static from(value: DecimalInput | null | undefined): Decimal {
    return sanitize(value);
  }

  /** Check if two values are equal within tolerance */
  static equals(a: DecimalInput, b: DecimalInput, tolerance: DecimalInput = '0.001'): boolean {
    return sanitize(a).minus(sanitize(b)).abs().lte(sanitize(tolerance));
  }

  /** Max of two values */
  static max(a: DecimalInput, b: DecimalInput): Decimal {
    const da = sanitize(a);
    const db = sanitize(b);
    return da.gte(db) ? da : db;
  }

  /** Min of two values */
  static min(a: DecimalInput, b: DecimalInput): Decimal {
    const da = sanitize(a);
    const db = sanitize(b);
    return da.lte(db) ? da : db;
  }
}

export { Decimal, sanitize };
