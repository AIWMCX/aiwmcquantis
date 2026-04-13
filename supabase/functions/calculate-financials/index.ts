/**
 * CALCULATE-FINANCIALS EDGE FUNCTION
 * 
 * Extracted microservice from analyze-business monolith
 * Handles all deterministic financial calculations
 * 
 * Benefits:
 * - Independent scaling
 * - Faster cold starts (~100ms vs 1s+ for monolith)
 * - Can be reused by other functions
 * - Isolated failure domain
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== TYPES ==========

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

export interface LocationMultipliers {
  salary: number;
  rent: number;
  utility: number;
  marketing: number;
  overall: number;
}

export interface FinancialsInput {
  mrr: number;
  startup_investment: number;
  cac?: number;
  average_check?: number;
  benchmarks?: IndustryBenchmarks;
  location_multipliers?: LocationMultipliers;
  industry?: string;
  location?: string;
  user_provided_costs?: number;
  user_provided_churn_rate?: number;
  user_provided_customers?: number;
}

// ========== DEFAULT BENCHMARKS ==========
// Fallback benchmarks for when none are provided

const DEFAULT_BENCHMARKS: Record<string, IndustryBenchmarks> = {
  saas: {
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
    keywords: ['saas', 'software', 'app', 'platform', 'subscription']
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce / Retail',
    cogs_percent: 55,
    salaries_fixed: 4000,
    rent_fixed: 1500,
    utilities_fixed: 300,
    other_fixed: 800,
    cac_min: 15,
    cac_max: 80,
    cac_typical: 35,
    average_check_min: 30,
    average_check_max: 200,
    orders_per_client: 3,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 5,
    net_margin_max: 15,
    keywords: ['store', 'shop', 'ecommerce', 'retail']
  },
  general: {
    id: 'general',
    name: 'General Business',
    cogs_percent: 35,
    salaries_fixed: 5000,
    rent_fixed: 1500,
    utilities_fixed: 300,
    other_fixed: 1000,
    cac_min: 30,
    cac_max: 150,
    cac_typical: 60,
    average_check_min: 30,
    average_check_max: 300,
    orders_per_client: 2,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 10,
    net_margin_max: 25,
    keywords: []
  }
};

const DEFAULT_LOCATION_MULTIPLIERS: LocationMultipliers = {
  salary: 1.0,
  rent: 1.0,
  utility: 1.0,
  marketing: 1.0,
  overall: 1.0
};

function detectBenchmarkFromIndustry(industry?: string): IndustryBenchmarks {
  if (!industry) return DEFAULT_BENCHMARKS.general;
  
  const lower = industry.toLowerCase();
  
  if (lower.includes('saas') || lower.includes('software') || lower.includes('app')) {
    return DEFAULT_BENCHMARKS.saas;
  }
  if (lower.includes('ecommerce') || lower.includes('retail') || lower.includes('store')) {
    return DEFAULT_BENCHMARKS.ecommerce;
  }
  
  // Search in benchmark keywords
  for (const [key, benchmark] of Object.entries(DEFAULT_BENCHMARKS)) {
    if (benchmark.keywords.some(kw => lower.includes(kw))) {
      return benchmark;
    }
  }
  
  return DEFAULT_BENCHMARKS.general;
}

export interface CalculationAudit {
  formula: string;
  inputs: Record<string, number | string>;
  result: number;
  isValid: boolean;
  notes?: string;
}

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  originalValue?: number;
  correctedValue?: number;
  fix?: string;
}

export interface ScenarioMetrics {
  revenue: number;
  profit: number;
  margin: number;
  label: string;
}

export interface FinancialsOutput {
  success: boolean;
  metrics: {
    mrr: number;
    arr: number;
    grossProfit: number;
    grossMarginPercent: number;
    netProfit: number;
    netMarginPercent: number;
    totalExpenses: number;
    expenses: {
      cogs: number;
      salaries: number;
      rent: number;
      utilities: number;
      marketing: number;
      other: number;
    };
    cac: number;
    ltv: number;
    ltvCacRatio: number;
    cacPaybackMonths: number;
    averageCheck: number;
    clientsActive: number;
    newClientsNeeded: number;
    ordersMonthly: number;
    startupInvestment: number;
    paybackMonths: number;
    roiYear1Percent: number;
    roiYear3Percent: number;
    npv3Years: number;
    breakEvenRevenue: number;
    breakEvenUnits: number;
    revenueFor45kProfit: number;
    isProfitable: boolean;
    industryDetected: string;
    scenarios: {
      pessimistic: ScenarioMetrics;
      base: ScenarioMetrics;
      optimistic: ScenarioMetrics;
    };
  };
  validation: {
    isValid: boolean;
    hasHardErrors: boolean;
    issues: ValidationIssue[];
  };
  audit: CalculationAudit[];
  calculatedAt: string;
  engineVersion: string;
}

// ========== CORE CALCULATION ENGINE ==========

function computeFinancials(input: FinancialsInput): FinancialsOutput {
  const { 
    mrr, 
    startup_investment: startupInvestment, 
    user_provided_costs: userProvidedCosts,
    user_provided_churn_rate: userProvidedChurnRate,
    user_provided_customers: userProvidedCustomers,
  } = input;
  
  // Resolve benchmarks - use provided or detect from industry
  const benchmarks: IndustryBenchmarks = input.benchmarks || detectBenchmarkFromIndustry(input.industry);
  const locationMultiplier: LocationMultipliers = input.location_multipliers || DEFAULT_LOCATION_MULTIPLIERS;
  
  let rawCac = input.cac ?? benchmarks.cac_typical;
  let rawAvgCheck = input.average_check ?? 
    (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
  
  const issues: ValidationIssue[] = [];
  const audit: CalculationAudit[] = [];
  
  // ===== STEP 1: Apply location adjustments to fixed costs =====
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultiplier.salary);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultiplier.rent);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultiplier.utility);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultiplier.overall);
  
  audit.push({
    formula: 'Location_Adjusted_Costs = Base_Costs × Location_Multiplier',
    inputs: {
      'Base Salaries': benchmarks.salaries_fixed,
      'Location Multiplier': locationMultiplier.salary,
    },
    result: adjustedSalaries,
    isValid: true,
    notes: `$${benchmarks.salaries_fixed} × ${locationMultiplier.salary} = $${adjustedSalaries}`,
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
  // Apply location marketing multiplier
  cac = Math.round(cac * locationMultiplier.marketing);
  
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
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  audit.push({
    formula: 'COGS = MRR × COGS_Percent',
    inputs: { MRR: mrr, 'COGS%': benchmarks.cogs_percent },
    result: cogs,
    isValid: true,
    notes: `$${mrr} × ${benchmarks.cogs_percent}% = $${cogs}`,
  });
  
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
      'Churn Rate': Math.round(churnRate * 100) + '%',
      'New Clients Needed': newClientsNeeded,
      CAC: cac,
    },
    result: marketing,
    isValid: true,
    notes: `${newClientsNeeded} clients × $${cac} = $${marketing}`,
  });
  
  // Total expenses
  let totalExpenses: number;
  
  if (userProvidedCosts && userProvidedCosts > 0) {
    totalExpenses = userProvidedCosts;
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
  
  // Validate profitability
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
  // RAMP-UP AWARE PAYBACK
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (netProfit > 0) {
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
        if (cumulative >= startupInvestment) {
          paybackMonths = m;
          foundPayback = true;
          break;
        }
      }
      if (!foundPayback) paybackMonths = 999;
    } else {
      paybackMonths = 999;
    }
  }
  
  audit.push({
    formula: 'Payback = Ramp-Up Cash Flow Model (30%→100% over 6 months)',
    inputs: { Investment: startupInvestment, 'Steady-State Profit': netProfit },
    result: paybackMonths,
    isValid: paybackMonths > 0 && paybackMonths < 48,
    notes: paybackMonths === 999 
      ? 'Business is unprofitable - payback impossible' 
      : `With 6-month ramp-up: payback at month ${paybackMonths}`,
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
  
  // ROI also uses ramp-adjusted Year 1 profit
  let roiYear1Percent = 0;
  if (startupInvestment > 0 && netProfit > 0) {
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
    roiYear1Percent = Math.round((y1Profit / startupInvestment) * 100);
  }
  
  const roiYear3Percent = startupInvestment > 0 
    ? Math.round((netProfit * 36 / startupInvestment) * 100) 
    : 0;
  
  const npv3Years = Math.round(netProfit * 36 - startupInvestment);
  
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
  
  // ===== STEP 10: Calculate CAC payback months =====
  const contributionPerCustomer = avgCheck * (1 - benchmarks.cogs_percent / 100);
  const cacPaybackMonths = contributionPerCustomer > 0 
    ? Math.ceil(cac / contributionPerCustomer) 
    : 999;
  
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
  const scenarios = {
    pessimistic: {
      revenue: Math.round(mrr * 0.7),
      profit: Math.round((mrr * 0.7) - totalExpenses),
      margin: Math.round((((mrr * 0.7) - totalExpenses) / (mrr * 0.7)) * 100) || 0,
      label: 'Pessimistic (-30%)',
    },
    base: {
      revenue: mrr,
      profit: netProfit,
      margin: netMarginPercent,
      label: 'Base Case',
    },
    optimistic: {
      revenue: Math.round(mrr * 1.3),
      profit: Math.round((mrr * 1.3) - totalExpenses),
      margin: Math.round((((mrr * 1.3) - totalExpenses) / (mrr * 1.3)) * 100) || 0,
      label: 'Optimistic (+30%)',
    },
  };
  
  const hasHardErrors = issues.some(i => i.severity === 'error');
  
  return {
    success: true,
    metrics: {
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
      isProfitable,
      industryDetected: benchmarks.name,
      scenarios,
    },
    validation: {
      isValid: !hasHardErrors,
      hasHardErrors,
      issues,
    },
    audit,
    calculatedAt: new Date().toISOString(),
    engineVersion: '2.1.0',
  };
}

// ========== REQUEST HANDLER ==========

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    
    // Validate request
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json() as FinancialsInput;

    // Validate required field: mrr
    if (typeof body.mrr !== 'number' || body.mrr < 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'mrr must be a non-negative number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Startup investment defaults to 0 if not provided
    if (body.startup_investment === undefined) {
      body.startup_investment = 0;
    }

    // Log what we're using
    const resolvedBenchmarks = body.benchmarks || detectBenchmarkFromIndustry(body.industry);
    console.log(`Using benchmarks: ${resolvedBenchmarks.name} (${body.benchmarks ? 'provided' : 'auto-detected'})`);

    // Run calculations
    const result = computeFinancials(body);
    
    const latencyMs = Date.now() - startTime;
    console.log(`calculate-financials completed in ${latencyMs}ms`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Latency-Ms': String(latencyMs),
        } 
      }
    );

  } catch (error) {
    console.error('calculate-financials error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
