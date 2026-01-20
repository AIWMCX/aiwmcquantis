/**
 * QUANTIS VALIDATION LAYER
 * 
 * Validates all inputs and outputs for consistency.
 * Blocks PDF generation if hard errors are found.
 * Provides fix suggestions for all issues.
 */

import type { 
  ComputedMetrics, 
  ValidationIssue, 
  ValidationResult,
  CalculationAudit,
  NarratorOutput 
} from './schemas.ts';
import type { IndustryBenchmarks } from './financial-engine.ts';

// ========== VALIDATION CONFIGURATION ==========

export interface ValidationConfig {
  // Thresholds
  minLtvCacRatio: number;
  maxPaybackMonths: number;
  minNetMarginPercent: number;
  maxStartupInvestment: number;
  
  // Tolerances
  breakdownSumTolerance: number; // % tolerance for investment breakdown sum
  
  // Flags
  allowUnprofitable: boolean;
  strictMode: boolean;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minLtvCacRatio: 2.0,
  maxPaybackMonths: 60,
  minNetMarginPercent: -50, // Allow losses up to 50%
  maxStartupInvestment: 10_000_000,
  breakdownSumTolerance: 0.05, // 5%
  allowUnprofitable: true, // Allow unprofitable analyses (just flag them)
  strictMode: false,
};

// ========== MAIN VALIDATION FUNCTION ==========

export function validateAnalysis(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  narratorOutput: NarratorOutput | null,
  audit: CalculationAudit[],
  config: ValidationConfig = DEFAULT_VALIDATION_CONFIG
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const corrections: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  
  // ===== 1. PROFITABILITY VALIDATION =====
  
  if (!metrics.isProfitable) {
    const issue: ValidationIssue = {
      code: 'UNPROFITABLE_BUSINESS',
      field: 'netProfit',
      message: `Business shows monthly loss of $${Math.abs(metrics.netProfit).toLocaleString()}`,
      severity: config.allowUnprofitable ? 'warning' : 'error',
      fix: `Increase revenue to $${metrics.breakEvenRevenue.toLocaleString()}/mo for break-even, or $${metrics.revenueFor45kProfit.toLocaleString()}/mo for $45k profit`,
    };
    
    if (config.allowUnprofitable) {
      warnings.push(issue);
    } else {
      issues.push(issue);
    }
  }
  
  // ===== 2. UNIT ECONOMICS VALIDATION =====
  
  // LTV:CAC ratio check
  if (metrics.ltvCacRatio < config.minLtvCacRatio) {
    const issue: ValidationIssue = {
      code: 'LTV_CAC_TOO_LOW',
      field: 'ltvCacRatio',
      message: `LTV:CAC ratio of ${metrics.ltvCacRatio}x is below minimum ${config.minLtvCacRatio}x`,
      severity: metrics.ltvCacRatio < 1.5 ? 'error' : 'warning',
      fix: `Reduce CAC from $${metrics.cac} to $${Math.round(metrics.ltv / 3)} for 3x ratio, or increase LTV`,
    };
    
    if (metrics.ltvCacRatio < 1.5) {
      issues.push(issue);
    } else {
      warnings.push(issue);
    }
  }
  
  // CAC payback vs lifetime
  if (metrics.cacPaybackMonths > benchmarks.client_lifetime_months) {
    issues.push({
      code: 'CAC_PAYBACK_EXCEEDS_LIFETIME',
      field: 'cacPaybackMonths',
      message: `CAC payback (${metrics.cacPaybackMonths} months) exceeds customer lifetime (${benchmarks.client_lifetime_months} months)`,
      severity: 'error',
      fix: 'Customer acquisition cost is too high relative to customer value. Reduce CAC or increase retention.',
    });
  }
  
  // ===== 3. INVESTMENT RETURN VALIDATION =====
  
  if (metrics.paybackMonths > config.maxPaybackMonths && metrics.paybackMonths < 999) {
    warnings.push({
      code: 'PAYBACK_TOO_LONG',
      field: 'paybackMonths',
      message: `Payback period of ${metrics.paybackMonths} months exceeds ${config.maxPaybackMonths} month threshold`,
      severity: 'warning',
      fix: 'Consider reducing initial investment or increasing monthly profitability',
    });
  }
  
  if (metrics.paybackMonths === 999) {
    issues.push({
      code: 'NEVER_PAYS_BACK',
      field: 'paybackMonths',
      message: 'Investment will never pay back at current projections (business is unprofitable)',
      severity: 'error',
      fix: 'Business must become profitable before investment can be recovered',
    });
  }
  
  if (metrics.roiYear1Percent < -100) {
    issues.push({
      code: 'ROI_SEVERELY_NEGATIVE',
      field: 'roiYear1Percent',
      message: `Year 1 ROI of ${metrics.roiYear1Percent}% indicates severe losses`,
      severity: 'error',
      fix: 'Business model needs fundamental restructuring',
    });
  }
  
  // ===== 4. MARGIN VALIDATION =====
  
  if (metrics.netMarginPercent < config.minNetMarginPercent) {
    issues.push({
      code: 'MARGIN_TOO_LOW',
      field: 'netMarginPercent',
      message: `Net margin of ${metrics.netMarginPercent}% is unsustainable`,
      severity: 'error',
      fix: 'Reduce costs or increase prices significantly',
    });
  }
  
  if (metrics.netMarginPercent < benchmarks.net_margin_min && metrics.netMarginPercent >= 0) {
    warnings.push({
      code: 'MARGIN_BELOW_INDUSTRY',
      field: 'netMarginPercent',
      message: `Net margin ${metrics.netMarginPercent}% is below ${benchmarks.name} industry minimum of ${benchmarks.net_margin_min}%`,
      severity: 'warning',
      fix: `Optimize to reach ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}% margin`,
    });
  }
  
  // ===== 5. SCENARIO CONSISTENCY VALIDATION =====
  
  // Pessimistic should be worse than base
  if (metrics.scenarios.pessimistic.netProfit > metrics.scenarios.base.netProfit) {
    issues.push({
      code: 'SCENARIO_INCONSISTENCY',
      field: 'scenarios',
      message: 'Pessimistic scenario shows higher profit than base scenario',
      severity: 'error',
      fix: 'Scenario calculations are inconsistent - engine error',
    });
  }
  
  // Optimistic should be better than base
  if (metrics.scenarios.optimistic.netProfit < metrics.scenarios.base.netProfit) {
    issues.push({
      code: 'SCENARIO_INCONSISTENCY',
      field: 'scenarios',
      message: 'Optimistic scenario shows lower profit than base scenario',
      severity: 'error',
      fix: 'Scenario calculations are inconsistent - engine error',
    });
  }
  
  // ===== 6. EXPENSE STRUCTURE VALIDATION =====
  
  const expenseSum = Object.values(metrics.expenses).reduce((a, b) => a + b, 0);
  const expenseDiff = Math.abs(expenseSum - metrics.totalExpenses);
  
  if (expenseDiff > 1) { // Allow $1 rounding error
    issues.push({
      code: 'EXPENSE_BREAKDOWN_MISMATCH',
      field: 'expenses',
      message: `Expense breakdown sum ($${expenseSum.toLocaleString()}) doesn't match total ($${metrics.totalExpenses.toLocaleString()})`,
      severity: 'error',
      fix: 'Internal calculation error - expense breakdown is inconsistent',
    });
  }
  
  // Check for suspiciously high individual expenses
  if (metrics.mrr > 0) {
    const salaryRatio = metrics.expenses.salaries / metrics.mrr;
    if (salaryRatio > 0.6) {
      warnings.push({
        code: 'HIGH_SALARY_RATIO',
        field: 'expenses.salaries',
        message: `Salaries consume ${Math.round(salaryRatio * 100)}% of revenue - unusually high`,
        severity: 'warning',
        fix: 'Consider automation or revenue growth to improve efficiency',
      });
    }
    
    const marketingRatio = metrics.expenses.marketing / metrics.mrr;
    if (marketingRatio > 0.4) {
      warnings.push({
        code: 'HIGH_MARKETING_RATIO',
        field: 'expenses.marketing',
        message: `Marketing consumes ${Math.round(marketingRatio * 100)}% of revenue - may be unsustainable`,
        severity: 'warning',
        fix: 'Focus on organic growth channels to reduce dependency on paid acquisition',
      });
    }
  }
  
  // ===== 7. NARRATOR OUTPUT VALIDATION (if provided) =====
  
  if (narratorOutput) {
    // Check for empty critical sections
    if (!narratorOutput.executive_summary || narratorOutput.executive_summary.length < 100) {
      warnings.push({
        code: 'EMPTY_EXECUTIVE_SUMMARY',
        field: 'executive_summary',
        message: 'Executive summary is missing or too short',
        severity: 'warning',
        fix: 'AI should provide comprehensive executive summary',
      });
    }
    
    if (narratorOutput.key_takeaways.length < 3) {
      warnings.push({
        code: 'FEW_TAKEAWAYS',
        field: 'key_takeaways',
        message: 'Less than 3 key takeaways provided',
        severity: 'warning',
        fix: 'Analysis should include at least 3 strategic takeaways',
      });
    }
    
    if (narratorOutput.business_plan.launch_steps.length < 3) {
      warnings.push({
        code: 'FEW_LAUNCH_STEPS',
        field: 'launch_steps',
        message: 'Less than 3 launch steps provided',
        severity: 'warning',
        fix: 'Business plan should include detailed launch roadmap',
      });
    }
  }
  
  // ===== 8. CALCULATION AUDIT VALIDATION =====
  
  const failedCalculations = audit.filter(a => !a.isValid);
  if (failedCalculations.length > 0) {
    for (const calc of failedCalculations) {
      warnings.push({
        code: 'CALCULATION_OUTSIDE_RANGE',
        field: calc.formula,
        message: `Calculation result outside expected range: ${calc.notes}`,
        severity: 'warning',
      });
    }
  }
  
  // ===== BUILD RESULT =====
  
  // Collect corrections (issues that were auto-corrected by engine)
  for (const issue of issues.concat(warnings)) {
    if (issue.originalValue !== undefined && issue.correctedValue !== undefined) {
      corrections.push(issue);
    }
  }
  
  const hasHardErrors = issues.some(i => i.severity === 'error');
  
  return {
    isValid: !hasHardErrors || config.allowUnprofitable,
    hasHardErrors,
    issues,
    corrections,
    warnings,
  };
}

// ========== GENERATE IMPROVEMENT SUGGESTIONS ==========

export function generateImprovementSuggestions(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  validation: ValidationResult,
  userProvidedDataCount: number,
  documentDataCount: number
): string[] {
  const suggestions: string[] = [];
  
  // Input quality suggestions
  if (userProvidedDataCount < 3) {
    suggestions.push('Expand "Advanced Financial Details" to add investment, revenue, and cost estimates for higher accuracy');
  }
  
  if (documentDataCount === 0) {
    suggestions.push('Upload business documents (invoices, revenue statements) for data-driven analysis');
  }
  
  // Industry-specific
  if (metrics.industryDetected === 'General Business') {
    suggestions.push('Select a specific industry from the dropdown for more accurate benchmarks');
  }
  
  // Metric improvement suggestions
  if (!metrics.isProfitable) {
    const revenueIncrease = Math.round((metrics.breakEvenRevenue - metrics.mrr) / metrics.mrr * 100);
    suggestions.push(`Increase revenue by ${revenueIncrease}% to reach break-even at $${metrics.breakEvenRevenue.toLocaleString()}/mo`);
  }
  
  if (metrics.ltvCacRatio < 3) {
    suggestions.push(`Improve LTV:CAC ratio from ${metrics.ltvCacRatio}x to 3x+ through better retention or lower CAC`);
  }
  
  if (metrics.paybackMonths > 24 && metrics.paybackMonths < 999) {
    suggestions.push(`Reduce payback period from ${metrics.paybackMonths} to under 24 months through profitability improvements`);
  }
  
  // Validation-based suggestions
  for (const issue of validation.warnings.slice(0, 2)) {
    if (issue.fix) {
      suggestions.push(issue.fix);
    }
  }
  
  return suggestions.slice(0, 5); // Max 5 suggestions
}

// ========== CHECK IF PDF GENERATION IS ALLOWED ==========

export function canGeneratePdf(validation: ValidationResult): { allowed: boolean; reason?: string } {
  if (validation.hasHardErrors) {
    const errorMessages = validation.issues
      .filter(i => i.severity === 'error')
      .map(i => i.message)
      .join('; ');
    
    return {
      allowed: false,
      reason: `Analysis has critical issues that must be resolved: ${errorMessages}`,
    };
  }
  
  return { allowed: true };
}

// ========== FORMAT VALIDATION FOR DISPLAY ==========

export function formatValidationSummary(validation: ValidationResult): string {
  const lines: string[] = [];
  
  if (validation.hasHardErrors) {
    lines.push('## ⚠️ Critical Issues Detected');
    lines.push('');
    for (const issue of validation.issues.filter(i => i.severity === 'error')) {
      lines.push(`- **${issue.code}**: ${issue.message}`);
      if (issue.fix) lines.push(`  - *Fix*: ${issue.fix}`);
    }
  }
  
  if (validation.warnings.length > 0) {
    lines.push('');
    lines.push('## ⚡ Warnings');
    lines.push('');
    for (const warning of validation.warnings) {
      lines.push(`- ${warning.message}`);
    }
  }
  
  if (validation.corrections.length > 0) {
    lines.push('');
    lines.push('## 🔧 Auto-Corrections Applied');
    lines.push('');
    for (const correction of validation.corrections) {
      lines.push(`- ${correction.field}: ${correction.originalValue} → ${correction.correctedValue}`);
      if (correction.fix) lines.push(`  - *Reason*: ${correction.fix}`);
    }
  }
  
  return lines.join('\n');
}
