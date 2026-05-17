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
 * Result of sanitization with origin tracking.
 * Allows the UI to distinguish "real zero" from "sanitized fallback zero."
 */
export interface SanitizeResult {
  value: Decimal;
  wasSanitized: boolean;
  originalInput: string;
}

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

/**
 * Sanitize with origin tracking — returns whether the value was sanitized
 * and what the original input was. Feeds into confidence badges (Phase 5).
 */
function sanitizeWithOrigin(value: DecimalInput | null | undefined, fallback: DecimalInput = 0): SanitizeResult {
  const originalInput = String(value ?? 'null');
  
  if (value === null || value === undefined) {
    return { value: new Decimal(fallback), wasSanitized: true, originalInput };
  }
  
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { value: new Decimal(fallback), wasSanitized: true, originalInput };
    }
    return { value: new Decimal(value), wasSanitized: false, originalInput };
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'NaN' || trimmed === 'Infinity' || trimmed === '-Infinity') {
      return { value: new Decimal(fallback), wasSanitized: true, originalInput };
    }
  }
  
  try {
    return { value: new Decimal(value), wasSanitized: false, originalInput };
  } catch {
    return { value: new Decimal(fallback), wasSanitized: true, originalInput };
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

  // ========================================================================
  // F3 / F4 — CANONICAL UNIT-ECONOMICS PRIMITIVES
  //
  // ONE formula, ONE function, ONE answer. Per QUANTIS_ACCURACY_ENGINE spec.
  // Every CAC-payback / LTV / project-payback computation in the codebase
  // MUST route through these three methods. Do not inline the math anywhere.
  // The server twin in `quantis-math-server.ts` mirrors these exactly.
  // ========================================================================

  /**
   * CAC payback (months) — how long to recover the cost of acquiring ONE customer.
   * Formula: CAC / (avgTicket × grossMarginFraction).
   * Clamped to [1, 120] months. Returns 120 (capped) when unrecoverable.
   * grossMarginFraction is 0–1 (e.g. 0.65), NOT a percent.
   */
  static cacPaybackMonths(
    cac: DecimalInput,
    avgTicket: DecimalInput,
    grossMarginFraction: DecimalInput
  ): Decimal {
    const cacD = sanitize(cac);
    const ticketD = sanitize(avgTicket);
    const gmD = sanitize(grossMarginFraction);
    const grossProfitPerCustomer = ticketD.times(gmD);
    if (grossProfitPerCustomer.lte(0) || cacD.lte(0)) return new Decimal(120);
    const raw = cacD.dividedBy(grossProfitPerCustomer);
    return QuantisMath.clamp(raw, 1, 120);
  }

  /**
   * LTV (lifetime value, $) computed ENTIRELY from primitives. User-supplied
   * LTV is discarded — this is the single source of truth.
   * Formula: avgTicket × grossMarginFraction × min(1 / churnMonthly, 240).
   * Returns 0 if churn is 0 or inputs invalid.
   */
  static ltvFromPrimitives(
    avgTicket: DecimalInput,
    grossMarginFraction: DecimalInput,
    churnMonthly: DecimalInput
  ): Decimal {
    const ticketD = sanitize(avgTicket);
    const gmD = sanitize(grossMarginFraction);
    const churnD = sanitize(churnMonthly);
    if (churnD.lte(0) || ticketD.lte(0) || gmD.lte(0)) return new Decimal(0);
    const lifetimeMonths = QuantisMath.clamp(
      new Decimal(1).dividedBy(churnD),
      1,
      240
    );
    return ticketD.times(gmD).times(lifetimeMonths);
  }

  /**
   * Project payback (YEARS) — how long to recover the TOTAL initial investment.
   * Distinct from cacPaybackMonths. Never conflate.
   * Formula: initialInvestment / max(annualNetProfit, 1) ÷ 12-month basis
   *   → since annualNetProfit is already annual, this is investment / profit.
   * Returns 999 sentinel when project is unprofitable.
   */
  static projectPaybackYears(
    initialInvestment: DecimalInput,
    annualNetProfit: DecimalInput
  ): Decimal {
    const invD = sanitize(initialInvestment);
    const profitD = sanitize(annualNetProfit);
    if (profitD.lte(0)) return new Decimal(999);
    if (invD.lte(0)) return new Decimal(0);
    return invD.dividedBy(profitD);
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

  // ========== STATISTICAL METHODS ==========

  /** Arithmetic mean of a dataset */
  static mean(dataset: DecimalInput[]): Decimal {
    if (dataset.length === 0) return new Decimal(0);
    let sum = new Decimal(0);
    for (const v of dataset) sum = sum.plus(sanitize(v));
    return sum.dividedBy(dataset.length);
  }

  /** Median of a dataset (sorted middle value) */
  static median(dataset: DecimalInput[]): Decimal {
    if (dataset.length === 0) return new Decimal(0);
    const sorted = dataset.map(d => sanitize(d)).sort((a, b) => a.cmp(b));
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return sorted[mid - 1].plus(sorted[mid]).dividedBy(2);
    }
    return sorted[mid];
  }

  /** Z-score: (value - mean) / stdDev. Returns 0 if stdDev is 0. */
  static zScore(value: DecimalInput, meanVal: DecimalInput, stdDev: DecimalInput): Decimal {
    const s = sanitize(stdDev);
    if (s.isZero()) return new Decimal(0);
    return sanitize(value).minus(sanitize(meanVal)).dividedBy(s);
  }

  /** Percentile (linear interpolation). p is 0–100. */
  static percentile(dataset: DecimalInput[], p: number): Decimal {
    if (dataset.length === 0) return new Decimal(0);
    const sorted = dataset.map(d => sanitize(d)).sort((a, b) => a.cmp(b));
    const pClamped = Math.max(0, Math.min(100, p));
    const rank = (pClamped / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return sorted[lower];
    const frac = new Decimal(rank - lower);
    return sorted[lower].plus(sorted[upper].minus(sorted[lower]).times(frac));
  }

  /** Self-test: 10 known-answer checks for QMath integrity */
  static runSelfTest(): { passed: number; failed: number; errors: string[] } {
    const errors: string[] = [];
    let passed = 0;

    const check = (label: string, actual: number | string, expected: number | string) => {
      if (String(actual) === String(expected)) { passed++; }
      else { errors.push(`${label}: expected ${expected}, got ${actual}`); }
    };

    // 1. add
    check('add(0.1, 0.2)', QuantisMath.toNumber(QuantisMath.add(0.1, 0.2), 1), 0.3);
    // 2. multiply
    check('multiply(3, 7)', QuantisMath.toNumber(QuantisMath.multiply(3, 7), 0), 21);
    // 3. divide-by-zero
    check('divide(10, 0)', QuantisMath.toNumber(QuantisMath.divide(10, 0), 2), 0);
    // 4. percentage
    check('percentage(25, 200)', QuantisMath.toNumber(QuantisMath.percentage(25, 200), 1), 12.5);
    // 5. compound
    check('compound(1000, 0.1, 3)', QuantisMath.toNumber(QuantisMath.compound(1000, 0.1, 3), 0), 1331);
    // 6. clamp
    check('clamp(150, 0, 100)', QuantisMath.toNumber(QuantisMath.clamp(150, 0, 100), 0), 100);
    // 7. normalize
    check('normalize(75, 50, 100)', QuantisMath.toNumber(QuantisMath.normalize(75, 50, 100), 1), 0.5);
    // 8. mean
    check('mean([10, 20, 30])', QuantisMath.toNumber(QuantisMath.mean([10, 20, 30]), 0), 20);
    // 9. median
    check('median([1, 3, 5, 7])', QuantisMath.toNumber(QuantisMath.median([1, 3, 5, 7]), 0), 4);
    // 10. stdDev
    const sd = QuantisMath.toNumber(QuantisMath.standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]), 2);
    check('stdDev([2,4,4,4,5,5,7,9])', sd, 2.14);

    return { passed, failed: errors.length, errors };
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

  /** Absolute value */
  static abs(value: DecimalInput): Decimal {
    return sanitize(value).abs();
  }

  /** Round to N decimal places */
  static roundTo(value: DecimalInput, decimals: number): number {
    return sanitize(value).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
  }
}

export { Decimal, sanitize, sanitizeWithOrigin };
