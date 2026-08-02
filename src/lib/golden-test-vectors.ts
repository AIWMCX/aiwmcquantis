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
      opex: 25700,
      cac: 100,
      capital: 50000
    },
    expectedRanges: {
      m12Profit: { min: 50000, max: 85000 },
      breakEven: { min: 8, max: 14 },
      ltvCac: { min: 8, max: 25 },
      runway: { min: 1.5, max: 3 }
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
      monthlyOpex: 24300,
      cac: 15,
      capital: 60000
    },
    expectedRanges: {
      m12Profit: { min: 25000, max: 42000 },
      netMarginPct: { min: 3, max: 12 },
      breakEven: { min: 13, max: 22 }
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
      opex: 18350,
      cac: 180,
      capital: 30000
    },
    expectedRanges: {
      m12Profit: { min: 35000, max: 60000 },
      grossMarginPct: { min: 75, max: 92 },
      ltvCac: { min: 5, max: 20 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 80.0,
    consecutivePasses: 0,
    isActive: true
  },

  // ── 7 new vectors (Restaurant, E-commerce, Agency, Food Truck, Fitness LA, Dropshipping, Fintech) ──

  {
    id: "gtv-rest-miami-001",
    vectorCode: "GTV-REST-MIAMI-001",
    businessType: "restaurant",
    location: "Miami, FL",
    description: "Full-service restaurant, 80 covers/day, $42 avg ticket, $18K opex",
    inputs: {
      businessType: "restaurant",
      location: "Miami, FL",
      dailyCustomers: 80,
      avgTicket: 42,
      monthlyOpex: 93200,
      cac: 35,
      capital: 120000
    },
    expectedRanges: {
      netMarginPct: { min: 5, max: 15 },
      breakEven: { min: 6, max: 14 },
      grossMarginPct: { min: 55, max: 72 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 75.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-ecom-dtc-001",
    vectorCode: "GTV-ECOM-DTC-001",
    businessType: "ecommerce",
    location: "Remote",
    description: "DTC e-commerce, $65 AOV, 2.1 orders/yr, $8K opex, $200 CAC",
    inputs: {
      businessType: "ecommerce",
      location: "Remote",
      arpu: 65,
      churn: 0.06,
      newPerMonth: 40,
      opex: 39000,
      cac: 200,
      capital: 25000
    },
    expectedRanges: {
      grossMarginPct: { min: 45, max: 65 },
      ltvCac: { min: 2, max: 8 },
      breakEven: { min: 4, max: 12 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 70.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-agency-nyc-001",
    vectorCode: "GTV-AGENCY-NYC-001",
    businessType: "consulting",
    location: "New York, NY",
    description: "Digital agency, $8K avg project, 4 clients/mo, $22K opex",
    inputs: {
      businessType: "consulting",
      location: "New York, NY",
      arpu: 8000,
      newPerMonth: 4,
      opex: 22000,
      cac: 600,
      capital: 40000
    },
    expectedRanges: {
      netMarginPct: { min: 15, max: 35 },
      breakEven: { min: 3, max: 8 },
      grossMarginPct: { min: 50, max: 75 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 75.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-truck-atx-001",
    vectorCode: "GTV-TRUCK-ATX-001",
    businessType: "food_truck",
    location: "Austin, TX",
    description: "Food truck, 90 customers/day, $14 avg ticket, $6K opex",
    inputs: {
      businessType: "food_truck",
      location: "Austin, TX",
      dailyCustomers: 90,
      avgTicket: 14,
      monthlyOpex: 35000,
      cac: 10,
      capital: 35000
    },
    expectedRanges: {
      netMarginPct: { min: 5, max: 20 },
      breakEven: { min: 11, max: 20 },
      grossMarginPct: { min: 55, max: 70 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 75.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-fit-la-001",
    vectorCode: "GTV-FIT-LA-001",
    businessType: "fitness_boutique",
    location: "Los Angeles, CA",
    description: "Fitness studio LA, $150 ARPU, 6% churn, 15 new/mo, $14K opex",
    inputs: {
      businessType: "fitness_boutique",
      location: "Los Angeles, CA",
      arpu: 150,
      churn: 0.06,
      newPerMonth: 15,
      opex: 30900,
      cac: 120,
      capital: 75000
    },
    expectedRanges: {
      m12Profit: { min: 60000, max: 100000 },
      ltvCac: { min: 6, max: 18 },
      breakEven: { min: 6, max: 14 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 75.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-drop-online-001",
    vectorCode: "GTV-DROP-ONLINE-001",
    businessType: "ecommerce",
    location: "Remote",
    description: "Dropshipping store, $35 AOV, 200 orders/mo, $3K opex, $25 CAC",
    inputs: {
      businessType: "ecommerce",
      location: "Remote",
      arpu: 35,
      newPerMonth: 200,
      opex: 6500,
      cac: 25,
      capital: 8000
    },
    expectedRanges: {
      grossMarginPct: { min: 20, max: 40 },
      breakEven: { min: 11, max: 20 },
      netMarginPct: { min: 5, max: 18 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 65.0,
    consecutivePasses: 0,
    isActive: true
  },
  {
    id: "gtv-fintech-sf-001",
    vectorCode: "GTV-FINTECH-SF-001",
    businessType: "saas",
    location: "San Francisco, CA",
    description: "Fintech app, $29 ARPU, 3% churn, 50 new/mo, $25K opex",
    inputs: {
      businessType: "saas",
      location: "San Francisco, CA",
      arpu: 29,
      churn: 0.03,
      newPerMonth: 50,
      opex: 25000,
      cac: 150,
      capital: 100000
    },
    expectedRanges: {
      grossMarginPct: { min: 80, max: 95 },
      ltvCac: { min: 4, max: 15 },
      breakEven: { min: 8, max: 18 }
    },
    tolerancePct: 15.0,
    confidenceThreshold: 75.0,
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
  
  // Real shape check (2026-08-02, golden-vector wiring audit): monthly_profit,
  // gross_margin_percent, and net_margin_percent do NOT exist at
  // financial_analysis's root in the actual engine output
  // (financial-analysis-shape.ts) — they live under scenarios.base.
  // net_profit/gross_margin/net_margin. Every one of these three checks
  // was silently reading `undefined` and reporting "Missing X" regardless
  // of whether the engine's real numbers were in range — this validator
  // has never been able to pass a real vector, independent of whether the
  // math was right. Fixed to read the actual paths.
  const base = result.financial_analysis?.scenarios?.base as { net_profit?: number; gross_margin?: number; net_margin?: number } | undefined;

  if (expectedRanges.monthlyProfit) {
    checkRange(base?.net_profit, expectedRanges.monthlyProfit, 'monthlyProfit');
  }

  if (expectedRanges.m12Profit) {
    // Approximate M12 profit as monthly * 12
    const m12 = base?.net_profit !== undefined ? base.net_profit * 12 : undefined;
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
    checkRange(base?.gross_margin, expectedRanges.grossMargin || expectedRanges.grossMarginPct, 'grossMarginPct');
  }

  if (expectedRanges.netMarginPct) {
    checkRange(base?.net_margin, expectedRanges.netMarginPct, 'netMarginPct');
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
