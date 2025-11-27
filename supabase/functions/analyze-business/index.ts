import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

// Minimal tool schema - everything as JSON strings to avoid complexity limits
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Submit business analysis",
    parameters: {
      type: "object",
      properties: {
        financial_json: { type: "string", description: "JSON with: mrr, arr, base_profit, startup_investment, payback_months, roi_year_1, cac, ltv, ltv_cac_ratio, breakeven_units, pessimistic_profit, optimistic_profit, rent, salaries, marketing, calculations_summary" },
        business_json: { type: "string", description: "JSON with: executive_summary, product_description, target_audience, competitive_advantages, operations, launch_steps (array), risks (array)" },
        marketing_json: { type: "string", description: "JSON with: positioning, pricing_strategy, channels (array), cac, ltv, first_3_months_plan" },
        market_json: { type: "string", description: "JSON with: tam, sam, som, trends (array), competitors (array), competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities" },
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
    // Try to fix common JSON issues
    try {
      return JSON.parse(str.replace(/'/g, '"').replace(/(\w+):/g, '"$1":'));
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
  const sources = raw.sources ? raw.sources.split(',').map((s: string) => s.trim()) : ["Открытые источники"];
  const limits = raw.limitations ? raw.limitations.split(',').map((s: string) => s.trim()) : ["Оценочные данные"];

  const mrr = fa.mrr || 0;
  const baseProfit = fa.base_profit || 0;
  const startup = fa.startup_investment || 0;
  
  return {
    financial_analysis: {
      inputs: {
        price_per_unit: fa.price_per_unit || mrr / 100,
        units_sold_monthly: fa.units_monthly || 100,
        purchase_frequency: 1,
        upsell_per_customer: 0,
        cogs_per_unit: fa.cogs || 0,
        fixed_opex: fa.fixed_opex || 0,
        marketing_budget: fa.marketing || 0,
        cac: fa.cac || 0,
        startup_investment: startup,
        capex: 0,
        ltv: fa.ltv || 0,
        churn_rate: fa.churn || 0.05
      },
      mrr: mrr,
      arr: fa.arr || mrr * 12,
      scenarios: {
        pessimistic: {
          revenue: mrr * 0.8,
          variable_costs: 0,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: mrr * 0.8,
          net_profit: fa.pessimistic_profit || baseProfit * 0.5,
          gross_margin: 30,
          net_margin: 15
        },
        base: {
          revenue: mrr,
          variable_costs: 0,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: mrr,
          net_profit: baseProfit,
          gross_margin: 40,
          net_margin: 20
        },
        optimistic: {
          revenue: mrr * 1.3,
          variable_costs: 0,
          fixed_costs: fa.fixed_opex || 0,
          gross_profit: mrr * 1.3,
          net_profit: fa.optimistic_profit || baseProfit * 1.5,
          gross_margin: 50,
          net_margin: 30
        }
      },
      unit_economics: {
        contribution_margin: fa.contribution_margin || (fa.price_per_unit || 0) - (fa.cogs || 0),
        contribution_margin_ratio: 0.6,
        cac: fa.cac || 0,
        cac_payback_months: fa.cac_payback || 3,
        ltv: fa.ltv || 0,
        ltv_cac_ratio: fa.ltv_cac_ratio || 3
      },
      breakeven: {
        breakeven_units: fa.breakeven_units || 0,
        breakeven_revenue: fa.breakeven_revenue || 0,
        breakeven_months: fa.breakeven_months || 6
      },
      returns: {
        payback_period_months: fa.payback_months || 12,
        roi_year_1: fa.roi_year_1 || 0,
        roi_year_3: (fa.roi_year_1 || 0) * 2,
        npv_3_years: baseProfit * 36 - startup
      },
      startup_investment: {
        total: startup,
        breakdown: {
          rent_deposit: fa.rent || startup * 0.15,
          equipment: fa.equipment || startup * 0.3,
          inventory: fa.inventory || startup * 0.2,
          legal: fa.legal || 50000,
          marketing_initial: fa.marketing || startup * 0.15,
          working_capital: fa.working_capital || startup * 0.2
        },
        reasoning: fa.calculations_summary || ""
      },
      monthly_expenses: {
        total: (fa.rent || 0) + (fa.salaries || 0) + (fa.marketing || 0) + (fa.utilities || 0) + (fa.other || 0),
        variable_costs: fa.variable_costs || 0,
        fixed_costs: fa.fixed_costs || 0,
        breakdown: {
          rent: fa.rent || 0,
          utilities: fa.utilities || 0,
          salaries: fa.salaries || 0,
          inventory_replenishment: fa.inventory_monthly || 0,
          marketing: fa.marketing || 0,
          other: fa.other || 0
        }
      },
      risk_analysis: {
        revenue_drop_20: {
          scenario: "Падение выручки на 20%",
          description: "Снижение спроса",
          impact_on_revenue: -20,
          impact_on_costs: 0,
          resulting_profit: baseProfit * 0.6,
          probability: "средняя" as const
        },
        costs_rise_15: {
          scenario: "Рост затрат на 15%",
          description: "Инфляция",
          impact_on_revenue: 0,
          impact_on_costs: 15,
          resulting_profit: baseProfit * 0.85,
          probability: "средняя" as const
        },
        cac_doubles: {
          scenario: "Удвоение CAC",
          description: "Рост конкуренции",
          impact_on_revenue: 0,
          impact_on_costs: 0,
          resulting_profit: baseProfit * 0.7,
          probability: "низкая" as const
        },
        churn_increase: {
          scenario: "Рост оттока",
          description: "Конкуренция",
          impact_on_revenue: -10,
          impact_on_costs: 0,
          resulting_profit: baseProfit * 0.9,
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
      cac: mp.cac || fa.cac || 0,
      ltv: mp.ltv || fa.ltv || 0,
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

    const prompt = `Проанализируй бизнес-идею и вызови функцию submit_analysis.

ИДЕЯ: ${idea.trim()}
ЛОКАЦИЯ: ${location.trim()}

Рассчитай по формулам:
- MRR = цена × клиенты
- ROI = (прибыль × 12) / инвестиции × 100%
- LTV:CAC должно быть > 3
- Точка безубыточности = расходы / маржа

Верни JSON строки для каждого раздела. Все суммы в рублях.`;

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
        JSON.stringify({ error: "Ошибка парсинга ответа", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = transformResponse(rawResult);
    console.log(`Done. Confidence: ${result.confidence_score}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          metadata: {
            idea: idea.trim(),
            location: location.trim(),
            generated_at: new Date().toISOString(),
            model: "google/gemini-2.5-flash",
            version: "3.2",
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
