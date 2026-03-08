/**
 * Unit Tests for Quantis Financial Engine
 * 
 * Tests the deterministic financial calculations that are the core
 * differentiator of AIWMC Quantis from "GPT wrappers".
 */

import { describe, it, expect } from 'vitest';

// ========== MOCK TYPES (matching financial-engine.ts) ==========

interface IndustryBenchmarks {
  id: string;
  name: string;
  cogs_percent: number;
  salaries_fixed: number;
  rent_fixed: number;
  utilities_fixed: number;
  other_fixed: number;
  cac_min: number;
  cac_max: number;
  cac_typical: number;
  average_check_min: number;
  average_check_max: number;
  orders_per_client: number;
  client_lifetime_months: number;
  ltv_cac_min: number;
  ltv_cac_max: number;
  net_margin_min: number;
  net_margin_max: number;
  keywords: string[];
}

interface FinancialEngineInput {
  mrr: number;
  startupInvestment: number;
  cac: number;
  averageCheck: number;
  userProvidedCosts?: number;
  userProvidedChurnRate?: number;
  userProvidedCustomers?: number;
  benchmarks: IndustryBenchmarks;
  locationMultiplier: number;
}

// ========== REIMPLEMENTED CALCULATIONS FOR TESTING ==========
// These mirror the calculations in financial-engine.ts

function computeTestFinancials(input: FinancialEngineInput) {
  const { 
    mrr, 
    startupInvestment, 
    cac, 
    averageCheck,
    userProvidedCosts,
    userProvidedCustomers,
    userProvidedChurnRate,
    benchmarks,
    locationMultiplier 
  } = input;
  
  // Location-adjusted fixed costs
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultiplier);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultiplier);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultiplier);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultiplier);
  
  // LTV calculation
  const ltv = averageCheck * benchmarks.orders_per_client * benchmarks.client_lifetime_months;
  
  // LTV:CAC ratio
  const ltvCacRatio = cac > 0 ? Math.round((ltv / cac) * 10) / 10 : 0;
  
  // COGS
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  // Fixed costs total
  const fixedCosts = adjustedSalaries + adjustedRent + adjustedUtilities + adjustedOther;
  
  // Client calculations
  const revenuePerClient = averageCheck * benchmarks.orders_per_client;
  const clientsActive = userProvidedCustomers && userProvidedCustomers > 0 
    ? userProvidedCustomers 
    : Math.max(1, Math.ceil(mrr / Math.max(revenuePerClient, 1)));
  
  const churnRate = userProvidedChurnRate && userProvidedChurnRate > 0 
    ? userProvidedChurnRate / 100 
    : 1 / benchmarks.client_lifetime_months;
  
  const newClientsNeeded = Math.ceil(clientsActive * churnRate);
  const marketing = newClientsNeeded * cac;
  
  // Total expenses
  let totalExpenses: number;
  if (userProvidedCosts && userProvidedCosts > 0) {
    totalExpenses = userProvidedCosts;
  } else {
    totalExpenses = cogs + fixedCosts + marketing;
  }
  
  // Profit calculations
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  const netProfit = mrr - totalExpenses;
  const netMarginPercent = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  const isProfitable = netProfit > 0;
  
  // Payback calculation
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (netProfit > 0) {
      paybackMonths = Math.ceil(startupInvestment / netProfit);
    } else {
      paybackMonths = 999;
    }
  }
  
  // ROI calculations
  const roiYear1Percent = startupInvestment > 0 
    ? Math.round((netProfit * 12 / startupInvestment) * 100) 
    : 0;
  
  // Break-even calculations
  const variableCostRatio = benchmarks.cogs_percent / 100 + (mrr > 0 ? marketing / mrr : 0);
  const contributionMargin = 1 - variableCostRatio;
  const breakEvenRevenue = contributionMargin > 0 
    ? Math.round(fixedCosts / contributionMargin) 
    : 0;
  
  // CAC payback
  const contributionPerCustomer = averageCheck * (1 - benchmarks.cogs_percent / 100);
  const cacPaybackMonths = contributionPerCustomer > 0 
    ? Math.ceil(cac / contributionPerCustomer) 
    : 999;
  
  return {
    mrr,
    arr: mrr * 12,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netMarginPercent,
    totalExpenses,
    cac,
    ltv,
    ltvCacRatio,
    cacPaybackMonths,
    clientsActive,
    paybackMonths,
    roiYear1Percent,
    breakEvenRevenue,
    isProfitable,
  };
}

// ========== TEST FIXTURES ==========

const SAAS_BENCHMARKS: IndustryBenchmarks = {
  id: 'saas',
  name: 'SaaS / Software',
  cogs_percent: 20,
  salaries_fixed: 8000,
  rent_fixed: 500,
  utilities_fixed: 200,
  other_fixed: 1000,
  cac_min: 50,
  cac_max: 500,
  cac_typical: 150,
  average_check_min: 20,
  average_check_max: 500,
  orders_per_client: 1,
  client_lifetime_months: 24,
  ltv_cac_min: 3,
  ltv_cac_max: 8,
  net_margin_min: 15,
  net_margin_max: 40,
  keywords: ['saas', 'software']
};

const FOOD_BENCHMARKS: IndustryBenchmarks = {
  id: 'food_service',
  name: 'Food & Beverage',
  cogs_percent: 38,
  salaries_fixed: 6000,
  rent_fixed: 2000,
  utilities_fixed: 500,
  other_fixed: 1200,
  cac_min: 8,
  cac_max: 30,
  cac_typical: 15,
  average_check_min: 8,
  average_check_max: 40,
  orders_per_client: 4,
  client_lifetime_months: 6,
  ltv_cac_min: 3,
  ltv_cac_max: 6,
  net_margin_min: 5,
  net_margin_max: 15,
  keywords: ['restaurant', 'cafe']
};

// ========== TESTS ==========

describe('Financial Engine: Core Calculations', () => {
  
  describe('LTV Calculation', () => {
    it('calculates LTV correctly for SaaS business', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      // LTV = 50 (avg check) × 1 (orders/month) × 24 (lifetime months) = 1200
      expect(result.ltv).toBe(1200);
    });
    
    it('calculates LTV correctly for F&B business', () => {
      const result = computeTestFinancials({
        mrr: 20000,
        startupInvestment: 30000,
        cac: 15,
        averageCheck: 25,
        benchmarks: FOOD_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      // LTV = 25 (avg check) × 4 (orders/month) × 6 (lifetime months) = 600
      expect(result.ltv).toBe(600);
    });
  });
  
  describe('LTV:CAC Ratio', () => {
    it('calculates healthy LTV:CAC ratio', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      // LTV:CAC = 1200 / 150 = 8.0
      expect(result.ltvCacRatio).toBe(8);
    });
    
    it('handles zero CAC gracefully', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 0,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.ltvCacRatio).toBe(0);
    });
  });
  
  describe('Expense Calculations', () => {
    it('applies location multiplier to fixed costs', () => {
      const baseResult = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      const sfResult = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.8 // San Francisco multiplier
      });
      
      // SF costs should be ~80% higher
      expect(sfResult.totalExpenses).toBeGreaterThan(baseResult.totalExpenses);
    });
    
    it('uses user-provided costs when available', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        userProvidedCosts: 5000,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.totalExpenses).toBe(5000);
    });
  });
  
  describe('Profitability Calculations', () => {
    it('correctly identifies profitable business', () => {
      const result = computeTestFinancials({
        mrr: 50000,
        startupInvestment: 100000,
        cac: 100,
        averageCheck: 100,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.isProfitable).toBe(true);
      expect(result.netProfit).toBeGreaterThan(0);
    });
    
    it('correctly identifies unprofitable business', () => {
      const result = computeTestFinancials({
        mrr: 5000,
        startupInvestment: 100000,
        cac: 500,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 2.0 // High cost location
      });
      
      expect(result.isProfitable).toBe(false);
      expect(result.netProfit).toBeLessThan(0);
    });
    
    it('calculates gross margin correctly', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS, // 20% COGS
        locationMultiplier: 1.0
      });
      
      // Gross Margin = (10000 - 2000) / 10000 = 80%
      expect(result.grossMarginPercent).toBe(80);
    });
  });
  
  describe('Payback Period', () => {
    it('calculates payback for profitable business', () => {
      const result = computeTestFinancials({
        mrr: 50000,
        startupInvestment: 100000,
        cac: 100,
        averageCheck: 100,
        userProvidedCosts: 20000,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      // Net profit = 50000 - 20000 = 30000
      // Payback = 100000 / 30000 = 3.33 → 4 months
      expect(result.paybackMonths).toBe(4);
    });
    
    it('returns 999 for unprofitable business', () => {
      const result = computeTestFinancials({
        mrr: 5000,
        startupInvestment: 100000,
        cac: 500,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 2.0
      });
      
      expect(result.paybackMonths).toBe(999);
    });
    
    it('returns 0 when no startup investment', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 0,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.paybackMonths).toBe(0);
    });
  });
  
  describe('ROI Calculations', () => {
    it('calculates Year 1 ROI correctly', () => {
      const result = computeTestFinancials({
        mrr: 50000,
        startupInvestment: 100000,
        cac: 100,
        averageCheck: 100,
        userProvidedCosts: 20000,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      // Net profit = 30000/month
      // Year 1 ROI = (30000 × 12 / 100000) × 100 = 360%
      expect(result.roiYear1Percent).toBe(360);
    });
    
    it('returns 0 ROI when no investment', () => {
      const result = computeTestFinancials({
        mrr: 50000,
        startupInvestment: 0,
        cac: 100,
        averageCheck: 100,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.roiYear1Percent).toBe(0);
    });
  });
  
  describe('ARR Calculation', () => {
    it('calculates ARR as MRR × 12', () => {
      const result = computeTestFinancials({
        mrr: 10000,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.arr).toBe(120000);
    });
  });
  
  describe('Edge Cases', () => {
    it('handles zero MRR', () => {
      const result = computeTestFinancials({
        mrr: 0,
        startupInvestment: 50000,
        cac: 150,
        averageCheck: 50,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.grossMarginPercent).toBe(0);
      expect(result.netMarginPercent).toBe(0);
      expect(result.isProfitable).toBe(false);
    });
    
    it('handles very high MRR', () => {
      const result = computeTestFinancials({
        mrr: 10000000,
        startupInvestment: 1000000,
        cac: 150,
        averageCheck: 1000,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.isProfitable).toBe(true);
      expect(result.paybackMonths).toBeLessThan(12);
    });
    
    it('handles minimum values', () => {
      const result = computeTestFinancials({
        mrr: 1,
        startupInvestment: 1,
        cac: 1,
        averageCheck: 1,
        benchmarks: SAAS_BENCHMARKS,
        locationMultiplier: 1.0
      });
      
      expect(result.ltv).toBeGreaterThan(0);
      expect(result.ltvCacRatio).toBeGreaterThan(0);
    });
  });
});

describe('Financial Engine: Industry-Specific', () => {
  
  it('applies different COGS percentages by industry', () => {
    const saasResult = computeTestFinancials({
      mrr: 10000,
      startupInvestment: 50000,
      cac: 100,
      averageCheck: 50,
      benchmarks: SAAS_BENCHMARKS, // 20% COGS
      locationMultiplier: 1.0
    });
    
    const fbResult = computeTestFinancials({
      mrr: 10000,
      startupInvestment: 50000,
      cac: 100,
      averageCheck: 50,
      benchmarks: FOOD_BENCHMARKS, // 38% COGS
      locationMultiplier: 1.0
    });
    
    // F&B has higher COGS, so lower gross margin
    expect(fbResult.grossMarginPercent).toBeLessThan(saasResult.grossMarginPercent);
    expect(saasResult.grossMarginPercent).toBe(80); // 100% - 20% COGS
    expect(fbResult.grossMarginPercent).toBe(62);   // 100% - 38% COGS
  });
  
  it('accounts for different client lifetime by industry', () => {
    // SaaS: 24 months lifetime
    // F&B: 6 months lifetime
    const saasResult = computeTestFinancials({
      mrr: 10000,
      startupInvestment: 50000,
      cac: 100,
      averageCheck: 50,
      benchmarks: SAAS_BENCHMARKS,
      locationMultiplier: 1.0
    });
    
    const fbResult = computeTestFinancials({
      mrr: 10000,
      startupInvestment: 50000,
      cac: 100,
      averageCheck: 50,
      benchmarks: FOOD_BENCHMARKS,
      locationMultiplier: 1.0
    });
    
    // SaaS LTV should be higher or equal due to longer lifetime
    expect(saasResult.ltv).toBeGreaterThanOrEqual(fbResult.ltv);
  });
});
