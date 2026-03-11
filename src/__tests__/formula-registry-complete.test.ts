/**
 * LAYER 1 — Formula Registry Complete Test Suite
 * Exhaustive tests for all 25+ registered formulas individually.
 */
import { describe, it, expect } from 'vitest';
import { FormulaRegistry } from '@/lib/formula-registry';

// Helper: run formula and assert output within tolerance
function assertFormula(id: string, inputs: number[], expected: number, tolerance = 0.01) {
  const result = FormulaRegistry.execute(id, ...inputs);
  expect(result.isValid).toBe(true);
  expect(result.confidence).toBeGreaterThan(0);
  expect(result.auditTrail).toBeTruthy();
  expect(Math.abs(result.output - expected)).toBeLessThanOrEqual(tolerance);
}

function assertFormulaWarnings(id: string, inputs: number[]) {
  const result = FormulaRegistry.execute(id, ...inputs);
  expect(result.warnings.length).toBeGreaterThan(0);
}

// ── Registry Meta ──

describe('FormulaRegistry — Meta', () => {
  it('has at least 15 formulas registered', () => {
    expect(FormulaRegistry.size).toBeGreaterThanOrEqual(15);
  });

  it('testAll passes with zero failures', () => {
    const { totalFailed } = FormulaRegistry.testAll();
    expect(totalFailed).toBe(0);
  });

  it('lists formulas by category', () => {
    expect(FormulaRegistry.byCategory('unit_economics').length).toBeGreaterThanOrEqual(2);
    expect(FormulaRegistry.byCategory('profitability').length).toBeGreaterThanOrEqual(3);
    expect(FormulaRegistry.byCategory('investment').length).toBeGreaterThanOrEqual(3);
  });

  it('throws on unknown formula', () => {
    expect(() => FormulaRegistry.execute('nonexistent_formula')).toThrow();
  });
});

// ── Unit Economics ──

describe('Formula: ltv', () => {
  it('SaaS $200/mo, 80% margin, 1 order, 24mo → 3840', () => {
    assertFormula('ltv', [200, 0.8, 1, 24], 3840);
  });

  it('E-com $50, 45% margin, 3 orders, 12mo → 810', () => {
    assertFormula('ltv', [50, 0.45, 3, 12], 810);
  });

  it('zero avg check → 0', () => {
    assertFormula('ltv', [0, 0.8, 1, 24], 0);
  });

  it('zero lifetime → 0', () => {
    assertFormula('ltv', [200, 0.8, 1, 0], 0);
  });

  it('high-value customer', () => {
    assertFormula('ltv', [500, 0.9, 2, 36], 32400);
  });
});

describe('Formula: ltv_cac_ratio', () => {
  it('healthy 6x ratio', () => {
    assertFormula('ltv_cac_ratio', [3000, 500], 6.0, 0.1);
  });

  it('poor 1x ratio', () => {
    assertFormula('ltv_cac_ratio', [500, 500], 1.0, 0.1);
  });

  it('zero CAC → 0 (safe division)', () => {
    assertFormula('ltv_cac_ratio', [3000, 0], 0, 0.1);
  });

  it('high ratio 100x', () => {
    assertFormula('ltv_cac_ratio', [10000, 100], 100.0, 0.1);
  });
});

describe('Formula: cac_payback', () => {
  it('$300 CAC / $100 contribution → 3 months', () => {
    assertFormula('cac_payback', [300, 100], 3);
  });

  it('zero contribution → 999', () => {
    assertFormula('cac_payback', [300, 0], 999);
  });

  it('instant payback (CAC < contribution) → 1', () => {
    assertFormula('cac_payback', [100, 200], 1);
  });

  it('long payback → 20', () => {
    assertFormula('cac_payback', [1000, 50], 20);
  });
});

// ── Profitability ──

describe('Formula: gross_profit', () => {
  it('profitable', () => assertFormula('gross_profit', [10000, 3000], 7000));
  it('break-even', () => assertFormula('gross_profit', [5000, 5000], 0));
  it('loss', () => assertFormula('gross_profit', [3000, 5000], -2000));
});

describe('Formula: gross_margin_percent', () => {
  it('SaaS-like 80%', () => assertFormula('gross_margin_percent', [8000, 10000], 80));
  it('retail-like 45%', () => assertFormula('gross_margin_percent', [4500, 10000], 45));
  it('zero revenue → 0', () => assertFormula('gross_margin_percent', [0, 0], 0));
});

describe('Formula: net_profit', () => {
  it('profitable', () => assertFormula('net_profit', [15000, 10000], 5000));
  it('loss', () => assertFormula('net_profit', [8000, 12000], -4000));
  it('break-even', () => assertFormula('net_profit', [10000, 10000], 0));
});

describe('Formula: net_margin_percent', () => {
  it('20% margin', () => assertFormula('net_margin_percent', [2000, 10000], 20));
  it('negative margin', () => assertFormula('net_margin_percent', [-3000, 10000], -30));
  it('zero revenue → 0', () => assertFormula('net_margin_percent', [0, 0], 0));
});

describe('Formula: cogs', () => {
  it('SaaS 20% COGS', () => assertFormula('cogs', [10000, 20], 2000));
  it('retail 55%', () => assertFormula('cogs', [10000, 55], 5500));
  it('zero revenue', () => assertFormula('cogs', [0, 35], 0));
});

// ── Investment ──

describe('Formula: payback_months', () => {
  it('normal payback → 10', () => assertFormula('payback_months', [50000, 5000], 10));
  it('quick payback → 1', () => assertFormula('payback_months', [10000, 10000], 1));
  it('unprofitable → 999', () => assertFormula('payback_months', [50000, -1000], 999));
  it('zero investment → 0', () => assertFormula('payback_months', [0, 5000], 0));
});

describe('Formula: roi_year1', () => {
  it('120% ROI', () => assertFormula('roi_year1', [5000, 50000], 120));
  it('negative ROI', () => assertFormula('roi_year1', [-2000, 50000], -48));
  it('zero investment → 0', () => assertFormula('roi_year1', [5000, 0], 0));
});

describe('Formula: npv_3year', () => {
  it('profitable business', () => assertFormula('npv_3year', [50000, 5000], 105932, 100));
  it('unprofitable', () => assertFormula('npv_3year', [50000, -1000], -81186, 100));
  it('zero investment', () => assertFormula('npv_3year', [0, 5000], 155932, 100));
});

describe('Formula: break_even_revenue', () => {
  it('normal break-even', () => assertFormula('break_even_revenue', [10000, 0.6], 16667));
  it('high margin', () => assertFormula('break_even_revenue', [5000, 0.9], 5556));
  it('zero margin → 0', () => assertFormula('break_even_revenue', [10000, 0], 0));
});

// ── Growth ──

describe('Formula: marketing_cost', () => {
  it('normal churn', () => assertFormula('marketing_cost', [100, 0.05, 200], 1000));
  it('no churn → 0', () => assertFormula('marketing_cost', [100, 0, 200], 0));
  it('high churn', () => assertFormula('marketing_cost', [50, 0.20, 100], 1000));
});

describe('Formula: location_adjusted_cost', () => {
  it('SF multiplier', () => assertFormula('location_adjusted_cost', [5000, 1.8], 9000));
  it('no adjustment', () => assertFormula('location_adjusted_cost', [5000, 1.0], 5000));
  it('discount location', () => assertFormula('location_adjusted_cost', [5000, 0.6], 3000));
});

// ── Mini Demo ──

describe('Formula: mini_annual_roi', () => {
  it('positive ROI 240%', () => assertFormula('mini_annual_roi', [2000, 10000], 240.0, 0.1));
  it('negative ROI', () => assertFormula('mini_annual_roi', [-500, 10000], -60.0, 0.1));
  it('zero investment → 0', () => assertFormula('mini_annual_roi', [2000, 0], 0, 0.1));
});

describe('Formula: mini_payback', () => {
  it('5 months', () => assertFormula('mini_payback', [10000, 2000], 5, 0.1));
  it('zero profit → 999', () => assertFormula('mini_payback', [10000, 0], 999));
  it('negative profit → 999', () => assertFormula('mini_payback', [10000, -500], 999));
});

describe('Formula: mini_net_margin', () => {
  it('20% margin', () => assertFormula('mini_net_margin', [2000, 10000], 20.0, 0.1));
  it('negative margin', () => assertFormula('mini_net_margin', [-3000, 10000], -30.0, 0.1));
  it('zero revenue → 0', () => assertFormula('mini_net_margin', [0, 0], 0, 0.1));
});

// ── Built-in Test Cases ──

describe('All formulas pass their built-in test cases', () => {
  const allFormulas = FormulaRegistry.list();
  for (const formula of allFormulas) {
    it(`${formula.id} passes all ${formula.testCases.length} test cases`, () => {
      const { passed, results } = FormulaRegistry.test(formula.id);
      for (const r of results) {
        if (!r.passed) {
          throw new Error(`${formula.id} test "${r.name}" failed: expected ${r.expected}, got ${r.actual}`);
        }
      }
      expect(passed).toBe(true);
    });
  }
});
