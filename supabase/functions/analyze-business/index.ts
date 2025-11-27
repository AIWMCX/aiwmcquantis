import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalysisRequest {
  idea: string;
  location: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
Ваша задача — провести глубокий, реалистичный анализ бизнес-идеи с конкретными цифрами и обоснованиями.

КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:
1. Все суммы в российских рублях (₽)
2. Каждую цифру обоснуйте конкретными расчетами
3. Будьте консервативны в оценках — лучше занизить, чем завысить
4. Используйте реальные рыночные данные для указанной локации
5. Формат ответа — СТРОГО JSON без markdown`;

    const userPrompt = `Проанализируйте бизнес-идею:

ИДЕЯ: ${idea.trim()}
ЛОКАЦИЯ: ${location.trim()}

Верните ТОЛЬКО валидный JSON (без markdown) в следующем формате:
{
  "financial_analysis": {
    "startup_investment": {
      "total": число,
      "breakdown": {
        "rent_deposit": число,
        "equipment": число,
        "inventory": число,
        "legal": число,
        "marketing_initial": число,
        "working_capital": число
      },
      "reasoning": "детальное обоснование каждой статьи расходов"
    },
    "monthly_revenue": {
      "conservative": число,
      "realistic": число,
      "optimistic": число,
      "reasoning": "расчет: количество клиентов × средний чек × частота покупок"
    },
    "monthly_expenses": {
      "total": число,
      "breakdown": {
        "rent": число,
        "utilities": число,
        "salaries": число,
        "inventory_replenishment": число,
        "marketing": число,
        "other": число
      },
      "reasoning": "обоснование каждой статьи"
    },
    "monthly_profit": число,
    "payback_period_months": число,
    "break_even_months": число,
    "roi_year_1": число
  },
  "business_plan": {
    "executive_summary": "краткое описание бизнеса в 2-3 абзацах",
    "product_description": "что именно продаем/предоставляем",
    "target_audience": "кто клиент, их характеристики, объем аудитории",
    "competitive_advantages": "почему клиенты выберут нас",
    "operations": "как работает бизнес день за днем",
    "launch_steps": [
      {"step": 1, "title": "название", "description": "что делать", "duration": "сроки", "cost": число},
      {"step": 2, "title": "название", "description": "что делать", "duration": "сроки", "cost": число}
    ],
    "risks": [
      {"risk": "описание", "probability": "низкая|средняя|высокая", "impact": "низкий|средний|высокий", "mitigation": "как минимизировать"}
    ]
  },
  "marketing_plan": {
    "positioning": "как позиционируем продукт",
    "pricing_strategy": "стратегия ценообразования с обоснованием",
    "channels": [
      {"channel": "название", "description": "как использовать", "budget_monthly": число, "expected_roi": "описание"}
    ],
    "cac": число,
    "ltv": число,
    "first_3_months_plan": "конкретный план действий по месяцам"
  },
  "market_analysis": {
    "market_size": {
      "tam": "общий объем рынка",
      "sam": "доступный рынок",
      "som": "захватываемый рынок в первый год"
    },
    "trends": ["тренд 1", "тренд 2", "тренд 3"],
    "competition": {
      "main_competitors": ["конкурент 1", "конкурент 2"],
      "competitive_landscape": "анализ конкуренции",
      "market_gaps": "незанятые ниши"
    },
    "barriers_to_entry": "барьеры входа на рынок",
    "growth_opportunities": "возможности масштабирования"
  },
  "confidence_score": число от 0 до 100,
  "data_sources": ["источник 1", "источник 2"],
  "limitations": ["ограничение 1", "ограничение 2"]
}`;

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
        temperature: 0.7,
        max_tokens: 8000,
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
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty AI response");
      return new Response(
        JSON.stringify({ error: "Пустой ответ от AI", code: "AI_EMPTY_RESPONSE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from AI response (handle potential markdown wrapping)
    let analysisResult;
    try {
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      analysisResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      return new Response(
        JSON.stringify({ error: "Не удалось обработать ответ AI", code: "PARSE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!analysisResult.financial_analysis || !analysisResult.business_plan) {
      console.error("Invalid AI response structure");
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
            version: "2.0",
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
