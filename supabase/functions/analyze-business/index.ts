import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

// Universal Financial Analysis Tool Schema
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_business_analysis",
    description: "Submit a comprehensive business analysis using universal financial formulas with 3 scenarios",
    parameters: {
      type: "object",
      properties: {
        financial_analysis: {
          type: "object",
          description: "Complete financial analysis using universal formulas",
          properties: {
            inputs: {
              type: "object",
              description: "12 Universal Input Variables",
              properties: {
                price_per_unit: { type: "number", description: "P - Price per unit in RUB" },
                units_sold_monthly: { type: "number", description: "N - Number of units/customers per month" },
                purchase_frequency: { type: "number", description: "F - Average purchase frequency per month" },
                upsell_per_customer: { type: "number", description: "U - Upsell/extras per customer in RUB" },
                cogs_per_unit: { type: "number", description: "C - Cost of goods sold per unit in RUB" },
                fixed_opex: { type: "number", description: "O - Fixed operating expenses per month in RUB" },
                marketing_budget: { type: "number", description: "M - Marketing budget per month in RUB" },
                cac: { type: "number", description: "A - Customer acquisition cost in RUB" },
                startup_investment: { type: "number", description: "I - Initial startup investment in RUB" },
                capex: { type: "number", description: "K - Capital expenditures in RUB" },
                ltv: { type: "number", description: "L - Customer lifetime value in RUB" },
                churn_rate: { type: "number", description: "H - Monthly churn rate as decimal (0.05 = 5%)" }
              },
              required: ["price_per_unit", "units_sold_monthly", "purchase_frequency", "upsell_per_customer", "cogs_per_unit", "fixed_opex", "marketing_budget", "cac", "startup_investment", "capex", "ltv", "churn_rate"]
            },
            mrr: { type: "number", description: "Monthly Recurring Revenue = P * N" },
            arr: { type: "number", description: "Annual Recurring Revenue = P * N * 12" },
            scenarios: {
              type: "object",
              description: "3 scenario analysis: pessimistic, base, optimistic",
              properties: {
                pessimistic: {
                  type: "object",
                  properties: {
                    revenue: { type: "number" },
                    variable_costs: { type: "number" },
                    fixed_costs: { type: "number" },
                    gross_profit: { type: "number" },
                    net_profit: { type: "number" },
                    gross_margin: { type: "number", description: "As percentage" },
                    net_margin: { type: "number", description: "As percentage" }
                  },
                  required: ["revenue", "variable_costs", "fixed_costs", "gross_profit", "net_profit", "gross_margin", "net_margin"]
                },
                base: {
                  type: "object",
                  properties: {
                    revenue: { type: "number" },
                    variable_costs: { type: "number" },
                    fixed_costs: { type: "number" },
                    gross_profit: { type: "number" },
                    net_profit: { type: "number" },
                    gross_margin: { type: "number" },
                    net_margin: { type: "number" }
                  },
                  required: ["revenue", "variable_costs", "fixed_costs", "gross_profit", "net_profit", "gross_margin", "net_margin"]
                },
                optimistic: {
                  type: "object",
                  properties: {
                    revenue: { type: "number" },
                    variable_costs: { type: "number" },
                    fixed_costs: { type: "number" },
                    gross_profit: { type: "number" },
                    net_profit: { type: "number" },
                    gross_margin: { type: "number" },
                    net_margin: { type: "number" }
                  },
                  required: ["revenue", "variable_costs", "fixed_costs", "gross_profit", "net_profit", "gross_margin", "net_margin"]
                }
              },
              required: ["pessimistic", "base", "optimistic"]
            },
            unit_economics: {
              type: "object",
              properties: {
                contribution_margin: { type: "number", description: "CM = P - C" },
                contribution_margin_ratio: { type: "number", description: "CMR = (P - C) / P as decimal" },
                cac: { type: "number", description: "Customer Acquisition Cost" },
                cac_payback_months: { type: "number", description: "PP = A / CM" },
                ltv: { type: "number", description: "L = (P - C) / H" },
                ltv_cac_ratio: { type: "number", description: "LTV:CAC ratio" }
              },
              required: ["contribution_margin", "contribution_margin_ratio", "cac", "cac_payback_months", "ltv", "ltv_cac_ratio"]
            },
            breakeven: {
              type: "object",
              properties: {
                breakeven_units: { type: "number", description: "N_BE = OPEX / (P - C)" },
                breakeven_revenue: { type: "number", description: "R_BE = N_BE * P" },
                breakeven_months: { type: "number", description: "Months to reach breakeven" }
              },
              required: ["breakeven_units", "breakeven_revenue", "breakeven_months"]
            },
            returns: {
              type: "object",
              properties: {
                payback_period_months: { type: "number", description: "T = I / NP" },
                roi_year_1: { type: "number", description: "ROI = (NP * 12) / I as percentage" },
                roi_year_3: { type: "number", description: "3-year ROI as percentage" },
                npv_3_years: { type: "number", description: "Net Present Value over 3 years" }
              },
              required: ["payback_period_months", "roi_year_1", "roi_year_3", "npv_3_years"]
            },
            startup_investment: {
              type: "object",
              properties: {
                total: { type: "number" },
                breakdown: {
                  type: "object",
                  properties: {
                    rent_deposit: { type: "number" },
                    equipment: { type: "number" },
                    inventory: { type: "number" },
                    legal: { type: "number" },
                    marketing_initial: { type: "number" },
                    working_capital: { type: "number" }
                  },
                  required: ["rent_deposit", "equipment", "inventory", "legal", "marketing_initial", "working_capital"]
                },
                reasoning: { type: "string" }
              },
              required: ["total", "breakdown", "reasoning"]
            },
            monthly_expenses: {
              type: "object",
              properties: {
                total: { type: "number" },
                variable_costs: { type: "number" },
                fixed_costs: { type: "number" },
                breakdown: {
                  type: "object",
                  properties: {
                    rent: { type: "number" },
                    utilities: { type: "number" },
                    salaries: { type: "number" },
                    inventory_replenishment: { type: "number" },
                    marketing: { type: "number" },
                    other: { type: "number" }
                  },
                  required: ["rent", "utilities", "salaries", "inventory_replenishment", "marketing", "other"]
                }
              },
              required: ["total", "variable_costs", "fixed_costs", "breakdown"]
            },
            risk_analysis: {
              type: "object",
              properties: {
                revenue_drop_20: {
                  type: "object",
                  properties: {
                    scenario: { type: "string" },
                    description: { type: "string" },
                    impact_on_revenue: { type: "number" },
                    impact_on_costs: { type: "number" },
                    resulting_profit: { type: "number" },
                    probability: { type: "string", enum: ["низкая", "средняя", "высокая"] }
                  },
                  required: ["scenario", "description", "impact_on_revenue", "impact_on_costs", "resulting_profit", "probability"]
                },
                costs_rise_15: {
                  type: "object",
                  properties: {
                    scenario: { type: "string" },
                    description: { type: "string" },
                    impact_on_revenue: { type: "number" },
                    impact_on_costs: { type: "number" },
                    resulting_profit: { type: "number" },
                    probability: { type: "string", enum: ["низкая", "средняя", "высокая"] }
                  },
                  required: ["scenario", "description", "impact_on_revenue", "impact_on_costs", "resulting_profit", "probability"]
                },
                cac_doubles: {
                  type: "object",
                  properties: {
                    scenario: { type: "string" },
                    description: { type: "string" },
                    impact_on_revenue: { type: "number" },
                    impact_on_costs: { type: "number" },
                    resulting_profit: { type: "number" },
                    probability: { type: "string", enum: ["низкая", "средняя", "высокая"] }
                  },
                  required: ["scenario", "description", "impact_on_revenue", "impact_on_costs", "resulting_profit", "probability"]
                },
                churn_increase: {
                  type: "object",
                  properties: {
                    scenario: { type: "string" },
                    description: { type: "string" },
                    impact_on_revenue: { type: "number" },
                    impact_on_costs: { type: "number" },
                    resulting_profit: { type: "number" },
                    probability: { type: "string", enum: ["низкая", "средняя", "высокая"] }
                  },
                  required: ["scenario", "description", "impact_on_revenue", "impact_on_costs", "resulting_profit", "probability"]
                }
              },
              required: ["revenue_drop_20", "costs_rise_15", "cac_doubles", "churn_increase"]
            },
            calculations_summary: { type: "string", description: "Detailed explanation of all calculations with formulas used" }
          },
          required: ["inputs", "mrr", "arr", "scenarios", "unit_economics", "breakeven", "returns", "startup_investment", "monthly_expenses", "risk_analysis", "calculations_summary"]
        },
        business_plan: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            product_description: { type: "string" },
            target_audience: { type: "string" },
            competitive_advantages: { type: "string" },
            operations: { type: "string" },
            launch_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  duration: { type: "string" },
                  cost: { type: "number" }
                },
                required: ["step", "title", "description", "duration", "cost"]
              }
            },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  probability: { type: "string", enum: ["низкая", "средняя", "высокая"] },
                  impact: { type: "string", enum: ["низкий", "средний", "высокий"] },
                  mitigation: { type: "string" }
                },
                required: ["risk", "probability", "impact", "mitigation"]
              }
            }
          },
          required: ["executive_summary", "product_description", "target_audience", "competitive_advantages", "operations", "launch_steps", "risks"]
        },
        marketing_plan: {
          type: "object",
          properties: {
            positioning: { type: "string" },
            pricing_strategy: { type: "string" },
            channels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  channel: { type: "string" },
                  description: { type: "string" },
                  budget_monthly: { type: "number" },
                  expected_roi: { type: "string" }
                },
                required: ["channel", "description", "budget_monthly", "expected_roi"]
              }
            },
            cac: { type: "number" },
            ltv: { type: "number" },
            first_3_months_plan: { type: "string" }
          },
          required: ["positioning", "pricing_strategy", "channels", "cac", "ltv", "first_3_months_plan"]
        },
        market_analysis: {
          type: "object",
          properties: {
            market_size: {
              type: "object",
              properties: {
                tam: { type: "string" },
                sam: { type: "string" },
                som: { type: "string" }
              },
              required: ["tam", "sam", "som"]
            },
            trends: { type: "array", items: { type: "string" } },
            competition: {
              type: "object",
              properties: {
                main_competitors: { type: "array", items: { type: "string" } },
                competitive_landscape: { type: "string" },
                market_gaps: { type: "string" }
              },
              required: ["main_competitors", "competitive_landscape", "market_gaps"]
            },
            barriers_to_entry: { type: "string" },
            growth_opportunities: { type: "string" }
          },
          required: ["market_size", "trends", "competition", "barriers_to_entry", "growth_opportunities"]
        },
        confidence_score: { type: "number" },
        data_sources: { type: "array", items: { type: "string" } },
        limitations: { type: "array", items: { type: "string" } }
      },
      required: ["financial_analysis", "business_plan", "marketing_plan", "market_analysis", "confidence_score", "data_sources", "limitations"],
      additionalProperties: false
    }
  }
};

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

    const systemPrompt = `Вы — финансовый аналитик с опытом McKinsey/BCG. Используйте УНИВЕРСАЛЬНУЮ СИСТЕМУ ФИНАНСОВОГО АНАЛИЗА.

## ОБЯЗАТЕЛЬНЫЕ ФОРМУЛЫ (применяйте к любому бизнесу):

### ВХОДНЫЕ ПЕРЕМЕННЫЕ (определите для бизнеса):
- P (Price) — цена за единицу/услугу
- N (Units) — количество продаж/клиентов в месяц  
- F (Frequency) — частота покупок
- U (Upsell) — допродажи на клиента
- C (COGS) — себестоимость единицы
- O (OpEx) — фиксированные операционные расходы
- M (Marketing) — маркетинговый бюджет
- A (CAC) — стоимость привлечения клиента
- I (Investment) — стартовые инвестиции
- H (Churn) — отток клиентов (доля)

### ФОРМУЛЫ ВЫРУЧКИ:
- R = P × N × F (базовая выручка)
- R_total = (P + U) × N × F (с допродажами)
- MRR = P × N (ежемесячная повторяющаяся выручка)
- ARR = MRR × 12

### ФОРМУЛЫ ЗАТРАТ:
- VC = C × N (переменные затраты)
- OPEX = O + M (операционные расходы)
- TC = VC + OPEX (общие затраты)

### ФОРМУЛЫ ПРИБЫЛИ:
- GP = R - VC (валовая прибыль)
- GM = GP / R × 100% (валовая маржа)
- NP = R - TC (чистая прибыль)
- NM = NP / R × 100% (чистая маржа)

### UNIT ECONOMICS:
- CM = P - C (маржинальный доход)
- CMR = (P - C) / P (коэффициент маржинального дохода)
- CAC Payback = A / CM (окупаемость CAC в месяцах)
- LTV = (P - C) / H (пожизненная ценность клиента)

### ТОЧКА БЕЗУБЫТОЧНОСТИ:
- N_BE = OPEX / (P - C) (в единицах)
- R_BE = N_BE × P (в деньгах)

### ОКУПАЕМОСТЬ ИНВЕСТИЦИЙ:
- Payback = I / NP (срок окупаемости в месяцах)
- ROI = (NP × 12) / I × 100% (годовой ROI)

## 3 СЦЕНАРИЯ (обязательно):
1. ПЕССИМИСТИЧНЫЙ: N -20%, CAC +30%, маркетинг +50%
2. БАЗОВЫЙ: реалистичные оценки
3. ОПТИМИСТИЧНЫЙ: N +30%, CAC -20%, допродажи +20%

## РИСК-АНАЛИЗ (обязательно с цифрами):
- Что если выручка падает на 20%?
- Что если затраты растут на 15%?
- Что если CAC удваивается?
- Что если отток растет?

Все суммы в рублях (₽). Каждую цифру обосновывайте формулами.
Вы ОБЯЗАНЫ вызвать функцию submit_business_analysis.`;

    const userPrompt = `ВЫЗОВИТЕ функцию submit_business_analysis с ПОЛНЫМ анализом:

ИДЕЯ: ${idea.trim()}
ЛОКАЦИЯ: ${location.trim()}

Примените все формулы. Рассчитайте 3 сценария. Проведите риск-анализ с конкретными цифрами.
Если точных данных по локации нет — используйте средние по России.
ОТКАЗ НЕДОПУСТИМ. Функция ДОЛЖНА быть вызвана.`;

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
        console.error("AI returned text instead of tool call:", textContent.substring(0, 300));
      }
      console.error("No tool call:", JSON.stringify(aiResponse).substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "AI не смог провести анализ. Попробуйте изменить формулировку.", 
          code: "AI_FORMAT_ERROR" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse:", parseError, toolCall.function.arguments?.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Не удалось обработать ответ AI", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!analysisResult.financial_analysis || !analysisResult.business_plan) {
      console.error("Invalid structure:", Object.keys(analysisResult));
      return new Response(
        JSON.stringify({ error: "Неполный анализ от AI", code: "INCOMPLETE_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analysis completed. Confidence: ${analysisResult.confidence_score || 'N/A'}`);

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
            version: "3.0-universal",
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
