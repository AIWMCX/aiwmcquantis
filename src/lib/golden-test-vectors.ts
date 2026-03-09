import { BusinessAnalysisResult } from "@/types/analysis";

export interface BusinessInputs {
  businessType: string;
  location: string;
  arpu?: number;
  churn?: number;
  newPerMonth?: number;
  opex?: number;
  cac?: number;
  capital?: number;
  monthlyRevenue?: number;
  initialInvestment?: number;
  dailyCustomers?: number;
  avgTicket?: number;
  monthlyOpex?: number;
}

export interface ExpectedRanges {
  monthlyProfit?: [number, number];
  m12Profit?: { min: number; max: number };
  paybackMonths?: [number, number];
  breakEven?: { min: number; max: number };
  grossMargin?: [number, number];
  grossMarginPct?: { min: number; max: number };
  netMarginPct?: { min: number; max: number };
  ltvCac?: { min: number; max: number };
  runway?: { min: number; max: number };
}

export interface GoldenVector {
  id: string;
  vectorCode: string;
  businessType: string;
  location: string;
  description: string;
  inputs: BusinessInputs;
  expectedRanges: ExpectedRanges;
  tolerancePct: number;
  confidenceThreshold: number;
  consecutivePasses: number;
  isActive: boolean;
}

/**
 * Enhanced Golden Test Vectors per Master Synthesis spec
 * These canonical archetypes define expected financial outputs for regression testing
 */
export const GOLDEN_VECTORS: GoldenVector[] = [
  {
    id: "gtv-fit-denver-001",
    vectorCode: "GTV-FIT-DENVER-001",
    businessType: "fitness_boutique",
    location: "Denver, CO",
    description: "Boutique fitness, 12 new/mo, 5% churn, $130 ARPU, $9,800 opex",
    inputs: {
      businessType: "fitness_boutique",
      location: "Denver, CO",
      arpu: 130,
      churn: 0.05,
      newPerMonth: 12,
      opex: 9800,
      cac: 100,
      capital: 50000
    },
    expectedRanges: {
      m12Profit: { min: 500, max: 2500 },
      breakEven: { min: 8, max: 14 },
      ltvCac: { min: 8, max: 25 },
      runway: { min: 7, max: 14 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 75.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-coffee-den-001",
    vectorCode: "GTV-COFFEE-DEN-001",
    businessType: "coffee_shop",
    location: "Denver, CO",
    description: "Independent coffee shop, 120 customers/day, $7.50 avg ticket",
    inputs: {
      businessType: "coffee_shop",
      location: "Denver, CO",
      dailyCustomers: 120,
      avgTicket: 7.50,
      monthlyOpex: 12000,
      cac: 15,
      capital: 60000
    },
    expectedRanges: {
      m12Profit: { min: 1000, max: 7000 },
      netMarginPct: { min: 3, max: 12 },
      breakEven: { min: 2, max: 10 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 70.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-saas-generic-001",
    vectorCode: "GTV-SAAS-GENERIC-001",
    businessType: "saas",
    location: "Remote",
    description: "B2B SaaS $89/mo ARPU, 4% churn, 120 customers Mo12",
    inputs: {
      businessType: "saas",
      location: "Remote",
      arpu: 89,
      churn: 0.04,
      newPerMonth: 10,
      opex: 7500,
      cac: 180,
      capital: 30000
    },
    expectedRanges: {
      m12Profit: { min: 1000, max: 5000 },
      grossMarginPct: { min: 75, max: 92 },
      ltvCac: { min: 5, max: 20 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 80.0,
    consecutivePasses: 0,
    isActive: true
  }
];

/**
 * Validates analysis output against a golden vector with tolerance
 */
export function validateAgainstGoldenVector(
  result: BusinessAnalysisResult,
  vector: GoldenVector
): { passed: boolean; failures: string[]; details: Record<string, { actual: number; expected: [number, number] }> } {
  const failures: string[] = [];
  const details: Record<string, { actual: number; expected: [number, number] }> = {};
  const tolerance = vector.tolerancePct / 100;

  const checkRange = (
    value: number | undefined, 
    range: { min: number; max: number } | [number, number] | undefined, 
    name: string
  ) => {
    if (!range) return;
    
    const min = Array.isArray(range) ? range[0] : range.min;
    const max = Array.isArray(range) ? range[1] : range.max;
    
    if (value === undefined) {
      failures.push(`Missing ${name}`);
      return;
    }
    
    // Apply tolerance to the range
    const toleratedMin = min * (1 - tolerance);
    const toleratedMax = max * (1 + tolerance);
    
    details[name] = { actual: value, expected: [min, max] };
    
    if (value < toleratedMin || value > toleratedMax) {
      failures.push(`${name} (${value.toFixed(2)}) outside expected range [${min}, ${max}] ±${vector.tolerancePct}%`);
    }
  };

  // Check various metrics based on what's defined in expectedRanges
  const { expectedRanges } = vector;
  
  if (expectedRanges.monthlyProfit) {
    checkRange(
      result.financial_analysis?.monthly_profit, 
      expectedRanges.monthlyProfit, 
      'monthlyProfit'
    );
  }
  
  if (expectedRanges.m12Profit) {
    // Approximate M12 profit as monthly * 12 or specific field
    const m12 = result.financial_analysis?.monthly_profit 
      ? result.financial_analysis.monthly_profit * 12 
      : undefined;
    checkRange(m12, expectedRanges.m12Profit, 'm12Profit');
  }
  
  if (expectedRanges.paybackMonths || expectedRanges.breakEven) {
    checkRange(
      result.financial_analysis?.returns?.payback_period_months, 
      expectedRanges.paybackMonths || expectedRanges.breakEven, 
      'paybackMonths'
    );
  }

  if (expectedRanges.grossMargin || expectedRanges.grossMarginPct) {
    const grossMargin = result.financial_analysis?.gross_margin_percent;
    checkRange(
      grossMargin, 
      expectedRanges.grossMargin || expectedRanges.grossMarginPct, 
      'grossMarginPct'
    );
  }

  if (expectedRanges.netMarginPct) {
    const netMargin = result.financial_analysis?.net_margin_percent;
    checkRange(netMargin, expectedRanges.netMarginPct, 'netMarginPct');
  }

  if (expectedRanges.ltvCac) {
    const ltvCac = result.financial_analysis?.unit_economics?.ltv_cac_ratio;
    checkRange(ltvCac, expectedRanges.ltvCac, 'ltvCacRatio');
  }

  if (expectedRanges.runway) {
    // Cash runway calculation
    const investment = result.financial_analysis?.startup_investment?.total ?? 0;
    const monthlyBurn = result.financial_analysis?.monthly_expenses?.total ?? 1;
    const runway = investment > 0 && monthlyBurn > 0 ? investment / monthlyBurn : 0;
    checkRange(runway, expectedRanges.runway, 'cashRunway');
  }

  return {
    passed: failures.length === 0,
    failures,
    details
  };
}

/**
 * Runs all active golden vectors against an analysis engine
 */
export async function runGoldenVectorSuite(
  analyzeFunction: (inputs: BusinessInputs) => Promise<BusinessAnalysisResult>
): Promise<{ 
  passed: boolean; 
  totalTests: number; 
  passedTests: number; 
  results: Array<{ vectorCode: string; passed: boolean; failures: string[] }> 
}> {
  const activeVectors = GOLDEN_VECTORS.filter(v => v.isActive);
  const results: Array<{ vectorCode: string; passed: boolean; failures: string[] }> = [];
  let passedTests = 0;

  for (const vector of activeVectors) {
    try {
      const analysisResult = await analyzeFunction(vector.inputs);
      const validation = validateAgainstGoldenVector(analysisResult, vector);
      
      results.push({
        vectorCode: vector.vectorCode,
        passed: validation.passed,
        failures: validation.failures
      });
      
      if (validation.passed) passedTests++;
    } catch (err) {
      results.push({
        vectorCode: vector.vectorCode,
        passed: false,
        failures: [`Execution error: ${err}`]
      });
    }
  }

  return {
    passed: passedTests === activeVectors.length,
    totalTests: activeVectors.length,
    passedTests,
    results
  };
}
