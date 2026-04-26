/**
 * QUANTIS TRUST FIX - STRICT SCHEMAS
 * 
 * Single source of truth for all data contracts.
 * Zod-like validation without external dependencies.
 * LLM cannot invent numbers - only the financial engine can.
 */

// ========== CURRENCY & LOCALE ==========

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'RUB';

export interface LocaleInput {
  country: string;
  city: string;
  currency: CurrencyCode;
}

// ========== INVESTMENT BREAKDOWN ==========

export interface InvestmentBreakdownItem {
  category: string;
  amount: number;
}

// ========== EXPENSE BREAKDOWN ==========

export interface ExpenseBreakdown {
  cogs: number;
  salaries: number;
  rent: number;
  utilities: number;
  marketing: number;
  other: number;
}

// ========== SCENARIO METRICS ==========

export interface ScenarioMetrics {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

// ========== COMPUTED METRICS (DETERMINISTIC ENGINE OUTPUT) ==========

export interface ComputedMetrics {
  // Core revenue
  mrr: number;
  arr: number;
  
  // Profitability
  grossProfit: number;
  grossMarginPercent: number;
  netProfit: number;
  netMarginPercent: number;
  
  // Expenses
  totalExpenses: number;
  expenses: ExpenseBreakdown;
  
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
  
  // Scenarios
  scenarios: {
    pessimistic: ScenarioMetrics;
    base: ScenarioMetrics;
    optimistic: ScenarioMetrics;
  };
  
  // Status
  isProfitable: boolean;
  industryDetected: string;
}

// ========== VALIDATION TYPES ==========

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: ValidationSeverity;
  fix?: string;
  originalValue?: number;
  correctedValue?: number;
}

export interface CalculationAudit {
  formula: string;
  inputs: Record<string, number>;
  result: number;
  isValid: boolean;
  notes?: string;
}

// ========== NARRATOR OUTPUT (QUALITATIVE ONLY) ==========

export interface LaunchStep {
  step: number;
  title: string;
  description: string;
  duration: string;
  cost_reference: string;
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
  budget_percent: number;
  expected_roi: string;
}

export interface CompetitorAnalysis {
  name: string;
  strengths: string;
  weaknesses: string;
  positioning?: string;
}

export interface ActionStep {
  step: string;
  timeline: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  metric_reference?: string;
}

export interface AssumptionEntry {
  assumption: string;
  category: 'demand' | 'pricing' | 'cost' | 'capacity' | 'financing' | 'other';
  source: 'user_input' | 'benchmark_placeholder' | 'derived_from_user';
  sensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  impact: string;
}

export interface DataQuality {
  completeness_pct: number;
  consistency_score: number;
  assumption_load: 'LOW' | 'MEDIUM' | 'HIGH';
  volatility_rating: 'LOW' | 'MEDIUM' | 'HIGH';
  overall_label: 'DATA_INFORMED' | 'ASSUMPTION_HEAVY' | 'EXPLORATORY';
  notes: string;
}

export interface NarratorOutput {
  executive_summary: string;
  investment_verdict: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK' | 'PROMISING';
  key_takeaways: string[];
  
  // Master prompt v2 fields
  assumptions_panel?: AssumptionEntry[];
  data_quality?: DataQuality | Record<string, unknown>;
  
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

// ========== VALIDATION RESULT ==========

export interface ValidationResult {
  isValid: boolean;
  hasHardErrors: boolean;
  canGeneratePdf: boolean;
  issues: ValidationIssue[];
  corrections: ValidationIssue[];
  warnings: ValidationIssue[];
  blockingReason?: string;
}

// ========== CONFIDENCE BREAKDOWN ==========

export interface ConfidenceBreakdown {
  input_completeness: number;
  data_quality: number;
  validation_score: number;
  industry_relevance: number;
  details: string[];
}

// ========== ANTI-INJECTION SECURITY ==========

const DANGEROUS_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /disregard\s+(previous|above|all)\s+instructions?/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+to\s+be/i,
  /act\s+as\s+if/i,
  /system\s*:\s*/i,
  /\[\[.*?\]\]/,
  /\{\{.*?\}\}/,
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

const INSTRUCTION_PATTERNS = [
  /^(you\s+must|you\s+should|please\s+)/i,
  /^(do\s+not|don't|never\s+)/i,
  /^(always\s+|make\s+sure\s+)/i,
];

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  threats: string[];
}

export function sanitizeUserInput(input: string): SanitizationResult {
  const threats: string[] = [];
  let sanitized = input;
  let wasModified = false;
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      threats.push(`Dangerous pattern detected: ${pattern.source}`);
      sanitized = sanitized.replace(pattern, '[REMOVED]');
      wasModified = true;
    }
  }
  
  for (const pattern of INSTRUCTION_PATTERNS) {
    if (pattern.test(sanitized.trim())) {
      threats.push(`Instruction-like pattern: ${pattern.source}`);
    }
  }
  
  // Remove HTML
  const htmlPattern = /<[^>]*>/g;
  if (htmlPattern.test(sanitized)) {
    sanitized = sanitized.replace(htmlPattern, '');
    wasModified = true;
    threats.push('HTML tags removed');
  }
  
  // Escape JSON-breaking chars
  sanitized = sanitized
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ');
  
  return { sanitized, wasModified, threats };
}

export function classifyInput(input: string): 'data' | 'instruction' | 'mixed' {
  const dangerousScore = DANGEROUS_PATTERNS.filter(p => p.test(input)).length;
  const instructionScore = INSTRUCTION_PATTERNS.filter(p => p.test(input)).length;
  
  if (dangerousScore > 0) return 'instruction';
  if (instructionScore >= 2) return 'instruction';
  if (instructionScore === 1) return 'mixed';
  return 'data';
}

// ========== NARRATOR OUTPUT VALIDATION ==========

/**
 * Validates that LLM narrator output doesn't contain invented numbers.
 * All numbers must reference computed metrics.
 */
export function validateNarratorNumbers(
  narratorOutput: NarratorOutput,
  computedMetrics: ComputedMetrics
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Build set of valid numbers from computed metrics
  const validNumbers = new Set<string>();
  
  const addNumber = (n: number) => {
    validNumbers.add(n.toString());
    validNumbers.add(n.toLocaleString());
    validNumbers.add(`$${n.toLocaleString()}`);
    validNumbers.add(`${n}%`);
    validNumbers.add(`${Math.round(n)}%`);
    // Add common variations
    validNumbers.add(Math.round(n).toString());
    validNumbers.add(Math.round(n / 1000) + 'k');
    validNumbers.add(Math.round(n / 1000000) + 'M');
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
  addNumber(computedMetrics.roiYear3Percent);
  addNumber(computedMetrics.startupInvestment);
  addNumber(computedMetrics.breakEvenRevenue);
  addNumber(computedMetrics.netMarginPercent);
  addNumber(computedMetrics.grossMarginPercent);
  addNumber(computedMetrics.averageCheck);
  addNumber(computedMetrics.clientsActive);
  addNumber(computedMetrics.cacPaybackMonths);
  addNumber(computedMetrics.npv3Years);
  addNumber(computedMetrics.revenueFor45kProfit);
  
  // Add expense breakdown
  Object.values(computedMetrics.expenses).forEach(addNumber);
  
  // Add scenario values
  const scenarios = [
    computedMetrics.scenarios.pessimistic,
    computedMetrics.scenarios.base,
    computedMetrics.scenarios.optimistic
  ];
  for (const scenario of scenarios) {
    addNumber(scenario.revenue);
    addNumber(scenario.netProfit);
    addNumber(scenario.grossProfit);
    addNumber(scenario.netMargin);
    addNumber(scenario.grossMargin);
  }
  
  // Add common safe numbers
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 24, 30, 36, 50, 100].forEach(addNumber);
  
  // Extract all dollar amounts from narrative
  const dollarPattern = /\$[\d,]+(?:\.\d{2})?/g;
  
  const textFields = [
    narratorOutput.executive_summary,
    ...narratorOutput.key_takeaways,
    narratorOutput.business_plan.product_description,
    narratorOutput.business_plan.target_audience,
    narratorOutput.marketing_plan.positioning,
    narratorOutput.marketing_plan.first_3_months_plan,
    narratorOutput.market_analysis.competitive_landscape,
  ].filter(Boolean);
  
  for (const text of textFields) {
    const matches = text.match(dollarPattern) || [];
    for (const match of matches) {
      // Check if this number is valid
      if (!validNumbers.has(match)) {
        const numValue = parseInt(match.replace(/[$,]/g, ''));
        // Allow if within 10% of a valid number (for rounding)
        let isClose = false;
        for (const valid of validNumbers) {
          const validNum = parseInt(valid.replace(/[$,%kM]/g, ''));
          if (!isNaN(validNum) && validNum > 0) {
            if (Math.abs(numValue - validNum) / validNum < 0.1) {
              isClose = true;
              break;
            }
          }
        }
        
        if (!isClose && numValue > 100) {
          issues.push({
            code: 'INVENTED_NUMBER',
            field: 'narrative',
            message: `Narrator may have invented number: ${match}`,
            severity: 'warning',
            fix: 'Verify this number comes from computed metrics',
          });
        }
      }
    }
  }
  
  return issues;
}
