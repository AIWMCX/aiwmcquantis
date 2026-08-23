/**
 * Property-based invariant tests for the real, production-imported financial
 * modules (src/financial/*.ts — Handbook §19 Wave 1/2 formula contracts).
 *
 * Unlike financial-engine.test.ts (which reimplements the calculation logic
 * as a local mock for testing convenience), every property here calls the
 * ACTUAL exported function. fast-check generates hundreds of randomized
 * inputs per property, specifically to surface edge cases example-based
 * tests wouldn't think to write (near-zero denominators, single-element
 * series, exact-crossing boundaries, etc.) — the reconciliation and
 * monotonicity properties below are the kind of check that only a
 * property-based approach makes practical.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import Decimal from "decimal.js";
import { calculateInvestmentPayback } from "@/financial/payback";
import { calculateCacPayback } from "@/financial/cac-payback";
import { calculateCvp, type CvpInput } from "@/financial/contribution-margin";
import { assertNoNumericSentinel } from "@/financial/result";

// ---------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------

/** A finite money-ish value as a decimal string, e.g. "1234.56". */
const moneyArb = fc
  .double({ min: -1_000_000, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
  .map((n) => n.toFixed(2));

/** A non-negative money value as a decimal string. */
const nonNegativeMoneyArb = fc
  .double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true })
  .map((n) => n.toFixed(2));

const negativeMoneyArb = fc
  .double({ min: -1_000_000, max: -0.01, noNaN: true, noDefaultInfinity: true })
  .map((n) => n.toFixed(2));

const seriesArb = fc.array(moneyArb, { minLength: 0, maxLength: 24 });
const nonEmptySeriesArb = fc.array(moneyArb, { minLength: 1, maxLength: 24 });

// ---------------------------------------------------------------------
// Shared property battery for calculateInvestmentPayback and
// calculateCacPayback — structurally identical cumulative-crossing
// algorithms (same result shape, same status vocabulary), so the same
// invariants apply to both without duplicating the property logic.
// ---------------------------------------------------------------------

type PaybackLikeFn = (principal: string, series: readonly string[]) => ReturnType<typeof calculateInvestmentPayback>;

function runPaybackInvariantBattery(name: string, fn: PaybackLikeFn) {
  describe(`${name} — invariants`, () => {
    it("never produces a customer-facing numeric sentinel for any finite input", () => {
      fc.assert(
        fc.property(moneyArb, seriesArb, (principal, series) => {
          const result = fn(principal, series);
          expect(() => assertNoNumericSentinel(result)).not.toThrow();
        }),
        { numRuns: 500 },
      );
    });

    it("negative principal always yields INVALID_INPUTS with null months", () => {
      fc.assert(
        fc.property(negativeMoneyArb, seriesArb, (principal, series) => {
          const result = fn(principal, series);
          expect(result.status).toBe("INVALID_INPUTS");
          expect(result.months).toBeNull();
        }),
        { numRuns: 200 },
      );
    });

    it("an empty series always yields INSUFFICIENT_INPUTS regardless of principal", () => {
      fc.assert(
        fc.property(nonNegativeMoneyArb, (principal) => {
          const result = fn(principal, []);
          expect(result.status).toBe("INSUFFICIENT_INPUTS");
          expect(result.months).toBeNull();
          expect(result.horizonMonths).toBe(0);
        }),
        { numRuns: 50 },
      );
    });

    it("horizonMonths always equals the input series length", () => {
      fc.assert(
        fc.property(nonNegativeMoneyArb, seriesArb, (principal, series) => {
          const result = fn(principal, series);
          expect(result.horizonMonths).toBe(series.length);
        }),
        { numRuns: 300 },
      );
    });

    it("VALUE months is always within [0, horizonMonths]", () => {
      fc.assert(
        fc.property(nonNegativeMoneyArb, nonEmptySeriesArb, (principal, series) => {
          const result = fn(principal, series);
          if (result.status === "VALUE") {
            const months = Number(result.months);
            expect(months).toBeGreaterThanOrEqual(0);
            expect(months).toBeLessThanOrEqual(result.horizonMonths);
          }
        }),
        { numRuns: 300 },
      );
    });

    it("NOT_ACHIEVED_WITHIN_HORIZON implies cumulative cash flow genuinely never recovered the principal", () => {
      fc.assert(
        fc.property(nonNegativeMoneyArb, nonEmptySeriesArb, (principal, series) => {
          const result = fn(principal, series);
          if (result.status === "NOT_ACHIEVED_WITHIN_HORIZON") {
            const sum = series.reduce((acc, v) => acc.plus(new Decimal(v)), new Decimal(0));
            const finalCumulative = sum.minus(new Decimal(principal));
            expect(finalCumulative.lessThan(0)).toBe(true);
          }
        }),
        { numRuns: 300 },
      );
    });

    it("VALUE reconciles independently against a from-scratch cumulative recomputation", () => {
      // The strongest check here: reimplement the crossing logic from the
      // module's own doc-comment description (not by importing any of its
      // internals) and verify the two agree. This is what catches a formula
      // regression that an example-based test with 2-3 fixed cases would miss.
      fc.assert(
        fc.property(nonNegativeMoneyArb, nonEmptySeriesArb, (principal, series) => {
          const result = fn(principal, series);
          if (result.status !== "VALUE") return;

          let cumulative = new Decimal(principal).negated();
          if (cumulative.greaterThanOrEqualTo(0)) {
            expect(result.months).toBe("0");
            return;
          }
          for (let i = 0; i < series.length; i++) {
            const before = cumulative;
            cumulative = cumulative.plus(new Decimal(series[i]));
            if (cumulative.greaterThanOrEqualTo(0)) {
              const current = new Decimal(series[i]);
              const fraction = current.greaterThan(0) ? before.negated().dividedBy(current) : new Decimal(1);
              const expectedMonths = new Decimal(i).plus(fraction).toDecimalPlaces(2).toString();
              expect(result.months).toBe(expectedMonths);
              return;
            }
          }
          throw new Error("reference recomputation found no crossing, but function returned VALUE");
        }),
        { numRuns: 300 },
      );
    });

    it("monotonicity: increasing any single month's cash flow never increases payback months", () => {
      fc.assert(
        fc.property(
          nonNegativeMoneyArb,
          fc.array(nonNegativeMoneyArb, { minLength: 1, maxLength: 12 }),
          fc.nat({ max: 11 }),
          nonNegativeMoneyArb,
          (principal, series, indexSeed, bump) => {
            const index = indexSeed % series.length;
            const before = fn(principal, series);
            const increased = [...series];
            increased[index] = new Decimal(series[index]).plus(new Decimal(bump)).toFixed(2);
            const after = fn(principal, increased);

            // Only comparable when both resolve to an actual month value —
            // a transition from NOT_ACHIEVED_WITHIN_HORIZON to VALUE is
            // itself monotonic-consistent (strictly better), just not a
            // numeric comparison.
            if (before.status === "VALUE" && after.status === "VALUE") {
              expect(Number(after.months)).toBeLessThanOrEqual(Number(before.months));
            } else if (before.status === "VALUE" && after.status !== "VALUE") {
              // Cash flow can only improve recovery, never regress from VALUE
              // to NOT_ACHIEVED — that would be a real monotonicity violation.
              throw new Error(
                `Monotonicity violated: increasing a cash flow moved payback from VALUE (${before.months}) to ${after.status}`,
              );
            }
          },
        ),
        { numRuns: 300 },
      );
    });
  });
}

runPaybackInvariantBattery("calculateInvestmentPayback", calculateInvestmentPayback);
runPaybackInvariantBattery("calculateCacPayback", calculateCacPayback);

// ---------------------------------------------------------------------
// calculateCvp — the richest, most branch-heavy module in src/financial/.
// The single highest-value property here is robustness: this function has
// enough interacting conditionals that a property test generating hundreds
// of random combinations (including adversarial near-zero/negative edges)
// is the practical way to gain confidence it never throws or returns a
// malformed shape, which is exactly what example-based tests struggle to
// cover exhaustively.
// ---------------------------------------------------------------------

const cvpInputArb: fc.Arbitrary<CvpInput> = fc.record({
  revenue: nonNegativeMoneyArb,
  fixedCosts: nonNegativeMoneyArb,
  variableCosts: nonNegativeMoneyArb,
  operatingIncome: moneyArb,
  unitsSold: fc.option(nonNegativeMoneyArb, { nil: undefined }),
  pricePerUnit: fc.option(nonNegativeMoneyArb, { nil: undefined }),
  expectedSales: fc.option(nonNegativeMoneyArb, { nil: undefined }),
  targetOperatingProfit: fc.option(moneyArb, { nil: undefined }),
});

describe("calculateCvp — invariants", () => {
  it("never throws for any combination of finite numeric-string inputs", () => {
    fc.assert(
      fc.property(cvpInputArb, (input) => {
        expect(() => calculateCvp(input)).not.toThrow();
      }),
      { numRuns: 500 },
    );
  });

  it("always returns one of the contract's typed statuses, never an ad-hoc value", () => {
    const validTopStatuses = new Set(["VALUE", "INSUFFICIENT_INPUTS", "INVALID_INPUTS"]);
    fc.assert(
      fc.property(cvpInputArb, (input) => {
        const result = calculateCvp(input);
        expect(validTopStatuses.has(result.status)).toBe(true);
        expect(new Set(["VALUE", "NOT_ACHIEVABLE", "INSUFFICIENT_INPUTS"]).has(result.breakEven.status)).toBe(true);
        expect(new Set(["VALUE", "NOT_MEANINGFUL", "INSUFFICIENT_INPUTS"]).has(result.marginOfSafety.status)).toBe(true);
        expect(new Set(["VALUE", "NOT_MEANINGFUL", "INSUFFICIENT_INPUTS"]).has(result.operatingLeverage.status)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("any negative revenue/fixedCosts/variableCosts always yields top-level INVALID_INPUTS", () => {
    fc.assert(
      fc.property(negativeMoneyArb, nonNegativeMoneyArb, nonNegativeMoneyArb, moneyArb, (revenue, fixedCosts, variableCosts, operatingIncome) => {
        const result = calculateCvp({ revenue, fixedCosts, variableCosts, operatingIncome });
        expect(result.status).toBe("INVALID_INPUTS");
      }),
      { numRuns: 100 },
    );
  });

  it("totalContribution always reconciles to revenue - variableCosts exactly", () => {
    fc.assert(
      fc.property(cvpInputArb, (input) => {
        const result = calculateCvp(input);
        if (result.status !== "VALUE" || result.totalContribution === null) return;
        const expected = new Decimal(input.revenue).minus(new Decimal(input.variableCosts)).toDecimalPlaces(2);
        expect(new Decimal(result.totalContribution).equals(expected)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("contributionMarginRatio, when present, reconciles to totalContribution / revenue within rounding tolerance", () => {
    fc.assert(
      fc.property(cvpInputArb, (input) => {
        const result = calculateCvp(input);
        if (result.contributionMarginRatio === null || result.totalContribution === null) return;
        const revenue = new Decimal(input.revenue);
        if (revenue.isZero()) return; // guarded to null upstream, shouldn't reach here
        const expected = new Decimal(result.totalContribution).dividedBy(revenue);
        const actual = new Decimal(result.contributionMarginRatio);
        expect(actual.minus(expected).abs().lessThanOrEqualTo("0.0002")).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("break-even VALUE reconciles: breakEvenRevenue * contributionMarginRatio ≈ fixedCosts", () => {
    fc.assert(
      fc.property(cvpInputArb, (input) => {
        const result = calculateCvp(input);
        if (result.breakEven.status !== "VALUE" || result.breakEven.breakEvenRevenue === null) return;
        if (result.contributionMarginRatio === null) return;
        const fixedCosts = new Decimal(input.fixedCosts);
        const recomputed = new Decimal(result.breakEven.breakEvenRevenue).times(new Decimal(result.contributionMarginRatio));
        // A fixed absolute tolerance doesn't scale: when contributionMarginRatio
        // is small, breakEvenRevenue = fixedCosts / ratio is large, and the
        // ratio's 4-decimal-place rounding (a fixed RELATIVE error on the
        // ratio) turns into a large ABSOLUTE error once multiplied back
        // through that large breakEvenRevenue. Discovered by fast-check
        // shrinking to revenue="1.87", variableCosts="1.86" (ratio ≈
        // 0.0053, breakEvenRevenue ≈ 21000+) — not a bug in calculateCvp,
        // but a flaw in this test's own tolerance model. Use a tolerance
        // that scales with fixedCosts' magnitude instead.
        const tolerance = fixedCosts.abs().times("0.01").plus("1.00");
        expect(recomputed.minus(fixedCosts).abs().lessThanOrEqualTo(tolerance)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it("margin-of-safety VALUE reconciles: amount = expectedSales - breakEvenRevenue, pct = amount / expectedSales", () => {
    fc.assert(
      fc.property(cvpInputArb, (input) => {
        const result = calculateCvp(input);
        if (result.marginOfSafety.status !== "VALUE") return;
        const expectedSales = input.expectedSales !== undefined ? new Decimal(input.expectedSales) : new Decimal(input.revenue);
        const breakEvenRevenue = new Decimal(result.breakEven.breakEvenRevenue as string);
        const expectedAmount = expectedSales.minus(breakEvenRevenue).toDecimalPlaces(2);
        expect(new Decimal(result.marginOfSafety.amount as string).equals(expectedAmount)).toBe(true);

        const expectedPct = expectedAmount.dividedBy(expectedSales);
        const actualPct = new Decimal(result.marginOfSafety.pct as string);
        expect(actualPct.minus(expectedPct).abs().lessThanOrEqualTo("0.001")).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});
