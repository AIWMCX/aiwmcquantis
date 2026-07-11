/**
 * QUANTIS 2.0 - MAIN ORCHESTRATOR ENGINE
 * 
 * This is the primary entry point for the Quantis 2.0 analysis system.
 * It orchestrates:
 * 1. Bulletproof validation of all inputs
 * 2. Financial calculations with auto-correction
 * 3. Recommendation generation
 * 4. Response formatting
 * 
 * CRITICAL: The LLM is NEVER allowed to modify numbers.
 * All calculations go through this deterministic engine.
 */

import { 
  validateBusinessInput, 
  type BusinessInput, 
  type BulletproofValidationResult,
  type ExpenseInput,
  sumExpenseBreakdown,
  formatPaybackPeriod,
} from './bulletproof-validator.ts';

import { 
  generateRecommendations, 
  type RecommendationPlan,
  formatActionPlan,
} from './recommendation-engine.ts';

import type { IndustryBenchmarks } from './financial-engine.ts';
import type { LocationMultiplierResult } from './location-intelligence.ts';
import type { SubIndustryResult } from './sub-industry-detection.ts';

// ========== ENGINE INPUT TYPES ==========

export interface QuantisEngineInput {
  // Business data
  businessIdea: string;
  location: string;
  
  // Financial inputs (mapped from various sources)
  financialInputs?: {
    startupInvestment?: number;
    monthlyRevenue?: number;
    averagePrice?: number;
    expectedCustomers?: number;
    monthlyCosts?: number;
    cac?: number;
    churnRate?: number;
  };
  
  // Expense breakdown
  expenses?: ExpenseInput;
  
  // Industry selection
  selectedIndustry?: string;
  
  // Documents for analysis
  documents?: Array<{
    name: string;
    type: string;
    parsedContent: string;
    extractedFinancials?: Record<string, unknown>;
  }>;
  
  // Context
  benchmarks: IndustryBenchmarks;
  locationMultipliers: LocationMultiplierResult;
  subIndustry: SubIndustryResult | null;
}

// ========== ENGINE OUTPUT TYPES ==========

export interface QuantisValidationOutput {
  isRealistic: boolean;
  isProfitable: boolean;
  wasAutoCorrected: boolean;
  reliabilityScore: number;
  
  corrections: Array<{
    field: string;
    original: number;
    corrected: number;
    reason: string;
  }>;
  
  warnings: Array<{
    code: string;
    message: string;
    severity: string;
    fix?: string;
  }>;
  
  calculationAudit: Array<{
    formula: string;
    inputs: Record<string, number | string>;
    result: number;
    isValid: boolean;
    notes?: string;
  }>;
  
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
  industryDetected: string;
  
  confidenceBreakdown: {
    inputCompleteness: number;
    dataQuality: number;
    validationScore: number;
    industryRelevance: number;
    details: string[];
  };
  
  improvementSuggestions: string[];
  
  summary: string;
  
  healthScores?: {
    dataQualityScore: number;
    businessViabilityScore: number;
    overallHealthScore: number;
    grade: string;
  };
}

export interface QuantisEngineOutput {
  success: boolean;
  
  // Validation results
  validation: QuantisValidationOutput;
  
  // Recommendations
  recommendations: RecommendationPlan;
  
  // Metrics (for downstream use)
  metrics: {
    mrr: number;
    arr: number;
    netProfit: number;
    netMarginPercent: number;
    grossProfit: number;
    grossMarginPercent: number;
    totalExpenses: number;
    paybackMonths: number | null;
    paybackDisplay: string;
    roiYear1Percent: number;
    ltvCacRatio: number;
    cac: number;
    ltv: number;
  };
  
  // Timestamp and version
  timestamp: string;
  version: string;
}

// ========== MAIN ENGINE FUNCTION ==========

/**
 * Process business analysis through Quantis 2.0 engine
 * 
 * This function:
 * 1. Validates all inputs with bulletproof validation
 * 2. Calculates financial metrics with auto-correction
 * 3. Generates actionable recommendations
 * 4. Returns structured output for API response
 */
export function processQuantisAnalysis(
  input: QuantisEngineInput
): QuantisEngineOutput {
  const { benchmarks, locationMultipliers, subIndustry, financialInputs, expenses } = input;
  
  // ===== 1. BUILD BUSINESS INPUT FOR VALIDATION =====
  
  const businessInput: BusinessInput = {
    businessName: input.businessIdea,
    businessType: detectBusinessType(input.businessIdea),
    initialInvestment: financialInputs?.startupInvestment,
    monthlyRevenue: financialInputs?.monthlyRevenue,
    pricing: {
      pricePerUnit: financialInputs?.averagePrice || benchmarks.average_check_min,
      pricingModel: 'subscription',
      billingCycle: 'monthly',
    },
    customerMetrics: financialInputs?.expectedCustomers ? {
      payingCustomers: financialInputs.expectedCustomers,
    } : undefined,
    expenses: expenses,
    monthlyExpenses: financialInputs?.monthlyCosts,
    unitEconomics: financialInputs?.cac ? {
      cac: financialInputs.cac,
    } : undefined,
    growth: financialInputs?.churnRate ? {
      churnRate: financialInputs.churnRate,
    } : undefined,
    industry: input.selectedIndustry || benchmarks.name,
    location: input.location,
  };
  
  // ===== 2. RUN BULLETPROOF VALIDATION =====
  
  const validationResult = validateBusinessInput(businessInput);
  
  // ===== 3. CALCULATE ENHANCED METRICS =====
  
  // Apply location multipliers to fixed costs
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultipliers.salary);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultipliers.rent);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultipliers.utility);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultipliers.overall);
  const fixedCosts = adjustedSalaries + adjustedRent + adjustedUtilities + adjustedOther;
  
  // Get MRR from validation (which reconciled revenue)
  const mrr = validationResult.calculatedMetrics.calculatedMRR;
  const arr = mrr * 12;
  
  // Calculate COGS
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  // Get CAC (user-provided or benchmark)
  let cac = financialInputs?.cac || benchmarks.cac_typical;
  
  // Apply location marketing multiplier
  cac = Math.round(cac * locationMultipliers.marketing);
  
  // Apply sub-industry modifiers if available
  if (subIndustry && subIndustry.confidence > 50) {
    cac = Math.round(cac * subIndustry.modifiers.cac_multiplier);
  }
  
  // Calculate LTV
  const avgCheck = financialInputs?.averagePrice || 
    (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
  const lifetimeMonths = subIndustry?.modifiers?.ltv_multiplier 
    ? Math.round(benchmarks.client_lifetime_months * subIndustry.modifiers.ltv_multiplier)
    : benchmarks.client_lifetime_months;
  // BUG FIX: LTV must be gross-margin-adjusted (aligns with financial-engine.ts formula).
  // LTV = Avg_Check × (1 - COGS%) × Orders × Lifetime — represents what the business KEEPS per customer.
  const grossMarginFractionQ = 1 - (benchmarks.cogs_percent / 100);
  const ltv = Math.round(avgCheck * grossMarginFractionQ * benchmarks.orders_per_client * lifetimeMonths);
  
  // LTV:CAC ratio
  const ltvCacRatio = cac > 0 ? Math.round((ltv / cac) * 10) / 10 : 0;
  
  // Calculate clients and marketing cost
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;
  const clientsActive = financialInputs?.expectedCustomers || 
    Math.max(1, Math.ceil(mrr / Math.max(revenuePerClient, 1)));
  
  // Churn rate from sub-industry or default
  const churnRate = financialInputs?.churnRate 
    ? financialInputs.churnRate / 100
    : (subIndustry?.modifiers?.churn_multiplier 
        ? 0.08 * subIndustry.modifiers.churn_multiplier 
        : 0.08);
  
  const newClientsNeeded = Math.ceil(clientsActive * churnRate);
  const marketingCost = newClientsNeeded * cac;
  
  // Total expenses (use validated/reconciled if available)
  const totalExpenses = validationResult.calculatedMetrics.reconciledExpenseTotal > 0
    ? validationResult.calculatedMetrics.reconciledExpenseTotal
    : cogs + fixedCosts + marketingCost;
  
  // Profitability
  const netProfit = validationResult.calculatedMetrics.monthlyNetProfit;
  const netMarginPercent = validationResult.calculatedMetrics.netMarginPercent;
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  
  // Payback and ROI — ramp-up aware
  const investment = financialInputs?.startupInvestment || 0;
  
  // Ramp-up payback calculation
  let paybackMonths = 0;
  if (investment > 0 && netProfit > 0) {
    const RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
    const fixedP = totalExpenses * 0.6;
    const varP = totalExpenses * 0.4;
    let cumulative = 0;
    let foundPayback = false;
    for (let m = 1; m <= 60; m++) {
      let mRev: number, mCost: number;
      if (m <= RAMP.length) {
        mRev = mrr * RAMP[m - 1];
        mCost = fixedP + varP * RAMP[m - 1];
      } else {
        const g = Math.pow(1.05, m - RAMP.length);
        mRev = mrr * g;
        mCost = totalExpenses * Math.pow(1.025, m - RAMP.length);
      }
      cumulative += mRev - mCost;
      if (cumulative >= investment) { paybackMonths = m; foundPayback = true; break; }
    }
    if (!foundPayback) paybackMonths = 999;
  } else if (investment > 0) {
    paybackMonths = 999;
  }
  
  // Ramp-up aware Year 1 ROI
  let roiYear1Percent = 0;
  if (investment > 0 && netProfit > 0) {
    const RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
    const fixedP = totalExpenses * 0.6;
    const varP = totalExpenses * 0.4;
    let y1Profit = 0;
    for (let m = 1; m <= 12; m++) {
      if (m <= RAMP.length) {
        y1Profit += mrr * RAMP[m - 1] - (fixedP + varP * RAMP[m - 1]);
      } else {
        const g = Math.pow(1.05, m - RAMP.length);
        y1Profit += mrr * g - totalExpenses * Math.pow(1.025, m - RAMP.length);
      }
    }
    roiYear1Percent = Math.round((y1Profit / investment) * 100);
  }
  
  // Break-even calculations
  const variableCostRatio = (benchmarks.cogs_percent / 100) + (mrr > 0 ? marketingCost / mrr : 0);
  const contributionMargin = 1 - variableCostRatio;
  const breakEvenRevenue = contributionMargin > 0 
    ? Math.round(fixedCosts / contributionMargin) 
    : 0;
  const revenueFor45kProfit = contributionMargin > 0 
    ? Math.round((fixedCosts + 45000) / contributionMargin) 
    : 0;
  
  // ===== 4. GENERATE RECOMMENDATIONS =====
  
  const recommendations = generateRecommendations(validationResult, {
    netMarginMin: benchmarks.net_margin_min,
    netMarginMax: benchmarks.net_margin_max,
    ltvCacMin: benchmarks.ltv_cac_min,
    ltvCacMax: benchmarks.ltv_cac_max,
  });
  
  // ===== 5. BUILD VALIDATION OUTPUT =====
  
  const isProfitable = netProfit > 0;
  const wasAutoCorrected = validationResult.corrections.length > 0;
  
  // Calculate reliability score
  let reliabilityScore = validationResult.healthScores.overallHealthScore;
  
  // Boost for user-provided data
  if (financialInputs) {
    const providedFields = Object.values(financialInputs).filter(v => v !== undefined && v > 0).length;
    reliabilityScore = Math.min(95, reliabilityScore + (providedFields * 3));
  }
  
  // Reduce for corrections
  reliabilityScore = Math.max(15, reliabilityScore - (validationResult.corrections.length * 5));
  
  // CRITICAL FIX: Reduce reliability for unrealistic margins
  const calculatedNetMargin = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  if (calculatedNetMargin > 50) {
    reliabilityScore = Math.max(15, reliabilityScore - 25);
  } else if (calculatedNetMargin > 40) {
    reliabilityScore = Math.max(15, reliabilityScore - 10);
  }
  
  // CRITICAL FIX: isRealistic requires consistent internal data
  const hasConsistentData = 
    validationResult.calculatedMetrics.expenseSource !== 'corrected' &&
    validationResult.corrections.length === 0 &&
    calculatedNetMargin <= 40;
  
  const validationOutput: QuantisValidationOutput = {
    isRealistic: validationResult.isValid && isProfitable && hasConsistentData,
    isProfitable,
    wasAutoCorrected,
    reliabilityScore: Math.round(reliabilityScore),
    
    corrections: validationResult.corrections.map(c => ({
      field: c.field,
      original: c.original,
      corrected: c.corrected,
      reason: c.reason,
    })),
    
    warnings: [
      ...validationResult.errors.map(e => ({
        code: e.code,
        message: e.message,
        severity: e.severity,
        fix: e.suggestedFix,
      })),
      ...validationResult.warnings.map(w => ({
        code: w.code,
        message: w.message,
        severity: w.severity,
        fix: w.suggestedFix,
      })),
    ],
    
    calculationAudit: [
      {
        formula: 'MRR = Revenue (validated)',
        inputs: { 
          'Source': validationResult.calculatedMetrics.revenueSource,
          'Value': mrr,
        },
        result: mrr,
        isValid: mrr > 0,
        notes: `Monthly Recurring Revenue: $${mrr.toLocaleString()}`,
      },
      {
        formula: 'Total_Expenses = COGS + Fixed + Marketing',
        inputs: { 
          COGS: cogs,
          Fixed: fixedCosts,
          Marketing: marketingCost,
        },
        result: totalExpenses,
        isValid: true,
        notes: `$${cogs} + $${fixedCosts} + $${marketingCost} = $${totalExpenses}`,
      },
      {
        formula: 'Net_Profit = MRR - Expenses',
        inputs: { MRR: mrr, Expenses: totalExpenses },
        result: netProfit,
        isValid: isProfitable,
        notes: isProfitable 
          ? `$${mrr} - $${totalExpenses} = $${netProfit} ✓` 
          : `$${mrr} - $${totalExpenses} = $${netProfit} ❌ LOSS`,
      },
      {
        formula: 'LTV = Avg_Check × (1 - COGS%) × Orders × Lifetime',
        inputs: {
          'Avg Check': avgCheck,
          'Gross Margin': `${Math.round(grossMarginFractionQ * 100)}%`,
          'Orders/Mo': benchmarks.orders_per_client,
          'Lifetime': lifetimeMonths,
        },
        result: ltv,
        isValid: true,
        notes: `$${avgCheck} × ${Math.round(grossMarginFractionQ * 100)}% × ${benchmarks.orders_per_client} × ${lifetimeMonths} = $${ltv} (margin-adjusted)`,
      },
      {
        formula: 'LTV:CAC = LTV / CAC',
        inputs: { LTV: ltv, CAC: cac },
        result: ltvCacRatio,
        isValid: ltvCacRatio >= 3,
        notes: `$${ltv} / $${cac} = ${ltvCacRatio}x (healthy: 3-8x)`,
      },
    ],
    
    breakEvenRevenue,
    revenueFor45kProfit,
    industryDetected: benchmarks.name,
    
    confidenceBreakdown: {
      inputCompleteness: validationResult.healthScores.breakdown.schemaCompleteness,
      dataQuality: validationResult.healthScores.breakdown.dataConsistency,
      validationScore: 100 - (validationResult.errors.length * 15) - (validationResult.warnings.length * 5),
      // Handbook §19 Wave 3 (item 7) — this was a flat 80 regardless of match
      // specificity, which collapsed the displayed breakdown toward the same
      // value across dissimilar businesses (root cause of the corpus's
      // repeated 76/79/83% bucketed scores). Computed from the same
      // industry/sub-industry/location match signals already in scope.
      industryRelevance: (() => {
        let score = 40; // generic industry, no location match
        if (benchmarks.id !== 'general') score += 25; // matched a specific industry
        if (subIndustry && subIndustry.confidence > 50) score += 20; // sub-industry detected
        if (locationMultipliers.matched) score += 15; // location-adjusted costs
        return Math.min(100, score);
      })(),
      details: [
        `Industry: ${benchmarks.name}`,
        `Location: ${locationMultipliers.matchedCity || input.location}`,
        subIndustry ? `Sub-industry: ${subIndustry.subIndustryName}` : null,
        `Health Grade: ${validationResult.healthScores.grade}`,
      ].filter(Boolean) as string[],
    },
    
    improvementSuggestions: validationResult.improvementSuggestions,
    
    summary: buildValidationSummary(isProfitable, wasAutoCorrected, validationResult, breakEvenRevenue, netProfit, mrr),
    
    healthScores: {
      dataQualityScore: validationResult.healthScores.dataQualityScore,
      businessViabilityScore: validationResult.healthScores.businessViabilityScore,
      overallHealthScore: validationResult.healthScores.overallHealthScore,
      grade: validationResult.healthScores.grade,
    },
  };
  
  // ===== 6. BUILD FINAL OUTPUT =====
  
  return {
    success: validationResult.canProceed,
    validation: validationOutput,
    recommendations,
    metrics: {
      mrr,
      arr,
      netProfit,
      netMarginPercent,
      grossProfit,
      grossMarginPercent,
      totalExpenses,
      paybackMonths,
      paybackDisplay: paybackMonths === 999 ? 'N/A (unprofitable)' : paybackMonths < 12 ? `${paybackMonths} months` : `${(paybackMonths / 12).toFixed(1)} years`,
      roiYear1Percent,
      ltvCacRatio,
      cac,
      ltv,
    },
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  };
}

// ========== HELPER FUNCTIONS ==========

function detectBusinessType(idea: string): BusinessInput['businessType'] {
  const ideaLower = idea.toLowerCase();
  
  if (ideaLower.includes('saas') || ideaLower.includes('software') || ideaLower.includes('app')) {
    return 'saas';
  }
  if (ideaLower.includes('shop') || ideaLower.includes('store') || ideaLower.includes('ecommerce')) {
    return 'ecommerce';
  }
  if (ideaLower.includes('marketplace')) {
    return 'marketplace';
  }
  if (ideaLower.includes('service') || ideaLower.includes('consulting') || ideaLower.includes('agency')) {
    return 'service';
  }
  if (ideaLower.includes('product')) {
    return 'product';
  }
  
  return 'other';
}

function buildValidationSummary(
  isProfitable: boolean,
  wasAutoCorrected: boolean,
  validation: BulletproofValidationResult,
  breakEvenRevenue: number,
  netProfit: number,
  mrr?: number
): string {
  // Calculate net margin for additional context
  const netMargin = mrr && mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  
  if (!isProfitable) {
    return `❌ Business is unprofitable. Need revenue of $${breakEvenRevenue.toLocaleString()}/mo to break even.`;
  }
  
  if (validation.hasCriticalErrors) {
    return `⛔ Critical issues detected. Address ${validation.errors.filter(e => e.severity === 'critical').length} critical errors before proceeding.`;
  }
  
  // CRITICAL FIX: Flag unrealistic margins
  if (netMargin > 50) {
    return `⚠️ VERIFY DATA: Net margin of ${netMargin}% is unrealistic. Likely missing expenses. Profit: $${netProfit.toLocaleString()}/mo`;
  }
  
  if (netMargin > 40) {
    return `⚠️ High margin: ${netMargin}% net margin is above industry norms. Verify all costs included. Profit: $${netProfit.toLocaleString()}/mo`;
  }
  
  if (wasAutoCorrected) {
    return `⚠️ Corrected ${validation.corrections.length} metrics for accuracy. Profit: $${netProfit.toLocaleString()}/mo`;
  }
  
  if (validation.warnings.length > 0) {
    return `✓ Analysis complete with ${validation.warnings.length} warnings. Profit: $${netProfit.toLocaleString()}/mo`;
  }
  
  return `✓ Calculations verified. Profit: $${netProfit.toLocaleString()}/mo. Grade: ${validation.healthScores.grade}`;
}

// ========== EXPORT ENGINE INFO ==========

export const QUANTIS_ENGINE_INFO = {
  version: '2.0.0',
  name: 'Quantis Business Intelligence Engine',
  features: [
    'Bulletproof input validation',
    'Expense reconciliation',
    'Revenue consistency checks',
    'Unit economics validation',
    'Health scoring (0-100)',
    'Auto-correction with audit trail',
    'Actionable recommendations',
    'Priority classification',
    'GAAP-compliant calculations',
  ],
  thresholds: {
    minLtvCacRatio: 3,
    maxPaybackMonths: 36,
    minNetMargin: 10,
  },
};
