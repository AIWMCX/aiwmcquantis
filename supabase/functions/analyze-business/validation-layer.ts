/**
 * QUANTIS TRUST FIX - VALIDATION LAYER
 * 
 * THE GATE: Validates all inputs and outputs for consistency.
 * BLOCKS PDF generation if hard errors are found.
 * This is what prevents contradictory tables in the PDF.
 */

import type { 
  ComputedMetrics, 
  ValidationIssue, 
  ValidationResult,
  CalculationAudit,
  NarratorOutput,
  InvestmentBreakdownItem,
  ExpenseBreakdown,
} from './schemas.ts';
import type { IndustryBenchmarks } from './financial-engine.ts';

// ========== VALIDATION CONFIGURATION ==========

export interface ValidationConfig {
  minLtvCacRatio: number;
  maxPaybackMonths: number;
  minNetMarginPercent: number;
  maxStartupInvestment: number;
  breakdownSumTolerance: number;
  allowUnprofitable: boolean;
  strictMode: boolean;
}

export const DEFAULT_CONFIG: ValidationConfig = {
  minLtvCacRatio: 2.0,
  maxPaybackMonths: 60,
  minNetMarginPercent: -50,
  maxStartupInvestment: 10_000_000,
  breakdownSumTolerance: 0.05, // 5%
  allowUnprofitable: true, // Still generate PDF but flag it
  strictMode: false,
};

// ========== HARD FAIL CODES (block PDF) ==========

const HARD_FAIL_CODES = [
  'INVESTMENT_BREAKDOWN_MISMATCH',
  'EXPENSE_BREAKDOWN_MISMATCH',
  'SCENARIO_INCONSISTENCY',
  'CAC_PAYBACK_EXCEEDS_LIFETIME',
  'NEVER_PAYS_BACK_WITH_LOSS',
  'MARGIN_UNSUSTAINABLE',
  'INTERNAL_CALCULATION_ERROR',
];

// ========== MAIN VALIDATION FUNCTION ==========

export function validateAnalysis(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  narratorOutput: NarratorOutput | null,
  audit: CalculationAudit[],
  investmentBreakdown: InvestmentBreakdownItem[] = [],
  config: ValidationConfig = DEFAULT_CONFIG
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const corrections: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  
  // ===== 1. INVESTMENT BREAKDOWN CONSISTENCY (CRITICAL) =====
  if (investmentBreakdown.length > 0) {
    const breakdownSum = investmentBreakdown.reduce((sum, item) => sum + item.amount, 0);
    const tolerance = metrics.startupInvestment * config.breakdownSumTolerance;
    
    if (Math.abs(breakdownSum - metrics.startupInvestment) > tolerance) {
      issues.push({
        code: 'INVESTMENT_BREAKDOWN_MISMATCH',
        field: 'investmentBreakdown',
        message: `Investment breakdown sum ($${breakdownSum.toLocaleString()}) ≠ total investment ($${metrics.startupInvestment.toLocaleString()})`,
        severity: 'error',
        fix: 'Normalize breakdown to match initialInvestment OR update initialInvestment to true total',
        originalValue: breakdownSum,
        correctedValue: metrics.startupInvestment,
      });
    }
  }
  
  // ===== 2. EXPENSE BREAKDOWN CONSISTENCY (CRITICAL) =====
  const expenseSum = Object.values(metrics.expenses).reduce((a, b) => a + b, 0);
  const expenseDiff = Math.abs(expenseSum - metrics.totalExpenses);
  
  if (expenseDiff > 1) { // Allow $1 rounding error
    issues.push({
      code: 'EXPENSE_BREAKDOWN_MISMATCH',
      field: 'expenses',
      message: `Expense breakdown sum ($${expenseSum.toLocaleString()}) ≠ total expenses ($${metrics.totalExpenses.toLocaleString()})`,
      severity: 'error',
      fix: 'Internal calculation error - expense breakdown is inconsistent',
      originalValue: expenseSum,
      correctedValue: metrics.totalExpenses,
    });
  }
  
  // ===== 3. SCENARIO CONSISTENCY (CRITICAL) =====
  // Pessimistic must be worse than base
  if (metrics.scenarios.pessimistic.netProfit > metrics.scenarios.base.netProfit) {
    issues.push({
      code: 'SCENARIO_INCONSISTENCY',
      field: 'scenarios',
      message: 'Pessimistic scenario shows higher profit than base scenario',
      severity: 'error',
      fix: 'Scenario calculations are internally inconsistent',
    });
  }
  
  // Optimistic must be better than base
  if (metrics.scenarios.optimistic.netProfit < metrics.scenarios.base.netProfit) {
    issues.push({
      code: 'SCENARIO_INCONSISTENCY',
      field: 'scenarios',
      message: 'Optimistic scenario shows lower profit than base scenario',
      severity: 'error',
      fix: 'Scenario calculations are internally inconsistent',
    });
  }
  
  // ===== 4. PROFITABILITY VALIDATION =====
  if (!metrics.isProfitable) {
    const issue: ValidationIssue = {
      code: 'UNPROFITABLE_BUSINESS',
      field: 'netProfit',
      message: `Business shows monthly loss of $${Math.abs(metrics.netProfit).toLocaleString()}`,
      severity: config.allowUnprofitable ? 'warning' : 'error',
      fix: `Increase revenue to $${metrics.breakEvenRevenue.toLocaleString()}/mo for break-even`,
    };
    
    if (config.allowUnprofitable) {
      warnings.push(issue);
    } else {
      issues.push(issue);
    }
    
    // Additional hard fail: if unprofitable AND payback says it pays back
    if (metrics.paybackMonths > 0 && metrics.paybackMonths < 999) {
      issues.push({
        code: 'NEVER_PAYS_BACK_WITH_LOSS',
        field: 'paybackMonths',
        message: 'Payback period calculated but business is unprofitable - contradictory',
        severity: 'error',
        fix: 'Payback can only be calculated for profitable businesses',
      });
    }
  }
  
  // ===== 5. UNIT ECONOMICS VALIDATION =====
  // LTV:CAC check
  if (metrics.ltvCacRatio < config.minLtvCacRatio) {
    const issue: ValidationIssue = {
      code: 'LTV_CAC_TOO_LOW',
      field: 'ltvCacRatio',
      message: `LTV:CAC ratio of ${metrics.ltvCacRatio}x is below minimum ${config.minLtvCacRatio}x`,
      severity: metrics.ltvCacRatio < 1.5 ? 'error' : 'warning',
      fix: `Reduce CAC to $${Math.round(metrics.ltv / 3)} for 3x ratio, or increase LTV`,
    };
    
    if (metrics.ltvCacRatio < 1.5) {
      issues.push(issue);
    } else {
      warnings.push(issue);
    }
  }
  
  // CAC payback vs customer lifetime
  if (metrics.cacPaybackMonths > benchmarks.client_lifetime_months && metrics.cacPaybackMonths < 999) {
    issues.push({
      code: 'CAC_PAYBACK_EXCEEDS_LIFETIME',
      field: 'cacPaybackMonths',
      message: `CAC payback (${metrics.cacPaybackMonths}mo) > customer lifetime (${benchmarks.client_lifetime_months}mo)`,
      severity: 'error',
      fix: 'Customers leave before you recover acquisition cost - reduce CAC or increase retention',
    });
  }
  
  // ===== 6. MARGIN VALIDATION =====
  if (metrics.netMarginPercent < config.minNetMarginPercent) {
    issues.push({
      code: 'MARGIN_UNSUSTAINABLE',
      field: 'netMarginPercent',
      message: `Net margin of ${metrics.netMarginPercent}% is unsustainable (below ${config.minNetMarginPercent}%)`,
      severity: 'error',
      fix: 'Reduce costs or increase prices significantly',
    });
  }
  
  if (metrics.netMarginPercent < benchmarks.net_margin_min && metrics.netMarginPercent >= 0) {
    warnings.push({
      code: 'MARGIN_BELOW_INDUSTRY',
      field: 'netMarginPercent',
      message: `Net margin ${metrics.netMarginPercent}% is below ${benchmarks.name} minimum of ${benchmarks.net_margin_min}%`,
      severity: 'warning',
      fix: `Optimize to reach ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}% margin`,
    });
  }
  
  // ===== 7. PAYBACK VALIDATION =====
  if (metrics.paybackMonths > config.maxPaybackMonths && metrics.paybackMonths < 999) {
    warnings.push({
      code: 'PAYBACK_TOO_LONG',
      field: 'paybackMonths',
      message: `Payback period of ${metrics.paybackMonths} months exceeds ${config.maxPaybackMonths} month threshold`,
      severity: 'warning',
      fix: 'Consider reducing initial investment or increasing profitability',
    });
  }
  
  if (metrics.paybackMonths === 999 && metrics.isProfitable === false) {
    // This is expected - just a warning
    warnings.push({
      code: 'NO_PAYBACK_UNPROFITABLE',
      field: 'paybackMonths',
      message: 'Investment cannot pay back - business is not profitable',
      severity: 'warning',
      fix: 'Reach profitability first, then payback becomes possible',
    });
  }
  
  // ===== 8. ROI VALIDATION =====
  if (metrics.roiYear1Percent < -100) {
    warnings.push({
      code: 'ROI_SEVERELY_NEGATIVE',
      field: 'roiYear1Percent',
      message: `Year 1 ROI of ${metrics.roiYear1Percent}% indicates severe losses`,
      severity: 'warning',
      fix: 'Business model may need fundamental restructuring',
    });
  }
  
  // ===== 9. EXPENSE RATIO CHECKS =====
  if (metrics.mrr > 0) {
    const salaryRatio = metrics.expenses.salaries / metrics.mrr;
    if (salaryRatio > 0.6) {
      warnings.push({
        code: 'HIGH_SALARY_RATIO',
        field: 'expenses.salaries',
        message: `Salaries consume ${Math.round(salaryRatio * 100)}% of revenue`,
        severity: 'warning',
        fix: 'Consider automation or revenue growth to improve efficiency',
      });
    }
    
    const marketingRatio = metrics.expenses.marketing / metrics.mrr;
    if (marketingRatio > 0.4) {
      warnings.push({
        code: 'HIGH_MARKETING_RATIO',
        field: 'expenses.marketing',
        message: `Marketing consumes ${Math.round(marketingRatio * 100)}% of revenue`,
        severity: 'warning',
        fix: 'Focus on organic growth channels',
      });
    }
  }
  
  // ===== 10. CALCULATION AUDIT VALIDATION =====
  const failedCalculations = audit.filter(a => !a.isValid);
  for (const calc of failedCalculations) {
    warnings.push({
      code: 'CALCULATION_OUTSIDE_RANGE',
      field: calc.formula,
      message: `Calculation outside expected range: ${calc.notes || calc.formula}`,
      severity: 'warning',
    });
  }
  
  // ===== 11. NARRATOR OUTPUT VALIDATION =====
  if (narratorOutput) {
    if (!narratorOutput.executive_summary || narratorOutput.executive_summary.length < 100) {
      warnings.push({
        code: 'EMPTY_EXECUTIVE_SUMMARY',
        field: 'executive_summary',
        message: 'Executive summary is missing or too short',
        severity: 'warning',
      });
    }
    
    if (narratorOutput.key_takeaways.length < 3) {
      warnings.push({
        code: 'FEW_TAKEAWAYS',
        field: 'key_takeaways',
        message: 'Less than 3 key takeaways provided',
        severity: 'warning',
      });
    }
  }
  
  // ===== COLLECT CORRECTIONS =====
  for (const issue of [...issues, ...warnings]) {
    if (issue.originalValue !== undefined && issue.correctedValue !== undefined) {
      corrections.push(issue);
    }
  }
  
  // ===== DETERMINE IF PDF CAN BE GENERATED =====
  const hasHardErrors = issues.some(i => HARD_FAIL_CODES.includes(i.code));
  const canGeneratePdf = !hasHardErrors;
  
  let blockingReason: string | undefined;
  if (!canGeneratePdf) {
    const blockingIssues = issues.filter(i => HARD_FAIL_CODES.includes(i.code));
    blockingReason = `Critical issues: ${blockingIssues.map(i => i.message).join('; ')}`;
  }
  
  return {
    isValid: !hasHardErrors,
    hasHardErrors,
    canGeneratePdf,
    issues,
    corrections,
    warnings,
    blockingReason,
  };
}

// ========== PDF GATE CHECK ==========

export function canGeneratePdf(validation: ValidationResult): { allowed: boolean; reason?: string } {
  if (!validation.canGeneratePdf) {
    return {
      allowed: false,
      reason: validation.blockingReason || 'Analysis has critical issues that must be resolved',
    };
  }
  return { allowed: true };
}

// ========== IMPROVEMENT SUGGESTIONS ==========

export function generateImprovementSuggestions(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  validation: ValidationResult,
  userProvidedDataCount: number,
  documentDataCount: number
): string[] {
  const suggestions: string[] = [];
  
  if (userProvidedDataCount < 3) {
    suggestions.push('Expand "Advanced Financial Details" to add investment, revenue, and cost estimates');
  }
  
  if (documentDataCount === 0) {
    suggestions.push('Upload business documents (invoices, revenue statements) for data-driven analysis');
  }
  
  if (metrics.industryDetected === 'General Business') {
    suggestions.push('Select a specific industry from the dropdown for more accurate benchmarks');
  }
  
  if (!metrics.isProfitable) {
    const revenueIncrease = metrics.mrr > 0 
      ? Math.round((metrics.breakEvenRevenue - metrics.mrr) / metrics.mrr * 100) 
      : 100;
    suggestions.push(`Increase revenue by ${revenueIncrease}% to reach break-even at $${metrics.breakEvenRevenue.toLocaleString()}/mo`);
  }
  
  if (metrics.ltvCacRatio < 3) {
    suggestions.push(`Improve LTV:CAC ratio from ${metrics.ltvCacRatio}x to 3x+ through better retention or lower CAC`);
  }
  
  if (metrics.paybackMonths > 24 && metrics.paybackMonths < 999) {
    suggestions.push(`Reduce payback period from ${metrics.paybackMonths} to under 24 months`);
  }
  
  // Add top validation fixes
  for (const issue of validation.warnings.slice(0, 2)) {
    if (issue.fix) {
      suggestions.push(issue.fix);
    }
  }
  
  return suggestions.slice(0, 5);
}

// ========== FORMAT VALIDATION FOR DISPLAY ==========

export function formatValidationSummary(validation: ValidationResult): string {
  const lines: string[] = [];
  
  if (validation.hasHardErrors) {
    lines.push('## ⛔ CRITICAL ISSUES (PDF BLOCKED)');
    lines.push('');
    for (const issue of validation.issues.filter(i => i.severity === 'error')) {
      lines.push(`- **${issue.code}**: ${issue.message}`);
      if (issue.fix) lines.push(`  - *Fix*: ${issue.fix}`);
    }
    lines.push('');
    lines.push('> Fix these issues before generating the report.');
  }
  
  if (validation.warnings.length > 0) {
    lines.push('');
    lines.push('## ⚠️ Warnings');
    lines.push('');
    for (const warning of validation.warnings.slice(0, 5)) {
      lines.push(`- ${warning.message}`);
    }
  }
  
  if (validation.corrections.length > 0) {
    lines.push('');
    lines.push('## 🔧 Auto-Corrections Applied');
    lines.push('');
    for (const correction of validation.corrections) {
      lines.push(`- ${correction.field}: ${correction.originalValue} → ${correction.correctedValue}`);
    }
  }
  
  return lines.join('\n');
}
