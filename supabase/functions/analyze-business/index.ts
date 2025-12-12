import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
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
// All formulas are validated and cross-checked

interface IndustryBenchmarks {
  cogs_percent: number;           // Себестоимость %
  salaries_fixed: number;         // ФОТ фикс
  rent_fixed: number;             // Аренда фикс
  utilities_fixed: number;        // Коммуналка
  other_fixed: number;            // Прочие фикс
  cac_min: number;                // CAC минимум
  cac_max: number;                // CAC максимум
  cac_typical: number;            // CAC типичный
  average_check_min: number;      // Средний чек мин
  average_check_max: number;      // Средний чек макс
  orders_per_client: number;      // Заказов на клиента/мес
  client_lifetime_months: number; // Время жизни клиента (мес)
  ltv_cac_min: number;            // LTV:CAC минимум
  ltv_cac_max: number;            // LTV:CAC максимум
  net_margin_min: number;         // Чистая маржа мин %
  net_margin_max: number;         // Чистая маржа макс %
}

function getIndustryBenchmarks(businessType: string, location: string): IndustryBenchmarks {
  const isCapital = location.toLowerCase().includes('москва') || 
                    location.toLowerCase().includes('moscow') ||
                    location.toLowerCase().includes('санкт-петербург') ||
                    location.toLowerCase().includes('спб');
  const m = isCapital ? 1.3 : 1.0; // Multiplier for capital cities
  
  // Default benchmarks for bakery/food delivery
  return {
    cogs_percent: 40,                              // 40% себестоимость - стандарт для пищевки
    salaries_fixed: Math.round(180000 * m),        // ФОТ: пекарь 70k + помощник 50k + курьер 40k + часть админа 20k
    rent_fixed: Math.round(55000 * m),             // Аренда 20-30м² производство
    utilities_fixed: Math.round(15000 * m),        // Коммуналка, вода, электричество
    other_fixed: Math.round(35000 * m),            // Упаковка, топливо, потери, прочее
    cac_min: 200,                                  // CAC минимум (органика + сарафан)
    cac_max: 800,                                  // CAC максимум (платная реклама)
    cac_typical: isCapital ? 400 : 300,            // Типичный CAC
    average_check_min: 400,                        // Мин чек
    average_check_max: 900,                        // Макс чек
    orders_per_client: 4,                          // Заказов в месяц от постоянного клиента
    client_lifetime_months: 4,                     // Среднее время жизни клиента
    ltv_cac_min: 3,                                // Минимальное здоровое LTV:CAC
    ltv_cac_max: 6,                                // Максимальное реалистичное LTV:CAC
    net_margin_min: 5,                             // Мин чистая маржа для пищевки
    net_margin_max: 15,                            // Макс чистая маржа для пищевки
  };
}

interface CalculationAudit {
  formula: string;
  inputs: Record<string, number>;
  result: number;
  isValid: boolean;
  notes?: string;
}

interface StrictFinancialResult {
  // Core metrics
  mrr: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
  
  // Expense breakdown
  expenses: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
  };
  
  // Unit economics
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  averageCheck: number;
  ordersMonthly: number;
  clientsActive: number;
  newClientsNeeded: number;
  
  // Investment metrics
  startupInvestment: number;
  paybackMonths: number;
  roiYear1Percent: number;
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
  
  // Validation
  isProfitable: boolean;
  corrections: Array<{ field: string; original: number; corrected: number; reason: string }>;
  audit: CalculationAudit[];
}

function calculateStrictFinancials(
  rawMrr: number,
  rawInvestment: number,
  rawCac: number,
  rawLtv: number,
  rawAvgCheck: number,
  benchmarks: IndustryBenchmarks
): StrictFinancialResult {
  const corrections: Array<{ field: string; original: number; corrected: number; reason: string }> = [];
  const audit: CalculationAudit[] = [];
  
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
        reason: `Средний чек ${avgCheck}₽ ниже рыночного минимума ${benchmarks.average_check_min}₽`
      });
    } else {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Средний чек ${avgCheck}₽ выше рыночного максимума ${benchmarks.average_check_max}₽`
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
      reason: `CAC ${cac}₽ нереалистично низкий. Минимум ${benchmarks.cac_min}₽ даже для органических каналов.`
    });
    cac = benchmarks.cac_typical;
  } else if (cac > benchmarks.cac_max) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: benchmarks.cac_max,
      reason: `CAC ${cac}₽ слишком высокий для B2C. Скорректировано до ${benchmarks.cac_max}₽`
    });
    cac = benchmarks.cac_max;
  }
  
  // 1.3 LTV - calculate from formula, not AI guess
  // FORMULA: LTV = Avg_Check × Orders_per_Month × Lifetime_Months
  const calculatedLtv = avgCheck * benchmarks.orders_per_client * benchmarks.client_lifetime_months;
  
  audit.push({
    formula: 'LTV = Средний_чек × Заказов_в_месяц × Время_жизни_клиента',
    inputs: {
      'Средний чек': avgCheck,
      'Заказов/мес': benchmarks.orders_per_client,
      'Время жизни (мес)': benchmarks.client_lifetime_months
    },
    result: calculatedLtv,
    isValid: true,
    notes: `${avgCheck} × ${benchmarks.orders_per_client} × ${benchmarks.client_lifetime_months} = ${calculatedLtv}₽`
  });
  
  let ltv = calculatedLtv;
  
  // Check if raw LTV was significantly different
  if (Math.abs(rawLtv - calculatedLtv) > calculatedLtv * 0.5) {
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: calculatedLtv,
      reason: `LTV пересчитан по формуле: ${avgCheck}₽ × ${benchmarks.orders_per_client} заказа × ${benchmarks.client_lifetime_months} мес = ${calculatedLtv}₽`
    });
  }
  
  // 1.4 Validate LTV:CAC ratio
  let ltvCacRatio = Math.round((ltv / cac) * 10) / 10;
  
  audit.push({
    formula: 'LTV:CAC = LTV / CAC',
    inputs: { LTV: ltv, CAC: cac },
    result: ltvCacRatio,
    isValid: ltvCacRatio >= benchmarks.ltv_cac_min && ltvCacRatio <= benchmarks.ltv_cac_max,
    notes: `${ltv} / ${cac} = ${ltvCacRatio}x (норма: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`
  });
  
  if (ltvCacRatio > benchmarks.ltv_cac_max) {
    // LTV:CAC too high - need to adjust
    const targetLtv = cac * benchmarks.ltv_cac_max;
    corrections.push({
      field: 'ltv_cac_ratio',
      original: ltvCacRatio,
      corrected: benchmarks.ltv_cac_max,
      reason: `LTV:CAC ${ltvCacRatio}x нереалистично высокий (максимум ${benchmarks.ltv_cac_max}x). LTV скорректирован до ${targetLtv}₽`
    });
    ltv = targetLtv;
    ltvCacRatio = benchmarks.ltv_cac_max;
  }
  
  // ===== STEP 2: Calculate expense structure =====
  
  const mrr = rawMrr;
  
  // 2.1 COGS (variable cost)
  // FORMULA: COGS = MRR × COGS_Percent
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));
  
  audit.push({
    formula: 'Себестоимость = Выручка × COGS%',
    inputs: { 'Выручка': mrr, 'COGS%': benchmarks.cogs_percent },
    result: cogs,
    isValid: true,
    notes: `${mrr} × ${benchmarks.cogs_percent}% = ${cogs}₽`
  });
  
  // 2.2 Fixed costs
  const salaries = benchmarks.salaries_fixed;
  const rent = benchmarks.rent_fixed;
  const utilities = benchmarks.utilities_fixed;
  const other = benchmarks.other_fixed;
  const fixedCosts = salaries + rent + utilities + other;
  
  // 2.3 Marketing cost
  // FORMULA: Marketing = New_Clients × CAC
  // New clients needed = ~30% of active clients (churn replacement + growth)
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;
  const clientsActive = Math.ceil(mrr / revenuePerClient);
  const newClientsNeeded = Math.ceil(clientsActive * 0.25); // 25% new clients per month
  const marketing = newClientsNeeded * cac;
  
  audit.push({
    formula: 'Маркетинг = Новые_клиенты × CAC',
    inputs: { 
      'Активные клиенты': clientsActive,
      'Новых клиентов (25%)': newClientsNeeded,
      'CAC': cac 
    },
    result: marketing,
    isValid: true,
    notes: `${newClientsNeeded} × ${cac}₽ = ${marketing}₽`
  });
  
  // 2.4 Total expenses
  // FORMULA: Total_Expenses = COGS + Fixed_Costs + Marketing
  const totalExpenses = cogs + fixedCosts + marketing;
  
  audit.push({
    formula: 'Расходы = COGS + Фикс_затраты + Маркетинг',
    inputs: { 
      'COGS': cogs, 
      'ФОТ': salaries,
      'Аренда': rent,
      'Коммуналка': utilities,
      'Прочие': other,
      'Маркетинг': marketing 
    },
    result: totalExpenses,
    isValid: true,
    notes: `${cogs} + ${salaries} + ${rent} + ${utilities} + ${other} + ${marketing} = ${totalExpenses}₽`
  });
  
  // ===== STEP 3: Calculate profit metrics =====
  
  // 3.1 Net Profit
  // FORMULA: Net_Profit = MRR - Total_Expenses
  const netProfit = mrr - totalExpenses;
  const isProfitable = netProfit > 0;
  
  audit.push({
    formula: 'Чистая_прибыль = Выручка - Расходы',
    inputs: { 'Выручка': mrr, 'Расходы': totalExpenses },
    result: netProfit,
    isValid: isProfitable,
    notes: `${mrr} - ${totalExpenses} = ${netProfit}₽ ${isProfitable ? '✓' : '❌ УБЫТОК'}`
  });
  
  // 3.2 Net Margin
  // FORMULA: Net_Margin = (Net_Profit / MRR) × 100
  const netMarginPercent = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;
  
  audit.push({
    formula: 'Чистая_маржа = (Прибыль / Выручка) × 100%',
    inputs: { 'Прибыль': netProfit, 'Выручка': mrr },
    result: netMarginPercent,
    isValid: netMarginPercent >= benchmarks.net_margin_min && netMarginPercent <= benchmarks.net_margin_max,
    notes: `(${netProfit} / ${mrr}) × 100 = ${netMarginPercent}% (норма: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%)`
  });
  
  // 3.3 Gross Profit & Margin
  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;
  
  // ===== STEP 4: Calculate investment metrics =====
  
  const startupInvestment = rawInvestment;
  
  // 4.1 Payback Period
  // FORMULA: Payback = Investment / Monthly_Profit
  let paybackMonths = 0;
  if (startupInvestment > 0) {
    if (netProfit > 0) {
      paybackMonths = Math.ceil(startupInvestment / netProfit);
    } else {
      paybackMonths = 999; // Never pays back if loss
    }
  }
  
  audit.push({
    formula: 'Окупаемость = Инвестиции / Месячная_прибыль',
    inputs: { 'Инвестиции': startupInvestment, 'Прибыль/мес': netProfit },
    result: paybackMonths,
    isValid: paybackMonths < 36 && paybackMonths > 0,
    notes: paybackMonths === 999 
      ? 'Бизнес убыточен - окупаемость невозможна' 
      : `${startupInvestment} / ${netProfit} = ${paybackMonths} мес`
  });
  
  // 4.2 ROI Year 1
  // FORMULA: ROI = (Profit × 12 / Investment) × 100
  let roiYear1Percent = 0;
  if (startupInvestment > 0) {
    roiYear1Percent = Math.round((netProfit * 12 / startupInvestment) * 100);
  }
  
  audit.push({
    formula: 'ROI = (Прибыль × 12 / Инвестиции) × 100%',
    inputs: { 'Прибыль/мес': netProfit, 'Инвестиции': startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `(${netProfit} × 12 / ${startupInvestment}) × 100 = ${roiYear1Percent}%`
  });
  
  // 4.3 Break-even Revenue
  // FORMULA: Break_Even = Fixed_Costs / (1 - Variable_Cost_Ratio)
  const variableCostRatio = (benchmarks.cogs_percent / 100) + (marketing / mrr); // COGS + marketing as % of revenue
  const breakEvenRevenue = Math.round(fixedCosts / (1 - variableCostRatio));
  
  audit.push({
    formula: 'Точка_безубыточности = Фикс_затраты / (1 - Перем_затраты%)',
    inputs: { 
      'Фикс затраты': fixedCosts, 
      'Перем затраты%': Math.round(variableCostRatio * 100) 
    },
    result: breakEvenRevenue,
    isValid: true,
    notes: `${fixedCosts} / (1 - ${Math.round(variableCostRatio * 100)}%) = ${breakEvenRevenue}₽/мес`
  });
  
  // 4.4 Revenue needed for 45k profit
  // FORMULA: Revenue_Target = (Fixed_Costs + Target_Profit) / (1 - Variable_Cost_Ratio)
  const targetProfit = 45000;
  const revenueFor45kProfit = Math.round((fixedCosts + targetProfit) / (1 - variableCostRatio));
  
  audit.push({
    formula: 'Выручка_для_45к = (Фикс_затраты + 45000) / (1 - Перем_затраты%)',
    inputs: { 
      'Фикс затраты': fixedCosts, 
      'Целевая прибыль': targetProfit,
      'Перем затраты%': Math.round(variableCostRatio * 100) 
    },
    result: revenueFor45kProfit,
    isValid: true,
    notes: `(${fixedCosts} + ${targetProfit}) / (1 - ${Math.round(variableCostRatio * 100)}%) = ${revenueFor45kProfit}₽/мес`
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
    audit
  };
}

function transformResponse(raw: any, location: string) {
  const fa = safeParseJSON(raw.financial_json, {});
  const bp = safeParseJSON(raw.business_json, {});
  const mp = safeParseJSON(raw.marketing_json, {});
  const ma = safeParseJSON(raw.market_json, {});
  const sources = raw.sources ? raw.sources.split(',').map((s: string) => s.trim()) : ["Открытые источники", "Отраслевые данные"];
  const limits = raw.limitations ? raw.limitations.split(',').map((s: string) => s.trim()) : ["Оценочные расчёты"];

  // Get benchmarks for this business/location
  const benchmarks = getIndustryBenchmarks("bakery", location);
  
  // Extract raw values from AI
  const rawMrr = fa.mrr || 450000;
  const rawInvestment = fa.startup_investment || 1500000;
  const rawCac = fa.cac || mp.cac || benchmarks.cac_typical;
  const rawLtv = fa.ltv || mp.ltv || 5000;
  const rawAvgCheck = fa.average_check || 600;
  
  // Calculate with strict validation
  const calc = calculateStrictFinancials(rawMrr, rawInvestment, rawCac, rawLtv, rawAvgCheck, benchmarks);
  
  // Build calculation summary
  const calculationsSummary = `
## Аудит финансовых расчётов

### Входные данные
- Выручка (MRR): ${calc.mrr.toLocaleString()}₽
- Инвестиции: ${calc.startupInvestment.toLocaleString()}₽
- Средний чек: ${calc.averageCheck}₽
- CAC: ${calc.cac}₽
- LTV: ${calc.ltv.toLocaleString()}₽

### Структура расходов
| Статья | Сумма | % от выручки |
|--------|-------|--------------|
| Себестоимость (COGS) | ${calc.expenses.cogs.toLocaleString()}₽ | ${Math.round(calc.expenses.cogs / calc.mrr * 100)}% |
| ФОТ | ${calc.expenses.salaries.toLocaleString()}₽ | ${Math.round(calc.expenses.salaries / calc.mrr * 100)}% |
| Аренда | ${calc.expenses.rent.toLocaleString()}₽ | ${Math.round(calc.expenses.rent / calc.mrr * 100)}% |
| Коммуналка | ${calc.expenses.utilities.toLocaleString()}₽ | ${Math.round(calc.expenses.utilities / calc.mrr * 100)}% |
| Маркетинг | ${calc.expenses.marketing.toLocaleString()}₽ | ${Math.round(calc.expenses.marketing / calc.mrr * 100)}% |
| Прочие | ${calc.expenses.other.toLocaleString()}₽ | ${Math.round(calc.expenses.other / calc.mrr * 100)}% |
| **ИТОГО** | **${calc.totalExpenses.toLocaleString()}₽** | **${Math.round(calc.totalExpenses / calc.mrr * 100)}%** |

### Расчёт прибыли
**Прибыль = Выручка - Расходы**
${calc.mrr.toLocaleString()}₽ - ${calc.totalExpenses.toLocaleString()}₽ = **${calc.netProfit.toLocaleString()}₽** ${calc.isProfitable ? '✓' : '❌ УБЫТОК'}

### Ключевые метрики
- **Чистая маржа:** ${calc.netMarginPercent}% ${calc.netMarginPercent >= benchmarks.net_margin_min ? '✓' : '⚠'}
- **LTV:CAC:** ${calc.ltvCacRatio}x ${calc.ltvCacRatio >= benchmarks.ltv_cac_min ? '✓' : '⚠'}
- **Окупаемость:** ${calc.paybackMonths === 999 ? 'никогда' : calc.paybackMonths + ' мес'}
- **ROI за год:** ${calc.roiYear1Percent}%

### Точки безубыточности
- **Для нулевой прибыли:** ${calc.breakEvenRevenue.toLocaleString()}₽/мес
- **Для прибыли 45k:** ${calc.revenueFor45kProfit.toLocaleString()}₽/мес

### Формулы расчётов
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
        churn_rate: 0.15
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
          legal: 50000,
          marketing_initial: Math.round(calc.startupInvestment * 0.1),
          working_capital: Math.round(calc.startupInvestment * 0.2)
        },
        reasoning: `Инвестиции ${calc.startupInvestment.toLocaleString()}₽: оборудование 45%, запасы 15%, оборотный капитал 20%, маркетинг 10%, депозит и регистрация 10%`
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
          scenario: "Падение выручки на 20%",
          description: "Снижение спроса, сезонность, конкуренция",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: Math.round((calc.mrr * 0.8) - calc.totalExpenses * 0.95),
          probability: "средняя" as const
        },
        costs_rise_15: {
          scenario: "Рост затрат на 15%",
          description: "Инфляция, рост цен на сырьё и аренду",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: Math.round(calc.mrr - calc.totalExpenses * 1.15),
          probability: "высокая" as const
        },
        cac_doubles: {
          scenario: "Удвоение CAC",
          description: "Рост конкуренции в рекламе",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: Math.round(calc.netProfit - calc.expenses.marketing),
          probability: "средняя" as const
        },
        churn_increase: {
          scenario: "Рост оттока на 50%",
          description: "Снижение качества, конкуренция",
          impact_on_revenue: -15,
          impact_on_costs: 0,
          resulting_profit: Math.round((calc.mrr * 0.85) - calc.totalExpenses),
          probability: "средняя" as const
        }
      },
      calculations_summary: calculationsSummary
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
    confidence_score: 0, // Will be calculated after validation
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
        JSON.stringify({ error: "Идея должна содержать минимум 10 символов", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || location.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Укажите локацию", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI сервис не настроен", code: "CONFIG_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing: "${idea.substring(0, 40)}..." in ${location}`);

    const prompt = `Ты — финансовый аналитик. Проанализируй бизнес-идею.

## БИЗНЕС-ИДЕЯ
${idea.trim()}

## ЛОКАЦИЯ (ИСПОЛЬЗУЙ ТОЛЬКО ЭТУ!)
${location.trim()}

## ТРЕБОВАНИЯ

### Для пекарни/доставки еды используй эти диапазоны:
- Выручка: 300,000 - 600,000₽/мес
- Средний чек: 400 - 800₽
- CAC: 250 - 500₽
- Стартовые инвестиции: 1,000,000 - 2,000,000₽
- Оборудование: 500,000 - 900,000₽

### Формулы (ВАЖНО!):
- LTV = Средний_чек × 4_заказа × 4_месяца
- Пример: 600₽ × 4 × 4 = 9,600₽

## ФОРМАТ ОТВЕТА

financial_json:
{
  "mrr": число (300000-600000),
  "average_check": число (400-800),
  "orders_monthly": число,
  "startup_investment": число (1000000-2000000),
  "cac": число (250-500),
  "ltv": число (рассчитай по формуле!),
  "equipment": число
}

business_json:
{
  "executive_summary": "краткое резюме",
  "product_description": "описание",
  "target_audience": "аудитория в ${location.trim()}",
  "competitive_advantages": "преимущества",
  "operations": "операции",
  "launch_steps": ["шаг1", "шаг2", "шаг3"],
  "risks": [{"name": "риск", "description": "описание", "mitigation": "как снизить"}]
}

marketing_json:
{
  "positioning": "позиционирование",
  "pricing_strategy": "стратегия",
  "channels": [{"name": "канал", "budget": число, "expected_roi": число}],
  "cac": число,
  "ltv": число,
  "first_3_months_plan": "план первых 3 месяцев"
}

market_json:
{
  "tam": "TAM",
  "sam": "SAM",
  "som": "SOM",
  "trends": ["тренд1", "тренд2"],
  "competitors": [{"name": "конкурент", "strengths": "сильные стороны", "weaknesses": "слабые стороны"}],
  "competitive_landscape": "анализ",
  "market_gaps": "возможности",
  "barriers_to_entry": "барьеры",
  "growth_opportunities": "рост"
}

Вызови submit_analysis.`;

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
          JSON.stringify({ error: "Слишком много запросов. Подождите минуту.", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Ошибка AI сервиса", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI Response received");

    if (aiResponse.error) {
      console.error("AI error:", JSON.stringify(aiResponse.error));
      return new Response(
        JSON.stringify({ error: "Ошибка AI. Попробуйте снова.", code: "AI_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response");
      return new Response(
        JSON.stringify({ error: "AI не вернул анализ. Попробуйте снова.", code: "NO_TOOL_CALL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawResult;
    try {
      rawResult = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Parse error:", e);
      return new Response(
        JSON.stringify({ error: "Ошибка парсинга", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = transformResponse(rawResult, location.trim());
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
        message: `❌ УБЫТОК ${Math.abs(calc.netProfit).toLocaleString()}₽/мес при выручке ${calc.mrr.toLocaleString()}₽. Безубыточность: ${calc.breakEvenRevenue.toLocaleString()}₽/мес. Для прибыли 45k: ${calc.revenueFor45kProfit.toLocaleString()}₽/мес.`
      });
    }
    
    if (calc.ltvCacRatio < 3) {
      warnings.push({
        field: 'ltv_cac_ratio',
        value: calc.ltvCacRatio,
        expected: '3-6x',
        severity: 'warning',
        message: `LTV:CAC ${calc.ltvCacRatio}x ниже нормы 3x — маркетинг слишком дорогой`
      });
    }
    
    if (calc.paybackMonths > 36 && calc.paybackMonths < 999) {
      warnings.push({
        field: 'payback',
        value: calc.paybackMonths,
        expected: '12-24 мес',
        severity: 'warning',
        message: `Окупаемость ${calc.paybackMonths} мес — длинный срок возврата инвестиций`
      });
    }
    
    // ========== INTELLIGENT RELIABILITY SCORE ==========
    // Base score starts at 100
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
    
    // 4. Penalty for unrealistic LTV:CAC (too high >8x or too low <2x) (-10)
    if (calc.ltvCacRatio > 8 || calc.ltvCacRatio < 2) {
      reliabilityScore -= 10;
    }
    
    // 5. Penalty for very long payback (>36 months) (-15)
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
    
    // Clamp to 0-100
    reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));
    
    // Update confidence_score in result
    result.confidence_score = reliabilityScore;
    
    console.log(`Done. Profit: ${calc.netProfit}. Corrections: ${calc.corrections.length}. Reliability: ${reliabilityScore}%`);

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
            summary: !calc.isProfitable 
              ? `❌ Бизнес убыточен. Нужна выручка от ${calc.breakEvenRevenue.toLocaleString()}₽/мес`
              : calc.corrections.length > 0 
                ? `⚠ Скорректировано ${calc.corrections.length} показателей`
                : `✓ Расчёты корректны. Прибыль ${calc.netProfit.toLocaleString()}₽/мес`
          },
          metadata: {
            idea: idea.trim(),
            location: location.trim(),
            generated_at: new Date().toISOString(),
            model: "google/gemini-2.5-flash",
            version: "5.0-strict-audit",
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
