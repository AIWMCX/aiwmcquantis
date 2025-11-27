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

function transformResponse(raw: any) {
  const fa = safeParseJSON(raw.financial_json, {});
  const bp = safeParseJSON(raw.business_json, {});
  const mp = safeParseJSON(raw.marketing_json, {});
  const ma = safeParseJSON(raw.market_json, {});
  const sources = raw.sources ? raw.sources.split(',').map((s: string) => s.trim()) : ["Открытые источники", "Отраслевые исследования"];
  const limits = raw.limitations ? raw.limitations.split(',').map((s: string) => s.trim()) : ["Оценочные данные"];

  const mrr = fa.mrr || 0;
  const baseProfit = fa.base_profit || 0;
  const startup = fa.startup_investment || 0;
  const cac = fa.cac || 500;
  const ltv = fa.ltv || 5000;
  
  // Calculate realistic margins
  const grossMarginPct = fa.gross_margin || 40;
  const netMarginPct = fa.net_margin || 12;
  
  return {
    financial_analysis: {
      inputs: {
        price_per_unit: fa.price_per_unit || fa.average_check || 500,
        units_sold_monthly: fa.orders_monthly || fa.units_monthly || Math.round(mrr / (fa.average_check || 500)),
        purchase_frequency: fa.purchase_frequency || 2,
        upsell_per_customer: fa.upsell || 0,
        cogs_per_unit: fa.cogs_per_unit || (fa.average_check || 500) * 0.35,
        fixed_opex: fa.fixed_opex || fa.total_expenses * 0.6 || 0,
        marketing_budget: fa.marketing || 0,
        cac: cac,
        startup_investment: startup,
        capex: fa.equipment || 0,
        ltv: ltv,
        churn_rate: fa.churn_rate || 0.08
      },
      mrr: mrr,
      arr: fa.arr || mrr * 12,
      scenarios: {
        pessimistic: {
          revenue: fa.pessimistic_revenue || mrr * 0.75,
          variable_costs: fa.pessimistic_variable_costs || mrr * 0.75 * 0.4,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: fa.pessimistic_gross_profit || mrr * 0.75 * (grossMarginPct / 100),
          net_profit: fa.pessimistic_profit || baseProfit * 0.3,
          gross_margin: grossMarginPct - 10,
          net_margin: Math.max(netMarginPct - 8, 0)
        },
        base: {
          revenue: mrr,
          variable_costs: fa.variable_costs || mrr * 0.35,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: fa.gross_profit || mrr * (grossMarginPct / 100),
          net_profit: baseProfit,
          gross_margin: grossMarginPct,
          net_margin: netMarginPct
        },
        optimistic: {
          revenue: fa.optimistic_revenue || mrr * 1.3,
          variable_costs: fa.optimistic_variable_costs || mrr * 1.3 * 0.32,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: fa.optimistic_gross_profit || mrr * 1.3 * (grossMarginPct / 100 + 0.05),
          net_profit: fa.optimistic_profit || baseProfit * 1.8,
          gross_margin: grossMarginPct + 5,
          net_margin: netMarginPct + 5
        }
      },
      unit_economics: {
        contribution_margin: fa.contribution_margin || (fa.average_check || 500) - (fa.cogs_per_unit || 175),
        contribution_margin_ratio: fa.contribution_margin_ratio || 0.65,
        cac: cac,
        cac_payback_months: fa.cac_payback_months || Math.ceil(cac / ((fa.average_check || 500) * (netMarginPct / 100) * (fa.purchase_frequency || 2))),
        ltv: ltv,
        ltv_cac_ratio: fa.ltv_cac_ratio || Math.round(ltv / cac * 10) / 10
      },
      breakeven: {
        breakeven_units: fa.breakeven_units || 0,
        breakeven_revenue: fa.breakeven_revenue || 0,
        breakeven_months: fa.breakeven_months || 0
      },
      returns: {
        payback_period_months: fa.payback_months || (startup > 0 && baseProfit > 0 ? Math.ceil(startup / baseProfit) : 0),
        roi_year_1: fa.roi_year_1 || (startup > 0 && baseProfit > 0 ? Math.round((baseProfit * 12 / startup) * 100) : 0),
        roi_year_3: fa.roi_year_3 || (startup > 0 && baseProfit > 0 ? Math.round((baseProfit * 36 / startup) * 100) : 0),
        npv_3_years: fa.npv_3_years || (baseProfit * 36 - startup)
      },
      startup_investment: {
        total: startup,
        breakdown: {
          rent_deposit: fa.rent_deposit || Math.round(startup * 0.1),
          equipment: fa.equipment || Math.round(startup * 0.4),
          inventory: fa.inventory_initial || Math.round(startup * 0.15),
          legal: fa.legal || 50000,
          marketing_initial: fa.marketing_initial || Math.round(startup * 0.1),
          working_capital: fa.working_capital || Math.round(startup * 0.25)
        },
        reasoning: fa.investment_reasoning || fa.calculations_summary || ""
      },
      monthly_expenses: {
        total: fa.total_expenses || 0,
        variable_costs: fa.variable_costs || 0,
        fixed_costs: fa.fixed_costs || 0,
        breakdown: {
          rent: fa.rent || 0,
          utilities: fa.utilities || 0,
          salaries: fa.salaries || 0,
          inventory_replenishment: fa.inventory_monthly || fa.cogs_monthly || 0,
          marketing: fa.marketing || 0,
          other: fa.other || 0
        }
      },
      risk_analysis: {
        revenue_drop_20: {
          scenario: "Падение выручки на 20%",
          description: "Снижение спроса, сезонность, конкуренция",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: fa.profit_revenue_drop_20 || Math.round(baseProfit * 0.4),
          probability: "средняя" as const
        },
        costs_rise_15: {
          scenario: "Рост затрат на 15%",
          description: "Инфляция, рост цен на сырьё и аренду",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: fa.profit_costs_rise_15 || Math.round(baseProfit * 0.7),
          probability: "высокая" as const
        },
        cac_doubles: {
          scenario: "Удвоение CAC",
          description: "Рост конкуренции в рекламе",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: fa.profit_cac_doubles || Math.round(baseProfit * 0.6),
          probability: "средняя" as const
        },
        churn_increase: {
          scenario: "Рост оттока на 50%",
          description: "Снижение качества, конкуренция",
          impact_on_revenue: -15,
          impact_on_costs: 0,
          resulting_profit: fa.profit_churn_increase || Math.round(baseProfit * 0.5),
          probability: "средняя" as const
        }
      },
      calculations_summary: fa.calculations_summary || ""
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
      cac: mp.cac || cac,
      ltv: mp.ltv || ltv,
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
    limitations: limits
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

## ЛОКАЦИЯ
${location.trim()}

## КРИТИЧЕСКИЕ ТРЕБОВАНИЯ К РЕАЛИСТИЧНОСТИ

### Маржинальность по отраслям (чистая прибыль / выручка):
- Пекарня, кондитерская: 8-15%
- Доставка еды: 5-12%
- Ресторан: 10-20%
- Розничная торговля: 3-10%
- Услуги (салон, фитнес): 15-25%
- IT/SaaS: 20-40%
- Производство: 10-20%
- Консалтинг: 25-40%

### CAC (стоимость привлечения клиента) - РЕАЛЬНЫЕ ЦИФРЫ:
- Instagram/Facebook Ads: 200-500₽
- VK Ads: 150-400₽
- Яндекс.Директ: 300-800₽
- SEO/контент: 100-300₽
- Delivery platforms: 200-500₽
- B2B продажи: 5000-50000₽

### LTV (пожизненная ценность клиента):
- Домашние заказы еды: 5000-15000₽
- Офисные заказы: 15000-50000₽
- Розница (постоянный клиент): 10000-30000₽
- SaaS подписки: 20000-100000₽
- Услуги (салон): 15000-40000₽

### ОБЯЗАТЕЛЬНЫЕ СООТНОШЕНИЯ:
- LTV:CAC ДОЛЖНО быть 3-5x (НЕ БОЛЬШЕ 10x!)
- Payback = Инвестиции / Чистая прибыль
- ROI = (Чистая прибыль × 12) / Инвестиции × 100%
- Gross Margin = (Выручка - Себестоимость) / Выручка
- Net Margin = Чистая прибыль / Выручка

### СТРУКТУРА РАСХОДОВ (типичная):
- Сырьё/товар: 30-45% выручки
- Зарплаты: 20-35% выручки
- Аренда: 8-15% выручки
- Маркетинг: 5-15% выручки
- Коммуналка: 3-5% выручки
- Прочее: 5-10% выручки

## ФОРМАТ ОТВЕТА (JSON строки)

financial_json должен содержать:
{
  "mrr": число (ежемесячная выручка),
  "arr": число (годовая выручка),
  "average_check": число (средний чек),
  "orders_monthly": число (заказов в месяц),
  "cogs_per_unit": число (себестоимость единицы),
  "gross_margin": число (валовая маржа %),
  "net_margin": число (чистая маржа % - РЕАЛИСТИЧНАЯ по отрасли!),
  "base_profit": число (чистая прибыль в месяц = MRR × net_margin),
  "pessimistic_profit": число (прибыль в пессимистичном сценарии),
  "optimistic_profit": число (прибыль в оптимистичном сценарии),
  "startup_investment": число (стартовые инвестиции),
  "payback_months": число (Инвестиции / Прибыль),
  "roi_year_1": число (ROI % за год),
  "cac": число (РЕАЛИСТИЧНЫЙ CAC 200-800₽),
  "ltv": число (РЕАЛИСТИЧНЫЙ LTV),
  "ltv_cac_ratio": число (ДОЛЖЕН быть 3-5, максимум 7),
  "breakeven_units": число,
  "breakeven_months": число,
  "total_expenses": число (общие расходы в месяц),
  "variable_costs": число,
  "fixed_costs": число,
  "rent": число,
  "salaries": число,
  "marketing": число,
  "utilities": число,
  "cogs_monthly": число,
  "other": число,
  "equipment": число (для стартовых инвестиций),
  "inventory_initial": число,
  "working_capital": число,
  "calculations_summary": "Подробное объяснение расчётов с формулами"
}

Вызови функцию submit_analysis с реалистичными данными.`;

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

    const result = transformResponse(rawResult);
    
    // Comprehensive validation with industry benchmarks
    const fa = result.financial_analysis;
    const validationIssues: Array<{
      field: string;
      value: number | string;
      expected: string;
      severity: 'warning' | 'error';
      message: string;
    }> = [];

    // Validate net margin by industry norms
    const netMargin = fa.scenarios.base.net_margin;
    if (netMargin > 40) {
      validationIssues.push({
        field: 'net_margin',
        value: netMargin,
        expected: '3-40%',
        severity: 'error',
        message: `Чистая маржа ${netMargin}% нереалистична. Для большинства отраслей норма 5-25%`
      });
    } else if (netMargin > 30) {
      validationIssues.push({
        field: 'net_margin',
        value: netMargin,
        expected: '3-25%',
        severity: 'warning',
        message: `Чистая маржа ${netMargin}% возможна только для IT/консалтинга`
      });
    }

    // Validate CAC
    const cac = fa.unit_economics.cac;
    if (cac < 50) {
      validationIssues.push({
        field: 'cac',
        value: cac,
        expected: '100-800₽',
        severity: 'error',
        message: `CAC ${cac}₽ нереалистично низкий. Минимум для digital-каналов 100-200₽`
      });
    } else if (cac < 100) {
      validationIssues.push({
        field: 'cac',
        value: cac,
        expected: '150-500₽',
        severity: 'warning',
        message: `CAC ${cac}₽ возможен только при органическом трафике`
      });
    }

    // Validate LTV:CAC ratio
    const ltvCacRatio = fa.unit_economics.ltv_cac_ratio;
    if (ltvCacRatio > 10) {
      validationIssues.push({
        field: 'ltv_cac_ratio',
        value: ltvCacRatio,
        expected: '3-7x',
        severity: 'error',
        message: `LTV:CAC ${ltvCacRatio}x нереалистично высокий. Норма 3-5x`
      });
    } else if (ltvCacRatio > 7) {
      validationIssues.push({
        field: 'ltv_cac_ratio',
        value: ltvCacRatio,
        expected: '3-5x',
        severity: 'warning',
        message: `LTV:CAC ${ltvCacRatio}x выше среднего, проверьте CAC и LTV`
      });
    } else if (ltvCacRatio < 2) {
      validationIssues.push({
        field: 'ltv_cac_ratio',
        value: ltvCacRatio,
        expected: '3-5x',
        severity: 'warning',
        message: `LTV:CAC ${ltvCacRatio}x низкий — бизнес может быть нерентабельным`
      });
    }

    // Validate ROI
    const roiYear1 = fa.returns.roi_year_1;
    if (roiYear1 > 200) {
      validationIssues.push({
        field: 'roi_year_1',
        value: roiYear1,
        expected: '20-100%',
        severity: 'error',
        message: `ROI ${roiYear1}% за первый год нереалистичен`
      });
    } else if (roiYear1 > 100) {
      validationIssues.push({
        field: 'roi_year_1',
        value: roiYear1,
        expected: '20-80%',
        severity: 'warning',
        message: `ROI ${roiYear1}% возможен, но требует проверки`
      });
    }

    // Validate payback period
    const payback = fa.returns.payback_period_months;
    if (payback > 0 && payback < 3) {
      validationIssues.push({
        field: 'payback_period',
        value: payback,
        expected: '6-24 месяцев',
        severity: 'warning',
        message: `Окупаемость ${payback} мес. очень быстрая, проверьте расчёты`
      });
    }

    // Validate gross margin
    const grossMargin = fa.scenarios.base.gross_margin;
    if (grossMargin > 80) {
      validationIssues.push({
        field: 'gross_margin',
        value: grossMargin,
        expected: '30-70%',
        severity: 'error',
        message: `Валовая маржа ${grossMargin}% возможна только для digital-продуктов`
      });
    }

    // Calculate overall reliability score
    const errorCount = validationIssues.filter(i => i.severity === 'error').length;
    const warningCount = validationIssues.filter(i => i.severity === 'warning').length;
    
    let reliabilityScore = 100;
    reliabilityScore -= errorCount * 20;
    reliabilityScore -= warningCount * 10;
    reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));

    const isRealistic = errorCount === 0;
    
    console.log(`Done. Confidence: ${result.confidence_score}. Reliability: ${reliabilityScore}%. Issues: ${validationIssues.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          validation: {
            is_realistic: isRealistic,
            reliability_score: reliabilityScore,
            issues: validationIssues,
            summary: isRealistic 
              ? "Показатели в пределах отраслевых норм"
              : `Обнаружено ${errorCount} критических и ${warningCount} предупреждающих отклонений от норм`
          },
          metadata: {
            idea: idea.trim(),
            location: location.trim(),
            generated_at: new Date().toISOString(),
            model: "google/gemini-2.5-flash",
            version: "3.4-validated",
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
