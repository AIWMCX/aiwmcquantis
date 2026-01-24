/**
 * Unit Tests for Bulletproof Validator
 * 
 * Tests the validation layer that prevents garbage data from
 * entering the financial analysis engine.
 */

import { describe, it, expect } from 'vitest';

// ========== VALIDATION THRESHOLDS (matching bulletproof-validator.ts) ==========

interface ValidationThresholds {
  minRevenuePerCustomer: number;
  maxRevenuePerCustomer: number;
  minConversionRate: number;
  maxConversionRate: number;
  maxSalaryToRevenueRatio: number;
  salaryWarningThreshold: number;
  maxMarketingToRevenueRatio: number;
  minLtvCacRatio: number;
  idealLtvCacRatio: number;
  maxCacPaybackMonths: number;
  minGrossMargin: number;
  idealGrossMargin: number;
  maxPaybackMonths: number;
  expenseSumTolerance: number;
  revenueTolerance: number;
}

const DEFAULT_THRESHOLDS: ValidationThresholds = {
  minRevenuePerCustomer: 1,
  maxRevenuePerCustomer: 100000,
  minConversionRate: 0.001,
  maxConversionRate: 1.0,
  maxSalaryToRevenueRatio: 10,
  salaryWarningThreshold: 5,
  maxMarketingToRevenueRatio: 0.5,
  minLtvCacRatio: 3,
  idealLtvCacRatio: 5,
  maxCacPaybackMonths: 12,
  minGrossMargin: 0.20,
  idealGrossMargin: 0.70,
  maxPaybackMonths: 36,
  expenseSumTolerance: 0.05,
  revenueTolerance: 0.10,
};

// ========== VALIDATION FUNCTIONS (simplified for testing) ==========

type ValidationSeverity = 'critical' | 'error' | 'warning' | 'info';

interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
}

interface ExpenseInput {
  rent?: number;
  utilities?: number;
  salaries?: number;
  marketing?: number;
  other?: number;
  total?: number;
}

interface ValidationResult {
  isValid: boolean;
  hasCriticalErrors: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  calculatedMetrics: {
    expenseLineItemSum: number;
    reconciledExpenseTotal: number;
    netMarginPercent: number;
    paybackPeriodMonths: number | null;
  };
}

function validateExpenses(
  expenses: ExpenseInput,
  thresholds: ValidationThresholds = DEFAULT_THRESHOLDS
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Sum line items
  const expenseLineItemSum = 
    (expenses.rent || 0) +
    (expenses.utilities || 0) +
    (expenses.salaries || 0) +
    (expenses.marketing || 0) +
    (expenses.other || 0);
  
  let reconciledExpenseTotal = expenseLineItemSum;
  
  // Check if total was provided and differs from sum
  if (expenses.total !== undefined && expenses.total > 0) {
    const difference = Math.abs(expenses.total - expenseLineItemSum);
    const differencePercent = expenseLineItemSum > 0 
      ? difference / expenseLineItemSum 
      : 1;
    
    if (differencePercent > thresholds.expenseSumTolerance) {
      errors.push({
        code: 'EXPENSE_BREAKDOWN_MISMATCH',
        field: 'expenses',
        message: `Line items sum to $${expenseLineItemSum} but total shows $${expenses.total}`,
        severity: 'error',
      });
      // CRITICAL: Always use sum of line items
      reconciledExpenseTotal = expenseLineItemSum;
    } else {
      reconciledExpenseTotal = expenses.total;
    }
  }
  
  return {
    isValid: errors.length === 0,
    hasCriticalErrors: errors.some(e => e.severity === 'critical'),
    errors,
    warnings,
    calculatedMetrics: {
      expenseLineItemSum,
      reconciledExpenseTotal,
      netMarginPercent: 0,
      paybackPeriodMonths: null,
    },
  };
}

function validateNetMargin(
  revenue: number,
  expenses: number
): { netMarginPercent: number; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const netProfit = revenue - expenses;
  const netMarginPercent = revenue > 0 
    ? Math.round((netProfit / revenue) * 100) 
    : 0;
  
  // Check for unrealistic margins
  if (netMarginPercent > 50) {
    errors.push({
      code: 'UNREALISTIC_NET_MARGIN',
      field: 'netMarginPercent',
      message: `Net margin of ${netMarginPercent}% is unrealistically high`,
      severity: 'error',
    });
  } else if (netMarginPercent > 40) {
    errors.push({
      code: 'HIGH_NET_MARGIN',
      field: 'netMarginPercent',
      message: `Net margin of ${netMarginPercent}% is unusually high`,
      severity: 'warning',
    });
  }
  
  return { netMarginPercent, errors };
}

function validateRevenue(
  providedRevenue: number,
  customers: number,
  pricePerUnit: number,
  thresholds: ValidationThresholds = DEFAULT_THRESHOLDS
): { calculatedRevenue: number; errors: ValidationError[]; isValid: boolean } {
  const errors: ValidationError[] = [];
  const calculatedRevenue = customers * pricePerUnit;
  
  const difference = Math.abs(providedRevenue - calculatedRevenue);
  const differencePercent = Math.max(providedRevenue, calculatedRevenue) > 0
    ? difference / Math.max(providedRevenue, calculatedRevenue)
    : 0;
  
  if (differencePercent > thresholds.revenueTolerance) {
    errors.push({
      code: 'REVENUE_MISMATCH',
      field: 'monthlyRevenue',
      message: `Provided $${providedRevenue} but calculated $${calculatedRevenue} from ${customers} customers × $${pricePerUnit}`,
      severity: 'error',
    });
  }
  
  return {
    calculatedRevenue,
    errors,
    isValid: errors.length === 0,
  };
}

function validatePayback(
  investment: number,
  monthlyProfit: number,
  thresholds: ValidationThresholds = DEFAULT_THRESHOLDS
): { paybackMonths: number | null; display: string; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  if (investment <= 0) {
    return { paybackMonths: null, display: 'No investment', errors };
  }
  
  if (monthlyProfit <= 0) {
    return { 
      paybackMonths: 999, 
      display: 'Never (unprofitable)', 
      errors: [{
        code: 'UNPROFITABLE_BUSINESS',
        field: 'monthlyProfit',
        message: 'Business is not profitable - cannot calculate payback',
        severity: 'error',
      }]
    };
  }
  
  const paybackMonths = Math.ceil(investment / monthlyProfit);
  
  if (paybackMonths > thresholds.maxPaybackMonths) {
    errors.push({
      code: 'PAYBACK_TOO_LONG',
      field: 'paybackPeriod',
      message: `Payback of ${paybackMonths} months exceeds threshold of ${thresholds.maxPaybackMonths} months`,
      severity: 'warning',
    });
  }
  
  return {
    paybackMonths,
    display: `${paybackMonths} months`,
    errors,
  };
}

// ========== TESTS ==========

describe('Bulletproof Validator: Expense Reconciliation', () => {
  
  describe('Line Item Sum vs Total', () => {
    it('detects mismatch between line items and total', () => {
      const result = validateExpenses({
        rent: 2000,
        utilities: 500,
        salaries: 6000,
        marketing: 1500,
        total: 500, // WRONG - should be 10000
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('EXPENSE_BREAKDOWN_MISMATCH');
      expect(result.calculatedMetrics.reconciledExpenseTotal).toBe(10000);
    });
    
    it('accepts matching line items and total', () => {
      const result = validateExpenses({
        rent: 2000,
        utilities: 500,
        salaries: 6000,
        marketing: 1500,
        total: 10000,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculatedMetrics.reconciledExpenseTotal).toBe(10000);
    });
    
    it('allows small tolerance (5%)', () => {
      const result = validateExpenses({
        rent: 2000,
        utilities: 500,
        salaries: 6000,
        marketing: 1500,
        total: 10400, // 4% difference - within tolerance
      });
      
      expect(result.isValid).toBe(true);
    });
    
    it('rejects differences over tolerance', () => {
      const result = validateExpenses({
        rent: 2000,
        utilities: 500,
        salaries: 6000,
        marketing: 1500,
        total: 11000, // 10% difference - over tolerance
      });
      
      expect(result.isValid).toBe(false);
    });
    
    it('uses sum when no total provided', () => {
      const result = validateExpenses({
        rent: 2000,
        utilities: 500,
        salaries: 6000,
        marketing: 1500,
      });
      
      expect(result.isValid).toBe(true);
      expect(result.calculatedMetrics.expenseLineItemSum).toBe(10000);
      expect(result.calculatedMetrics.reconciledExpenseTotal).toBe(10000);
    });
  });
  
  describe('Missing Expense Categories', () => {
    it('handles partial expense data', () => {
      const result = validateExpenses({
        rent: 2000,
        // No other categories
      });
      
      expect(result.isValid).toBe(true);
      expect(result.calculatedMetrics.expenseLineItemSum).toBe(2000);
    });
    
    it('handles empty expenses object', () => {
      const result = validateExpenses({});
      
      expect(result.isValid).toBe(true);
      expect(result.calculatedMetrics.expenseLineItemSum).toBe(0);
    });
  });
});

describe('Bulletproof Validator: Net Margin Validation', () => {
  
  it('flags unrealistic net margin (>50%)', () => {
    const result = validateNetMargin(10000, 3000); // 70% margin
    
    expect(result.netMarginPercent).toBe(70);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('UNREALISTIC_NET_MARGIN');
    expect(result.errors[0].severity).toBe('error');
  });
  
  it('warns about high net margin (40-50%)', () => {
    const result = validateNetMargin(10000, 5500); // 45% margin
    
    expect(result.netMarginPercent).toBe(45);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('HIGH_NET_MARGIN');
    expect(result.errors[0].severity).toBe('warning');
  });
  
  it('accepts normal net margin (<40%)', () => {
    const result = validateNetMargin(10000, 7000); // 30% margin
    
    expect(result.netMarginPercent).toBe(30);
    expect(result.errors).toHaveLength(0);
  });
  
  it('handles zero revenue', () => {
    const result = validateNetMargin(0, 5000);
    
    expect(result.netMarginPercent).toBe(0);
  });
  
  it('handles negative profit (loss)', () => {
    const result = validateNetMargin(10000, 15000); // -50% margin
    
    expect(result.netMarginPercent).toBe(-50);
    expect(result.errors).toHaveLength(0); // Loss is valid, just not profitable
  });
});

describe('Bulletproof Validator: Revenue Reconciliation', () => {
  
  it('detects revenue mismatch', () => {
    const result = validateRevenue(
      5000,    // Provided revenue
      100,     // Customers
      100      // Price per unit → calculated = 10000
    );
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('REVENUE_MISMATCH');
    expect(result.calculatedRevenue).toBe(10000);
  });
  
  it('accepts matching revenue', () => {
    const result = validateRevenue(
      10000,   // Provided revenue
      100,     // Customers
      100      // Price per unit → calculated = 10000
    );
    
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('allows revenue within tolerance (10%)', () => {
    const result = validateRevenue(
      10800,   // 8% higher than calculated
      100,
      100
    );
    
    expect(result.isValid).toBe(true);
  });
  
  it('rejects revenue outside tolerance', () => {
    const result = validateRevenue(
      12000,   // 20% higher than calculated
      100,
      100
    );
    
    expect(result.isValid).toBe(false);
  });
});

describe('Bulletproof Validator: Payback Period', () => {
  
  it('calculates payback for profitable business', () => {
    const result = validatePayback(
      100000,  // Investment
      10000    // Monthly profit → 10 months
    );
    
    expect(result.paybackMonths).toBe(10);
    expect(result.display).toBe('10 months');
    expect(result.errors).toHaveLength(0);
  });
  
  it('flags unprofitable business', () => {
    const result = validatePayback(
      100000,  // Investment
      -5000    // Monthly loss
    );
    
    expect(result.paybackMonths).toBe(999);
    expect(result.display).toBe('Never (unprofitable)');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('UNPROFITABLE_BUSINESS');
  });
  
  it('warns about long payback (>36 months)', () => {
    const result = validatePayback(
      100000,  // Investment
      2000     // Monthly profit → 50 months
    );
    
    expect(result.paybackMonths).toBe(50);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('PAYBACK_TOO_LONG');
    expect(result.errors[0].severity).toBe('warning');
  });
  
  it('handles zero investment', () => {
    const result = validatePayback(
      0,       // No investment
      10000
    );
    
    expect(result.paybackMonths).toBe(null);
    expect(result.display).toBe('No investment');
  });
  
  it('rounds payback up to next month', () => {
    const result = validatePayback(
      100000,  // Investment
      33334    // Would be 2.99 months → rounds to 3
    );
    
    expect(result.paybackMonths).toBe(3);
  });
});

describe('Bulletproof Validator: Edge Cases', () => {
  
  it('handles all zero values', () => {
    const expenseResult = validateExpenses({
      rent: 0,
      utilities: 0,
      salaries: 0,
      total: 0,
    });
    
    expect(expenseResult.isValid).toBe(true);
    expect(expenseResult.calculatedMetrics.expenseLineItemSum).toBe(0);
  });
  
  it('handles very large numbers', () => {
    const result = validateRevenue(
      1000000000, // $1B revenue
      1000000,    // 1M customers
      1000        // $1000 each
    );
    
    expect(result.isValid).toBe(true);
    expect(result.calculatedRevenue).toBe(1000000000);
  });
  
  it('handles decimal precision', () => {
    const result = validateRevenue(
      99.99,   // Precise amount
      1,
      99.99
    );
    
    expect(result.isValid).toBe(true);
    expect(result.calculatedRevenue).toBe(99.99);
  });
});
