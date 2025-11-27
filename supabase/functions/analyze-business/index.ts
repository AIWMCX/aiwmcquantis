import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

// Simplified tool schema to avoid "too many states" error
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_business_analysis",
    description: "Submit business analysis with financial projections",
    parameters: {
      type: "object",
      properties: {
        financial_analysis: {
          type: "object",
          properties: {
            // Input variables
            price_per_unit: { type: "number" },
            units_sold_monthly: { type: "number" },
            cogs_per_unit: { type: "number" },
            fixed_opex: { type: "number" },
            marketing_budget: { type: "number" },
            cac: { type: "number" },
            ltv: { type: "number" },
            churn_rate: { type: "number" },
            
            // Calculated metrics
            mrr: { type: "number" },
            arr: { type: "number" },
            contribution_margin: { type: "number" },
            ltv_cac_ratio: { type: "number" },
            cac_payback_months: { type: "number" },
            breakeven_units: { type: "number" },
            breakeven_revenue: { type: "number" },
            breakeven_months: { type: "number" },
            
            // 3 Scenarios - flat structure
            pessimistic_revenue: { type: "number" },
            pessimistic_profit: { type: "number" },
            pessimistic_margin: { type: "number" },
            base_revenue: { type: "number" },
            base_profit: { type: "number" },
            base_margin: { type: "number" },
            optimistic_revenue: { type: "number" },
            optimistic_profit: { type: "number" },
            optimistic_margin: { type: "number" },
            
            // Investment & Returns
            startup_investment: { type: "number" },
            payback_months: { type: "number" },
            roi_year_1: { type: "number" },
            
            // Expenses breakdown
            rent: { type: "number" },
            utilities: { type: "number" },
            salaries: { type: "number" },
            inventory: { type: "number" },
            marketing: { type: "number" },
            other_expenses: { type: "number" },
            
            // Risk scenarios - profit if...
            profit_if_revenue_drops_20: { type: "number" },
            profit_if_costs_rise_15: { type: "number" },
            profit_if_cac_doubles: { type: "number" },
            
            // Text explanations
            investment_reasoning: { type: "string" },
            calculations_summary: { type: "string" }
          },
          required: ["mrr", "base_profit", "startup_investment", "payback_months", "roi_year_1", "calculations_summary"]
        },
        business_plan: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            product_description: { type: "string" },
            target_audience: { type: "string" },
            competitive_advantages: { type: "string" },
            operations: { type: "string" },
            launch_steps_json: { type: "string" },
            risks_json: { type: "string" }
          },
          required: ["executive_summary", "product_description", "target_audience"]
        },
        marketing_plan: {
          type: "object",
          properties: {
            positioning: { type: "string" },
            pricing_strategy: { type: "string" },
            channels_json: { type: "string" },
            cac: { type: "number" },
            ltv: { type: "number" },
            first_3_months_plan: { type: "string" }
          },
          required: ["positioning", "pricing_strategy", "cac", "ltv"]
        },
        market_analysis: {
          type: "object",
          properties: {
            tam: { type: "string" },
            sam: { type: "string" },
            som: { type: "string" },
            trends_json: { type: "string" },
            competitors_json: { type: "string" },
            competitive_landscape: { type: "string" },
            market_gaps: { type: "string" },
            barriers_to_entry: { type: "string" },
            growth_opportunities: { type: "string" }
          },
          required: ["tam", "sam", "som", "competitive_landscape"]
        },
        confidence_score: { type: "number" },
        data_sources_json: { type: "string" },
        limitations_json: { type: "string" }
      },
      required: ["financial_analysis", "business_plan", "marketing_plan", "market_analysis", "confidence_score"]
    }
  }
};

// Transform flat response to nested structure for frontend
function transformResponse(raw: any) {
  const fa = raw.financial_analysis || {};
  
  return {
    financial_analysis: {
      inputs: {
        price_per_unit: fa.price_per_unit || 0,
        units_sold_monthly: fa.units_sold_monthly || 0,
        purchase_frequency: 1,
        upsell_per_customer: 0,
        cogs_per_unit: fa.cogs_per_unit || 0,
        fixed_opex: fa.fixed_opex || 0,
        marketing_budget: fa.marketing_budget || 0,
        cac: fa.cac || 0,
        startup_investment: fa.startup_investment || 0,
        capex: 0,
        ltv: fa.ltv || 0,
        churn_rate: fa.churn_rate || 0.05
      },
      mrr: fa.mrr || 0,
      arr: fa.arr || (fa.mrr || 0) * 12,
      scenarios: {
        pessimistic: {
          revenue: fa.pessimistic_revenue || 0,
          variable_costs: 0,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: fa.pessimistic_revenue || 0,
          net_profit: fa.pessimistic_profit || 0,
          gross_margin: fa.pessimistic_margin || 0,
          net_margin: fa.pessimistic_margin || 0
        },
        base: {
          revenue: fa.base_revenue || fa.mrr || 0,
          variable_costs: 0,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: fa.base_revenue || 0,
          net_profit: fa.base_profit || 0,
          gross_margin: fa.base_margin || 0,
          net_margin: fa.base_margin || 0
        },
        optimistic: {
          revenue: fa.optimistic_revenue || 0,
          variable_costs: 0,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: fa.optimistic_revenue || 0,
          net_profit: fa.optimistic_profit || 0,
          gross_margin: fa.optimistic_margin || 0,
          net_margin: fa.optimistic_margin || 0
        }
      },
      unit_economics: {
        contribution_margin: fa.contribution_margin || 0,
        contribution_margin_ratio: fa.price_per_unit ? (fa.contribution_margin || 0) / fa.price_per_unit : 0,
        cac: fa.cac || 0,
        cac_payback_months: fa.cac_payback_months || 0,
        ltv: fa.ltv || 0,
        ltv_cac_ratio: fa.ltv_cac_ratio || 0
      },
      breakeven: {
        breakeven_units: fa.breakeven_units || 0,
        breakeven_revenue: fa.breakeven_revenue || 0,
        breakeven_months: fa.breakeven_months || 0
      },
      returns: {
        payback_period_months: fa.payback_months || 0,
        roi_year_1: fa.roi_year_1 || 0,
        roi_year_3: (fa.roi_year_1 || 0) * 2,
        npv_3_years: (fa.base_profit || 0) * 36 - (fa.startup_investment || 0)
      },
      startup_investment: {
        total: fa.startup_investment || 0,
        breakdown: {
          rent_deposit: fa.rent || 0,
          equipment: fa.inventory || 0,
          inventory: fa.inventory || 0,
          legal: 50000,
          marketing_initial: fa.marketing || 0,
          working_capital: fa.other_expenses || 0
        },
        reasoning: fa.investment_reasoning || ""
      },
      monthly_expenses: {
        total: (fa.rent || 0) + (fa.utilities || 0) + (fa.salaries || 0) + (fa.inventory || 0) + (fa.marketing || 0) + (fa.other_expenses || 0),
        variable_costs: (fa.inventory || 0),
        fixed_costs: (fa.rent || 0) + (fa.utilities || 0) + (fa.salaries || 0),
        breakdown: {
          rent: fa.rent || 0,
          utilities: fa.utilities || 0,
          salaries: fa.salaries || 0,
          inventory_replenishment: fa.inventory || 0,
          marketing: fa.marketing || 0,
          other: fa.other_expenses || 0
        }
      },
      risk_analysis: {
        revenue_drop_20: {
          scenario: "Падение выручки на 20%",
          description: "Снижение спроса или потеря клиентов",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: fa.profit_if_revenue_drops_20 || 0,
          probability: "средняя" as const
        },
        costs_rise_15: {
          scenario: "Рост затрат на 15%",
          description: "Инфляция или рост цен поставщиков",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: fa.profit_if_costs_rise_15 || 0,
          probability: "средняя" as const
        },
        cac_doubles: {
          scenario: "Удвоение CAC",
          description: "Рост конкуренции за рекламу",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: fa.profit_if_cac_doubles || 0,
          probability: "низкая" as const
        },
        churn_increase: {
          scenario: "Рост оттока клиентов",
          description: "Снижение качества или конкуренция",
          impact_on_revenue: -10,
          impact_on_costs: 0,
          resulting_profit: (fa.base_profit || 0) * 0.9,
          probability: "средняя" as const
        }
      },
      calculations_summary: fa.calculations_summary || ""
    },
    business_plan: {
      executive_summary: raw.business_plan?.executive_summary || "",
      product_description: raw.business_plan?.product_description || "",
      target_audience: raw.business_plan?.target_audience || "",
      competitive_advantages: raw.business_plan?.competitive_advantages || "",
      operations: raw.business_plan?.operations || "",
      launch_steps: parseJSON(raw.business_plan?.launch_steps_json, []),
      risks: parseJSON(raw.business_plan?.risks_json, [])
    },
    marketing_plan: {
      positioning: raw.marketing_plan?.positioning || "",
      pricing_strategy: raw.marketing_plan?.pricing_strategy || "",
      channels: parseJSON(raw.marketing_plan?.channels_json, []),
      cac: raw.marketing_plan?.cac || 0,
      ltv: raw.marketing_plan?.ltv || 0,
      first_3_months_plan: raw.marketing_plan?.first_3_months_plan || ""
    },
    market_analysis: {
      market_size: {
        tam: raw.market_analysis?.tam || "",
        sam: raw.market_analysis?.sam || "",
        som: raw.market_analysis?.som || ""
      },
      trends: parseJSON(raw.market_analysis?.trends_json, []),
      competition: {
        main_competitors: parseJSON(raw.market_analysis?.competitors_json, []),
        competitive_landscape: raw.market_analysis?.competitive_landscape || "",
        market_gaps: raw.market_analysis?.market_gaps || ""
      },
      barriers_to_entry: raw.market_analysis?.barriers_to_entry || "",
      growth_opportunities: raw.market_analysis?.growth_opportunities || ""
    },
    confidence_score: raw.confidence_score || 70,
    data_sources: parseJSON(raw.data_sources_json, ["Открытые источники", "Рыночные исследования"]),
    limitations: parseJSON(raw.limitations_json, ["Оценочные данные"])
  };
}

function parseJSON(str: string | undefined, fallback: any): any {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea, location } = await req.json() as AnalysisRequest;

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Business idea must be at least 10 characters", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || typeof location !== "string" || location.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Location must be at least 2 characters", code: "VALIDATION_ERROR" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", code: "CONFIG_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing: "${idea.substring(0, 50)}..." in ${location}`);

    const systemPrompt = `Вы — финансовый аналитик. Проведите анализ бизнес-идеи используя УНИВЕРСАЛЬНЫЕ ФОРМУЛЫ:

ФОРМУЛЫ (применяйте к любому бизнесу):
- MRR = P × N (цена × клиенты)
- ARR = MRR × 12
- Маржинальный доход CM = P - C (цена - себестоимость)
- LTV = CM / H (маржа / отток)
- LTV:CAC = LTV / CAC (должно быть >3)
- Точка безубыточности N_BE = OPEX / CM
- Срок окупаемости = Инвестиции / Прибыль
- ROI = (Прибыль × 12) / Инвестиции × 100%

3 СЦЕНАРИЯ:
- Пессимистичный: выручка -20%, затраты +30%
- Базовый: реалистичные оценки
- Оптимистичный: выручка +30%, затраты -10%

РИСКИ (рассчитайте прибыль если):
- Выручка падает на 20%
- Затраты растут на 15%
- CAC удваивается

Все суммы в рублях. Вызовите функцию submit_business_analysis.
Для массивов используйте JSON строки в полях *_json.`;

    const userPrompt = `Анализ бизнеса:
ИДЕЯ: ${idea.trim()}
ЛОКАЦИЯ: ${location.trim()}

Вызовите submit_business_analysis с полными расчетами по формулам.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [analysisToolSchema],
        tool_choice: { type: "function", function: { name: "submit_business_analysis" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Слишком много запросов. Попробуйте через минуту.", code: "RATE_LIMIT" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит использования AI.", code: "PAYMENT_REQUIRED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Ошибка AI сервиса", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    console.log("AI response received:", JSON.stringify(aiResponse).substring(0, 300));

    if (aiResponse.error) {
      console.error("AI API error:", JSON.stringify(aiResponse.error));
      return new Response(
        JSON.stringify({ error: "Временная ошибка AI. Попробуйте снова.", code: "AI_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "submit_business_analysis") {
      const textContent = aiResponse.choices?.[0]?.message?.content;
      if (textContent) {
        console.error("AI returned text:", textContent.substring(0, 300));
      }
      return new Response(
        JSON.stringify({ error: "AI не смог провести анализ. Попробуйте изменить формулировку.", code: "AI_FORMAT_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawResult;
    try {
      rawResult = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse:", parseError);
      return new Response(
        JSON.stringify({ error: "Не удалось обработать ответ AI", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform flat structure to nested
    const analysisResult = transformResponse(rawResult);

    console.log(`Analysis completed. Confidence: ${analysisResult.confidence_score}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...analysisResult,
          metadata: {
            idea: idea.trim(),
            location: location.trim(),
            generated_at: new Date().toISOString(),
            model: "google/gemini-2.5-flash",
            version: "3.1-simplified",
          },
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
