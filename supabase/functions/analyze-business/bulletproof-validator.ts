/**
 * QUANTIS™ 2.0 - BULLETPROOF VALIDATION ENGINE
 * 
 * CRITICAL: This is the GATE that prevents garbage data from entering the system.
 * All inputs are validated, reconciled, and scored before analysis.
 * 
 * Features:
 * - Schema validation for all required fields
 * - Data consistency checks (revenue = customers × price)
 * - Expense reconciliation (line items must match total)
 * - Business logic validation (ratios checked against thresholds)
 * - Health scoring (0-100 scores for data quality & viability)
 * - Auto-correction of common errors with full audit trail
 */

// ========== VALIDATION ERROR TYPES ==========

export type ValidationSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
  originalValue?: number | string;
  expectedValue?: number | string;
  correctedValue?: number | string;
  suggestedFix?: string;
  impact?: string;
}

export interface AutoCorrection {
  field: string;
  original: number;
  corrected: number;
  reason: string;
  formula?: string;
}

// ========== INPUT DATA STRUCTURE ==========

export interface ExpenseInput {
  rent?: number;
  utilities?: number;
  salaries?: number;
  marketing?: number;
  inventory?: number;
  supplies?: number;
  software?: number;
  insurance?: number;
  other?: number;
  total?: number;  // User-provided total to validate against sum
}

export interface CustomerMetricsInput {
  totalCustomers?: number;
  payingCustomers?: number;
  conversionRate?: number;
}

export interface PricingInput {
  pricePerUnit: number;
  pricingModel: 'one-time' | 'subscription' | 'usage-based' | 'tiered';
  billingCycle?: 'monthly' | 'annual' | 'one-time';
}

export interface UnitEconomicsInput {
  cac?: number;
  ltv?: number;
  retentionMonths?: number;
  churnRate?: number;
}

export interface GrowthInput {
  customerGrowthRate?: number;
  churnRate?: number;
  revenueGrowthRate?: number;
}

export interface BusinessInput {
  // Required fields
  businessName: string;
  businessType: 'product' | 'service' | 'saas' | 'marketplace' | 'ecommerce' | 'other';
  
  // Core financial inputs
  initialInvestment?: number;
  monthlyRevenue?: number;
  
  // Customer data
  customerMetrics?: CustomerMetricsInput;
  
  // Pricing
  pricing: PricingInput;
  
  // Expenses - either total or breakdown
  expenses?: ExpenseInput;
  monthlyExpenses?: number;  // Alternative to detailed breakdown
  
  // Growth projections
  growth?: GrowthInput;
  
  // Unit economics
  unitEconomics?: UnitEconomicsInput;
  
  // Context
  industry?: string;
  location?: string;
}

// ========== VALIDATION THRESHOLDS ==========

export interface ValidationThresholds {
  // Revenue sanity checks
  minRevenuePerCustomer: number;
  maxRevenuePerCustomer: number;
  minConversionRate: number;
  maxConversionRate: number;
  
  // Expense ratio thresholds
  maxSalaryToRevenueRatio: number;
  salaryWarningThreshold: number;
  maxMarketingToRevenueRatio: number;
  
  // Unit economics thresholds
  minLtvCacRatio: number;
  idealLtvCacRatio: number;
  maxCacPaybackMonths: number;
  
  // Profitability thresholds
  minGrossMargin: number;
  idealGrossMargin: number;
  maxPaybackMonths: number;
  
  // Data quality thresholds
  expenseSumTolerance: number;  // % difference allowed between sum and total
  revenueTolerance: number;      // % difference allowed in revenue calculation
}

export const DEFAULT_THRESHOLDS: ValidationThresholds = {
  minRevenuePerCustomer: 1,
  maxRevenuePerCustomer: 100000,
  minConversionRate: 0.001,  // 0.1%
  maxConversionRate: 1.0,     // 100%
  
  maxSalaryToRevenueRatio: 10,
  salaryWarningThreshold: 5,
  maxMarketingToRevenueRatio: 0.5,
  
  minLtvCacRatio: 3,
  idealLtvCacRatio: 5,
  maxCacPaybackMonths: 12,
  
  minGrossMargin: 0.20,
  idealGrossMargin: 0.70,
  maxPaybackMonths: 36,
  
  expenseSumTolerance: 0.05,  // 5%
  revenueTolerance: 0.10,     // 10%
};

// ========== HEALTH SCORE STRUCTURE ==========

export interface HealthScores {
  dataQualityScore: number;       // 0-100: How complete/consistent is the data?
  businessViabilityScore: number; // 0-100: Is this a viable business model?
  overallHealthScore: number;     // 0-100: Combined weighted score
  breakdown: {
    schemaCompleteness: number;
    dataConsistency: number;
    expenseReconciliation: number;
    profitability: number;
    unitEconomics: number;
    riskProfile: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
}

// ========== VALIDATION RESULT ==========

export interface BulletproofValidationResult {
  isValid: boolean;
  hasCriticalErrors: boolean;
  canProceed: boolean;  // Can we generate analysis despite issues?
  
  // Errors and warnings
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  
  // Auto-corrections applied
  corrections: AutoCorrection[];
  
  // Calculated/reconciled metrics
  calculatedMetrics: {
    // Revenue reconciliation
    calculatedRevenue: number;
    providedRevenue: number | null;
    revenueSource: 'calculated' | 'provided' | 'corrected';
    
    // Expense reconciliation
    expenseLineItemSum: number;
    providedExpenseTotal: number | null;
    reconciledExpenseTotal: number;
    expenseSource: 'sum' | 'provided' | 'corrected';
    
    // Derived metrics
    calculatedMRR: number;
    calculatedARR: number;
    monthlyNetProfit: number;
    netMarginPercent: number;
    grossMarginPercent: number;
    paybackPeriodMonths: number | null;
    paybackDisplay: string;
    
    // Health scores
    dataQualityScore: number;
    businessViabilityScore: number;
    overallHealthScore: number;
  };
  
  // Health assessment
  healthScores: HealthScores;
  
  // Suggestions for improvement
  improvementSuggestions: string[];
  
  // Audit trail
  validationTimestamp: string;
  validationVersion: string;
}

// ========== MAIN VALIDATION FUNCTION ==========

export function validateBusinessInput(
  input: BusinessInput,
  thresholds: ValidationThresholds = DEFAULT_THRESHOLDS
): BulletproofValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const infos: ValidationError[] = [];
  const corrections: AutoCorrection[] = [];
  const suggestions: string[] = [];
  
  // Track health score components
  let schemaCompleteness = 100;
  let dataConsistency = 100;
  let expenseReconciliation = 100;
  let profitabilityScore = 100;
  let unitEconomicsScore = 100;
  let riskProfileScore = 100;

  // ===== 1. SCHEMA VALIDATION =====
  
  // 1.1 Required field checks
  if (!input.businessName || input.businessName.trim().length < 2) {
    errors.push({
      code: 'MISSING_BUSINESS_NAME',
      field: 'businessName',
      message: 'Business name is required and must be at least 2 characters',
      severity: 'error',
      suggestedFix: 'Provide a valid business name'
    });
    schemaCompleteness -= 15;
  }
  
  if (!input.pricing || typeof input.pricing.pricePerUnit !== 'number') {
    errors.push({
      code: 'MISSING_PRICING',
      field: 'pricing.pricePerUnit',
      message: 'Price per unit is required',
      severity: 'critical',
      suggestedFix: 'Provide your product/service price'
    });
    schemaCompleteness -= 25;
  }
  
  // 1.2 Validate numeric ranges
  if (input.pricing?.pricePerUnit !== undefined) {
    if (input.pricing.pricePerUnit <= 0) {
      errors.push({
        code: 'INVALID_PRICE',
        field: 'pricing.pricePerUnit',
        message: 'Price must be greater than 0',
        severity: 'critical',
        originalValue: input.pricing.pricePerUnit,
        suggestedFix: 'Enter a positive price value'
      });
      schemaCompleteness -= 20;
    } else if (input.pricing.pricePerUnit > 1000000) {
      warnings.push({
        code: 'UNUSUALLY_HIGH_PRICE',
        field: 'pricing.pricePerUnit',
        message: `Price of $${input.pricing.pricePerUnit.toLocaleString()} is unusually high`,
        severity: 'warning',
        originalValue: input.pricing.pricePerUnit,
        suggestedFix: 'Verify this is the correct unit price'
      });
    }
  }
  
  // ===== 2. REVENUE VALIDATION & RECONCILIATION =====
  
  let calculatedRevenue = 0;
  let providedRevenue: number | null = null;
  let revenueSource: 'calculated' | 'provided' | 'corrected' = 'calculated';
  
  // Calculate expected revenue from customer data
  if (input.customerMetrics?.payingCustomers && input.pricing?.pricePerUnit) {
    const billingMultiplier = input.pricing.billingCycle === 'annual' ? 1/12 : 1;
    calculatedRevenue = Math.round(
      input.customerMetrics.payingCustomers * 
      input.pricing.pricePerUnit * 
      billingMultiplier
    );
  } else if (input.customerMetrics?.totalCustomers && input.customerMetrics?.conversionRate && input.pricing?.pricePerUnit) {
    const payingCustomers = Math.round(input.customerMetrics.totalCustomers * input.customerMetrics.conversionRate);
    const billingMultiplier = input.pricing.billingCycle === 'annual' ? 1/12 : 1;
    calculatedRevenue = Math.round(payingCustomers * input.pricing.pricePerUnit * billingMultiplier);
  }
  
  // Compare with provided revenue
  if (input.monthlyRevenue !== undefined && input.monthlyRevenue > 0) {
    providedRevenue = input.monthlyRevenue;
    
    if (calculatedRevenue > 0) {
      const revenueDifference = Math.abs(providedRevenue - calculatedRevenue);
      const differencePercent = revenueDifference / Math.max(providedRevenue, calculatedRevenue);
      
      if (differencePercent > thresholds.revenueTolerance) {
        // Significant mismatch - flag it and use calculated
        errors.push({
          code: 'REVENUE_MISMATCH',
          field: 'monthlyRevenue',
          message: `Revenue mismatch: Provided $${providedRevenue.toLocaleString()} but calculated $${calculatedRevenue.toLocaleString()} from ${input.customerMetrics?.payingCustomers || 0} customers × $${input.pricing?.pricePerUnit || 0}`,
          severity: 'error',
          originalValue: providedRevenue,
          expectedValue: calculatedRevenue,
          correctedValue: calculatedRevenue,
          suggestedFix: 'Verify customer count and pricing are correct'
        });
        
        corrections.push({
          field: 'monthlyRevenue',
          original: providedRevenue,
          corrected: calculatedRevenue,
          reason: `Revenue recalculated from customer data: ${input.customerMetrics?.payingCustomers || 0} × $${input.pricing?.pricePerUnit || 0}`,
          formula: 'Revenue = Paying_Customers × Price_Per_Unit'
        });
        
        revenueSource = 'corrected';
        dataConsistency -= 25;
      } else {
        revenueSource = 'provided';
      }
    } else {
      revenueSource = 'provided';
      calculatedRevenue = providedRevenue;
    }
  } else if (calculatedRevenue === 0) {
    warnings.push({
      code: 'NO_REVENUE_DATA',
      field: 'monthlyRevenue',
      message: 'No revenue data provided or calculable',
      severity: 'warning',
      suggestedFix: 'Provide monthly revenue or customer metrics with pricing'
    });
    suggestions.push('Add revenue estimate or customer count for accurate analysis');
    schemaCompleteness -= 20;
  }
  
  const finalRevenue = revenueSource === 'corrected' ? calculatedRevenue : 
                       (providedRevenue || calculatedRevenue);
  
  // ===== 3. EXPENSE RECONCILIATION =====
  
  let expenseLineItemSum = 0;
  let providedExpenseTotal: number | null = null;
  let reconciledExpenseTotal = 0;
  let expenseSource: 'sum' | 'provided' | 'corrected' = 'sum';
  
  if (input.expenses) {
    // Sum all expense line items
    const expenseItems = [
      input.expenses.rent || 0,
      input.expenses.utilities || 0,
      input.expenses.salaries || 0,
      input.expenses.marketing || 0,
      input.expenses.inventory || 0,
      input.expenses.supplies || 0,
      input.expenses.software || 0,
      input.expenses.insurance || 0,
      input.expenses.other || 0,
    ];
    expenseLineItemSum = expenseItems.reduce((sum, item) => sum + item, 0);
    
    // Check if total was provided
    if (input.expenses.total !== undefined && input.expenses.total > 0) {
      providedExpenseTotal = input.expenses.total;
      
      const expenseDifference = Math.abs(providedExpenseTotal - expenseLineItemSum);
      const differencePercent = expenseLineItemSum > 0 
        ? expenseDifference / expenseLineItemSum 
        : 1;
      
      if (differencePercent > thresholds.expenseSumTolerance) {
        // CRITICAL: Expense mismatch - this is what caused the "$500 vs $6,005" bug
        errors.push({
          code: 'EXPENSE_BREAKDOWN_MISMATCH',
          field: 'expenses',
          message: `Expense mismatch: Line items sum to $${expenseLineItemSum.toLocaleString()} but total shows $${providedExpenseTotal.toLocaleString()}`,
          severity: 'error',
          originalValue: providedExpenseTotal,
          expectedValue: expenseLineItemSum,
          correctedValue: expenseLineItemSum,
          suggestedFix: 'Using sum of line items as correct total',
          impact: 'Incorrect expense total leads to wrong profit calculations'
        });
        
        corrections.push({
          field: 'expenses.total',
          original: providedExpenseTotal,
          corrected: expenseLineItemSum,
          reason: 'Sum of expense line items differs from provided total',
          formula: 'Total = Rent + Utilities + Salaries + Marketing + Other'
        });
        
        reconciledExpenseTotal = expenseLineItemSum;  // ALWAYS use sum
        expenseSource = 'corrected';
        expenseReconciliation -= 40;
        dataConsistency -= 20;
      } else {
        // Close enough - use provided
        reconciledExpenseTotal = providedExpenseTotal;
        expenseSource = 'provided';
      }
    } else {
      reconciledExpenseTotal = expenseLineItemSum;
      expenseSource = 'sum';
    }
  } else if (input.monthlyExpenses !== undefined && input.monthlyExpenses > 0) {
    // Only total provided, no breakdown
    reconciledExpenseTotal = input.monthlyExpenses;
    expenseSource = 'provided';
    infos.push({
      code: 'NO_EXPENSE_BREAKDOWN',
      field: 'expenses',
      message: 'Only total expenses provided - no category breakdown available',
      severity: 'info',
      suggestedFix: 'Provide expense breakdown for more detailed analysis'
    });
    suggestions.push('Add expense breakdown (rent, salaries, marketing) for better insights');
  }
  
  // ===== 4. PROFITABILITY CALCULATIONS =====
  
  const monthlyNetProfit = finalRevenue - reconciledExpenseTotal;
  const netMarginPercent = finalRevenue > 0 
    ? Math.round((monthlyNetProfit / finalRevenue) * 100) 
    : 0;
  const grossMarginPercent = finalRevenue > 0 
    ? Math.round(((finalRevenue - (input.expenses?.inventory || 0)) / finalRevenue) * 100) 
    : 0;
  
  // Calculate payback period
  let paybackPeriodMonths: number | null = null;
  let paybackDisplay = 'Not calculable';
  
  if (input.initialInvestment && input.initialInvestment > 0) {
    if (monthlyNetProfit > 0) {
      paybackPeriodMonths = Math.ceil(input.initialInvestment / monthlyNetProfit);
      paybackDisplay = `${paybackPeriodMonths} months`;
      
      if (paybackPeriodMonths > thresholds.maxPaybackMonths) {
        warnings.push({
          code: 'PAYBACK_TOO_LONG',
          field: 'paybackPeriod',
          message: `Payback period of ${paybackPeriodMonths} months exceeds ${thresholds.maxPaybackMonths} month threshold`,
          severity: 'warning',
          suggestedFix: 'Reduce initial investment or increase monthly profitability'
        });
        profitabilityScore -= 20;
      }
    } else if (monthlyNetProfit <= 0) {
      // THIS IS THE FIX FOR "999 months" - clear messaging
      paybackPeriodMonths = null;
      paybackDisplay = 'Never (Business loses money monthly)';
      
      errors.push({
        code: 'UNPROFITABLE_NO_PAYBACK',
        field: 'netProfit',
        message: `Business is unprofitable with monthly loss of $${Math.abs(monthlyNetProfit).toLocaleString()}. Investment cannot be recovered.`,
        severity: 'error',
        suggestedFix: 'Increase revenue or reduce costs to reach profitability first',
        impact: 'Cannot calculate investment payback for unprofitable business'
      });
      
      profitabilityScore -= 50;
    }
  }
  
  // ===== 5. UNIT ECONOMICS VALIDATION =====
  
  if (input.unitEconomics?.cac !== undefined && input.unitEconomics?.ltv !== undefined) {
    const cac = input.unitEconomics.cac;
    const ltv = input.unitEconomics.ltv;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    
    if (ltvCacRatio < thresholds.minLtvCacRatio) {
      const severity = ltvCacRatio < 1.5 ? 'critical' : 'error';
      
      errors.push({
        code: 'LTV_CAC_BELOW_MINIMUM',
        field: 'unitEconomics.ltvCacRatio',
        message: `LTV:CAC ratio of ${ltvCacRatio.toFixed(1)}:1 is below minimum viable ${thresholds.minLtvCacRatio}:1`,
        severity,
        originalValue: ltvCacRatio,
        expectedValue: thresholds.minLtvCacRatio,
        suggestedFix: `Reduce CAC to $${Math.round(ltv / thresholds.minLtvCacRatio)} or increase LTV to $${Math.round(cac * thresholds.minLtvCacRatio)}`,
        impact: 'Customers cost more to acquire than they generate in revenue'
      });
      
      unitEconomicsScore -= severity === 'critical' ? 40 : 25;
      suggestions.push('Reduce customer acquisition cost through organic marketing channels');
      suggestions.push('Increase customer lifetime value through better retention');
    }
  }
  
  // ===== 6. EXPENSE RATIO WARNINGS =====
  
  if (input.expenses?.salaries && finalRevenue > 0) {
    const salaryRatio = input.expenses.salaries / finalRevenue;
    
    if (salaryRatio > thresholds.maxSalaryToRevenueRatio) {
      errors.push({
        code: 'UNSUSTAINABLE_SALARY_COSTS',
        field: 'expenses.salaries',
        message: `Salaries ($${input.expenses.salaries.toLocaleString()}) are ${salaryRatio.toFixed(1)}x revenue ($${finalRevenue.toLocaleString()})`,
        severity: 'critical',
        originalValue: salaryRatio,
        suggestedFix: 'Restructure team to equity compensation, reduce roles, or dramatically increase revenue',
        impact: 'Salary costs alone exceed revenue - business cannot survive'
      });
      
      riskProfileScore -= 50;
    } else if (salaryRatio > thresholds.salaryWarningThreshold) {
      warnings.push({
        code: 'HIGH_SALARY_RATIO',
        field: 'expenses.salaries',
        message: `Salaries consume ${Math.round(salaryRatio * 100)}% of revenue`,
        severity: 'warning',
        suggestedFix: 'Consider automation or outsourcing to reduce labor costs'
      });
      
      riskProfileScore -= 15;
    }
  }
  
  // ===== 7. CALCULATE HEALTH SCORES =====
  
  // Data Quality Score (weighted average of schema, consistency, reconciliation)
  const dataQualityScore = Math.max(0, Math.round(
    (schemaCompleteness * 0.3) + 
    (dataConsistency * 0.4) + 
    (expenseReconciliation * 0.3)
  ));
  
  // Business Viability Score (weighted average of profitability, unit economics, risk)
  const businessViabilityScore = Math.max(0, Math.round(
    (profitabilityScore * 0.4) + 
    (unitEconomicsScore * 0.35) + 
    (riskProfileScore * 0.25)
  ));
  
  // Overall Health Score
  const overallHealthScore = Math.round(
    (dataQualityScore * 0.5) + 
    (businessViabilityScore * 0.5)
  );
  
  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  let summary: string;
  
  if (overallHealthScore >= 90) {
    grade = 'A';
    summary = 'Excellent data quality and strong business viability';
  } else if (overallHealthScore >= 75) {
    grade = 'B';
    summary = 'Good overall health with minor issues';
  } else if (overallHealthScore >= 60) {
    grade = 'C';
    summary = 'Fair health - address warnings for better accuracy';
  } else if (overallHealthScore >= 40) {
    grade = 'D';
    summary = 'Poor health - significant issues need attention';
  } else {
    grade = 'F';
    summary = 'Critical issues - data or business model needs major revision';
  }
  
  const healthScores: HealthScores = {
    dataQualityScore,
    businessViabilityScore,
    overallHealthScore,
    breakdown: {
      schemaCompleteness,
      dataConsistency,
      expenseReconciliation,
      profitability: profitabilityScore,
      unitEconomics: unitEconomicsScore,
      riskProfile: riskProfileScore,
    },
    grade,
    summary
  };
  
  // ===== 8. DETERMINE VALIDATION STATUS =====
  
  const hasCriticalErrors = errors.some(e => e.severity === 'critical');
  const isValid = errors.length === 0;
  
  // Can proceed if no critical errors (analysis with warnings is OK)
  const canProceed = !hasCriticalErrors;
  
  return {
    isValid,
    hasCriticalErrors,
    canProceed,
    errors,
    warnings,
    infos,
    corrections,
    calculatedMetrics: {
      calculatedRevenue,
      providedRevenue,
      revenueSource,
      expenseLineItemSum,
      providedExpenseTotal,
      reconciledExpenseTotal,
      expenseSource,
      calculatedMRR: finalRevenue,
      calculatedARR: finalRevenue * 12,
      monthlyNetProfit,
      netMarginPercent,
      grossMarginPercent,
      paybackPeriodMonths,
      paybackDisplay,
      dataQualityScore,
      businessViabilityScore,
      overallHealthScore,
    },
    healthScores,
    improvementSuggestions: suggestions.slice(0, 5),
    validationTimestamp: new Date().toISOString(),
    validationVersion: '2.0.0',
  };
}

// ========== QUICK VALIDATION HELPERS ==========

/**
 * Quick check if input has minimum required fields
 */
export function hasMinimumRequiredFields(input: Partial<BusinessInput>): boolean {
  return !!(
    input.businessName && 
    input.pricing?.pricePerUnit &&
    input.pricing.pricePerUnit > 0
  );
}

/**
 * Calculate revenue from customer metrics and pricing
 */
export function calculateExpectedRevenue(
  customerMetrics: CustomerMetricsInput,
  pricing: PricingInput
): number {
  if (!customerMetrics || !pricing || !pricing.pricePerUnit) return 0;
  
  let payingCustomers = customerMetrics.payingCustomers || 0;
  
  if (!payingCustomers && customerMetrics.totalCustomers && customerMetrics.conversionRate) {
    payingCustomers = Math.round(customerMetrics.totalCustomers * customerMetrics.conversionRate);
  }
  
  const billingMultiplier = pricing.billingCycle === 'annual' ? 1/12 : 1;
  return Math.round(payingCustomers * pricing.pricePerUnit * billingMultiplier);
}

/**
 * Sum expense breakdown items
 */
export function sumExpenseBreakdown(expenses: ExpenseInput): number {
  return (expenses.rent || 0) +
         (expenses.utilities || 0) +
         (expenses.salaries || 0) +
         (expenses.marketing || 0) +
         (expenses.inventory || 0) +
         (expenses.supplies || 0) +
         (expenses.software || 0) +
         (expenses.insurance || 0) +
         (expenses.other || 0);
}

/**
 * Validate LTV:CAC ratio and return assessment
 */
export function assessLtvCacRatio(ltv: number, cac: number): {
  ratio: number;
  status: 'excellent' | 'healthy' | 'warning' | 'danger';
  message: string;
} {
  if (cac <= 0) {
    return { ratio: 0, status: 'danger', message: 'CAC cannot be zero or negative' };
  }
  
  const ratio = ltv / cac;
  
  if (ratio >= 5) {
    return { ratio, status: 'excellent', message: `Excellent LTV:CAC of ${ratio.toFixed(1)}:1` };
  } else if (ratio >= 3) {
    return { ratio, status: 'healthy', message: `Healthy LTV:CAC of ${ratio.toFixed(1)}:1` };
  } else if (ratio >= 1.5) {
    return { ratio, status: 'warning', message: `Below-target LTV:CAC of ${ratio.toFixed(1)}:1 - optimize acquisition` };
  } else {
    return { ratio, status: 'danger', message: `Critical LTV:CAC of ${ratio.toFixed(1)}:1 - customers cost more than they're worth` };
  }
}

/**
 * Format payback period for display (fixes "999 months" issue)
 */
export function formatPaybackPeriod(
  investment: number,
  monthlyProfit: number
): { months: number | null; display: string; recommendation?: string } {
  if (investment <= 0) {
    return { months: null, display: 'No initial investment' };
  }
  
  if (monthlyProfit <= 0) {
    return {
      months: null,
      display: 'Never (Business loses money monthly)',
      recommendation: 'Focus on reaching profitability before calculating payback'
    };
  }
  
  const months = Math.ceil(investment / monthlyProfit);
  
  if (months > 60) {
    return {
      months,
      display: `${months} months (${(months / 12).toFixed(1)} years)`,
      recommendation: 'Consider reducing initial investment or increasing profitability'
    };
  }
  
  return {
    months,
    display: `${months} months`,
    recommendation: months > 24 ? 'Target payback within 24 months for lower risk' : undefined
  };
}
