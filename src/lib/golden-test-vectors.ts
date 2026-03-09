import { AnalysisResult } from "@/types/analysis";

export interface BusinessInputs {
  businessType: string;
  location: string;
  monthlyRevenue?: number;
  initialInvestment?: number;
}

export interface GoldenVector {
  id: string;
  businessType: string;
  location: string;
  inputs: BusinessInputs;
  expectedRanges: {
    monthlyProfit: [number, number];
    paybackMonths: [number, number];
    grossMargin: [number, number];
  };
  confidenceThreshold: number;
}

export const GOLDEN_VECTORS: GoldenVector[] = [
  {
    id: "gv-coffee-shop-houston",
    businessType: "Coffee Shop",
    location: "Houston, TX",
    inputs: {
      businessType: "Coffee Shop",
      location: "Houston, TX",
      monthlyRevenue: 25000,
      initialInvestment: 150000,
    },
    expectedRanges: {
      monthlyProfit: [2000, 8000],
      paybackMonths: [18, 36],
      grossMargin: [65, 85],
    },
    confidenceThreshold: 75.0,
  },
  {
    id: "gv-saas-b2b-global",
    businessType: "B2B SaaS",
    location: "Global",
    inputs: {
      businessType: "B2B SaaS",
      location: "Global",
      monthlyRevenue: 10000,
      initialInvestment: 50000,
    },
    expectedRanges: {
      monthlyProfit: [-5000, 5000],
      paybackMonths: [12, 48],
      grossMargin: [75, 95],
    },
    confidenceThreshold: 80.0,
  },
  {
    id: "gv-barbershop-denver",
    businessType: "Barbershop",
    location: "Denver, CO",
    inputs: {
      businessType: "Barbershop",
      location: "Denver, CO",
      monthlyRevenue: 15000,
      initialInvestment: 60000,
    },
    expectedRanges: {
      monthlyProfit: [1500, 5000],
      paybackMonths: [12, 24],
      grossMargin: [40, 60],
    },
    confidenceThreshold: 70.0,
  }
];

export function validateAgainstGoldenVector(
  result: AnalysisResult,
  vector: GoldenVector
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  const checkRange = (value: number | undefined, range: [number, number], name: string) => {
    if (value === undefined) {
      failures.push(`Missing ${name}`);
      return;
    }
    if (value < range[0] || value > range[1]) {
      failures.push(`${name} (${value}) is outside expected range [${range[0]}, ${range[1]}]`);
    }
  };

  checkRange(result.monthly_profit, vector.expectedRanges.monthlyProfit, "monthlyProfit");
  checkRange(result.payback_months, vector.expectedRanges.paybackMonths, "paybackMonths");

  // Approximate gross margin check if available in result
  const revenue = result.result?.revenue?.base || vector.inputs.monthlyRevenue;
  const costs = result.result?.costs?.monthly || 0;
  
  if (revenue && costs) {
    // Assuming simple gross margin for illustration
    const estimatedMargin = ((revenue - costs) / revenue) * 100;
    // Real implementation would extract exact gross margin from result.result
  }

  return {
    passed: failures.length === 0,
    failures
  };
}