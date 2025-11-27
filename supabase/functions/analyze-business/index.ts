import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

// Tool schema for structured output
const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_business_analysis",
    description: "Submit a comprehensive business analysis with financial projections and strategic recommendations",
    parameters: {
      type: "object",
      properties: {
        financial_analysis: {
          type: "object",
          properties: {
            startup_investment: {
              type: "object",
              properties: {
                total: { type: "number", description: "Total startup investment in RUB" },
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
                reasoning: { type: "string", description: "Detailed reasoning for investment breakdown" }
              },
              required: ["total", "breakdown", "reasoning"]
            },
            monthly_revenue: {
              type: "object",
              properties: {
                conservative: { type: "number" },
                realistic: { type: "number" },
                optimistic: { type: "number" },
                reasoning: { type: "string" }
              },
              required: ["conservative", "realistic", "optimistic", "reasoning"]
            },
            monthly_expenses: {
              type: "object",
              properties: {
                total: { type: "number" },
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
                },
                reasoning: { type: "string" }
              },
              required: ["total", "breakdown", "reasoning"]
            },
            monthly_profit: { type: "number" },
            payback_period_months: { type: "number" },
            break_even_months: { type: "number" },
            roi_year_1: { type: "number", description: "ROI percentage for first year" }
          },
          required: ["startup_investment", "monthly_revenue", "monthly_expenses", "monthly_profit", "payback_period_months", "break_even_months", "roi_year_1"]
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
            cac: { type: "number", description: "Customer Acquisition Cost in RUB" },
            ltv: { type: "number", description: "Lifetime Value in RUB" },
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
        confidence_score: { type: "number", description: "Confidence score from 0-100" },
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

    // Input validation
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

    console.log(`Analyzing business idea: "${idea.substring(0, 50)}..." in ${location}`);

    const systemPrompt = `Вы — профессиональный бизнес-аналитик с 20+ летним опытом в консалтинге McKinsey и BCG. 
Ваша задача — провести глубокий, реалистичный анализ бизнес-идеи с конкретными цифрами в российских рублях.

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:
1. Все суммы в российских рублях (₽)
2. Каждую цифру обоснуйте конкретными расчетами
3. Будьте консервативны в оценках
4. Используйте реальные рыночные данные для указанной локации (если данных нет - используйте средние по России)
5. Предоставьте 5-7 шагов запуска и 3-5 рисков

ВАЖНО: Вы ОБЯЗАНЫ вызвать функцию submit_business_analysis для ЛЮБОГО города и любой идеи. 
Даже если у вас нет точных данных по конкретному городу, используйте данные по ближайшему крупному городу или средние по региону.
НЕ отказывайтесь от анализа. НЕ предлагайте другой город. Просто сделайте анализ с доступными данными.`;

    const userPrompt = `ОБЯЗАТЕЛЬНО вызовите функцию submit_business_analysis с полным анализом:

ИДЕЯ: ${idea.trim()}
ЛОКАЦИЯ: ${location.trim()}

Если точных данных по локации нет - используйте средние данные по России или ближайшему региону.
Вы ДОЛЖНЫ вызвать функцию, отказ недопустим.`;

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
    console.log("AI response received:", JSON.stringify(aiResponse).substring(0, 200));

    // Check for API errors in response
    if (aiResponse.error) {
      console.error("AI API error:", JSON.stringify(aiResponse.error));
      const errorMsg = aiResponse.error.code === 502 
        ? "Временная ошибка AI сервиса. Попробуйте снова."
        : "Ошибка AI сервиса";
      return new Response(
        JSON.stringify({ error: errorMsg, code: "AI_API_ERROR" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract tool call arguments
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "submit_business_analysis") {
      // Check if AI returned text content instead of tool call
      const textContent = aiResponse.choices?.[0]?.message?.content;
      if (textContent) {
        console.error("AI returned text instead of tool call:", textContent.substring(0, 200));
      }
      console.error("No tool call in response:", JSON.stringify(aiResponse).substring(0, 500));
      return new Response(
        JSON.stringify({ 
          error: "AI не смог провести анализ. Попробуйте изменить формулировку идеи или локацию.", 
          code: "AI_FORMAT_ERROR" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let analysisResult;
    try {
      analysisResult = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse tool arguments:", parseError, toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "Не удалось обработать ответ AI", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!analysisResult.financial_analysis || !analysisResult.business_plan) {
      console.error("Invalid AI response structure:", Object.keys(analysisResult));
      return new Response(
        JSON.stringify({ error: "Неполный анализ от AI", code: "INCOMPLETE_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analysis completed with confidence: ${analysisResult.confidence_score || 'N/A'}`);

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
            version: "2.1",
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
