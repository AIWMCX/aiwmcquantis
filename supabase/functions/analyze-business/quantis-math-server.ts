/**
 * QUANTIS MATH SERVER — Deno-Compatible Precision Arithmetic
 * 
 * Port of src/lib/quantis-math.ts for edge function use.
 * Uses npm:decimal.js per Lovable edge function deployment standard.
 * 
 * CRITICAL: This is the SERVER-SIDE single source of truth for all arithmetic.
 * Every Math.round(a * b) pattern in the production pipeline should go through this.
 */

import Decimal from "npm:decimal.js@10.4.3";

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
