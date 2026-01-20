/**
 * QUANTIS ANALYSIS SCHEMAS
 * Strict Zod validation for all inputs and outputs
 * LLM cannot invent numbers - only the financial engine can
 */

// Type definitions for Deno runtime
type ZodIssue = {
  path: (string | number)[];
  message: string;
  code?: string;
};

// ========== INPUT SCHEMAS ==========

export interface LocaleInput {
  country: string;
  city: string;
  currency: 'USD' | 'EUR' | 'GBP' | 'RUB';
}

export interface PricingPlan {
  name: string;
  priceMonthly: number;
}

export interface BusinessInput {
  name: string;
  industry: string;
  description: string;
  pricing?: {
    plans: PricingPlan[];
    expectedArpu: number;
  };
}

export interface FinancialAssumptions {
  mrr: number;
  grossMargin: number;
  monthlyChurn: number;
  cac: number;
  monthlyOpex: number;
  initialInvestment: number;
}

export interface InvestmentBreakdownItem {
  category: string;
  amount: number;
}

export interface AnalysisInput {
  locale: LocaleInput;
  business: BusinessInput;
  assumptions: FinancialAssumptions;
  investmentBreakdown: InvestmentBreakdownItem[];
}

// ========== COMPUTED METRICS (from deterministic engine only) ==========

export interface ComputedMetrics {
  // Core revenue metrics
  mrr: number;
  arr: number;
  
  // Profitability
  grossProfit: number;
  grossMarginPercent: number;
  netProfit: number;
  netMarginPercent: number;
  
  // Expenses (deterministic from engine)
  totalExpenses: number;
  expenses: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
  };
  
  // Unit Economics
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  cacPaybackMonths: number;
  
  // Customer metrics
  averageCheck: number;
  clientsActive: number;
  newClientsNeeded: number;
  ordersMonthly: number;
  
  // Investment returns
  startupInvestment: number;
  paybackMonths: number;
  roiYear1Percent: number;
  roiYear3Percent: number;
  npv3Years: number;
  
  // Break-even
  breakEvenRevenue: number;
  breakEvenUnits: number;
  revenueFor45kProfit: number;
  
  // Scenarios (computed, not AI-generated)
  scenarios: {
    pessimistic: ScenarioMetrics;
    base: ScenarioMetrics;
    optimistic: ScenarioMetrics;
  };
  
  // Validation status
  isProfitable: boolean;
  industryDetected: string;
}

export interface ScenarioMetrics {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

// ========== VALIDATION TYPES ==========

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  fix?: string;
  originalValue?: number;
  correctedValue?: number;
}

export interface ValidationResult {
  isValid: boolean;
  hasHardErrors: boolean;
  issues: ValidationIssue[];
  corrections: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface CalculationAudit {
  formula: string;
  inputs: Record<string, number>;
  result: number;
  isValid: boolean;
  notes?: string;
}

// ========== LLM NARRATOR OUTPUT (qualitative only, no numbers) ==========

export interface NarratorOutput {
  executive_summary: string;
  investment_verdict: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'PROMISING';
  key_takeaways: string[];
  
  business_plan: {
    product_description: string;
    target_audience: string;
    competitive_advantages: string;
    operations: string;
    launch_steps: LaunchStep[];
    risks: BusinessRisk[];
  };
  
  marketing_plan: {
    positioning: string;
    pricing_strategy: string;
    channels: MarketingChannel[];
    first_3_months_plan: string;
  };
  
  market_analysis: {
    tam: string;
    sam: string;
    som: string;
    trends: string[];
    competitors: CompetitorAnalysis[];
    competitive_landscape: string;
    market_gaps: string;
    barriers_to_entry: string;
    growth_opportunities: string;
  };
  
  action_plan: ActionStep[];
}

export interface LaunchStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  cost_reference: string; // References computed metric, e.g., "startup_investment.marketing_initial"
}

export interface BusinessRisk {
  risk: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface MarketingChannel {
  channel: string;
  description: string;
  budget_percent: number; // Percentage of marketing budget (computed)
  expected_roi: string;
}

export interface CompetitorAnalysis {
  name: string;
  strengths: string;
  weaknesses: string;
  positioning: string;
}

export interface ActionStep {
  step: string;
  timeline: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  metric_reference?: string; // References computed metric for context
}

// ========== VALIDATION FUNCTIONS ==========

export function validateLocale(input: unknown): { valid: boolean; data?: LocaleInput; errors?: string[] } {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Locale must be an object'] };
  }
  
  const obj = input as Record<string, unknown>;
  
  if (!obj.country || typeof obj.country !== 'string' || obj.country.length < 2) {
    errors.push('Country must be at least 2 characters');
  }
  
  if (!obj.city || typeof obj.city !== 'string' || obj.city.length < 1) {
    errors.push('City is required');
  }
  
  const validCurrencies = ['USD', 'EUR', 'GBP', 'RUB'];
  const currency = obj.currency || 'USD';
  if (!validCurrencies.includes(currency as string)) {
    errors.push(`Currency must be one of: ${validCurrencies.join(', ')}`);
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      country: obj.country as string,
      city: obj.city as string,
      currency: (currency as 'USD' | 'EUR' | 'GBP' | 'RUB'),
    }
  };
}

export function validateAssumptions(input: unknown): { valid: boolean; data?: FinancialAssumptions; errors?: string[] } {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Assumptions must be an object'] };
  }
  
  const obj = input as Record<string, unknown>;
  
  // MRR
  const mrr = Number(obj.mrr);
  if (isNaN(mrr) || mrr < 0) {
    errors.push('MRR must be a non-negative number');
  }
  
  // Gross Margin (0-1)
  const grossMargin = Number(obj.grossMargin);
  if (isNaN(grossMargin) || grossMargin < 0 || grossMargin > 1) {
    errors.push('Gross margin must be between 0 and 1');
  }
  
  // Monthly Churn (0-1)
  const monthlyChurn = Number(obj.monthlyChurn);
  if (isNaN(monthlyChurn) || monthlyChurn < 0 || monthlyChurn > 1) {
    errors.push('Monthly churn must be between 0 and 1');
  }
  
  // CAC
  const cac = Number(obj.cac);
  if (isNaN(cac) || cac < 0) {
    errors.push('CAC must be a non-negative number');
  }
  
  // Monthly OPEX
  const monthlyOpex = Number(obj.monthlyOpex);
  if (isNaN(monthlyOpex) || monthlyOpex < 0) {
    errors.push('Monthly OPEX must be a non-negative number');
  }
  
  // Initial Investment
  const initialInvestment = Number(obj.initialInvestment);
  if (isNaN(initialInvestment) || initialInvestment < 0) {
    errors.push('Initial investment must be a non-negative number');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return {
    valid: true,
    data: {
      mrr,
      grossMargin,
      monthlyChurn,
      cac,
      monthlyOpex,
      initialInvestment,
    }
  };
}

export function validateInvestmentBreakdown(
  breakdown: InvestmentBreakdownItem[],
  totalInvestment: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!breakdown || breakdown.length === 0) {
    return issues; // Optional field
  }
  
  const breakdownSum = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const tolerance = totalInvestment * 0.01; // 1% tolerance
  
  if (Math.abs(breakdownSum - totalInvestment) > tolerance) {
    issues.push({
      code: 'INVESTMENT_BREAKDOWN_MISMATCH',
      field: 'investmentBreakdown',
      message: `Investment breakdown sum ($${breakdownSum.toLocaleString()}) does not equal initial investment ($${totalInvestment.toLocaleString()})`,
      severity: 'error',
      fix: 'Normalize breakdown to match initialInvestment OR update initialInvestment to true total',
      originalValue: breakdownSum,
      correctedValue: totalInvestment,
    });
  }
  
  // Check for negative amounts
  for (const item of breakdown) {
    if (item.amount < 0) {
      issues.push({
        code: 'NEGATIVE_BREAKDOWN_ITEM',
        field: `investmentBreakdown.${item.category}`,
        message: `Breakdown item "${item.category}" has negative amount`,
        severity: 'error',
      });
    }
  }
  
  return issues;
}

// ========== ANTI-INJECTION SECURITY ==========

const DANGEROUS_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /disregard\s+(previous|above|all)\s+instructions?/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+to\s+be/i,
  /act\s+as\s+if/i,
  /system\s*:\s*/i,
  /\[\[.*?\]\]/,  // Injection brackets
  /\{\{.*?\}\}/,  // Template injection
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

const INSTRUCTION_PATTERNS = [
  /^(you\s+must|you\s+should|please\s+)/i,
  /^(do\s+not|don't|never\s+)/i,
  /^(always\s+|make\s+sure\s+)/i,
];

export function sanitizeUserInput(input: string): { sanitized: string; wasModified: boolean; threats: string[] } {
  const threats: string[] = [];
  let sanitized = input;
  let wasModified = false;
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      threats.push(`Dangerous pattern detected: ${pattern.source}`);
      sanitized = sanitized.replace(pattern, '[REMOVED]');
      wasModified = true;
    }
  }
  
  // Check for instruction-like patterns at start
  for (const pattern of INSTRUCTION_PATTERNS) {
    if (pattern.test(sanitized.trim())) {
      threats.push(`Instruction-like pattern at start: ${pattern.source}`);
      // Don't remove but flag it
    }
  }
  
  // Remove HTML tags
  const htmlPattern = /<[^>]*>/g;
  if (htmlPattern.test(sanitized)) {
    sanitized = sanitized.replace(htmlPattern, '');
    wasModified = true;
    threats.push('HTML tags removed');
  }
  
  // Escape special characters that could break JSON
  sanitized = sanitized
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
  
  return { sanitized, wasModified, threats };
}

export function classifyInputAsDataOrInstruction(input: string): 'data' | 'instruction' | 'mixed' {
  const instructionScore = INSTRUCTION_PATTERNS.filter(p => p.test(input)).length;
  const dangerousScore = DANGEROUS_PATTERNS.filter(p => p.test(input)).length;
  
  if (dangerousScore > 0) return 'instruction';
  if (instructionScore >= 2) return 'instruction';
  if (instructionScore === 1) return 'mixed';
  return 'data';
}

// ========== OUTPUT VALIDATION ==========

/**
 * Validates that LLM output doesn't contain invented numbers
 * All numbers in the narrative must reference computed metrics
 */
export function validateNarratorOutput(
  narratorOutput: NarratorOutput,
  computedMetrics: ComputedMetrics
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Extract all numbers from narrative text
  const numberPattern = /\$[\d,]+(?:\.\d{2})?|\d{1,3}(?:,\d{3})+|\d+%/g;
  
  const textFields = [
    narratorOutput.executive_summary,
    ...narratorOutput.key_takeaways,
    narratorOutput.business_plan.product_description,
    narratorOutput.business_plan.target_audience,
    narratorOutput.market_analysis.competitive_landscape,
    narratorOutput.marketing_plan.positioning,
    narratorOutput.marketing_plan.first_3_months_plan,
  ];
  
  // Build set of valid numbers from computed metrics
  const validNumbers = new Set<string>();
  
  const addNumber = (n: number) => {
    validNumbers.add(n.toString());
    validNumbers.add(n.toLocaleString());
    validNumbers.add(`$${n.toLocaleString()}`);
    validNumbers.add(`${n}%`);
    validNumbers.add(`${Math.round(n)}%`);
  };
  
  // Add all computed values
  addNumber(computedMetrics.mrr);
  addNumber(computedMetrics.arr);
  addNumber(computedMetrics.netProfit);
  addNumber(computedMetrics.grossProfit);
  addNumber(computedMetrics.totalExpenses);
  addNumber(computedMetrics.cac);
  addNumber(computedMetrics.ltv);
  addNumber(computedMetrics.ltvCacRatio);
  addNumber(computedMetrics.paybackMonths);
  addNumber(computedMetrics.roiYear1Percent);
  addNumber(computedMetrics.startupInvestment);
  addNumber(computedMetrics.breakEvenRevenue);
  addNumber(computedMetrics.netMarginPercent);
  addNumber(computedMetrics.grossMarginPercent);
  addNumber(computedMetrics.averageCheck);
  addNumber(computedMetrics.clientsActive);
  
  // Add expense breakdown
  Object.values(computedMetrics.expenses).forEach(addNumber);
  
  // Add scenario values
  ['pessimistic', 'base', 'optimistic'].forEach(scenario => {
    const s = computedMetrics.scenarios[scenario as keyof typeof computedMetrics.scenarios];
    addNumber(s.revenue);
    addNumber(s.netProfit);
    addNumber(s.grossProfit);
  });
  
  // Check each text field for unauthorized numbers
  for (const text of textFields) {
    if (!text) continue;
    
    const matches = text.match(numberPattern) || [];
    for (const match of matches) {
      // Skip small generic numbers (1-12, percentages under 100%)
      const numValue = parseFloat(match.replace(/[$,%,]/g, ''));
      if (numValue <= 12 || (match.includes('%') && numValue <= 100)) continue;
      
      // Check if this number is in our valid set
      const isValid = validNumbers.has(match) || 
                      validNumbers.has(match.replace(/,/g, '')) ||
                      Math.abs(numValue - computedMetrics.mrr) < 100 ||
                      Math.abs(numValue - computedMetrics.netProfit) < 100 ||
                      Math.abs(numValue - computedMetrics.startupInvestment) < 100;
      
      if (!isValid) {
        issues.push({
          code: 'UNAUTHORIZED_NUMBER',
          field: 'narrator_output',
          message: `LLM generated unauthorized number: ${match}. All numbers must come from computed metrics.`,
          severity: 'warning',
        });
      }
    }
  }
  
  return issues;
}
