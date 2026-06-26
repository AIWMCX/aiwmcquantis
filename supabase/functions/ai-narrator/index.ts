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
 * 
 * MASTER PROMPT v2 — 30-Day Accuracy Lockdown
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeadersFor } from "../_shared/cors.ts";

import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { aiCall } from '../_shared/llm-call.ts';
import {
  CANONICAL_DATA_SOURCES_PROMPT,
  canonicalDataSourcesAsStrings,
  mergeCanonicalDataSources,
} from '../_shared/canonical-data-sources.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'ai-narrator';
const FUNCTION_VERSION = '1.0.0';

// ========== SHARED MASTER PROMPT DIRECTIVES ==========
// Kept in sync with narrator-prompt.ts MASTER_PROMPT_DIRECTIVES

const MASTER_PROMPT_DIRECTIVES = `
## IDENTITY & ROLE

You are AIWMC Quantis — a Senior FP&A Director and industry consultant.
No buzzwords, no hand-waving. Every insight must be traceable to explicit assumptions.

## ASSUMPTIONS-FIRST RULE

Before any qualitative commentary, populate assumptions_panel_json listing every high-impact assumption:
- assumption: Human-readable description.
- category: "demand" | "pricing" | "cost" | "capacity" | "financing" | "other".
- source: "user_input" | "benchmark_placeholder" | "derived_from_user".
- sensitivity: "HIGH" | "MEDIUM" | "LOW".
- impact: What it moves (e.g., "affects payback and runway").

Your narrative MUST be consistent with these assumptions.

## DATA QUALITY TRANSPARENCY

Populate data_quality_json with honest assessment:
- completeness_pct (0-100), consistency_score (1-5), assumption_load ("LOW"/"MEDIUM"/"HIGH"),
  volatility_rating ("LOW"/"MEDIUM"/"HIGH"), overall_label ("DATA_INFORMED"/"ASSUMPTION_HEAVY"/"EXPLORATORY"), notes (1-2 sentences).

## NO HIDDEN BENCHMARKS

When referencing industry ranges, label them as "reference range, not a prediction" and show percentile positioning where possible.

## INDUSTRY-SPECIFIC REVENUE LOGIC

Use correct revenue archetype per business type:
- Coffee shop/Restaurant: covers × ticket × operating days
- SaaS: subs × ARPU, churn-driven
- Ecommerce: sessions × conversion × AOV
- Consulting/Agency: billable hours × rate × utilization
- Fitness: memberships + class passes, occupancy
- Real estate: units × occupancy × rent

## EXPLICIT VIABILITY VERDICTS

Use: VIABLE (positive unit economics, payback ≤ 24mo), MARGINALLY VIABLE (borderline, payback 24-48mo),
HIGH-RISK (weak unit economics, top/bottom 10% assumptions), NOT VIABLE (negative unit economics under stress).

## TRACEABILITY CONTRACT

For every major metric, point to the underlying formula and inputs. If you cannot, mark as "illustrative only."

## 30-DAY ACCURACY LOCKDOWN

Under-promise on weak inputs. Mark assumption-heavy sections explicitly. Prefer ranges over point estimates.
`;

// ========== TIER FIREWALL (QOC-ECON v1.0 §4.5) ==========
// Server-side bind tier→model. The request's `tier` is set by QOC's narrate
// adapter from the server-resolved plan (DB truth) — never client-claimed.
// Any client-supplied `model` field is IGNORED. This makes a Free run
// structurally incapable of reaching a premium model (the 50x cost spike fix).
type NarrationTier = "deepseek" | "haiku" | "sonnet" | "opus";
const TIER_TO_MODEL: Record<NarrationTier, string> = {
  deepseek: "google/gemini-2.5-flash-lite", // free tier — cheapest
  haiku:    "google/gemini-2.5-flash",      // plus baseline
  sonnet:   "openai/gpt-5-mini",            // pro narration (current default)
  opus:     "openai/gpt-5",                 // adversarial / Plus validation
};
function resolveTierModel(rawTier: unknown): { tier: NarrationTier; model: string } {
  const t = String(rawTier ?? "sonnet").toLowerCase() as NarrationTier;
  const tier: NarrationTier = (t in TIER_TO_MODEL) ? t : "sonnet";
  return { tier, model: TIER_TO_MODEL[tier] };
}

// ========== DYNAMIC TOKEN CAPS (QOC confidence-gated) ==========
// Fewer input fields → simpler analysis → fewer output tokens needed.
// Saves 30-50% on simple requests without affecting complex ones.
type ConfidenceBand = "very_high" | "high" | "medium" | "low" | "very_low";
function resolveMaxTokens(confidenceBand?: string, fieldsPresent?: number): number {
  const band = (confidenceBand ?? "medium") as ConfidenceBand;
  const fields = fieldsPresent ?? 5;
  if (band === "very_high" || fields >= 8) return 4096;
  if (band === "high" || fields >= 6) return 3500;
  if (band === "medium" || fields >= 4) return 3000;
  if (band === "low") return 2000;
  return 1500; // very_low — minimal inputs, cap output tightly
}

// Enable extended thinking only for the hardest cases (opus + weak inputs).
function shouldEnableThinking(tier: NarrationTier, confidenceBand?: string): boolean {
  return tier === "opus" && (confidenceBand === "very_low" || confidenceBand === "low");
}

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
    assumptions_panel_json?: string;
    data_quality_json?: string;
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
    description: "Submit comprehensive business analysis with detailed structured data. You are a narrator — all financial data comes from the engine. Explain, contextualize, and recommend.",
    parameters: {
      type: "object",
      properties: {
        financial_json: { 
          type: "string", 
          description: "JSON with mrr, average_check, orders_monthly, startup_investment, cac, ltv, equipment" 
        },
        business_json: { 
          type: "string", 
          description: "JSON with executive_summary (include viability verdict), product_description, target_audience, competitive_advantages, operations, launch_steps, risks" 
        },
        marketing_json: { 
          type: "string", 
          description: "JSON with positioning, pricing_strategy, channels, cac, ltv, first_3_months_plan" 
        },
        market_json: { 
          type: "string", 
          description: "JSON: tam (dollar value with derivation methodology, e.g. '$2.4B — US specialty coffee market'), sam (narrowed by geography with dollar value), som (capacity-constrained dollar value tied to user's unit economics), trends array (industry+location specific — NO generic phrases like 'Digital transformation'), competitors array (name, strengths, weaknesses — specific to location/industry, NO placeholders), competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities. Every field MUST be specific to the business idea, industry, and location." 
        },
        assumptions_panel_json: {
          type: "string",
          description: "JSON array of {assumption, category, source, sensitivity, impact}. Every high-impact assumption must be declared."
        },
        data_quality_json: {
          type: "string",
          description: "JSON with {completeness_pct, consistency_score, assumption_load, volatility_rating, overall_label, notes}."
        },
        confidence: { type: "number", description: "Confidence score 0-100. Must be consistent with data_quality_json." },
        sources: { type: "string", description: "Comma-separated data sources with attribution" },
        limitations: { type: "string", description: "Comma-separated limitations and caveats" }
      },
      required: ["financial_json", "business_json", "marketing_json", "market_json", "assumptions_panel_json", "data_quality_json", "confidence"]
    }
  }
};

// ========== FALLBACK GENERATOR ==========

function generateFallbackContent(input: NarratorInput): NarratorOutput['content'] {
  const { businessIdea, location, industry, financialInputs, calculatedMetrics } = input;
  
  const mrr = calculatedMetrics?.mrr || financialInputs?.monthly_revenue || 50000;
  const investment = financialInputs?.startup_investment || 100000;
  const cac = calculatedMetrics?.cac || financialInputs?.cac || ((industry.cac_min + industry.cac_max) / 2) || 60;
  const ltv = calculatedMetrics?.ltv || 500;
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
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
      executive_summary: `This ${industry.name} business in ${location} is under EXPLORATORY analysis — most inputs are benchmark-derived placeholders. With projected monthly revenue of $${mrr.toLocaleString()} and an initial investment of $${investment.toLocaleString()}, the business targets the local market. Industry benchmarks indicate net margins of ${industry.net_margin_min}-${industry.net_margin_max}% (reference range, not a prediction). This analysis is heavily assumption-based and should be validated with real operational data before making financial commitments.`,
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
      pricing_strategy: `Pricing targets the $${industry.average_check_min}-$${industry.average_check_max} range (industry reference range), positioning in the quality-value segment with ${industry.net_margin_min}-${industry.net_margin_max}% net margins.`,
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
      tam: `Estimated TAM: $${((mrr * 12 * 500) / 1e6).toFixed(1)}M — derived from ${industry.name} revenue potential × 500x market multiplier for ${location}. Benchmark-derived estimate requiring validation with actual market research.`,
      sam: `Estimated SAM: $${((mrr * 12 * 50) / 1e6).toFixed(1)}M — ${industry.name} serviceable market in ${location}, narrowed from TAM by geography and business format.`,
      som: `SOM: $${(mrr * 12).toLocaleString()} — first-year revenue target based on capacity and unit economics at $${industry.average_check_min}-$${industry.average_check_max} average transaction range.`,
      trends: [
        `${industry.name} demand patterns in ${location} — requires local market validation`,
        `Labor and operational cost trends for ${industry.name} in ${location}`,
        `Customer acquisition dynamics in the ${location} ${industry.name} market`,
      ],
      competitors: [
        { name: `Direct ${industry.name} competitors in ${location}`, strengths: "Established customer base and local reputation", weaknesses: "Specific competitive data requires market research" },
      ],
      competitive_landscape: `The ${industry.name} market in ${location} — specific competitive data not available without market research. Requires validation with local surveys or industry reports.`,
      market_gaps: `Potential gaps in the ${location} ${industry.name} market — requires primary research (customer interviews, competitor audits) to validate.`,
      barriers_to_entry: `Initial capital of $${investment.toLocaleString()}, customer acquisition costs (CAC: $${cac}), and time to build reputation in ${location}.`,
      growth_opportunities: `Scale ${industry.name} operations in ${location} based on validated unit economics (current LTV:CAC ${ltvCacRatio.toFixed(1)}x).`,
    }),
    assumptions_panel_json: JSON.stringify([
      { assumption: `Monthly revenue of $${mrr.toLocaleString()} based on industry benchmark average`, category: 'demand', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Directly affects all profitability and payback metrics' },
      { assumption: `CAC of $${cac} from industry range $${industry.cac_min}-$${industry.cac_max}`, category: 'cost', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Affects LTV:CAC ratio and unit economics viability' },
      { assumption: `Net margin ${industry.net_margin_min}-${industry.net_margin_max}% (industry reference range)`, category: 'pricing', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Affects profitability timeline' },
      { assumption: `Initial investment of $${investment.toLocaleString()}`, category: 'financing', source: 'benchmark_placeholder', sensitivity: 'MEDIUM', impact: 'Affects payback period and ROI' },
      { assumption: `Customer lifetime of ${industry.client_lifetime_months} months`, category: 'demand', source: 'benchmark_placeholder', sensitivity: 'MEDIUM', impact: 'Affects LTV calculations' },
    ]),
    data_quality_json: JSON.stringify({
      completeness_pct: 20,
      consistency_score: 3,
      assumption_load: 'HIGH',
      volatility_rating: 'MEDIUM',
      overall_label: 'EXPLORATORY',
      notes: 'Fallback mode: upstream model response incomplete. Most metrics are benchmark-derived placeholders. Outputs are illustrative only and must not be used for final decisions.',
    }),
    sources: canonicalDataSourcesAsStrings().join('; '),
    limitations: "Analysis based on industry averages (benchmark placeholders); results are illustrative and may vary significantly based on execution and real-world data",
    confidence: 45
  };
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('ai-narrator', reqId);

  // Per-request CORS headers (origin allowlist — see _shared/cors.ts).
  const corsHeaders = corsHeadersFor(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // deno-lint-ignore no-explicit-any
    const body: any = await req.json();
    const input: NarratorInput = body;
    // Tier firewall: pull `tier` from request (set by QOC), never trust `model`.
    const { tier, model: firewalledModel } = resolveTierModel(body?.tier);
    log.info(`Tier firewall: tier=${tier} → model=${firewalledModel}`);

    // ── Model-binding assertion: reject if client-supplied model ≠ tier-derived ──
    // A mismatch means either a spoofed request or a misconfigured client.
    // Block the request and log a SECURITY audit event.
    const clientModel = body?.model;
    if (clientModel && typeof clientModel === "string" && clientModel !== firewalledModel) {
      log.error(`SECURITY AUDIT: tier-model mismatch — client sent model="${clientModel}" but tier="${tier}" resolves to "${firewalledModel}". Request blocked.`);
      // Best-effort audit write (non-blocking)
      try {
        const sbUrl = Deno.env.get("SUPABASE_URL");
        const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (sbUrl && sbKey) {
          fetch(`${sbUrl}/rest/v1/qoc_audit`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "authorization": `Bearer ${sbKey}`,
              "apikey": sbKey,
              "prefer": "return=minimal",
            },
            body: JSON.stringify({
              request_id: `sec-${crypto.randomUUID()}`,
              report_id: "SECURITY_MODEL_MISMATCH",
              overall_verdict: "HARD_BLOCK",
              total_cost_usd: 0,
              total_duration_ms: 0,
              traces: JSON.stringify([{
                stage: "narrate",
                verdict: "HARD_BLOCK",
                cost_usd: 0,
                duration_ms: 0,
                detail: {
                  event: "SECURITY_MODEL_MISMATCH",
                  client_model: clientModel,
                  expected_model: firewalledModel,
                  tier,
                },
                notes: ["Blocked: client-provided model does not match tier-derived binding."],
              }]),
            }),
          }).catch(() => {});
        }
      } catch { /* audit is best-effort */ }
      return new Response(
        JSON.stringify({
          success: false,
          error: "MODEL_MISMATCH: client-provided model does not match tier binding. This incident has been logged.",
          usedFallback: false,
          latencyMs: Date.now() - startTime,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      log.info("LOVABLE_API_KEY not found, using fallback");
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

    // ── QOC confidence signals for dynamic token caps ──
    const confidenceBand = body?.confidence_band as string | undefined;
    const fieldsPresent = typeof body?.fields_present === "number" ? body.fields_present : undefined;
    const maxTokens = resolveMaxTokens(confidenceBand, fieldsPresent);
    const useThinking = shouldEnableThinking(tier, confidenceBand);
    log.info(`Dynamic caps: confidence=${confidenceBand ?? "unknown"} fields=${fieldsPresent ?? "?"} max_tokens=${maxTokens} thinking=${useThinking}`);

    // ── Build the prompt ──
    // CACHE OPTIMIZATION: static directives go in the system message (identical
    // across all requests → provider-side prefix caching at 10-25% input cost).
    // Variable per-request data goes in the user message.
    const systemPrompt = `${MASTER_PROMPT_DIRECTIVES}\n\n${CANONICAL_DATA_SOURCES_PROMPT}`;

    const userFinancialContext = input.financialInputs ? `
## USER-PROVIDED FINANCIAL DATA
${input.financialInputs.monthly_revenue ? `- Monthly Revenue: $${input.financialInputs.monthly_revenue.toLocaleString()}` : ''}
${input.financialInputs.startup_investment ? `- Initial Investment: $${input.financialInputs.startup_investment.toLocaleString()}` : ''}
${input.financialInputs.monthly_costs ? `- Monthly Operating Costs: $${input.financialInputs.monthly_costs.toLocaleString()}` : ''}
` : '';

    const calculatedContext = input.calculatedMetrics ? `
## CALCULATED METRICS (FROM FINANCIAL ENGINE — USE THESE EXACT NUMBERS)
- MRR: $${input.calculatedMetrics.mrr.toLocaleString()}
- Net Profit: $${input.calculatedMetrics.netProfit.toLocaleString()}
- LTV: $${input.calculatedMetrics.ltv.toLocaleString()}
- CAC: $${input.calculatedMetrics.cac}
- LTV:CAC Ratio: ${input.calculatedMetrics.ltvCacRatio}x
- Payback: ${input.calculatedMetrics.paybackMonths} months
` : '';

    const userPrompt = `## BUSINESS IDEA
${input.businessIdea}

## LOCATION
${input.location}

## INDUSTRY: ${input.industry.name}
${userFinancialContext}${calculatedContext}

## INDUSTRY BENCHMARKS (reference ranges, not predictions)
- Average Transaction: $${input.industry.average_check_min} - $${input.industry.average_check_max}
- Customer Acquisition Cost: $${input.industry.cac_min} - $${input.industry.cac_max}
- Net Margin Range: ${input.industry.net_margin_min}% - ${input.industry.net_margin_max}%
- Client Lifetime: ${input.industry.client_lifetime_months} months

Provide comprehensive, actionable analysis. Use the correct industry archetype for revenue logic. Position metrics against industry percentiles where possible. Include viability verdict (VIABLE/MARGINALLY VIABLE/HIGH-RISK/NOT VIABLE). Declare all assumptions and rate data quality honestly. Call submit_analysis with all sections in English.`;

    try {
      log.info("Making AI narrator request...");

      // deno-lint-ignore no-explicit-any
      const requestBody: any = {
        model: firewalledModel, // QOC tier firewall — bound server-side
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        tools: [analysisToolSchema],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      };
      // Conditional thinking for hardest cases (opus + weak inputs)
      if (useThinking) {
        requestBody.thinking = { type: "enabled" };
      }

      const aiResult = await aiCall(
        requestBody,
        {
          task: 'ai-narrator',
          timeoutMs: useThinking ? 40_000 : 25_000,
          metadata: {
            industry: input.industry?.name,
            tier,
            model: firewalledModel,
            max_tokens: maxTokens,
            confidence_band: confidenceBand,
            thinking_enabled: useThinking,
          },
        },
      );

      if (!aiResult.ok) {
        log.error(`AI error: ${aiResult.status} - ${aiResult.error}`);
        // Use fallback for non-config errors
        if (aiResult.error !== 'CONFIG') {
          const fallbackContent = generateFallbackContent(input);
          return new Response(
            JSON.stringify({
              success: true,
              content: fallbackContent,
              usedFallback: true,
              model: "deterministic-fallback",
              error: aiResult.message,
              latencyMs: Date.now() - startTime
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: aiResult.message,
            usedFallback: false,
            latencyMs: Date.now() - startTime
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const choices = aiResult.data.choices as Array<{ message?: { tool_calls?: Array<{ function: { arguments: string } }> } }> | undefined;
      const toolCall = choices?.[0]?.message?.tool_calls?.[0];

      if (!toolCall) {
        log.info("No tool call in AI response, using fallback");
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
      // Force canonical provenance into the sources field (merge, dedup).
      const merged = mergeCanonicalDataSources(
        typeof content.sources === 'string'
          ? content.sources.split(/[,;]\s*/).filter(Boolean)
          : [],
      );
      content.sources = merged.join('; ');
      log.info(`AI narrator succeeded in ${Date.now() - startTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          content,
          usedFallback: false,
          model: firewalledModel,
          tier,
          latencyMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
      log.error(`AI fetch error: ${errorMessage}`);
      const fallbackContent = generateFallbackContent(input);
      return new Response(
        JSON.stringify({
          success: true,
          content: fallbackContent,
          usedFallback: true,
          model: "deterministic-fallback",
          error: errorMessage,
          latencyMs: Date.now() - startTime
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err) {
    log.error("Narrator error:", err);
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
