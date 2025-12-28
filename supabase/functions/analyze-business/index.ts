import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

// ========== MULTI-INDUSTRY BENCHMARK SYSTEM ==========

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

const INDUSTRY_BENCHMARKS: IndustryBenchmarks[] = [
  {
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
    keywords: ['saas', 'software', 'app', 'platform', 'subscription', 'api', 'cloud', 'service', 'automation', 'digital product', 'web app', 'mobile app', 'tool', 'dashboard']
  },
  {
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
    keywords: ['store', 'shop', 'ecommerce', 'e-commerce', 'retail', 'marketplace', 'online store', 'dropshipping', 'products', 'selling', 'merch', 'merchandise']
  },
  {
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
    keywords: ['restaurant', 'cafe', 'bakery', 'food', 'delivery', 'catering', 'coffee', 'bar', 'kitchen', 'meal', 'pizza', 'burger', 'sushi', 'dessert', 'cake', 'pastry', 'пекарня', 'ресторан', 'кафе', 'доставка еды']
  },
  {
    id: 'consulting',
    name: 'Consulting / Professional Services',
    cogs_percent: 15,
    salaries_fixed: 10000,
    rent_fixed: 1000,
    utilities_fixed: 200,
    other_fixed: 500,
    cac_min: 100,
    cac_max: 1000,
    cac_typical: 300,
    average_check_min: 500,
    average_check_max: 5000,
    orders_per_client: 1,
    client_lifetime_months: 18,
    ltv_cac_min: 3,
    ltv_cac_max: 10,
    net_margin_min: 20,
    net_margin_max: 50,
    keywords: ['consulting', 'consultant', 'agency', 'services', 'professional', 'advisor', 'coach', 'coaching', 'training', 'b2b', 'enterprise']
  },
  {
    id: 'fitness',
    name: 'Fitness / Wellness',
    cogs_percent: 25,
    salaries_fixed: 5000,
    rent_fixed: 3000,
    utilities_fixed: 500,
    other_fixed: 800,
    cac_min: 20,
    cac_max: 100,
    cac_typical: 50,
    average_check_min: 50,
    average_check_max: 200,
    orders_per_client: 1,
    client_lifetime_months: 8,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 15,
    net_margin_max: 35,
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'wellness', 'health', 'workout', 'training', 'sport', 'crossfit', 'personal trainer', 'spa', 'massage']
  },
  {
    id: 'education',
    name: 'Education / Online Courses',
    cogs_percent: 20,
    salaries_fixed: 4000,
    rent_fixed: 500,
    utilities_fixed: 100,
    other_fixed: 500,
    cac_min: 30,
    cac_max: 200,
    cac_typical: 80,
    average_check_min: 50,
    average_check_max: 500,
    orders_per_client: 2,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 25,
    net_margin_max: 60,
    keywords: ['course', 'education', 'learning', 'online course', 'tutorial', 'training', 'school', 'academy', 'bootcamp', 'teaching', 'edtech', 'e-learning']
  },
  {
    id: 'healthcare',
    name: 'Healthcare / Medical',
    cogs_percent: 30,
    salaries_fixed: 12000,
    rent_fixed: 3000,
    utilities_fixed: 500,
    other_fixed: 2000,
    cac_min: 50,
    cac_max: 300,
    cac_typical: 120,
    average_check_min: 100,
    average_check_max: 1000,
    orders_per_client: 3,
    client_lifetime_months: 24,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 10,
    net_margin_max: 30,
    keywords: ['health', 'medical', 'clinic', 'doctor', 'dental', 'therapy', 'telehealth', 'pharmacy', 'healthcare', 'hospital', 'patient']
  },
  {
    id: 'fintech',
    name: 'Fintech / Financial Services',
    cogs_percent: 15,
    salaries_fixed: 15000,
    rent_fixed: 2000,
    utilities_fixed: 300,
    other_fixed: 3000,
    cac_min: 30,
    cac_max: 200,
    cac_typical: 80,
    average_check_min: 10,
    average_check_max: 100,
    orders_per_client: 12,
    client_lifetime_months: 36,
    ltv_cac_min: 3,
    ltv_cac_max: 10,
    net_margin_min: 20,
    net_margin_max: 50,
    keywords: ['fintech', 'finance', 'banking', 'payment', 'invest', 'trading', 'crypto', 'wallet', 'money', 'insurance', 'lending', 'credit']
  },
  {
    id: 'media',
    name: 'Media / Content / Entertainment',
    cogs_percent: 25,
    salaries_fixed: 5000,
    rent_fixed: 1000,
    utilities_fixed: 200,
    other_fixed: 800,
    cac_min: 5,
    cac_max: 50,
    cac_typical: 20,
    average_check_min: 5,
    average_check_max: 30,
    orders_per_client: 1,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 8,
    net_margin_min: 15,
    net_margin_max: 40,
    keywords: ['media', 'content', 'streaming', 'video', 'podcast', 'entertainment', 'news', 'blog', 'publishing', 'newsletter', 'creator', 'influencer']
  },
  {
    id: 'real_estate',
    name: 'Real Estate / Property',
    cogs_percent: 10,
    salaries_fixed: 8000,
    rent_fixed: 2000,
    utilities_fixed: 300,
    other_fixed: 1500,
    cac_min: 200,
    cac_max: 2000,
    cac_typical: 500,
    average_check_min: 1000,
    average_check_max: 20000,
    orders_per_client: 1,
    client_lifetime_months: 60,
    ltv_cac_min: 3,
    ltv_cac_max: 10,
    net_margin_min: 10,
    net_margin_max: 30,
    keywords: ['real estate', 'property', 'rental', 'housing', 'apartment', 'home', 'realty', 'broker', 'agent', 'landlord', 'lease']
  },
  {
    id: 'logistics',
    name: 'Logistics / Delivery',
    cogs_percent: 45,
    salaries_fixed: 6000,
    rent_fixed: 3000,
    utilities_fixed: 800,
    other_fixed: 2000,
    cac_min: 20,
    cac_max: 100,
    cac_typical: 40,
    average_check_min: 10,
    average_check_max: 100,
    orders_per_client: 8,
    client_lifetime_months: 12,
    ltv_cac_min: 3,
    ltv_cac_max: 6,
    net_margin_min: 5,
    net_margin_max: 15,
    keywords: ['logistics', 'delivery', 'shipping', 'courier', 'freight', 'transport', 'warehouse', 'fulfillment', 'supply chain']
  },
  {
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
];

function detectIndustry(businessIdea: string): IndustryBenchmarks {
  const ideaLower = businessIdea.toLowerCase();
  
  let bestMatch: IndustryBenchmarks | null = null;
  let bestScore = 0;
  
  for (const industry of INDUSTRY_BENCHMARKS) {
    if (industry.id === 'general') continue;
    
    let score = 0;
    for (const keyword of industry.keywords) {
      if (ideaLower.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = industry;
    }
  }
  
  return bestMatch || INDUSTRY_BENCHMARKS.find(i => i.id === 'general')!;
}

function getLocationMultiplier(location: string): number {
  const loc = location.toLowerCase();
  const highCostCities = [
    'new york', 'nyc', 'san francisco', 'sf', 'los angeles', 'la', 'london', 
    'tokyo', 'singapore', 'hong kong', 'zurich', 'geneva', 'paris', 'sydney',
    'москва', 'moscow', 'санкт-петербург', 'спб', 'st petersburg'
  ];
  const mediumCostCities = [
    'chicago', 'boston', 'seattle', 'miami', 'denver', 'austin', 'toronto',
    'berlin', 'amsterdam', 'dubai', 'melbourne', 'dublin'
  ];
  
  if (highCostCities.some(city => loc.includes(city))) return 1.4;
  if (mediumCostCities.some(city => loc.includes(city))) return 1.15;
  return 1.0;
}

// Tool schema for AI
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Submit business analysis with realistic industry benchmarks",
    parameters: {
      type: "object",
      properties: {
        financial_json: { type: "string", description: "JSON object with financial metrics" },
        business_json: { type: "string", description: "JSON with business plan sections" },
        marketing_json: { type: "string", description: "JSON with marketing plan" },
        market_json: { type: "string", description: "JSON with market analysis" },
        confidence: { type: "number" },
        sources: { type: "string" },
        limitations: { type: "string" }
      },
      required: ["financial_json", "business_json", "marketing_json", "market_json", "confidence"]
    }
  }
};

function safeParseJSON(str: string, fallback: any): any {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    try {
      return JSON.parse(str.replace(/'/g, '"'));
    } catch {
      return fallback;
    }
  }
}

// ========== STRICT FINANCIAL CALCULATOR ==========

interface CalculationAudit {
  formula: string;
  inputs: Record<string, number>;
  result: number;
  isValid: boolean;
  notes?: string;
}

interface StrictFinancialResult {
  mrr: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
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
  averageCheck: number;
  ordersMonthly: number;
  clientsActive: number;
  newClientsNeeded: number;
  startupInvestment: number;
  paybackMonths: number;
  roiYear1Percent: number;
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
  isProfitable: boolean;
  corrections: Array<{ field: string; original: number; corrected: number; reason: string }>;
  audit: CalculationAudit[];
  industryDetected: string;
}

function calculateStrictFinancials(
  rawMrr: number,
  rawInvestment: number,
  rawCac: number,
  rawLtv: number,
  rawAvgCheck: number,
  benchmarks: IndustryBenchmarks,
  locationMultiplier: number
): StrictFinancialResult {
  const corrections: Array<{ field: string; original: number; corrected: number; reason: string }> = [];
  const audit: CalculationAudit[] = [];
  
  // Apply location multiplier to fixed costs
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultiplier);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultiplier);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultiplier);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultiplier);
  
  // ===== STEP 1: Validate and correct input values =====
  
  // 1.1 Average Check
  let avgCheck = rawAvgCheck;
  if (avgCheck < benchmarks.average_check_min || avgCheck > benchmarks.average_check_max) {
    const corrected = Math.round((benchmarks.average_check_min + benchmarks.average_check_max) / 2);
    if (avgCheck < benchmarks.average_check_min) {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Average check $${avgCheck} is below market minimum $${benchmarks.average_check_min} for ${benchmarks.name}`
      });
    } else {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Average check $${avgCheck} exceeds market maximum $${benchmarks.average_check_max} for ${benchmarks.name}`
      });
    }
    avgCheck = corrected;
  }
  
  // 1.2 CAC
  let cac = rawCac;
  if (cac < benchmarks.cac_min) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: benchmarks.cac_typical,
      reason: `CAC $${cac} is unrealistically low. Minimum is $${benchmarks.cac_min} even for organic channels in ${benchmarks.name}.`
    });
    cac = benchmarks.cac_typical;
  } else if (cac > benchmarks.cac_max) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: benchmarks.cac_max,
      reason: `CAC $${cac} is too high for ${benchmarks.name}. Adjusted to maximum $${benchmarks.cac_max}`
    });
    cac = benchmarks.cac_max;
  }
  
  // 1.3 LTV - calculate from formula
  // FORMULA: LTV = Avg_Check × Orders_per_Month × Lifetime_Months
  const calculatedLtv = avgCheck * benchmarks.orders_per_client * benchmarks.client_lifetime_months;
  
  audit.push({
    formula: 'LTV = Avg_Check × Orders_per_Month × Client_Lifetime',
    inputs: {
      'Average Check': avgCheck,
      'Orders/Month': benchmarks.orders_per_client,
      'Lifetime (months)': benchmarks.client_lifetime_months
    },
    result: calculatedLtv,
    isValid: true,
    notes: `$${avgCheck} × ${benchmarks.orders_per_client} × ${benchmarks.client_lifetime_months} = $${calculatedLtv}`
  });
  
  let ltv = calculatedLtv;
  
  if (Math.abs(rawLtv - calculatedLtv) > calculatedLtv * 0.5) {
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: calculatedLtv,
      reason: `LTV recalculated: $${avgCheck} × ${benchmarks.orders_per_client} orders × ${benchmarks.client_lifetime_months} months = $${calculatedLtv}`
    });
  }
  
  // 1.4 Validate LTV:CAC ratio
  let ltvCacRatio = Math.round((ltv / cac) * 10) / 10;
  
  audit.push({
    formula: 'LTV:CAC = LTV / CAC',
    inputs: { LTV: ltv, CAC: cac },
    result: ltvCacRatio,
    isValid: ltvCacRatio >= benchmarks.ltv_cac_min && ltvCacRatio <= benchmarks.ltv_cac_max,
    notes: `$${ltv} / $${cac} = ${ltvCacRatio}x (healthy: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`
  });
  
  if (ltvCacRatio > benchmarks.ltv_cac_max) {
    const targetLtv = cac * benchmarks.ltv_cac_max;
    corrections.push({
      field: 'ltv_cac_ratio',
      original: ltvCacRatio,
      corrected: benchmarks.ltv_cac_max,
      reason: `LTV:CAC ${ltvCacRatio}x is unrealistically high (max ${benchmarks.ltv_cac_max}x). LTV adjusted to $${targetLtv}`
    });
    ltv = targetLtv;
    ltvCacRatio = benchmarks.ltv_cac_max;
  }
  
  // ===== STEP 2: Calculate expense structure =====
  
  const mrr = rawMrr;
  
  // 2.1 COGS (variable cost)
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  audit.push({
    formula: 'COGS = Revenue × COGS%',
    inputs: { 'Revenue': mrr, 'COGS%': benchmarks.cogs_percent },
    result: cogs,
    isValid: true,
    notes: `$${mrr} × ${benchmarks.cogs_percent}% = $${cogs}`
  });
  
  // 2.2 Fixed costs
  const salaries = adjustedSalaries;
  const rent = adjustedRent;
  const utilities = adjustedUtilities;
  const other = adjustedOther;
  const fixedCosts = salaries + rent + utilities + other;
  
  // 2.3 Marketing cost
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;
  const clientsActive = Math.ceil(mrr / revenuePerClient);
  const newClientsNeeded = Math.ceil(clientsActive * 0.25);
  const marketing = newClientsNeeded * cac;
  
  audit.push({
    formula: 'Marketing = New_Clients × CAC',
    inputs: { 
      'Active Clients': clientsActive,
      'New Clients (25%)': newClientsNeeded,
      'CAC': cac 
    },
    result: marketing,
    isValid: true,
    notes: `${newClientsNeeded} × $${cac} = $${marketing}`
  });
  
  // 2.4 Total expenses
  const totalExpenses = cogs + fixedCosts + marketing;
  
  audit.push({
    formula: 'Total_Expenses = COGS + Fixed_Costs + Marketing',
    inputs: { 
      'COGS': cogs, 
      'Salaries': salaries,
      'Rent': rent,
      'Utilities': utilities,
      'Other': other,
      'Marketing': marketing 
    },
    result: totalExpenses,
    isValid: true,
    notes: `$${cogs} + $${salaries} + $${rent} + $${utilities} + $${other} + $${marketing} = $${totalExpenses}`
  });
  
  // ===== STEP 3: Calculate profit metrics =====
  
  const netProfit = mrr - totalExpenses;
  const isProfitable = netProfit > 0;
  
  audit.push({
    formula: 'Net_Profit = Revenue - Expenses',
    inputs: { 'Revenue': mrr, 'Expenses': totalExpenses },
    result: netProfit,
    isValid: isProfitable,
    notes: `$${mrr} - $${totalExpenses} = $${netProfit} ${isProfitable ? '✓' : '❌ LOSS'}`
  });
  
  const netMarginPercent = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  
  audit.push({
    formula: 'Net_Margin = (Profit / Revenue) × 100%',
    inputs: { 'Profit': netProfit, 'Revenue': mrr },
    result: netMarginPercent,
    isValid: netMarginPercent >= benchmarks.net_margin_min && netMarginPercent <= benchmarks.net_margin_max,
    notes: `($${netProfit} / $${mrr}) × 100 = ${netMarginPercent}% (healthy: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%)`
  });
  
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  
  // ===== STEP 4: Calculate investment metrics =====
  
  const startupInvestment = rawInvestment;
  
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (netProfit > 0) {
      paybackMonths = Math.ceil(startupInvestment / netProfit);
    } else {
      paybackMonths = 999;
    }
  }
  
  audit.push({
    formula: 'Payback = Investment / Monthly_Profit',
    inputs: { 'Investment': startupInvestment, 'Profit/mo': netProfit },
    result: paybackMonths,
    isValid: paybackMonths < 36 && paybackMonths > 0,
    notes: paybackMonths === 999 
      ? 'Business is unprofitable - payback impossible' 
      : `$${startupInvestment} / $${netProfit} = ${paybackMonths} months`
  });
  
  let roiYear1Percent = 0;
  if (startupInvestment > 0) {
    roiYear1Percent = Math.round((netProfit * 12 / startupInvestment) * 100);
  }
  
  audit.push({
    formula: 'ROI = (Profit × 12 / Investment) × 100%',
    inputs: { 'Profit/mo': netProfit, 'Investment': startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `($${netProfit} × 12 / $${startupInvestment}) × 100 = ${roiYear1Percent}%`
  });
  
  const variableCostRatio = (benchmarks.cogs_percent / 100) + (marketing / mrr);
  const breakEvenRevenue = Math.round(fixedCosts / (1 - variableCostRatio));
  
  audit.push({
    formula: 'Break_Even = Fixed_Costs / (1 - Variable_Cost_Ratio)',
    inputs: { 
      'Fixed Costs': fixedCosts, 
      'Variable Cost %': Math.round(variableCostRatio * 100) 
    },
    result: breakEvenRevenue,
    isValid: true,
    notes: `$${fixedCosts} / (1 - ${Math.round(variableCostRatio * 100)}%) = $${breakEvenRevenue}/mo`
  });
  
  const targetProfit = 45000;
  const revenueFor45kProfit = Math.round((fixedCosts + targetProfit) / (1 - variableCostRatio));
  
  audit.push({
    formula: 'Revenue_for_$45k = (Fixed_Costs + $45000) / (1 - Variable%)',
    inputs: { 
      'Fixed Costs': fixedCosts, 
      'Target Profit': targetProfit,
      'Variable Cost %': Math.round(variableCostRatio * 100) 
    },
    result: revenueFor45kProfit,
    isValid: true,
    notes: `($${fixedCosts} + $${targetProfit}) / (1 - ${Math.round(variableCostRatio * 100)}%) = $${revenueFor45kProfit}/mo`
  });
  
  return {
    mrr,
    totalExpenses,
    netProfit,
    netMarginPercent,
    grossProfit,
    grossMarginPercent,
    expenses: {
      cogs,
      salaries,
      rent,
      utilities,
      marketing,
      other
    },
    cac,
    ltv,
    ltvCacRatio,
    averageCheck: avgCheck,
    ordersMonthly: Math.round(mrr / avgCheck),
    clientsActive,
    newClientsNeeded,
    startupInvestment,
    paybackMonths,
    roiYear1Percent,
    breakEvenRevenue,
    revenueFor45kProfit,
    isProfitable,
    corrections,
    audit,
    industryDetected: benchmarks.name
  };
}

function transformResponse(raw: any, location: string, benchmarks: IndustryBenchmarks, locationMultiplier: number) {
  const fa = safeParseJSON(raw.financial_json, {});
  const bp = safeParseJSON(raw.business_json, {});
  const mp = safeParseJSON(raw.marketing_json, {});
  const ma = safeParseJSON(raw.market_json, {});
  const sources = raw.sources ? raw.sources.split(',').map((s: string) => s.trim()) : ["Public sources", "Industry data"];
  const limits = raw.limitations ? raw.limitations.split(',').map((s: string) => s.trim()) : ["Estimates based on industry benchmarks"];

  // Extract raw values from AI
  const rawMrr = fa.mrr || 50000;
  const rawInvestment = fa.startup_investment || 100000;
  const rawCac = fa.cac || mp.cac || benchmarks.cac_typical;
  const rawLtv = fa.ltv || mp.ltv || 500;
  const rawAvgCheck = fa.average_check || (benchmarks.average_check_min + benchmarks.average_check_max) / 2;
  
  // Calculate with strict validation
  const calc = calculateStrictFinancials(rawMrr, rawInvestment, rawCac, rawLtv, rawAvgCheck, benchmarks, locationMultiplier);
  
  // Build calculation summary in English
  const calculationsSummary = `
## Financial Calculations Audit

### Input Data
- Revenue (MRR): $${calc.mrr.toLocaleString()}
- Investment: $${calc.startupInvestment.toLocaleString()}
- Average Check: $${calc.averageCheck}
- CAC: $${calc.cac}
- LTV: $${calc.ltv.toLocaleString()}
- Industry: ${calc.industryDetected}

### Expense Structure
| Category | Amount | % of Revenue |
|----------|--------|--------------|
| COGS | $${calc.expenses.cogs.toLocaleString()} | ${Math.round(calc.expenses.cogs / calc.mrr * 100)}% |
| Salaries | $${calc.expenses.salaries.toLocaleString()} | ${Math.round(calc.expenses.salaries / calc.mrr * 100)}% |
| Rent | $${calc.expenses.rent.toLocaleString()} | ${Math.round(calc.expenses.rent / calc.mrr * 100)}% |
| Utilities | $${calc.expenses.utilities.toLocaleString()} | ${Math.round(calc.expenses.utilities / calc.mrr * 100)}% |
| Marketing | $${calc.expenses.marketing.toLocaleString()} | ${Math.round(calc.expenses.marketing / calc.mrr * 100)}% |
| Other | $${calc.expenses.other.toLocaleString()} | ${Math.round(calc.expenses.other / calc.mrr * 100)}% |
| **TOTAL** | **$${calc.totalExpenses.toLocaleString()}** | **${Math.round(calc.totalExpenses / calc.mrr * 100)}%** |

### Profit Calculation
**Profit = Revenue - Expenses**
$${calc.mrr.toLocaleString()} - $${calc.totalExpenses.toLocaleString()} = **$${calc.netProfit.toLocaleString()}** ${calc.isProfitable ? '✓' : '❌ LOSS'}

### Key Metrics
- **Net Margin:** ${calc.netMarginPercent}% ${calc.netMarginPercent >= benchmarks.net_margin_min ? '✓' : '⚠'}
- **LTV:CAC:** ${calc.ltvCacRatio}x ${calc.ltvCacRatio >= benchmarks.ltv_cac_min ? '✓' : '⚠'}
- **Payback:** ${calc.paybackMonths === 999 ? 'never' : calc.paybackMonths + ' months'}
- **Year 1 ROI:** ${calc.roiYear1Percent}%

### Break-even Points
- **For zero profit:** $${calc.breakEvenRevenue.toLocaleString()}/mo
- **For $45k profit:** $${calc.revenueFor45kProfit.toLocaleString()}/mo

### Formula Audit
${calc.audit.map(a => `- ${a.formula}: ${a.notes}`).join('\n')}
`.trim();

  return {
    financial_analysis: {
      inputs: {
        price_per_unit: calc.averageCheck,
        units_sold_monthly: calc.ordersMonthly,
        purchase_frequency: benchmarks.orders_per_client,
        upsell_per_customer: 0,
        cogs_per_unit: Math.round(calc.averageCheck * (benchmarks.cogs_percent / 100)),
        fixed_opex: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
        marketing_budget: calc.expenses.marketing,
        cac: calc.cac,
        startup_investment: calc.startupInvestment,
        capex: Math.round(calc.startupInvestment * 0.45),
        ltv: calc.ltv,
        churn_rate: Math.round(100 / benchmarks.client_lifetime_months) / 100
      },
      mrr: calc.mrr,
      arr: calc.mrr * 12,
      scenarios: {
        pessimistic: {
          revenue: Math.round(calc.mrr * 0.8),
          variable_costs: Math.round(calc.expenses.cogs * 0.8),
          fixed_costs: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
          gross_profit: Math.round((calc.mrr * 0.8) - (calc.expenses.cogs * 0.8)),
          net_profit: Math.round((calc.mrr * 0.8) - calc.totalExpenses * 0.95),
          gross_margin: calc.grossMarginPercent,
          net_margin: calc.netMarginPercent - 8
        },
        base: {
          revenue: calc.mrr,
          variable_costs: calc.expenses.cogs,
          fixed_costs: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
          gross_profit: calc.grossProfit,
          net_profit: calc.netProfit,
          gross_margin: calc.grossMarginPercent,
          net_margin: calc.netMarginPercent
        },
        optimistic: {
          revenue: Math.round(calc.mrr * 1.25),
          variable_costs: Math.round(calc.expenses.cogs * 1.25),
          fixed_costs: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
          gross_profit: Math.round((calc.mrr * 1.25) - (calc.expenses.cogs * 1.25)),
          net_profit: Math.round((calc.mrr * 1.25) - calc.totalExpenses * 1.1),
          gross_margin: calc.grossMarginPercent,
          net_margin: calc.netMarginPercent + 5
        }
      },
      unit_economics: {
        contribution_margin: Math.round(calc.averageCheck - calc.averageCheck * (benchmarks.cogs_percent / 100)),
        contribution_margin_ratio: (100 - benchmarks.cogs_percent) / 100,
        cac: calc.cac,
        cac_payback_months: Math.ceil(calc.cac / (calc.averageCheck * (Math.max(calc.netMarginPercent, 5) / 100) * benchmarks.orders_per_client)),
        ltv: calc.ltv,
        ltv_cac_ratio: calc.ltvCacRatio
      },
      breakeven: {
        breakeven_units: Math.ceil(calc.breakEvenRevenue / calc.averageCheck),
        breakeven_revenue: calc.breakEvenRevenue,
        breakeven_months: calc.isProfitable ? Math.min(calc.paybackMonths, 24) : 0
      },
      returns: {
        payback_period_months: calc.paybackMonths,
        roi_year_1: calc.roiYear1Percent,
        roi_year_3: Math.round((calc.netProfit * 36 / calc.startupInvestment) * 100),
        npv_3_years: Math.round(calc.netProfit * 36 - calc.startupInvestment)
      },
      startup_investment: {
        total: calc.startupInvestment,
        breakdown: {
          rent_deposit: Math.round(calc.expenses.rent * 2),
          equipment: Math.round(calc.startupInvestment * 0.45),
          inventory: Math.round(calc.startupInvestment * 0.15),
          legal: 2000,
          marketing_initial: Math.round(calc.startupInvestment * 0.1),
          working_capital: Math.round(calc.startupInvestment * 0.2)
        },
        reasoning: `Investment $${calc.startupInvestment.toLocaleString()}: equipment 45%, inventory 15%, working capital 20%, marketing 10%, deposit & legal 10%`
      },
      monthly_expenses: {
        total: calc.totalExpenses,
        variable_costs: calc.expenses.cogs + calc.expenses.marketing,
        fixed_costs: calc.expenses.salaries + calc.expenses.rent + calc.expenses.utilities + calc.expenses.other,
        breakdown: {
          rent: calc.expenses.rent,
          utilities: calc.expenses.utilities,
          salaries: calc.expenses.salaries,
          inventory_replenishment: calc.expenses.cogs,
          marketing: calc.expenses.marketing,
          other: calc.expenses.other
        }
      },
      risk_analysis: {
        revenue_drop_20: {
          scenario: "Revenue drops 20%",
          description: "Demand decline, seasonality, or competition",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: Math.round((calc.mrr * 0.8) - calc.totalExpenses * 0.95),
          probability: "medium" as const
        },
        costs_rise_15: {
          scenario: "Costs increase 15%",
          description: "Inflation, supplier price increases, rent hikes",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: Math.round(calc.mrr - calc.totalExpenses * 1.15),
          probability: "high" as const
        },
        cac_doubles: {
          scenario: "CAC doubles",
          description: "Increased ad competition, market saturation",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: Math.round(calc.netProfit - calc.expenses.marketing),
          probability: "medium" as const
        },
        churn_increase: {
          scenario: "Churn increases 50%",
          description: "Quality issues, competitor offers, market shift",
          impact_on_revenue: -15,
          impact_on_costs: 0,
          resulting_profit: Math.round((calc.mrr * 0.85) - calc.totalExpenses),
          probability: "medium" as const
        }
      },
      calculations_summary: calculationsSummary,
      industry_detected: calc.industryDetected
    },
    business_plan: {
      executive_summary: bp.executive_summary || "",
      product_description: bp.product_description || "",
      target_audience: bp.target_audience || "",
      competitive_advantages: bp.competitive_advantages || "",
      operations: bp.operations || "",
      launch_steps: Array.isArray(bp.launch_steps) ? bp.launch_steps : [],
      risks: Array.isArray(bp.risks) ? bp.risks : []
    },
    marketing_plan: {
      positioning: mp.positioning || "",
      pricing_strategy: mp.pricing_strategy || "",
      channels: Array.isArray(mp.channels) ? mp.channels : [],
      cac: calc.cac,
      ltv: calc.ltv,
      first_3_months_plan: mp.first_3_months_plan || ""
    },
    market_analysis: {
      market_size: {
        tam: ma.tam || "",
        sam: ma.sam || "",
        som: ma.som || ""
      },
      trends: Array.isArray(ma.trends) ? ma.trends : [],
      competition: {
        main_competitors: Array.isArray(ma.competitors) ? ma.competitors : [],
        competitive_landscape: ma.competitive_landscape || "",
        market_gaps: ma.market_gaps || ""
      },
      barriers_to_entry: ma.barriers_to_entry || "",
      growth_opportunities: ma.growth_opportunities || ""
    },
    confidence_score: 0,
    data_sources: sources,
    limitations: limits,
    _calc: calc
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, location } = await req.json() as AnalysisRequest;

    if (!idea || idea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Business idea must be at least 10 characters", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || location.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Please specify a location", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service is not configured", code: "CONFIG_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect industry from business idea
    const detectedIndustry = detectIndustry(idea);
    const locationMultiplier = getLocationMultiplier(location);
    
    console.log(`Analyzing: "${idea.substring(0, 40)}..." in ${location} | Industry: ${detectedIndustry.name} | Location multiplier: ${locationMultiplier}`);

    const prompt = `You are a financial analyst. Analyze this business idea.

## BUSINESS IDEA
${idea.trim()}

## LOCATION (USE THIS LOCATION ONLY!)
${location.trim()}

## DETECTED INDUSTRY: ${detectedIndustry.name}

## REQUIREMENTS

### Use these industry-specific ranges for ${detectedIndustry.name}:
- Monthly Revenue: $${Math.round(detectedIndustry.average_check_max * detectedIndustry.orders_per_client * 100)} - $${Math.round(detectedIndustry.average_check_max * detectedIndustry.orders_per_client * 500)}
- Average Check: $${detectedIndustry.average_check_min} - $${detectedIndustry.average_check_max}
- CAC: $${detectedIndustry.cac_min} - $${detectedIndustry.cac_max}
- Startup Investment: $${Math.round((detectedIndustry.salaries_fixed + detectedIndustry.rent_fixed) * 10)} - $${Math.round((detectedIndustry.salaries_fixed + detectedIndustry.rent_fixed) * 25)}

### Formulas (IMPORTANT!):
- LTV = Average_Check × ${detectedIndustry.orders_per_client}_orders_per_month × ${detectedIndustry.client_lifetime_months}_months_lifetime
- Example: $${detectedIndustry.average_check_max} × ${detectedIndustry.orders_per_client} × ${detectedIndustry.client_lifetime_months} = $${detectedIndustry.average_check_max * detectedIndustry.orders_per_client * detectedIndustry.client_lifetime_months}

## RESPONSE FORMAT (ALL IN ENGLISH!)

financial_json:
{
  "mrr": number (monthly revenue in USD),
  "average_check": number (in USD),
  "orders_monthly": number,
  "startup_investment": number (in USD),
  "cac": number (in USD),
  "ltv": number (calculate using formula!),
  "equipment": number (in USD)
}

business_json:
{
  "executive_summary": "brief summary",
  "product_description": "description",
  "target_audience": "audience in ${location.trim()}",
  "competitive_advantages": "advantages",
  "operations": "operations plan",
  "launch_steps": ["step1", "step2", "step3"],
  "risks": [{"name": "risk name", "description": "description", "mitigation": "how to mitigate"}]
}

marketing_json:
{
  "positioning": "market positioning",
  "pricing_strategy": "pricing strategy",
  "channels": [{"name": "channel name", "budget": number, "expected_roi": number}],
  "cac": number,
  "ltv": number,
  "first_3_months_plan": "first 3 months marketing plan"
}

market_json:
{
  "tam": "Total Addressable Market",
  "sam": "Serviceable Available Market",
  "som": "Serviceable Obtainable Market",
  "trends": ["trend1", "trend2"],
  "competitors": [{"name": "competitor", "strengths": "strengths", "weaknesses": "weaknesses"}],
  "competitive_landscape": "analysis",
  "market_gaps": "opportunities",
  "barriers_to_entry": "barriers",
  "growth_opportunities": "growth potential"
}

Call submit_analysis with all sections in English.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        tools: [analysisToolSchema],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a minute.", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    if (aiResponse.error) {
      console.error("AI error:", JSON.stringify(aiResponse.error));
      return new Response(
        JSON.stringify({ error: "AI error. Please try again.", code: "AI_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "AI did not return analysis. Please try again.", code: "NO_TOOL_CALL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawResult;
    try {
      rawResult = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Parse error:", e);
      return new Response(
        JSON.stringify({ error: "Parse error", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = transformResponse(rawResult, location.trim(), detectedIndustry, locationMultiplier);
    const calc = result._calc as StrictFinancialResult;
    delete result._calc;
    
    // Build validation warnings
    const warnings: Array<{
      field: string;
      value: number | string;
      expected: string;
      severity: 'warning' | 'error';
      message: string;
    }> = [];
    
    if (!calc.isProfitable) {
      warnings.push({
        field: 'profitability',
        value: calc.netProfit,
        expected: '> 0',
        severity: 'error',
        message: `❌ LOSS of $${Math.abs(calc.netProfit).toLocaleString()}/mo at revenue $${calc.mrr.toLocaleString()}. Break-even: $${calc.breakEvenRevenue.toLocaleString()}/mo. For $45k profit: $${calc.revenueFor45kProfit.toLocaleString()}/mo.`
      });
    }
    
    if (calc.ltvCacRatio < 3) {
      warnings.push({
        field: 'ltv_cac_ratio',
        value: calc.ltvCacRatio,
        expected: '3-6x',
        severity: 'warning',
        message: `LTV:CAC ${calc.ltvCacRatio}x is below healthy threshold of 3x — marketing is too expensive`
      });
    }
    
    if (calc.paybackMonths > 36 && calc.paybackMonths < 999) {
      warnings.push({
        field: 'payback',
        value: calc.paybackMonths,
        expected: '12-24 months',
        severity: 'warning',
        message: `Payback period of ${calc.paybackMonths} months — long investment recovery time`
      });
    }
    
    // ========== INTELLIGENT RELIABILITY SCORE ==========
    let reliabilityScore = 100;
    
    // 1. Penalty for AI data corrections (max -40)
    const correctionPenalty = Math.min(calc.corrections.length * 10, 40);
    reliabilityScore -= correctionPenalty;
    
    // 2. Penalty for unprofitability (-25)
    if (!calc.isProfitable) {
      reliabilityScore -= 25;
    }
    
    // 3. Penalty for each warning (-8)
    reliabilityScore -= warnings.length * 8;
    
    // 4. Penalty for unrealistic LTV:CAC (-10)
    if (calc.ltvCacRatio > 8 || calc.ltvCacRatio < 2) {
      reliabilityScore -= 10;
    }
    
    // 5. Penalty for very long payback (-15)
    if (calc.paybackMonths > 36 && calc.paybackMonths < 999) {
      reliabilityScore -= 15;
    }
    
    // 6. Bonus for having detailed AI data (+5 each, max +15)
    const bp = safeParseJSON(rawResult.business_json, {});
    const mp = safeParseJSON(rawResult.marketing_json, {});
    const ma = safeParseJSON(rawResult.market_json, {});
    
    if (Array.isArray(bp.launch_steps) && bp.launch_steps.length >= 3) {
      reliabilityScore += 5;
    }
    if (Array.isArray(mp.channels) && mp.channels.length >= 2) {
      reliabilityScore += 5;
    }
    if (Array.isArray(ma.competitors) && ma.competitors.length >= 2) {
      reliabilityScore += 5;
    }
    
    reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));
    
    result.confidence_score = reliabilityScore;
    
    console.log(`Done. Profit: $${calc.netProfit}. Industry: ${calc.industryDetected}. Corrections: ${calc.corrections.length}. Reliability: ${reliabilityScore}%`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          validation: {
            is_realistic: calc.isProfitable && calc.corrections.length === 0 && warnings.length === 0,
            is_profitable: calc.isProfitable,
            was_auto_corrected: calc.corrections.length > 0,
            reliability_score: reliabilityScore,
            corrections: calc.corrections,
            warnings,
            calculation_audit: calc.audit,
            break_even_revenue: calc.breakEvenRevenue,
            revenue_for_45k_profit: calc.revenueFor45kProfit,
            industry_detected: calc.industryDetected,
            summary: !calc.isProfitable 
              ? `❌ Business is unprofitable. Need revenue from $${calc.breakEvenRevenue.toLocaleString()}/mo`
              : calc.corrections.length > 0 
                ? `⚠ Corrected ${calc.corrections.length} metrics for accuracy`
                : `✓ Calculations verified. Profit $${calc.netProfit.toLocaleString()}/mo`
          },
          metadata: {
            idea: idea.trim(),
            location: location.trim(),
            industry_detected: calc.industryDetected,
            location_cost_multiplier: locationMultiplier,
            generated_at: new Date().toISOString(),
            model: "google/gemini-2.5-flash",
            version: "6.0-multi-industry-usd",
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
