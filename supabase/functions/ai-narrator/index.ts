/**
 * AI-NARRATOR EDGE FUNCTION
 * 
 * Extracted microservice from analyze-business monolith
 * Handles all LLM-based narration and content generation
 * 
 * Benefits:
 * - Isolated failure domain (LLM failures don't break calculations)
 * - Independent timeout handling
 * - Can retry/fallback without affecting other services
 * - Easier to swap AI providers
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id, x-fingerprint, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ========== TYPES ==========

export interface NarratorInput {
  businessIdea: string;
  location: string;
  industry: {
    id: string;
    name: string;
    average_check_min: number;
    average_check_max: number;
    cac_min: number;
    cac_max: number;
    net_margin_min: number;
    net_margin_max: number;
    orders_per_client: number;
    client_lifetime_months: number;
  };
  financialInputs?: {
    monthly_revenue?: number;
    startup_investment?: number;
    monthly_costs?: number;
    average_price?: number;
    expected_customers?: number;
    cac?: number;
    churn_rate?: number;
  };
  calculatedMetrics?: {
    mrr: number;
    netProfit: number;
    ltv: number;
    cac: number;
    ltvCacRatio: number;
    paybackMonths: number;
  };
  documents?: Array<{
    name: string;
    type: string;
    parsedContent: string;
  }>;
}

export interface NarratorOutput {
  success: boolean;
  content?: {
    financial_json: string;
    business_json: string;
    marketing_json: string;
    market_json: string;
    confidence: number;
    sources: string;
    limitations: string;
  };
  error?: string;
  usedFallback: boolean;
  model?: string;
  latencyMs: number;
}

// ========== TOOL SCHEMA ==========

const analysisToolSchema = {
  type: "function",
  function: {
    name: "submit_analysis",
    description: "Submit comprehensive business analysis with detailed structured data",
    parameters: {
      type: "object",
      properties: {
        financial_json: { 
          type: "string", 
          description: "JSON with mrr, average_check, orders_monthly, startup_investment, cac, ltv, equipment" 
        },
        business_json: { 
          type: "string", 
          description: "JSON with executive_summary, product_description, target_audience, competitive_advantages, operations, launch_steps, risks" 
        },
        marketing_json: { 
          type: "string", 
          description: "JSON with positioning, pricing_strategy, channels, cac, ltv, first_3_months_plan" 
        },
        market_json: { 
          type: "string", 
          description: "JSON with tam, sam, som, trends, competitors, competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities" 
        },
        confidence: { type: "number", description: "Confidence score 0-100" },
        sources: { type: "string", description: "Comma-separated data sources" },
        limitations: { type: "string", description: "Comma-separated limitations" }
      },
      required: ["financial_json", "business_json", "marketing_json", "market_json", "confidence"]
    }
  }
};

// ========== FALLBACK GENERATOR ==========

function generateFallbackContent(input: NarratorInput): NarratorOutput['content'] {
  const { businessIdea, location, industry, financialInputs, calculatedMetrics } = input;
  
  const mrr = calculatedMetrics?.mrr || financialInputs?.monthly_revenue || 50000;
  const investment = financialInputs?.startup_investment || 100000;
  const cac = calculatedMetrics?.cac || financialInputs?.cac || industry.cac_typical || 60;
  const ltv = calculatedMetrics?.ltv || 500;
  const avgCheck = financialInputs?.average_price || 
    (industry.average_check_min + industry.average_check_max) / 2;

  return {
    financial_json: JSON.stringify({
      mrr,
      average_check: avgCheck,
      orders_monthly: Math.round(mrr / avgCheck),
      startup_investment: investment,
      cac,
      ltv,
      equipment: Math.round(investment * 0.35)
    }),
    business_json: JSON.stringify({
      executive_summary: `This ${industry.name} business in ${location} represents a solid investment opportunity. With projected monthly revenue of $${mrr.toLocaleString()} and an initial investment of $${investment.toLocaleString()}, the business targets the growing demand in the local market. Industry benchmarks indicate net margins of ${industry.net_margin_min}-${industry.net_margin_max}%, suggesting healthy profitability potential when executed well.`,
      product_description: `A ${industry.name.toLowerCase()} offering designed for the ${location} market, delivering value through quality and customer-centric service at an average price point of $${avgCheck}.`,
      target_audience: `Primary customers in ${location} seeking quality ${industry.name.toLowerCase()} solutions. Demographics include value-conscious consumers who prioritize quality and convenience.`,
      competitive_advantages: "1) Customer-centric approach with personalized service. 2) Operational efficiency enabling competitive pricing. 3) Technology-enabled processes. 4) Strong local market knowledge.",
      operations: "The operational model focuses on efficiency and scalability with core operations staff, modern technology stack, and established quality control processes.",
      launch_steps: [
        { step: 1, title: "Market Validation", description: "Validate product-market fit with initial customers", duration: "2-3 weeks", cost: 2000 },
        { step: 2, title: "Legal & Setup", description: "Business registration and permits", duration: "2-4 weeks", cost: 3500 },
        { step: 3, title: "Build Infrastructure", description: "Core product or service setup", duration: "4-8 weeks", cost: Math.round(investment * 0.4) },
        { step: 4, title: "Soft Launch", description: "Beta launch with initial customers", duration: "2-4 weeks", cost: 2500 },
        { step: 5, title: "Marketing Launch", description: "Full marketing campaign activation", duration: "4-6 weeks", cost: Math.round(mrr * 0.2) },
        { step: 6, title: "Scale Operations", description: "Hire team, optimize processes", duration: "ongoing", cost: Math.round(mrr * 0.15) }
      ],
      risks: [
        { risk: "Market Competition", probability: "high", impact: "medium", mitigation: "Focus on differentiation and customer experience excellence" },
        { risk: "Customer Acquisition", probability: "medium", impact: "high", mitigation: "Diversify marketing channels and optimize CAC through testing" },
        { risk: "Cash Flow", probability: "medium", impact: "high", mitigation: "Maintain 3-6 months operating reserves" },
        { risk: "Operational", probability: "low", impact: "medium", mitigation: "Document processes and cross-train team members" }
      ]
    }),
    marketing_json: JSON.stringify({
      positioning: `For customers in ${location} who need reliable ${industry.name.toLowerCase()} solutions, we offer a customer-focused approach that prioritizes quality and convenience.`,
      pricing_strategy: `Pricing targets the $${industry.average_check_min}-$${industry.average_check_max} range, positioning in the quality-value segment with ${industry.net_margin_min}-${industry.net_margin_max}% net margins.`,
      channels: [
        { channel: "Digital Advertising", description: "Google Ads and Meta platforms targeting high-intent keywords", budget_monthly: Math.round(mrr * 0.08), expected_roi: "2.5-3.5x return" },
        { channel: "Content Marketing", description: "SEO-optimized content addressing customer pain points", budget_monthly: Math.round(mrr * 0.04), expected_roi: "5-10x over 12 months" },
        { channel: "Social Media", description: "Community building and engagement on relevant platforms", budget_monthly: Math.round(mrr * 0.03), expected_roi: "3-4x engagement-to-conversion" },
        { channel: "Referral Program", description: "Customer referral incentives for word-of-mouth growth", budget_monthly: Math.round(mrr * 0.03), expected_roi: "5-7x ROI" }
      ],
      cac,
      ltv,
      first_3_months_plan: `Month 1: Soft launch, validate product-market fit, target 20-30 customers. Month 2: Activate paid channels, launch referral program, target 50-70 customers. Month 3: Scale successful channels, optimize underperformers, target 100+ customers.`
    }),
    market_json: JSON.stringify({
      tam: `The ${industry.name} market globally represents multi-billion dollar opportunity with consistent growth.`,
      sam: `The ${location} market and surrounding regions represent $50-200M in annual spending.`,
      som: `Realistic first-year target of $${(mrr * 12).toLocaleString()} based on capacity and market penetration assumptions.`,
      trends: [
        "Digital transformation driving customer expectations for convenience",
        "Growing preference for local, trusted service providers",
        "Increased focus on customer experience as key differentiator"
      ],
      competitors: [
        { name: "Established Local Provider", strengths: "Market presence, relationships", weaknesses: "Outdated operations" },
        { name: "National Chain", strengths: "Brand recognition, resources", weaknesses: "Impersonal service" },
        { name: "Emerging Competitors", strengths: "Fresh approach", weaknesses: "Limited track record" }
      ],
      competitive_landscape: `The ${industry.name} market in ${location} is moderately competitive with opportunities for differentiated offerings.`,
      market_gaps: "Underserved segments include busy professionals and digitally-savvy consumers expecting modern service delivery.",
      barriers_to_entry: `Initial capital of $${investment.toLocaleString()}, time to build reputation, and competitive response.`,
      growth_opportunities: `Geographic expansion within ${location} region, service extensions, and strategic partnerships.`
    }),
    sources: "Industry benchmarks, market analysis, location intelligence",
    limitations: "Analysis based on industry averages; results may vary based on execution",
    confidence: 70
  };
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const input: NarratorInput = await req.json();
    
    // Validate required fields
    if (!input.businessIdea || !input.location) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "businessIdea and location are required",
          usedFallback: false,
          latencyMs: Date.now() - startTime
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.log("LOVABLE_API_KEY not found, using fallback");
      const fallbackContent = generateFallbackContent(input);
      return new Response(
        JSON.stringify({
          success: true,
          content: fallbackContent,
          usedFallback: true,
          model: "deterministic-fallback",
          latencyMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the prompt
    const userFinancialContext = input.financialInputs ? `
## USER-PROVIDED FINANCIAL DATA
${input.financialInputs.monthly_revenue ? `- Monthly Revenue: $${input.financialInputs.monthly_revenue.toLocaleString()}` : ''}
${input.financialInputs.startup_investment ? `- Initial Investment: $${input.financialInputs.startup_investment.toLocaleString()}` : ''}
${input.financialInputs.monthly_costs ? `- Monthly Operating Costs: $${input.financialInputs.monthly_costs.toLocaleString()}` : ''}
` : '';

    const calculatedContext = input.calculatedMetrics ? `
## CALCULATED METRICS (FROM FINANCIAL ENGINE)
- MRR: $${input.calculatedMetrics.mrr.toLocaleString()}
- Net Profit: $${input.calculatedMetrics.netProfit.toLocaleString()}
- LTV: $${input.calculatedMetrics.ltv.toLocaleString()}
- CAC: $${input.calculatedMetrics.cac}
- LTV:CAC Ratio: ${input.calculatedMetrics.ltvCacRatio}x
- Payback: ${input.calculatedMetrics.paybackMonths} months
` : '';

    const prompt = `You are a Senior Partner at a top-tier consulting firm analyzing a business opportunity.

## BUSINESS IDEA
${input.businessIdea}

## LOCATION
${input.location}

## INDUSTRY: ${input.industry.name}
${userFinancialContext}${calculatedContext}

## INDUSTRY BENCHMARKS
- Average Transaction: $${input.industry.average_check_min} - $${input.industry.average_check_max}
- Customer Acquisition Cost: $${input.industry.cac_min} - $${input.industry.cac_max}
- Net Margin Range: ${input.industry.net_margin_min}% - ${input.industry.net_margin_max}%
- Client Lifetime: ${input.industry.client_lifetime_months} months

Provide comprehensive, actionable analysis. Call submit_analysis with all sections in English.`;

    // Make AI request with fast timeout to prevent client disconnection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for fast fallback

    try {
      console.log("Making AI narrator request...");
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [{ role: "user", content: prompt }],
          tools: [analysisToolSchema],
          tool_choice: { type: "function", function: { name: "submit_analysis" } },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI error: ${response.status} - ${errorText}`);
        
        // Use fallback for non-auth errors
        if (response.status !== 401 && response.status !== 403) {
          const fallbackContent = generateFallbackContent(input);
          return new Response(
            JSON.stringify({
              success: true,
              content: fallbackContent,
              usedFallback: true,
              model: "deterministic-fallback",
              error: `AI returned ${response.status}`,
              latencyMs: Date.now() - startTime
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `AI service error: ${response.status}`,
            usedFallback: false,
            latencyMs: Date.now() - startTime
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await response.json();
      const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall) {
        console.log("No tool call in AI response, using fallback");
        const fallbackContent = generateFallbackContent(input);
        return new Response(
          JSON.stringify({
            success: true,
            content: fallbackContent,
            usedFallback: true,
            model: "deterministic-fallback",
            latencyMs: Date.now() - startTime
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const content = JSON.parse(toolCall.function.arguments);
      console.log(`AI narrator succeeded in ${Date.now() - startTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          content,
          usedFallback: false,
          model: "openai/gpt-5-mini",
          latencyMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      console.error(`AI fetch error: ${errorMessage}`);
      
      // Use fallback for timeout and network errors
      const fallbackContent = generateFallbackContent(input);
      return new Response(
        JSON.stringify({
          success: true,
          content: fallbackContent,
          usedFallback: true,
          model: "deterministic-fallback",
          error: errorMessage.includes('abort') ? 'Timeout after 45s' : errorMessage,
          latencyMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    console.error("Narrator error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        usedFallback: false,
        latencyMs: Date.now() - startTime
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
