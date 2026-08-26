/**
 * QUANTIS MATH SERVER — Deno-Compatible Precision Arithmetic
 * 
 * Port of src/lib/quantis-math.ts for edge function use.
 * Uses npm:decimal.js per Lovable edge function deployment standard.
 * 
 * CRITICAL: This is the SERVER-SIDE single source of truth for all arithmetic.
 * Every Math.round(a * b) pattern in the production pipeline should go through this.
 */

import Decimal from "https://esm.sh/decimal.js@10.4.3";

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface SanitizeResult {
  value: Decimal;
  wasSanitized: boolean;
  originalInput: string;
}

export class QMath {
  // ========== INPUT SANITIZATION ==========

  /** Sanitize any input to a safe Decimal, converting NaN/Infinity/null to 0 */
  static sanitize(input: unknown): Decimal {
    if (input === null || input === undefined) return new Decimal(0);
    try {
      const d = new Decimal(input as string | number);
      return d.isFinite() ? d : new Decimal(0);
    } catch {
      return new Decimal(0);
    }
  }

  /** Sanitize with origin tracking — UI can distinguish real 0 from fallback 0 */
  static sanitizeWithOrigin(input: unknown): SanitizeResult {
    const originalInput = String(input ?? 'null');
    if (input === null || input === undefined) {
      return { value: new Decimal(0), wasSanitized: true, originalInput };
    }
    try {
      const d = new Decimal(input as string | number);
      if (!d.isFinite()) {
        return { value: new Decimal(0), wasSanitized: true, originalInput };
      }
      return { value: d, wasSanitized: false, originalInput };
    } catch {
      return { value: new Decimal(0), wasSanitized: true, originalInput };
    }
  }

  // ========== BASIC ARITHMETIC ==========

  static add(a: unknown, b: unknown): Decimal {
    return QMath.sanitize(a).plus(QMath.sanitize(b));
  }

  static subtract(a: unknown, b: unknown): Decimal {
    return QMath.sanitize(a).minus(QMath.sanitize(b));
  }

  static multiply(a: unknown, b: unknown): Decimal {
    return QMath.sanitize(a).times(QMath.sanitize(b));
  }

  static divide(a: unknown, b: unknown): Decimal {
    const divisor = QMath.sanitize(b);
    if (divisor.isZero()) return new Decimal(0);
    return QMath.sanitize(a).dividedBy(divisor);
  }

  /** a × (b / 100) */
  static percentage(value: unknown, percent: unknown): Decimal {
    return QMath.sanitize(value).times(QMath.sanitize(percent).dividedBy(100));
  }

  // ========== ROUNDING ==========

  /** Round to integer (for display) */
  static round(value: unknown): number {
    return QMath.sanitize(value).round().toNumber();
  }

  /** Round to N decimal places */
  static roundTo(value: unknown, places: number): number {
    return QMath.sanitize(value).toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toNumber();
  }

  // ========== FINANCIAL FORMULAS ==========

  /** 
   * Net Present Value (DCF)
   * NPV = -investment + Σ(month 1→N) [cashFlow / (1 + monthlyRate)^month]
   */
  static npv(investment: unknown, monthlyCashFlow: unknown, months: number, annualRate: unknown): Decimal {
    const inv = QMath.sanitize(investment);
    const cf = QMath.sanitize(monthlyCashFlow);
    const rate = QMath.sanitize(annualRate);
    
    // Monthly rate = (1 + annualRate)^(1/12) - 1
    const monthlyRate = rate.plus(1).pow(new Decimal(1).dividedBy(12)).minus(1);
    
    let sum = inv.negated();
    for (let m = 1; m <= months; m++) {
      const discountFactor = monthlyRate.plus(1).pow(m);
      if (!discountFactor.isZero()) {
        sum = sum.plus(cf.dividedBy(discountFactor));
      }
    }
    return sum;
  }

  /**
   * LTV = avgCheck × grossMarginFraction × ordersPerMonth × lifetimeMonths
   *
   * GTM-audit item #9 (2026-08-25) DIVERGENCE WARNING: this method's 2nd
   * argument is `cogsPercent` on a 0-100 PERCENT scale (converted
   * internally to a fraction). The client's `QuantisMath.ltv()` in
   * src/lib/quantis-math.ts has the IDENTICAL name, argument count, and
   * argument order, but its 2nd argument is `grossMarginFraction` on a
   * 0-1 FRACTION scale directly -- passing one function's convention to
   * the other silently produces a wildly wrong LTV (e.g. passing a 0.65
   * fraction here would compute grossMarginFraction = 1 - 0.65/100 =
   * 0.9935, nearly the opposite of intended). Confirmed via real call-
   * site tracing (2026-08-25) that this method's only caller
   * (financial-engine.ts's generate12MonthProjections) is never actually
   * invoked in production, and the client's only caller
   * (formula-registry.ts) is reference-only, not the live engine -- this
   * is a dormant unit-mismatch, not a live bug -- but never copy an
   * `ltv(...)` call between the two files without checking which
   * convention the destination expects.
   */
  static ltv(avgCheck: unknown, cogsPercent: unknown, ordersPerMonth: unknown, lifetimeMonths: unknown): Decimal {
    const check = QMath.sanitize(avgCheck);
    const cogs = QMath.sanitize(cogsPercent);
    const orders = QMath.sanitize(ordersPerMonth);
    const lifetime = QMath.sanitize(lifetimeMonths);
    
    const grossMarginFraction = new Decimal(1).minus(cogs.dividedBy(100));
    return check.times(grossMarginFraction).times(orders).times(lifetime);
  }

  /**
   * Payback months = investment / monthlyNetProfit
   * Returns 999 if unprofitable
   */
  static paybackMonths(investment: unknown, monthlyProfit: unknown): number {
    const inv = QMath.sanitize(investment);
    const profit = QMath.sanitize(monthlyProfit);
    
    if (inv.isZero()) return 0;
    if (profit.lte(0)) return 999;
    
    return inv.dividedBy(profit).ceil().toNumber();
  }

  /** Clamp value between min and max */
  static clamp(value: unknown, min: number, max: number): Decimal {
    const v = QMath.sanitize(value);
    if (v.lt(min)) return new Decimal(min);
    if (v.gt(max)) return new Decimal(max);
    return v;
  }

  // ========================================================================
  // F3 / F4 — CANONICAL UNIT-ECONOMICS PRIMITIVES (server twin)
  //
  // Mirrors src/lib/quantis-math.ts exactly. Every CAC-payback / LTV /
  // project-payback in the edge function MUST route through these. Do not
  // inline the math anywhere else.
  // ========================================================================

  /**
   * CAC payback (months): CAC / (avgTicket × grossMarginFraction).
   * Clamped to [1, 120]. grossMarginFraction is 0–1, not percent.
   */
  static cacPaybackMonths(cac: unknown, avgTicket: unknown, grossMarginFraction: unknown): Decimal {
    const cacD = QMath.sanitize(cac);
    const ticketD = QMath.sanitize(avgTicket);
    const gmD = QMath.sanitize(grossMarginFraction);
    const grossProfitPerCustomer = ticketD.times(gmD);
    if (grossProfitPerCustomer.lte(0) || cacD.lte(0)) return new Decimal(120);
    return QMath.clamp(cacD.dividedBy(grossProfitPerCustomer), 1, 120);
  }

  /**
   * LTV from primitives: avgTicket × grossMarginFraction × min(1/churn, 240).
   * User-supplied LTV is discarded. This is the canonical computation.
   */
  static ltvFromPrimitives(avgTicket: unknown, grossMarginFraction: unknown, churnMonthly: unknown): Decimal {
    const ticketD = QMath.sanitize(avgTicket);
    const gmD = QMath.sanitize(grossMarginFraction);
    const churnD = QMath.sanitize(churnMonthly);
    if (churnD.lte(0) || ticketD.lte(0) || gmD.lte(0)) return new Decimal(0);
    const lifetimeMonths = QMath.clamp(new Decimal(1).dividedBy(churnD), 1, 240);
    return ticketD.times(gmD).times(lifetimeMonths);
  }

  /**
   * Project payback (YEARS): initialInvestment / annualNetProfit.
   * Distinct from cacPaybackMonths — never conflate. Returns 999 when unprofitable.
   */
  static projectPaybackYears(initialInvestment: unknown, annualNetProfit: unknown): Decimal {
    const invD = QMath.sanitize(initialInvestment);
    const profitD = QMath.sanitize(annualNetProfit);
    if (profitD.lte(0)) return new Decimal(999);
    if (invD.lte(0)) return new Decimal(0);
    return invD.dividedBy(profitD);
  }

  /**
   * Break-even revenue = fixedCosts / contributionMargin
   */
  static breakEvenRevenue(fixedCosts: unknown, contributionMargin: unknown): Decimal {
    const fixed = QMath.sanitize(fixedCosts);
    const margin = QMath.sanitize(contributionMargin);
    
    if (margin.lte(0.01)) return new Decimal(0);
    return fixed.dividedBy(margin);
  }

  /**
   * ROI = (profit × months / investment) × 100
   *
   * GTM-audit item #9 (2026-08-25) DIVERGENCE WARNING: the client's
   * `QuantisMath.roi(gain, cost)` in src/lib/quantis-math.ts is a
   * DIFFERENT formula under the same name -- `((gain - cost) / cost) *
   * 100`, a 2-argument gain-over-cost ratio, not this 3-argument
   * period return on investment over the supplied `months` window (it does
   * NOT annualize -- CodeRabbit catch: the original wording here was
   * inaccurate). Confirmed via real call-site
   * tracing (2026-08-25) that neither this method nor the client's
   * roi() is actually reached by the live analyze-business engine today
   * (financial-calculator.ts computes roiYear1Percent/roiYear3Percent
   * inline, not through either QMath.roi() variant), so this is a
   * dormant naming collision, not a live bug -- but do NOT assume
   * `roi()` means the same thing in both files, and do not "fix" this by
   * unifying the two without re-auditing every caller of both first.
   */
  static roi(monthlyProfit: unknown, investment: unknown, months: number): Decimal {
    const profit = QMath.sanitize(monthlyProfit);
    const inv = QMath.sanitize(investment);
    
    if (inv.isZero()) return new Decimal(0);
    return profit.times(months).dividedBy(inv).times(100);
  }

  /**
   * Margin percent = (profit / revenue) × 100
   */
  static marginPercent(profit: unknown, revenue: unknown): number {
    const rev = QMath.sanitize(revenue);
    if (rev.isZero()) return 0;
    return QMath.sanitize(profit).dividedBy(rev).times(100).round().toNumber();
  }

  /**
   * LTV:CAC ratio with 1 decimal place
   */
  static ltvCacRatio(ltv: unknown, cac: unknown): number {
    const cacVal = QMath.sanitize(cac);
    if (cacVal.isZero()) return 0;
    return QMath.sanitize(ltv).dividedBy(cacVal).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toNumber();
  }

  // ========== STATISTICAL METHODS ==========

  /** Arithmetic mean of a dataset */
  static mean(dataset: unknown[]): Decimal {
    if (dataset.length === 0) return new Decimal(0);
    let sum = new Decimal(0);
    for (const v of dataset) sum = sum.plus(QMath.sanitize(v));
    return sum.dividedBy(dataset.length);
  }

  /** Median (sorted middle value) */
  static median(dataset: unknown[]): Decimal {
    if (dataset.length === 0) return new Decimal(0);
    const sorted = dataset.map(d => QMath.sanitize(d)).sort((a, b) => a.cmp(b));
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return sorted[mid - 1].plus(sorted[mid]).dividedBy(2);
    }
    return sorted[mid];
  }

  /** Z-score: (value - mean) / stdDev. Returns 0 if stdDev is 0. */
  static zScore(value: unknown, meanVal: unknown, stdDev: unknown): Decimal {
    const s = QMath.sanitize(stdDev);
    if (s.isZero()) return new Decimal(0);
    return QMath.sanitize(value).minus(QMath.sanitize(meanVal)).dividedBy(s);
  }

  /** Standard deviation (sample) */
  static standardDeviation(dataset: unknown[]): Decimal {
    if (dataset.length < 2) return new Decimal(0);
    const values = dataset.map(d => QMath.sanitize(d));
    let sum = new Decimal(0);
    for (const v of values) sum = sum.plus(v);
    const mean = sum.dividedBy(values.length);
    let varianceSum = new Decimal(0);
    for (const v of values) {
      const diff = v.minus(mean);
      varianceSum = varianceSum.plus(diff.times(diff));
    }
    return varianceSum.dividedBy(values.length - 1).sqrt();
  }

  /** Percentile (linear interpolation). p is 0–100. */
  static percentile(dataset: unknown[], p: number): Decimal {
    if (dataset.length === 0) return new Decimal(0);
    const sorted = dataset.map(d => QMath.sanitize(d)).sort((a, b) => a.cmp(b));
    const pClamped = Math.max(0, Math.min(100, p));
    const rank = (pClamped / 100) * (sorted.length - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return sorted[lower];
    const frac = new Decimal(rank - lower);
    return sorted[lower].plus(sorted[upper].minus(sorted[lower]).times(frac));
  }

  /** Self-test: 10 known-answer checks */
  static runSelfTest(): { passed: number; failed: number; errors: string[] } {
    const errors: string[] = [];
    let passed = 0;
    const check = (label: string, actual: number | string, expected: number | string) => {
      if (String(actual) === String(expected)) passed++;
      else errors.push(`${label}: expected ${expected}, got ${actual}`);
    };
    check('add(0.1,0.2)', QMath.roundTo(QMath.add(0.1, 0.2).toNumber(), 1), 0.3);
    check('multiply(3,7)', QMath.round(QMath.multiply(3, 7)), 21);
    check('divide(10,0)', QMath.round(QMath.divide(10, 0)), 0);
    check('mean([10,20,30])', QMath.round(QMath.mean([10, 20, 30])), 20);
    check('median([1,3,5,7])', QMath.round(QMath.median([1, 3, 5, 7])), 4);
    check('zScore(10,8,2)', QMath.roundTo(QMath.zScore(10, 8, 2).toNumber(), 1), 1);
    check('percentile([1,2,3,4,5],50)', QMath.round(QMath.percentile([1, 2, 3, 4, 5], 50)), 3);
    check('stdDev([2,4,4,4,5,5,7,9])', QMath.roundTo(QMath.standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]).toNumber(), 2), 2.14);
    check('paybackMonths(10000,500)', QMath.paybackMonths(10000, 500), 20);
    check('marginPercent(20,100)', QMath.marginPercent(20, 100), 20);
    return { passed, failed: errors.length, errors };
  }

  // ========== COMPARISON ==========

  static equals(a: unknown, b: unknown, tolerance: number = 0.01): boolean {
    return QMath.sanitize(a).minus(QMath.sanitize(b)).abs().lte(tolerance);
  }

  static max(a: unknown, b: unknown): Decimal {
    const da = QMath.sanitize(a);
    const db = QMath.sanitize(b);
    return da.gte(db) ? da : db;
  }

  static min(a: unknown, b: unknown): Decimal {
    const da = QMath.sanitize(a);
    const db = QMath.sanitize(b);
    return da.lte(db) ? da : db;
  }

  /** Convert Decimal result to number for JSON serialization */
  static toNum(value: Decimal): number {
    return value.toNumber();
  }
}

export { Decimal };
