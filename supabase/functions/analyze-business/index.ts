import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

// Minimal tool schema
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Submit business analysis with realistic industry benchmarks",
    parameters: {
      type: "object",
      properties: {
        financial_json: { type: "string", description: "JSON object with realistic financial metrics" },
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

// ========== REALISTIC FINANCIAL MODEL ==========
// Based on real industry benchmarks for food/bakery business in Russia

interface RealisticExpenseModel {
  cogs_percent: number;        // Себестоимость (% от выручки): 35-45%
  salaries_fixed: number;      // ФОТ (фиксированный): 150-200k
  rent_fixed: number;          // Аренда (фиксированная): 40-70k
  utilities_fixed: number;     // Коммуналка: 10-20k
  other_fixed: number;         // Прочие: 25-40k
  marketing_cac: number;       // CAC для расчёта маркетинга
  average_check: number;       // Средний чек
  orders_per_client: number;   // Заказов на клиента в месяц
}

function getIndustryDefaults(businessType: string, location: string): RealisticExpenseModel {
  // Default for bakery/food delivery
  const isCapital = location.toLowerCase().includes('москва') || location.toLowerCase().includes('moscow');
  const multiplier = isCapital ? 1.3 : 1.0;
  
  return {
    cogs_percent: 40,                           // 40% себестоимость
    salaries_fixed: Math.round(180000 * multiplier), // ФОТ
    rent_fixed: Math.round(55000 * multiplier),      // Аренда
    utilities_fixed: Math.round(15000 * multiplier), // Коммуналка
    other_fixed: Math.round(35000 * multiplier),     // Прочие
    marketing_cac: isCapital ? 400 : 300,            // CAC
    average_check: isCapital ? 650 : 550,            // Средний чек
    orders_per_client: 4,                            // Заказов в месяц на клиента
  };
}

function calculateRealisticFinancials(
  rawMrr: number,
  rawInvestment: number,
  rawCac: number,
  rawLtv: number,
  defaults: RealisticExpenseModel
): {
  correctedMrr: number;
  correctedProfit: number;
  totalExpenses: number;
  expenseBreakdown: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
  };
  breakEvenRevenue: number;
  profitableRevenue: number;
  correctedCac: number;
  correctedLtv: number;
  correctedLtvCacRatio: number;
  isProfitable: boolean;
  corrections: Array<{ field: string; original: number; corrected: number; reason: string }>;
} {
  const corrections: Array<{ field: string; original: number; corrected: number; reason: string }> = [];
  
  // 1. Validate and correct CAC
  let correctedCac = rawCac;
  if (correctedCac < 150) {
    corrections.push({
      field: 'cac',
      original: rawCac,
      corrected: defaults.marketing_cac,
      reason: `CAC ${rawCac}₽ нереалистично низкий (минимум 150₽ даже для дешёвых каналов)`
    });
    correctedCac = defaults.marketing_cac;
  } else if (correctedCac > 1500) {
    corrections.push({
      field: 'cac',
      original: rawCac,
      corrected: 800,
      reason: `CAC ${rawCac}₽ слишком высокий для B2C бизнеса`
    });
    correctedCac = 800;
  }
  
  // 2. Calculate LTV based on realistic customer behavior
  // LTV = Average Check × Orders per Month × Customer Lifetime (months)
  const avgCheck = defaults.average_check;
  const monthlyRevenuePerClient = avgCheck * defaults.orders_per_client;
  const customerLifetimeMonths = 4; // Typical for food delivery
  const calculatedLtv = monthlyRevenuePerClient * customerLifetimeMonths;
  
  let correctedLtv = rawLtv;
  const ltvCacRatioRaw = rawLtv / correctedCac;
  
  // LTV:CAC should be 3-5x, max 7x for very good businesses
  if (ltvCacRatioRaw > 7) {
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: calculatedLtv,
      reason: `LTV ${rawLtv}₽ даёт соотношение LTV:CAC = ${ltvCacRatioRaw.toFixed(1)}x (нереалистично >7x). Расчётный LTV: ${avgCheck}₽ × ${defaults.orders_per_client} заказа × ${customerLifetimeMonths} мес = ${calculatedLtv}₽`
    });
    correctedLtv = calculatedLtv;
  } else if (ltvCacRatioRaw < 2) {
    // LTV too low - adjust up slightly
    const minViableLtv = correctedCac * 3;
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: minViableLtv,
      reason: `LTV ${rawLtv}₽ слишком низкий (LTV:CAC = ${ltvCacRatioRaw.toFixed(1)}x < 2). Минимальный для рентабельности: ${minViableLtv}₽`
    });
    correctedLtv = minViableLtv;
  }
  
  const correctedLtvCacRatio = Math.round((correctedLtv / correctedCac) * 10) / 10;
  
  // 3. Calculate number of clients needed for given revenue
  const clientsNeeded = Math.ceil(rawMrr / monthlyRevenuePerClient);
  
  // 4. Calculate REALISTIC expenses
  const cogs = Math.round(rawMrr * (defaults.cogs_percent / 100));
  const marketing = Math.round(clientsNeeded * correctedCac * 0.3); // ~30% new clients per month
  
  const expenseBreakdown = {
    cogs,
    salaries: defaults.salaries_fixed,
    rent: defaults.rent_fixed,
    utilities: defaults.utilities_fixed,
    marketing,
    other: defaults.other_fixed
  };
  
  const totalExpenses = cogs + defaults.salaries_fixed + defaults.rent_fixed + 
                        defaults.utilities_fixed + marketing + defaults.other_fixed;
  
  // 5. Calculate actual profit
  const actualProfit = rawMrr - totalExpenses;
  const isProfitable = actualProfit > 0;
  
  // 6. Calculate break-even revenue
  // Break-even: Revenue = Fixed Costs / (1 - Variable Cost %)
  const fixedCosts = defaults.salaries_fixed + defaults.rent_fixed + 
                     defaults.utilities_fixed + defaults.other_fixed;
  const variableCostPercent = defaults.cogs_percent / 100 + 0.05; // COGS + marketing ~5%
  const breakEvenRevenue = Math.round(fixedCosts / (1 - variableCostPercent));
  
  // 7. Calculate revenue needed for original profit claim
  const profitableRevenue = Math.round((fixedCosts + 45000) / (1 - variableCostPercent));
  
  // 8. Check if original profit was wrong
  const originalProfitFromAI = rawMrr * 0.10; // AI often assumes 10% margin
  if (Math.abs(actualProfit - originalProfitFromAI) > 20000 && actualProfit < originalProfitFromAI) {
    corrections.push({
      field: 'net_profit',
      original: Math.round(originalProfitFromAI),
      corrected: actualProfit,
      reason: `При выручке ${rawMrr.toLocaleString()}₽ реальная прибыль = ${actualProfit.toLocaleString()}₽. Расходы: COGS ${cogs.toLocaleString()}₽ + ФОТ ${defaults.salaries_fixed.toLocaleString()}₽ + Аренда ${defaults.rent_fixed.toLocaleString()}₽ + Прочее ${(defaults.utilities_fixed + defaults.other_fixed + marketing).toLocaleString()}₽ = ${totalExpenses.toLocaleString()}₽`
    });
  }
  
  return {
    correctedMrr: rawMrr,
    correctedProfit: actualProfit,
    totalExpenses,
    expenseBreakdown,
    breakEvenRevenue,
    profitableRevenue,
    correctedCac,
    correctedLtv,
    correctedLtvCacRatio,
    isProfitable,
    corrections
  };
}

function transformResponse(raw: any, location: string) {
  const fa = safeParseJSON(raw.financial_json, {});
  const bp = safeParseJSON(raw.business_json, {});
  const mp = safeParseJSON(raw.marketing_json, {});
  const ma = safeParseJSON(raw.market_json, {});
  const sources = raw.sources ? raw.sources.split(',').map((s: string) => s.trim()) : ["Открытые источники", "Отраслевые исследования"];
  const limits = raw.limitations ? raw.limitations.split(',').map((s: string) => s.trim()) : ["Оценочные данные"];

  const mrr = fa.mrr || 0;
  const startup = fa.startup_investment || 0;
  const rawCac = fa.cac || mp.cac || 350;
  const rawLtv = fa.ltv || mp.ltv || 5000;
  
  // Get industry defaults based on location
  const defaults = getIndustryDefaults("bakery", location);
  
  // Calculate realistic financials
  const realistic = calculateRealisticFinancials(mrr, startup, rawCac, rawLtv, defaults);
  
  // Calculate gross margin (COGS based)
  const grossMarginPct = 100 - defaults.cogs_percent; // 60% if COGS is 40%
  
  // Calculate net margin from actual profit
  const netMarginPct = mrr > 0 ? Math.round((realistic.correctedProfit / mrr) * 100) : 0;
  
  // Recalculate payback with realistic profit
  const paybackMonths = startup > 0 && realistic.correctedProfit > 0 
    ? Math.ceil(startup / realistic.correctedProfit) 
    : (startup > 0 ? 999 : 0); // 999 = never if loss
  
  // ROI with realistic profit
  const roiYear1 = startup > 0 && realistic.correctedProfit > 0 
    ? Math.round((realistic.correctedProfit * 12 / startup) * 100) 
    : (realistic.correctedProfit < 0 ? Math.round((realistic.correctedProfit * 12 / startup) * 100) : 0);
  
  return {
    financial_analysis: {
      inputs: {
        price_per_unit: fa.average_check || defaults.average_check,
        units_sold_monthly: fa.orders_monthly || Math.round(mrr / defaults.average_check),
        purchase_frequency: defaults.orders_per_client,
        upsell_per_customer: fa.upsell || 0,
        cogs_per_unit: Math.round(defaults.average_check * (defaults.cogs_percent / 100)),
        fixed_opex: defaults.salaries_fixed + defaults.rent_fixed + defaults.utilities_fixed + defaults.other_fixed,
        marketing_budget: realistic.expenseBreakdown.marketing,
        cac: realistic.correctedCac,
        startup_investment: startup,
        capex: fa.equipment || Math.round(startup * 0.4),
        ltv: realistic.correctedLtv,
        churn_rate: fa.churn_rate || 0.15
      },
      mrr: mrr,
      arr: mrr * 12,
      scenarios: {
        pessimistic: {
          revenue: Math.round(mrr * 0.8),
          variable_costs: Math.round(mrr * 0.8 * (defaults.cogs_percent / 100)),
          fixed_costs: defaults.salaries_fixed + defaults.rent_fixed + defaults.utilities_fixed + defaults.other_fixed,
          gross_profit: Math.round(mrr * 0.8 * (grossMarginPct / 100)),
          net_profit: Math.round((mrr * 0.8) - realistic.totalExpenses * 0.95),
          gross_margin: grossMarginPct,
          net_margin: Math.max(netMarginPct - 8, -20)
        },
        base: {
          revenue: mrr,
          variable_costs: realistic.expenseBreakdown.cogs,
          fixed_costs: defaults.salaries_fixed + defaults.rent_fixed + defaults.utilities_fixed + defaults.other_fixed,
          gross_profit: Math.round(mrr * (grossMarginPct / 100)),
          net_profit: realistic.correctedProfit,
          gross_margin: grossMarginPct,
          net_margin: netMarginPct
        },
        optimistic: {
          revenue: Math.round(mrr * 1.25),
          variable_costs: Math.round(mrr * 1.25 * (defaults.cogs_percent / 100)),
          fixed_costs: defaults.salaries_fixed + defaults.rent_fixed + defaults.utilities_fixed + defaults.other_fixed,
          gross_profit: Math.round(mrr * 1.25 * (grossMarginPct / 100)),
          net_profit: Math.round((mrr * 1.25) - realistic.totalExpenses * 1.1),
          gross_margin: grossMarginPct,
          net_margin: netMarginPct + 5
        }
      },
      unit_economics: {
        contribution_margin: Math.round(defaults.average_check * (grossMarginPct / 100)),
        contribution_margin_ratio: grossMarginPct / 100,
        cac: realistic.correctedCac,
        cac_payback_months: Math.ceil(realistic.correctedCac / (defaults.average_check * (Math.max(netMarginPct, 5) / 100) * defaults.orders_per_client)),
        ltv: realistic.correctedLtv,
        ltv_cac_ratio: realistic.correctedLtvCacRatio
      },
      breakeven: {
        breakeven_units: Math.ceil(realistic.breakEvenRevenue / defaults.average_check),
        breakeven_revenue: realistic.breakEvenRevenue,
        breakeven_months: startup > 0 && realistic.correctedProfit > 0 ? Math.min(paybackMonths, 24) : 0
      },
      returns: {
        payback_period_months: paybackMonths,
        roi_year_1: roiYear1,
        roi_year_3: startup > 0 ? Math.round((realistic.correctedProfit * 36 / startup) * 100) : 0,
        npv_3_years: Math.round(realistic.correctedProfit * 36 - startup)
      },
      startup_investment: {
        total: startup,
        breakdown: {
          rent_deposit: fa.rent_deposit || Math.round(defaults.rent_fixed * 2),
          equipment: fa.equipment || Math.round(startup * 0.45),
          inventory: fa.inventory_initial || Math.round(startup * 0.15),
          legal: fa.legal || 50000,
          marketing_initial: fa.marketing_initial || Math.round(startup * 0.1),
          working_capital: fa.working_capital || Math.round(startup * 0.2)
        },
        reasoning: fa.investment_reasoning || `Стартовые инвестиции ${startup.toLocaleString()}₽ включают оборудование, депозит аренды, начальные запасы и оборотный капитал на 2-3 месяца.`
      },
      monthly_expenses: {
        total: realistic.totalExpenses,
        variable_costs: realistic.expenseBreakdown.cogs + realistic.expenseBreakdown.marketing,
        fixed_costs: defaults.salaries_fixed + defaults.rent_fixed + defaults.utilities_fixed + defaults.other_fixed,
        breakdown: {
          rent: defaults.rent_fixed,
          utilities: defaults.utilities_fixed,
          salaries: defaults.salaries_fixed,
          inventory_replenishment: realistic.expenseBreakdown.cogs,
          marketing: realistic.expenseBreakdown.marketing,
          other: defaults.other_fixed
        }
      },
      risk_analysis: {
        revenue_drop_20: {
          scenario: "Падение выручки на 20%",
          description: "Снижение спроса, сезонность, конкуренция",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: Math.round((mrr * 0.8) - realistic.totalExpenses * 0.95),
          probability: "средняя" as const
        },
        costs_rise_15: {
          scenario: "Рост затрат на 15%",
          description: "Инфляция, рост цен на сырьё и аренду",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: Math.round(mrr - realistic.totalExpenses * 1.15),
          probability: "высокая" as const
        },
        cac_doubles: {
          scenario: "Удвоение CAC",
          description: "Рост конкуренции в рекламе",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: Math.round(realistic.correctedProfit - realistic.expenseBreakdown.marketing),
          probability: "средняя" as const
        },
        churn_increase: {
          scenario: "Рост оттока на 50%",
          description: "Снижение качества, конкуренция",
          impact_on_revenue: -15,
          impact_on_costs: 0,
          resulting_profit: Math.round((mrr * 0.85) - realistic.totalExpenses),
          probability: "средняя" as const
        }
      },
      calculations_summary: `
### Расчёт финансовой модели

**Входные данные:**
- Ежемесячная выручка (MRR): ${mrr.toLocaleString()}₽
- Стартовые инвестиции: ${startup.toLocaleString()}₽
- Средний чек: ${defaults.average_check}₽
- CAC: ${realistic.correctedCac}₽
- LTV: ${realistic.correctedLtv.toLocaleString()}₽

**Структура расходов (в месяц):**
- Себестоимость (${defaults.cogs_percent}%): ${realistic.expenseBreakdown.cogs.toLocaleString()}₽
- ФОТ (фикс.): ${defaults.salaries_fixed.toLocaleString()}₽
- Аренда (фикс.): ${defaults.rent_fixed.toLocaleString()}₽
- Коммуналка: ${defaults.utilities_fixed.toLocaleString()}₽
- Маркетинг: ${realistic.expenseBreakdown.marketing.toLocaleString()}₽
- Прочие: ${defaults.other_fixed.toLocaleString()}₽
- **Итого расходы: ${realistic.totalExpenses.toLocaleString()}₽**

**Расчёт прибыли:**
Прибыль = ${mrr.toLocaleString()}₽ - ${realistic.totalExpenses.toLocaleString()}₽ = **${realistic.correctedProfit.toLocaleString()}₽**

**Точка безубыточности:** ${realistic.breakEvenRevenue.toLocaleString()}₽/мес
**Для прибыли 45k нужна выручка:** ~${realistic.profitableRevenue.toLocaleString()}₽/мес

**Окупаемость:** ${startup.toLocaleString()}₽ / ${realistic.correctedProfit.toLocaleString()}₽ = ${paybackMonths === 999 ? 'никогда (убыток)' : paybackMonths + ' мес'}

**LTV:CAC = ${realistic.correctedLtvCacRatio}x** ${realistic.correctedLtvCacRatio >= 3 ? '✓ норма (3-5x)' : '⚠ ниже нормы'}
      `.trim()
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
      cac: realistic.correctedCac,
      ltv: realistic.correctedLtv,
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
    confidence_score: raw.confidence || 70,
    data_sources: sources,
    limitations: limits,
    _corrections: realistic.corrections,
    _isProfitable: realistic.isProfitable,
    _breakEvenRevenue: realistic.breakEvenRevenue,
    _profitableRevenue: realistic.profitableRevenue
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

    // Enhanced prompt with realistic industry benchmarks
    const prompt = `Ты — опытный финансовый аналитик. Проанализируй бизнес-идею с РЕАЛИСТИЧНЫМИ отраслевыми показателями.

## БИЗНЕС-ИДЕЯ
${idea.trim()}

## ЛОКАЦИЯ (ИСПОЛЬЗУЙ ТОЛЬКО ЭТУ ЛОКАЦИЮ!)
${location.trim()}

## КРИТИЧЕСКИЕ ТРЕБОВАНИЯ К РЕАЛИСТИЧНОСТИ

### Маржинальность по отраслям (чистая прибыль / выручка):
- Пекарня, кондитерская: 8-15%
- Доставка еды: 5-12%
- Ресторан: 10-20%
- Розничная торговля: 3-10%
- Услуги (салон, фитнес): 15-25%
- IT/SaaS: 20-40%

### CAC (стоимость привлечения клиента) - РЕАЛЬНЫЕ ЦИФРЫ:
- Instagram/VK Ads: 200-500₽
- Яндекс.Директ: 300-800₽
- SEO/контент: 100-300₽
- B2B продажи: 5000-50000₽

### LTV - расчёт по формуле:
LTV = Средний чек × Заказов в месяц × Время жизни клиента (мес.)
Например: 600₽ × 4 заказа × 4 мес = 9600₽

### ОБЯЗАТЕЛЬНЫЕ СООТНОШЕНИЯ:
- LTV:CAC ДОЛЖНО быть 3-5x (НЕ БОЛЬШЕ 7x!)
- Payback = Инвестиции / Чистая прибыль

### СТРУКТУРА РАСХОДОВ для пищевого бизнеса:
- COGS (сырьё): 35-45% от выручки
- ФОТ: 150-200k/мес (фиксированно)
- Аренда: 40-70k/мес (фиксированно)
- Коммуналка: 10-20k/мес
- Маркетинг: CAC × новые клиенты
- Прочие: 25-40k/мес

## ВАЖНО
- Используй ТОЛЬКО указанную локацию: ${location.trim()}
- НЕ СМЕШИВАЙ разные города в одном анализе
- Целевая аудитория должна соответствовать локации

## ФОРМАТ ОТВЕТА (JSON строки)

financial_json:
{
  "mrr": число (выручка 300000-600000 для пекарни),
  "average_check": число (500-800),
  "orders_monthly": число,
  "cogs_percent": 40,
  "startup_investment": число (1000000-2000000 для пекарни),
  "cac": число (250-500),
  "ltv": число (рассчитай по формуле),
  "equipment": число,
  "calculations_summary": "Подробный расчёт"
}

business_json:
{
  "executive_summary": "краткое резюме",
  "product_description": "описание продукта",
  "target_audience": "аудитория в ${location.trim()}",
  "competitive_advantages": "преимущества",
  "operations": "операции",
  "launch_steps": ["шаг1", "шаг2"],
  "risks": [{name, description, mitigation}]
}

marketing_json:
{
  "positioning": "позиционирование",
  "pricing_strategy": "стратегия цен",
  "channels": [{name, budget, expected_roi}],
  "cac": число,
  "ltv": число,
  "first_3_months_plan": "план"
}

market_json:
{
  "tam": "TAM в ${location.trim()}",
  "sam": "SAM",
  "som": "SOM",
  "trends": ["тренд1"],
  "competitors": [{name, strengths, weaknesses}],
  "competitive_landscape": "анализ",
  "market_gaps": "возможности",
  "barriers_to_entry": "барьеры",
  "growth_opportunities": "рост"
}

Вызови функцию submit_analysis.`;

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
    console.log("Response:", JSON.stringify(aiResponse).substring(0, 200));

    if (aiResponse.error) {
      console.error("AI error:", JSON.stringify(aiResponse.error));
      return new Response(
        JSON.stringify({ error: "Ошибка AI. Попробуйте снова.", code: "AI_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call");
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
    
    // Extract internal fields
    const corrections = result._corrections || [];
    const isProfitable = result._isProfitable;
    const breakEvenRevenue = result._breakEvenRevenue;
    const profitableRevenue = result._profitableRevenue;
    
    // Remove internal fields from response
    delete result._corrections;
    delete result._isProfitable;
    delete result._breakEvenRevenue;
    delete result._profitableRevenue;
    
    // Build validation object
    const validationIssues: Array<{
      field: string;
      value: number | string;
      expected: string;
      severity: 'warning' | 'error';
      message: string;
    }> = [];
    
    const fa = result.financial_analysis;
    
    // Check profitability
    if (!isProfitable) {
      validationIssues.push({
        field: 'profitability',
        value: fa.scenarios.base.net_profit,
        expected: '> 0',
        severity: 'error',
        message: `❌ Бизнес УБЫТОЧЕН при выручке ${fa.mrr.toLocaleString()}₽. Точка безубыточности: ${breakEvenRevenue.toLocaleString()}₽/мес. Для прибыли 45к нужна выручка ~${profitableRevenue.toLocaleString()}₽/мес.`
      });
    }
    
    // Check LTV:CAC
    const ltvCacRatio = fa.unit_economics.ltv_cac_ratio;
    if (ltvCacRatio < 2.5) {
      validationIssues.push({
        field: 'ltv_cac_ratio',
        value: ltvCacRatio,
        expected: '3-5x',
        severity: 'error',
        message: `LTV:CAC ${ltvCacRatio}x ниже нормы — бизнес на грани рентабельности`
      });
    } else if (ltvCacRatio > 7) {
      validationIssues.push({
        field: 'ltv_cac_ratio',
        value: ltvCacRatio,
        expected: '3-5x (макс 7x)',
        severity: 'warning',
        message: `LTV:CAC ${ltvCacRatio}x выше реалистичного — данные могут быть оптимистичными`
      });
    }
    
    // Check payback
    const payback = fa.returns.payback_period_months;
    if (payback > 36 && payback < 999) {
      validationIssues.push({
        field: 'payback_period',
        value: payback,
        expected: '12-24 месяца',
        severity: 'warning',
        message: `Окупаемость ${payback} мес. — длительный срок возврата инвестиций`
      });
    }
    
    // Calculate reliability score
    const correctionPenalty = Math.min(corrections.length * 10, 40);
    const profitPenalty = isProfitable ? 0 : 30;
    const warningPenalty = validationIssues.filter(i => i.severity === 'warning').length * 5;
    const errorPenalty = validationIssues.filter(i => i.severity === 'error').length * 15;
    const reliabilityScore = Math.max(0, Math.min(100, 100 - correctionPenalty - profitPenalty - warningPenalty - errorPenalty));
    
    const wasAutoCorrected = corrections.length > 0;
    
    console.log(`Done. Corrections: ${corrections.length}. Profitable: ${isProfitable}. Reliability: ${reliabilityScore}%`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          validation: {
            is_realistic: isProfitable && corrections.length === 0 && validationIssues.length === 0,
            is_profitable: isProfitable,
            was_auto_corrected: wasAutoCorrected,
            reliability_score: reliabilityScore,
            corrections: corrections,
            warnings: validationIssues,
            break_even_revenue: breakEvenRevenue,
            profitable_revenue_for_45k: profitableRevenue,
            summary: !isProfitable 
              ? `⚠️ Бизнес убыточен при текущей выручке. Нужна выручка от ${breakEvenRevenue.toLocaleString()}₽/мес для безубыточности.`
              : wasAutoCorrected 
                ? `Скорректировано ${corrections.length} показателей до отраслевых норм`
                : validationIssues.length > 0
                  ? `${validationIssues.length} предупреждений`
                  : "✓ Все показатели в пределах отраслевых норм"
          },
          metadata: {
            idea: idea.trim(),
            location: location.trim(),
            generated_at: new Date().toISOString(),
            model: "google/gemini-2.5-flash",
            version: "4.0-realistic-model",
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
