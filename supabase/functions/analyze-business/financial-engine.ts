/**
 * QUANTIS DETERMINISTIC FINANCIAL ENGINE
 * 
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for all financial calculations.
 * The LLM is NEVER allowed to compute or modify these numbers.
 * 
 * All calculations are:
 * 1. Deterministic - same inputs always produce same outputs
 * 2. Auditable - every step is logged with formula and inputs
 * 3. Validated - unrealistic values are caught and corrected
 * 4. Traceable - full calculation audit trail for transparency
 */

import type { 
  ComputedMetrics, 
  ScenarioMetrics, 
  ValidationIssue, 
  CalculationAudit,
  InvestmentBreakdownItem 
} from './schemas.ts';

// ========== INDUSTRY BENCHMARK TYPE ==========

export interface IndustryBenchmarks {
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

// ========== ENGINE INPUT INTERFACE ==========

export interface FinancialEngineInput {
  // Core metrics
  mrr: number;
  startupInvestment: number;
  
  // Unit economics inputs
  cac: number;
  averageCheck: number;
  
  // Optional user overrides
  userProvidedCosts?: number;
  userProvidedChurnRate?: number;
  userProvidedCustomers?: number;
  
  // Context
  benchmarks: IndustryBenchmarks;
  locationMultiplier: number;
}

// ========== ENGINE OUTPUT INTERFACE ==========

export interface FinancialEngineOutput {
  metrics: ComputedMetrics;
  validation: {
    isValid: boolean;
    hasHardErrors: boolean;
    issues: ValidationIssue[];
  };
  audit: CalculationAudit[];
}

// ========== CORE CALCULATION ENGINE ==========

/**
 * The heart of the financial engine - produces all metrics deterministically
 */
export function computeFinancials(input: FinancialEngineInput): FinancialEngineOutput {
  const { 
    mrr, 
    startupInvestment, 
    cac: rawCac, 
    averageCheck: rawAvgCheck,
    userProvidedCosts,
    userProvidedChurnRate,
    userProvidedCustomers,
    benchmarks,
    locationMultiplier 
  } = input;
  
  const issues: ValidationIssue[] = [];
  const audit: CalculationAudit[] = [];
  
  // ===== STEP 1: Apply location adjustments to fixed costs =====
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultiplier);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultiplier);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultiplier);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultiplier);
  
  audit.push({
    formula: 'Location_Adjusted_Costs = Base_Costs × Location_Multiplier',
    inputs: {
      'Base Salaries': benchmarks.salaries_fixed,
      'Location Multiplier': locationMultiplier,
    },
    result: adjustedSalaries,
    isValid: true,
    notes: `$${benchmarks.salaries_fixed} × ${locationMultiplier} = $${adjustedSalaries}`,
  });
  
  // ===== STEP 2: Validate and correct average check =====
  let avgCheck = rawAvgCheck;
  if (avgCheck < benchmarks.average_check_min) {
    issues.push({
      code: 'AVG_CHECK_BELOW_MIN',
      field: 'averageCheck',
      message: `Average check $${avgCheck} is below market minimum $${benchmarks.average_check_min} for ${benchmarks.name}`,
      severity: 'warning',
      originalValue: avgCheck,
      correctedValue: benchmarks.average_check_min,
      fix: `Using industry minimum of $${benchmarks.average_check_min}`,
    });
    avgCheck = benchmarks.average_check_min;
  } else if (avgCheck > benchmarks.average_check_max * 2) {
    issues.push({
      code: 'AVG_CHECK_ABOVE_MAX',
      field: 'averageCheck',
      message: `Average check $${avgCheck} exceeds 2x market maximum for ${benchmarks.name}`,
      severity: 'warning',
      originalValue: avgCheck,
      correctedValue: benchmarks.average_check_max,
      fix: `Using industry maximum of $${benchmarks.average_check_max}`,
    });
    avgCheck = benchmarks.average_check_max;
  }
  
  // ===== STEP 3: Validate and correct CAC =====
  let cac = rawCac;
  if (cac < benchmarks.cac_min * 0.5) {
    issues.push({
      code: 'CAC_UNREALISTICALLY_LOW',
      field: 'cac',
      message: `CAC $${cac} is unrealistically low. Minimum is $${benchmarks.cac_min} for ${benchmarks.name}`,
      severity: 'warning',
      originalValue: cac,
      correctedValue: benchmarks.cac_typical,
      fix: `Using industry typical of $${benchmarks.cac_typical}`,
    });
    cac = benchmarks.cac_typical;
  } else if (cac > benchmarks.cac_max * 2) {
    issues.push({
      code: 'CAC_TOO_HIGH',
      field: 'cac',
      message: `CAC $${cac} is very high for ${benchmarks.name}. Maximum is typically $${benchmarks.cac_max}`,
      severity: 'warning',
      originalValue: cac,
      correctedValue: benchmarks.cac_max,
      fix: `Capping at industry maximum of $${benchmarks.cac_max}`,
    });
    cac = benchmarks.cac_max;
  }
  
  // ===== STEP 4: Calculate LTV (deterministic formula) =====
  // FORMULA: LTV = Avg_Check × Orders_per_Month × Lifetime_Months
  const ltv = avgCheck * benchmarks.orders_per_client * benchmarks.client_lifetime_months;
  
  audit.push({
    formula: 'LTV = Average_Check × Orders_per_Month × Client_Lifetime_Months',
    inputs: {
      'Average Check': avgCheck,
      'Orders/Month': benchmarks.orders_per_client,
      'Lifetime (months)': benchmarks.client_lifetime_months,
    },
    result: ltv,
    isValid: true,
    notes: `$${avgCheck} × ${benchmarks.orders_per_client} × ${benchmarks.client_lifetime_months} = $${ltv}`,
  });
  
  // ===== STEP 5: Calculate LTV:CAC ratio =====
  const ltvCacRatio = cac > 0 ? Math.round((ltv / cac) * 10) / 10 : 0;
  
  audit.push({
    formula: 'LTV_CAC_Ratio = LTV / CAC',
    inputs: { LTV: ltv, CAC: cac },
    result: ltvCacRatio,
    isValid: ltvCacRatio >= 2 && ltvCacRatio <= 10,
    notes: `$${ltv} / $${cac} = ${ltvCacRatio}x (healthy: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`,
  });
  
  // Validate LTV:CAC
  if (ltvCacRatio < 2) {
    issues.push({
      code: 'LTV_CAC_WEAK',
      field: 'ltvCacRatio',
      message: `LTV:CAC ratio of ${ltvCacRatio}x is below healthy threshold of 3x`,
      severity: ltvCacRatio < 1.5 ? 'error' : 'warning',
      fix: 'Reduce CAC through organic channels or increase customer lifetime value',
    });
  } else if (ltvCacRatio > 10) {
    issues.push({
      code: 'LTV_CAC_SUSPICIOUSLY_HIGH',
      field: 'ltvCacRatio',
      message: `LTV:CAC ratio of ${ltvCacRatio}x is unusually high - verify inputs`,
      severity: 'warning',
      fix: 'This may indicate underinvestment in growth or optimistic assumptions',
    });
  }
  
  // ===== STEP 6: Calculate expense structure =====
  
  // COGS (variable cost based on revenue)
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  audit.push({
    formula: 'COGS = MRR × COGS_Percent',
    inputs: { MRR: mrr, 'COGS%': benchmarks.cogs_percent },
    result: cogs,
    isValid: true,
    notes: `$${mrr} × ${benchmarks.cogs_percent}% = $${cogs}`,
  });
  
  // Fixed costs
  const fixedCosts = adjustedSalaries + adjustedRent + adjustedUtilities + adjustedOther;
  
  // Calculate active clients and marketing spend
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;
  const clientsActive = userProvidedCustomers && userProvidedCustomers > 0 
    ? userProvidedCustomers 
    : Math.max(1, Math.ceil(mrr / Math.max(revenuePerClient, 1)));
  
  const churnRate = userProvidedChurnRate && userProvidedChurnRate > 0 
    ? userProvidedChurnRate / 100 
    : 1 / benchmarks.client_lifetime_months;
  
  const newClientsNeeded = Math.ceil(clientsActive * churnRate);
  const marketing = newClientsNeeded * cac;
  
  audit.push({
    formula: 'Marketing_Cost = New_Clients_Needed × CAC',
    inputs: {
      'Active Clients': clientsActive,
      'Churn Rate': Math.round(churnRate * 100),
      'New Clients Needed': newClientsNeeded,
      CAC: cac,
    },
    result: marketing,
    isValid: true,
    notes: `${newClientsNeeded} clients × $${cac} = $${marketing}`,
  });
  
  // Total expenses - use user provided if available
  let totalExpenses: number;
  let expenseSource: 'user' | 'calculated' = 'calculated';
  
  if (userProvidedCosts && userProvidedCosts > 0) {
    totalExpenses = userProvidedCosts;
    expenseSource = 'user';
    
    audit.push({
      formula: 'Total_Expenses = User_Provided_Costs',
      inputs: { 'User Monthly Costs': userProvidedCosts },
      result: totalExpenses,
      isValid: true,
      notes: `Using user-provided monthly costs: $${userProvidedCosts.toLocaleString()}`,
    });
  } else {
    totalExpenses = cogs + fixedCosts + marketing;
    
    audit.push({
      formula: 'Total_Expenses = COGS + Fixed_Costs + Marketing',
      inputs: {
        COGS: cogs,
        Salaries: adjustedSalaries,
        Rent: adjustedRent,
        Utilities: adjustedUtilities,
        Other: adjustedOther,
        Marketing: marketing,
      },
      result: totalExpenses,
      isValid: true,
      notes: `$${cogs} + $${fixedCosts} + $${marketing} = $${totalExpenses}`,
    });
  }
  
  // ===== STEP 7: Calculate profit metrics =====
  
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  
  const netProfit = mrr - totalExpenses;
  const netMarginPercent = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  const isProfitable = netProfit > 0;
  
  audit.push({
    formula: 'Net_Profit = MRR - Total_Expenses',
    inputs: { MRR: mrr, Expenses: totalExpenses },
    result: netProfit,
    isValid: isProfitable,
    notes: `$${mrr} - $${totalExpenses} = $${netProfit} ${isProfitable ? '✓' : '❌ LOSS'}`,
  });
  
  // Validate profitability against industry norms
  if (isProfitable && netMarginPercent < benchmarks.net_margin_min) {
    issues.push({
      code: 'NET_MARGIN_BELOW_INDUSTRY',
      field: 'netMarginPercent',
      message: `Net margin ${netMarginPercent}% is below industry minimum of ${benchmarks.net_margin_min}%`,
      severity: 'warning',
      fix: `Target ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}% net margin for this industry`,
    });
  }
  
  if (!isProfitable) {
    issues.push({
      code: 'UNPROFITABLE',
      field: 'netProfit',
      message: `Business is unprofitable with monthly loss of $${Math.abs(netProfit).toLocaleString()}`,
      severity: 'error',
      fix: 'Increase revenue or reduce costs to reach profitability',
    });
  }
  
  // ===== STEP 8: Calculate investment returns =====
  
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (netProfit > 0) {
      paybackMonths = Math.ceil(startupInvestment / netProfit);
    } else {
      paybackMonths = 999; // Unprofitable - never pays back
    }
  }
  
  audit.push({
    formula: 'Payback_Months = Startup_Investment / Monthly_Net_Profit',
    inputs: { Investment: startupInvestment, 'Monthly Profit': netProfit },
    result: paybackMonths,
    isValid: paybackMonths > 0 && paybackMonths < 48,
    notes: paybackMonths === 999 
      ? 'Business is unprofitable - payback impossible' 
      : `$${startupInvestment} / $${netProfit} = ${paybackMonths} months`,
  });
  
  if (paybackMonths > 36 && paybackMonths < 999) {
    issues.push({
      code: 'PAYBACK_TOO_LONG',
      field: 'paybackMonths',
      message: `Payback period of ${paybackMonths} months exceeds typical threshold of 24-36 months`,
      severity: 'warning',
      fix: 'Consider reducing initial investment or increasing monthly profitability',
    });
  }
  
  // ROI calculations
  const roiYear1Percent = startupInvestment > 0 
    ? Math.round((netProfit * 12 / startupInvestment) * 100) 
    : 0;
  
  const roiYear3Percent = startupInvestment > 0 
    ? Math.round((netProfit * 36 / startupInvestment) * 100) 
    : 0;
  
  const npv3Years = Math.round(netProfit * 36 - startupInvestment);
  
  audit.push({
    formula: 'ROI_Year1 = (Net_Profit × 12 / Investment) × 100%',
    inputs: { 'Monthly Profit': netProfit, Investment: startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `($${netProfit} × 12 / $${startupInvestment}) × 100 = ${roiYear1Percent}%`,
  });
  
  // ===== STEP 9: Calculate break-even points =====
  
  const variableCostRatio = benchmarks.cogs_percent / 100 + (mrr > 0 ? marketing / mrr : 0);
  const contributionMargin = 1 - variableCostRatio;
  
  const breakEvenRevenue = contributionMargin > 0 
    ? Math.round(fixedCosts / contributionMargin) 
    : 0;
  
  const breakEvenUnits = avgCheck > 0 
    ? Math.ceil(breakEvenRevenue / avgCheck) 
    : 0;
  
  const targetProfit = 45000;
  const revenueFor45kProfit = contributionMargin > 0 
    ? Math.round((fixedCosts + targetProfit) / contributionMargin) 
    : 0;
  
  audit.push({
    formula: 'Break_Even_Revenue = Fixed_Costs / Contribution_Margin',
    inputs: { 
      'Fixed Costs': fixedCosts, 
      'Contribution Margin': Math.round(contributionMargin * 100),
    },
    result: breakEvenRevenue,
    isValid: true,
    notes: `$${fixedCosts} / ${Math.round(contributionMargin * 100)}% = $${breakEvenRevenue}/mo`,
  });
  
  // ===== STEP 10: Calculate CAC payback months =====
  
  const contributionPerCustomer = avgCheck * (1 - benchmarks.cogs_percent / 100);
  const cacPaybackMonths = contributionPerCustomer > 0 
    ? Math.ceil(cac / contributionPerCustomer) 
    : 999;
  
  audit.push({
    formula: 'CAC_Payback = CAC / (Avg_Check × Contribution_Margin)',
    inputs: { CAC: cac, 'Contribution/Customer': contributionPerCustomer },
    result: cacPaybackMonths,
    isValid: cacPaybackMonths <= benchmarks.client_lifetime_months,
    notes: `$${cac} / $${Math.round(contributionPerCustomer)} = ${cacPaybackMonths} months`,
  });
  
  if (cacPaybackMonths > benchmarks.client_lifetime_months) {
    issues.push({
      code: 'CAC_PAYBACK_EXCEEDS_LIFETIME',
      field: 'cacPaybackMonths',
      message: `CAC payback (${cacPaybackMonths} months) exceeds customer lifetime (${benchmarks.client_lifetime_months} months)`,
      severity: 'error',
      fix: 'Reduce CAC or increase customer lifetime value',
    });
  }
  
  // ===== STEP 11: Generate scenario analysis =====
  
  const scenarios = generateScenarios(mrr, cogs, fixedCosts, marketing, netProfit, grossProfit, grossMarginPercent, netMarginPercent);
  
  // ===== BUILD FINAL OUTPUT =====
  
  const metrics: ComputedMetrics = {
    mrr,
    arr: mrr * 12,
    grossProfit,
    grossMarginPercent,
    netProfit,
    netMarginPercent,
    totalExpenses,
    expenses: {
      cogs,
      salaries: adjustedSalaries,
      rent: adjustedRent,
      utilities: adjustedUtilities,
      marketing,
      other: adjustedOther,
    },
    cac,
    ltv,
    ltvCacRatio,
    cacPaybackMonths,
    averageCheck: avgCheck,
    clientsActive,
    newClientsNeeded,
    ordersMonthly: Math.round(mrr / avgCheck),
    startupInvestment,
    paybackMonths,
    roiYear1Percent,
    roiYear3Percent,
    npv3Years,
    breakEvenRevenue,
    breakEvenUnits,
    revenueFor45kProfit,
    scenarios,
    isProfitable,
    industryDetected: benchmarks.name,
  };
  
  const hasHardErrors = issues.some(i => i.severity === 'error');
  
  return {
    metrics,
    validation: {
      isValid: !hasHardErrors,
      hasHardErrors,
      issues,
    },
    audit,
  };
}

// ========== SCENARIO MULTIPLIERS (FinTech Squad v2.0) ==========

const SCENARIO_MULTIPLIERS = {
  conservative: { revenue: 0.80, costs: 1.10, growth: 0.50 },
  baseline: { revenue: 1.00, costs: 1.00, growth: 1.00 },
  aggressive: { revenue: 1.25, costs: 0.90, growth: 1.50 },
} as const;

// ========== SCENARIO GENERATION ==========

function generateScenarios(
  mrr: number,
  cogs: number,
  fixedCosts: number,
  marketing: number,
  netProfit: number,
  grossProfit: number,
  grossMarginPercent: number,
  netMarginPercent: number
): { pessimistic: ScenarioMetrics; base: ScenarioMetrics; optimistic: ScenarioMetrics } {
  
  const mult = SCENARIO_MULTIPLIERS;
  
  // Pessimistic (Conservative): Revenue drops, costs increase
  const pessimisticRevenue = Math.round(mrr * mult.conservative.revenue);
  const pessimisticCogs = Math.round(cogs * mult.conservative.revenue); // COGS scales with revenue
  const pessimisticMarketing = Math.round(marketing * mult.conservative.costs);
  const pessimisticFixed = Math.round(fixedCosts * mult.conservative.costs);
  const pessimisticTotal = pessimisticCogs + pessimisticFixed + pessimisticMarketing;
  const pessimisticNetProfit = pessimisticRevenue - pessimisticTotal;
  const pessimisticGrossProfit = pessimisticRevenue - pessimisticCogs;
  
  // Base case: current projections (multiplier = 1.0)
  const baseTotal = cogs + fixedCosts + marketing;
  
  // Optimistic (Aggressive): Revenue grows, costs controlled
  const optimisticRevenue = Math.round(mrr * mult.aggressive.revenue);
  const optimisticCogs = Math.round(cogs * mult.aggressive.revenue); // COGS scales with revenue
  const optimisticMarketing = Math.round(marketing * mult.aggressive.costs);
  const optimisticFixed = Math.round(fixedCosts * mult.aggressive.costs);
  const optimisticTotal = optimisticCogs + optimisticFixed + optimisticMarketing;
  const optimisticNetProfit = optimisticRevenue - optimisticTotal;
  const optimisticGrossProfit = optimisticRevenue - optimisticCogs;
  
  return {
    pessimistic: {
      revenue: pessimisticRevenue,
      variableCosts: pessimisticCogs + pessimisticMarketing,
      fixedCosts: pessimisticFixed,
      grossProfit: pessimisticGrossProfit,
      netProfit: pessimisticNetProfit,
      grossMargin: pessimisticRevenue > 0 ? Math.round((pessimisticGrossProfit / pessimisticRevenue) * 100) : 0,
      netMargin: pessimisticRevenue > 0 ? Math.round((pessimisticNetProfit / pessimisticRevenue) * 100) : 0,
    },
    base: {
      revenue: mrr,
      variableCosts: cogs + marketing,
      fixedCosts,
      grossProfit,
      netProfit,
      grossMargin: grossMarginPercent,
      netMargin: netMarginPercent,
    },
    optimistic: {
      revenue: optimisticRevenue,
      variableCosts: optimisticCogs + optimisticMarketing,
      fixedCosts: optimisticFixed,
      grossProfit: optimisticGrossProfit,
      netProfit: optimisticNetProfit,
      grossMargin: optimisticRevenue > 0 ? Math.round((optimisticGrossProfit / optimisticRevenue) * 100) : 0,
      netMargin: optimisticRevenue > 0 ? Math.round((optimisticNetProfit / optimisticRevenue) * 100) : 0,
    },
  };
}

// ========== 12-MONTH PROJECTIONS (FinTech Squad v2.0) ==========

export interface MonthlyProjection {
  month: number;
  revenue: number;
  costs: number;
  profit: number;
  cumulativeProfit: number;
  cash: number;
}

export function generate12MonthProjections(
  mrr: number,
  totalExpenses: number,
  startupInvestment: number,
  currentCash: number,
  monthlyGrowthRate: number = 0.05 // Default 5% growth
): MonthlyProjection[] {
  const projections: MonthlyProjection[] = [];
  
  let revenue = mrr;
  let costs = totalExpenses;
  let cash = currentCash || 0;
  let cumulativeProfit = -startupInvestment;
  
  for (let month = 1; month <= 12; month++) {
    if (month > 1) {
      // Revenue grows at specified rate, costs grow at half the rate
      revenue = Math.round(revenue * (1 + monthlyGrowthRate));
      costs = Math.round(costs * (1 + monthlyGrowthRate * 0.5));
    }
    
    const profit = revenue - costs;
    cumulativeProfit += profit;
    cash += profit;
    
    projections.push({
      month,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      profit: Math.round(profit),
      cumulativeProfit: Math.round(cumulativeProfit),
      cash: Math.round(Math.max(0, cash)),
    });
  }
  
  return projections;
}

// ========== RISK FLAG ANALYSIS (FinTech Squad v2.0) ==========

export interface RiskFlag {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  profitImpact?: number;
  mitigation: string;
}

export function analyzeRisks(
  metrics: ComputedMetrics,
  currentCash: number = 0,
  currentCustomers: number = 0,
  churnRate: number = 0
): { risks: RiskFlag[]; overallLevel: 'low' | 'medium' | 'high' | 'critical' } {
  const risks: RiskFlag[] = [];
  
  // Risk 1: Negative profit
  if (metrics.netProfit < 0) {
    risks.push({
      id: 'negative-profit',
      severity: 'high',
      title: 'Negative Monthly Profit',
      description: `Costs exceed revenue by $${Math.abs(metrics.netProfit).toLocaleString()}/month`,
      profitImpact: metrics.netProfit * 12,
      mitigation: 'Reduce costs or increase pricing',
    });
  }
  
  // Risk 2: Limited runway
  if (metrics.netProfit < 0 && currentCash > 0) {
    const runwayMonths = currentCash / Math.abs(metrics.netProfit);
    if (runwayMonths < 6) {
      risks.push({
        id: 'low-runway',
        severity: runwayMonths < 3 ? 'critical' : 'high',
        title: 'Limited Cash Runway',
        description: `Only ${runwayMonths.toFixed(1)} months of runway`,
        mitigation: 'Secure funding or reduce burn rate immediately',
      });
    }
  }
  
  // Risk 3: Long payback period
  if (metrics.paybackMonths > 24 && metrics.paybackMonths < 999) {
    risks.push({
      id: 'long-payback',
      severity: metrics.paybackMonths > 36 ? 'high' : 'medium',
      title: 'Extended Payback Period',
      description: `${metrics.paybackMonths} months exceeds 2-year threshold`,
      mitigation: 'Increase margins or reduce initial investment',
    });
  }
  
  // Risk 4: Poor LTV:CAC ratio
  if (metrics.ltvCacRatio < 3 && metrics.ltvCacRatio > 0) {
    risks.push({
      id: 'low-ltv-cac',
      severity: metrics.ltvCacRatio < 1.5 ? 'critical' : 'high',
      title: 'Poor Unit Economics',
      description: `LTV:CAC ratio of ${metrics.ltvCacRatio}x is below 3x threshold`,
      mitigation: 'Reduce CAC or increase customer lifetime value',
    });
  }
  
  // Risk 5: High churn
  if (churnRate > 10) {
    risks.push({
      id: 'high-churn',
      severity: churnRate > 20 ? 'high' : 'medium',
      title: 'Elevated Churn Rate',
      description: `${churnRate}% monthly churn impacts growth sustainability`,
      mitigation: 'Implement customer retention programs',
    });
  }
  
  // Risk 6: Customer concentration
  if (currentCustomers > 0 && currentCustomers < 10 && metrics.mrr > 10000) {
    risks.push({
      id: 'customer-concentration',
      severity: 'medium',
      title: 'Customer Concentration Risk',
      description: `Revenue dependent on only ${currentCustomers} customers`,
      mitigation: 'Diversify customer base to reduce dependency',
    });
  }
  
  // Calculate overall risk level
  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  const highCount = risks.filter(r => r.severity === 'high').length;
  
  let overallLevel: 'low' | 'medium' | 'high' | 'critical';
  if (criticalCount > 0) overallLevel = 'critical';
  else if (highCount >= 2) overallLevel = 'high';
  else if (highCount === 1 || risks.length >= 3) overallLevel = 'medium';
  else overallLevel = 'low';
  
  return { risks, overallLevel };
}

// ========== VERDICT CALCULATION (FinTech Squad v2.0) ==========

export type Verdict = 'promising' | 'moderate' | 'risky' | 'critical';

export function calculateVerdict(
  roiPercent: number, 
  netProfit: number, 
  paybackMonths: number
): Verdict {
  if (netProfit < 0 && roiPercent < -50) return 'critical';
  if (netProfit < 0 || paybackMonths > 36) return 'risky';
  if (roiPercent < 50 || paybackMonths > 18) return 'moderate';
  return 'promising';
}

// ========== RELIABILITY SCORE (FinTech Squad v2.0) ==========

export function calculateReliabilityScore(
  hasRevenue: boolean,
  hasInvestment: boolean,
  hasCosts: boolean,
  hasIndustry: boolean,
  hasLocation: boolean,
  hasCAC: boolean,
  hasLTV: boolean,
  hasGrowthRate: boolean,
  hasChurnRate: boolean,
  hasCustomerCount: boolean
): number {
  let score = 0;
  
  if (hasRevenue) score += 15;
  if (hasInvestment) score += 15;
  if (hasCosts) score += 15;
  if (hasIndustry) score += 10;
  if (hasLocation) score += 10;
  if (hasCAC) score += 10;
  if (hasLTV) score += 10;
  if (hasGrowthRate) score += 5;
  if (hasChurnRate) score += 5;
  if (hasCustomerCount) score += 5;
  
  return Math.min(score, 100);
}

// ========== INVESTMENT BREAKDOWN GENERATOR ==========

export function generateInvestmentBreakdown(
  totalInvestment: number,
  monthlyRent: number,
  industryId: string
): InvestmentBreakdownItem[] {
  // Industry-specific allocation ratios
  const allocations: Record<string, Record<string, number>> = {
    saas: { equipment: 0.35, working_capital: 0.30, marketing_initial: 0.20, rent_deposit: 0.05, legal: 0.05, inventory: 0.05 },
    ecommerce: { inventory: 0.35, equipment: 0.20, working_capital: 0.20, marketing_initial: 0.15, rent_deposit: 0.05, legal: 0.05 },
    food_service: { equipment: 0.40, rent_deposit: 0.15, inventory: 0.20, working_capital: 0.15, marketing_initial: 0.05, legal: 0.05 },
    consulting: { working_capital: 0.40, equipment: 0.20, marketing_initial: 0.20, rent_deposit: 0.10, legal: 0.10, inventory: 0 },
    default: { equipment: 0.30, working_capital: 0.25, inventory: 0.15, marketing_initial: 0.15, rent_deposit: 0.10, legal: 0.05 },
  };
  
  const ratios = allocations[industryId] || allocations.default;
  
  // Calculate rent deposit as 2 months rent or allocation, whichever is higher
  const rentDeposit = Math.max(monthlyRent * 2, totalInvestment * ratios.rent_deposit);
  const remaining = totalInvestment - rentDeposit;
  
  // Adjust other allocations proportionally
  const rentRatio = ratios.rent_deposit;
  const adjustmentFactor = (1 - rentRatio) > 0 ? remaining / (totalInvestment * (1 - rentRatio)) : 1;
  
  return [
    { category: 'rent_deposit', amount: Math.round(rentDeposit) },
    { category: 'equipment', amount: Math.round(totalInvestment * ratios.equipment * adjustmentFactor) },
    { category: 'inventory', amount: Math.round(totalInvestment * ratios.inventory * adjustmentFactor) },
    { category: 'working_capital', amount: Math.round(totalInvestment * ratios.working_capital * adjustmentFactor) },
    { category: 'marketing_initial', amount: Math.round(totalInvestment * ratios.marketing_initial * adjustmentFactor) },
    { category: 'legal', amount: Math.round(totalInvestment * ratios.legal * adjustmentFactor) },
  ].filter(item => item.amount > 0);
}

// ========== CALCULATION SUMMARY GENERATOR ==========

export function generateCalculationSummary(
  metrics: ComputedMetrics,
  audit: CalculationAudit[],
  benchmarks: IndustryBenchmarks
): string {
  return `
## Financial Calculations Audit

### Input Data
- Revenue (MRR): $${metrics.mrr.toLocaleString()}
- Investment: $${metrics.startupInvestment.toLocaleString()}
- Average Check: $${metrics.averageCheck}
- CAC: $${metrics.cac}
- LTV: $${metrics.ltv.toLocaleString()}
- Industry: ${metrics.industryDetected}

### Expense Structure
| Category | Amount | % of Revenue |
|----------|--------|--------------|
| COGS | $${metrics.expenses.cogs.toLocaleString()} | ${metrics.mrr > 0 ? Math.round(metrics.expenses.cogs / metrics.mrr * 100) : 0}% |
| Salaries | $${metrics.expenses.salaries.toLocaleString()} | ${metrics.mrr > 0 ? Math.round(metrics.expenses.salaries / metrics.mrr * 100) : 0}% |
| Rent | $${metrics.expenses.rent.toLocaleString()} | ${metrics.mrr > 0 ? Math.round(metrics.expenses.rent / metrics.mrr * 100) : 0}% |
| Utilities | $${metrics.expenses.utilities.toLocaleString()} | ${metrics.mrr > 0 ? Math.round(metrics.expenses.utilities / metrics.mrr * 100) : 0}% |
| Marketing | $${metrics.expenses.marketing.toLocaleString()} | ${metrics.mrr > 0 ? Math.round(metrics.expenses.marketing / metrics.mrr * 100) : 0}% |
| Other | $${metrics.expenses.other.toLocaleString()} | ${metrics.mrr > 0 ? Math.round(metrics.expenses.other / metrics.mrr * 100) : 0}% |
| **TOTAL** | **$${metrics.totalExpenses.toLocaleString()}** | **${metrics.mrr > 0 ? Math.round(metrics.totalExpenses / metrics.mrr * 100) : 0}%** |

### Profit Calculation
**Profit = Revenue - Expenses**
$${metrics.mrr.toLocaleString()} - $${metrics.totalExpenses.toLocaleString()} = **$${metrics.netProfit.toLocaleString()}** ${metrics.isProfitable ? '✓' : '❌ LOSS'}

### Key Metrics
- **Net Margin:** ${metrics.netMarginPercent}% ${metrics.netMarginPercent >= benchmarks.net_margin_min ? '✓' : '⚠'}
- **LTV:CAC:** ${metrics.ltvCacRatio}x ${metrics.ltvCacRatio >= benchmarks.ltv_cac_min ? '✓' : '⚠'}
- **Payback:** ${metrics.paybackMonths === 999 ? 'never' : metrics.paybackMonths + ' months'}
- **Year 1 ROI:** ${metrics.roiYear1Percent}%

### Break-even Points
- **For zero profit:** $${metrics.breakEvenRevenue.toLocaleString()}/mo
- **For $45k profit:** $${metrics.revenueFor45kProfit.toLocaleString()}/mo

### Formula Audit
${audit.map(a => `- ${a.formula}: ${a.notes}`).join('\n')}
`.trim();
}
