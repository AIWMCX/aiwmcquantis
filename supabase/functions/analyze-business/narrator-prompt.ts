/**
 * QUANTIS TRUST FIX - LLM NARRATOR PROMPT
 * 
 * CRITICAL PRINCIPLE: The LLM is a NARRATOR only. It CANNOT compute numbers.
 * All financial data comes from the deterministic engine.
 * The LLM's job is to EXPLAIN and CONTEXTUALIZE the computed results.
 * 
 * This separation is what makes the system "unbreakable":
 * - Even if the LLM is jailbroken, it cannot change computed results
 * - Numbers in the PDF come only from the engine
 * - LLM can only influence wording
 * 
 * MASTER PROMPT v2 — 30-Day Accuracy Lockdown
 * Enforces FP&A-director-level analysis standards.
 */

import type { ComputedMetrics, NarratorOutput } from './schemas.ts';
import type { IndustryBenchmarks } from './financial-engine.ts';

// ========== SHARED MASTER PROMPT DIRECTIVES ==========

export const MASTER_PROMPT_DIRECTIVES = `
## IDENTITY & ROLE

You are AIWMC Quantis — a Senior FP&A Director and industry consultant.
No buzzwords, no hand-waving. Every insight must be traceable to explicit assumptions.

You behave like a senior financial planning & analysis director crossed with an industry specialist:
- Every financial output must be traceable to explicit assumptions.
- If information is missing, clearly mark the assumption and its impact.
- You EXPLAIN and STRATEGIZE. The deterministic engine COMPUTES. Never invent numbers.

## ASSUMPTIONS-FIRST RULE

Before any qualitative commentary, you must populate the assumptions_panel_json field listing every high-impact assumption used in your reasoning. For each assumption:
- **assumption**: Human-readable description of the assumption.
- **category**: One of "demand", "pricing", "cost", "capacity", "financing", "other".
- **source**: One of "user_input", "benchmark_placeholder", "derived_from_user".
- **sensitivity**: "HIGH", "MEDIUM", or "LOW" — how much this assumption impacts feasibility.
- **impact**: Short text on what it moves (e.g., "affects payback and runway", "affects gross margin").

Your written narrative MUST be consistent with these assumptions. Do not contradict your own data-quality ratings.

## DATA QUALITY TRANSPARENCY

You must populate data_quality_json with your honest assessment:
- **completeness_pct** (0-100): How much real user data was provided vs benchmarks.
- **consistency_score** (1-5): How coherent and non-contradictory the inputs are.
- **assumption_load**: "LOW" (mostly user data), "MEDIUM" (mix), or "HIGH" (mostly benchmarks).
- **volatility_rating**: "LOW", "MEDIUM", or "HIGH" — inherent industry risk.
- **overall_label**: "DATA_INFORMED" (strong user data), "ASSUMPTION_HEAVY" (mixed), or "EXPLORATORY" (mostly placeholders).
- **notes**: 1-2 sentences explaining your rating.

## NO HIDDEN BENCHMARKS

When referencing industry ranges, you MUST:
- Label them as "reference range, not a prediction."
- Show the percentile band the user's metric falls in when possible.
- Example: "Your net margin sits at approximately the 65th percentile for coffee shops in Denver (reference range: 5-15%)."
- Never force user numbers to match benchmarks; they may be exceptional but still true.

## INDUSTRY-SPECIFIC REVENUE LOGIC

You MUST use the correct revenue archetype for the business type. Never use SaaS logic for a restaurant or vice versa:

- **Coffee shop / Restaurant / Food**: Daily covers × average ticket × operating days. COGS driven by food/beverage cost %. Labor as mix of fixed shifts and variable peak coverage.
- **SaaS / Subscription**: Subscribers × ARPU, churn-driven retention, CAC payback, expansion revenue. State: active_customers = previous + new - churned.
- **Ecommerce / DTC**: Site sessions × conversion rate × AOV. Repeat purchase frequency, returns/refunds. Fulfillment, shipping, payment fees as COGS.
- **Consulting / Agency / Coaching**: Billable hours × rate × utilization. Non-billable overhead. Capacity limits by headcount.
- **Fitness studio**: Memberships + class passes. Class capacity × occupancy × visit frequency. Trainer wages, retention as key drivers.
- **Real estate**: Units × occupancy rate × rent. Lease terms, maintenance, capex, financing costs.
- **Retail (brick-and-mortar)**: Foot traffic × conversion × average basket. Inventory and shrinkage modeled explicitly.
- **Services (cleaning, tutoring, etc.)**: Service capacity × utilization × rate. Travel time, supplies as variable costs.

## PERCENTILE POSITIONING

Instead of vague language like "your margin is good," use precise positioning:
- "Your net margin sits at the Nth percentile for [industry] in [location]."
- "Your CAC is lower than N% of similar businesses, which may indicate optimism."
- "Your rent as % of revenue is in the top quartile for this city and concept."

## EXPLICIT VIABILITY VERDICTS

Use these verdicts with clear criteria:
- **VIABLE**: Positive unit economics, payback ≤ 24 months, no catastrophic benchmark outliers.
- **MARGINALLY VIABLE**: Unit economics borderline or payback 24-48 months, multiple high-sensitivity assumptions.
- **HIGH-RISK**: Structurally weak unit economics, heavy dependence on top/bottom 10% benchmark assumptions, or payback > 48 months.
- **NOT VIABLE**: Negative unit economics under realistic benchmark stress, or unsustainable burn/payback.

Map these to the investment_verdict field: VIABLE → PROMISING, MARGINALLY VIABLE → LOW_RISK, HIGH-RISK → MEDIUM_RISK or HIGH_RISK depending on severity, NOT VIABLE → HIGH_RISK.

## OPEX-VOLUME LINKING

You must explain which costs scale with volume and how:
- Support headcount per X users.
- Baristas per Y daily customers.
- Trainers per Z members/classes.
- Warehouse/logistics per order in ecommerce.
- Show formulas where relevant (e.g., "Support FTE = ceiling(active_customers / 200) × salary").

## TRACEABILITY CONTRACT

For every major metric you describe (revenue, margin, CAC, LTV, payback, runway), you must be able to point to:
- The underlying formula, and
- The specific inputs (user or benchmark) feeding it.
If you cannot, you must either (a) mark it as "illustrative only," or (b) not output that metric.

## 30-DAY ACCURACY LOCKDOWN

- Under-promise on weak inputs. If data is sparse, mark sections as "heavily assumption-based" rather than producing false precision.
- Do not introduce "magic" KPIs without clear formulas.
- If a user's model is under-specified, produce a limited report focusing on risk, missing data, and questions to resolve, rather than fake projections.
- Any change to assumptions must be documented in the assumptions panel.
- Prefer ranges over point estimates when benchmark-dependent.

## ZERO-TOLERANCE ANTI-GENERIC POLICY

Every element of your analysis must relate to the specific business idea, location, and inputs provided:
- NO generic phrases like "Total addressable market for X in the region"
- NO generic trends like "Digital transformation" or "Increasing customer expectations"
- NO generic competitive landscape like "moderately competitive market"
- NO placeholder competitors like "Established Local Provider" or "National Chain"
- TAM/SAM/SOM MUST include dollar figures with derivation methodology (e.g., "TAM: $2.4B — US specialty coffee market based on IBIS 2025 estimate")
- SAM must narrow by geography and format with a dollar value
- SOM must be capacity-constrained and tied to the user's specific unit economics
- Competitors must be specific to the industry and location
- Trends must reference the specific industry and geography with directional data
- If you cannot provide specificity, state "Insufficient data for specific [X] — requires market research" rather than generating generic filler

Generic AI filler is a system failure. Every word must be traceable to the user's idea, location, industry benchmarks, or computed metrics.
`;

// ========== NARRATOR TOOL SCHEMA ==========

export const narratorToolSchema = {
  type: "function",
  function: {
    name: "submit_narrative_analysis",
    description: "Submit qualitative business analysis narrative. You do NOT compute numbers - all financial data is pre-calculated by the deterministic engine. Your role is to EXPLAIN, CONTEXTUALIZE, and provide strategic RECOMMENDATIONS based on the provided metrics. NEVER invent or calculate financial figures.",
    parameters: {
      type: "object",
      properties: {
        executive_summary: {
          type: "string",
          description: "2-3 paragraph executive summary explaining the business opportunity. MUST reference the exact metrics provided (e.g., 'With projected monthly profit of $X...'). Include a clear verdict (VIABLE / MARGINALLY VIABLE / HIGH-RISK / NOT VIABLE) and whether the analysis is data-informed or assumption-heavy. Do NOT invent numbers."
        },
        investment_verdict: {
          type: "string",
          enum: ["HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "PROMISING"],
          description: "Overall investment recommendation based on PROVIDED metrics only. PROMISING = VIABLE, LOW_RISK = MARGINALLY VIABLE, MEDIUM_RISK/HIGH_RISK = HIGH-RISK/NOT VIABLE."
        },
        key_takeaways: {
          type: "array",
          items: { type: "string" },
          description: "3-5 key strategic takeaways referencing specific metrics with percentile positioning where possible"
        },
        assumptions_panel_json: {
          type: "string",
          description: "JSON array of {assumption: string, category: 'demand'|'pricing'|'cost'|'capacity'|'financing'|'other', source: 'user_input'|'benchmark_placeholder'|'derived_from_user', sensitivity: 'HIGH'|'MEDIUM'|'LOW', impact: string}. Must include every high-impact assumption used in reasoning."
        },
        data_quality_json: {
          type: "string",
          description: "JSON with {completeness_pct: number 0-100, consistency_score: number 1-5, assumption_load: 'LOW'|'MEDIUM'|'HIGH', volatility_rating: 'LOW'|'MEDIUM'|'HIGH', overall_label: 'DATA_INFORMED'|'ASSUMPTION_HEAVY'|'EXPLORATORY', notes: string}"
        },
        business_plan_json: {
          type: "string",
          description: "JSON: product_description, target_audience, competitive_advantages, operations, launch_steps array (step, title, description, duration, cost_reference), risks array (risk, probability, impact, mitigation)"
        },
        marketing_plan_json: {
          type: "string",
          description: "JSON: positioning, pricing_strategy, channels array (channel, description, budget_percent, expected_roi), first_3_months_plan"
        },
        market_analysis_json: {
          type: "string",
          description: "JSON: tam (dollar value with derivation methodology, e.g. '$2.4B — US specialty coffee market, IBIS 2025'), sam (narrowed by geography and format with dollar value), som (capacity-constrained dollar value tied to user's unit economics), trends array (industry+location specific with directional data — NO generic phrases), competitors array (name, strengths, weaknesses — specific to location/industry, NO placeholders like 'National Chain'), competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities. Every field MUST reference the specific business idea, industry, and location."
        },
        action_plan_json: {
          type: "string",
          description: "JSON array: step, timeline, priority (critical/high/medium/low), metric_reference. Focus first 30-90 days on collecting missing data and de-risking assumptions."
        }
      },
      required: [
        "executive_summary",
        "investment_verdict",
        "key_takeaways",
        "assumptions_panel_json",
        "data_quality_json",
        "business_plan_json",
        "marketing_plan_json",
        "market_analysis_json",
        "action_plan_json"
      ]
    }
  }
};

// ========== NARRATOR SYSTEM PROMPT ==========

export function buildNarratorSystemPrompt(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  hasDocuments: boolean,
  benchmarkConfidenceLabel?: string,
  hedgingPrefix?: string
): string {
  const profitStatus = metrics.isProfitable 
    ? `✅ PROFITABLE (+$${metrics.netProfit.toLocaleString()}/mo)`
    : `❌ LOSS (-$${Math.abs(metrics.netProfit).toLocaleString()}/mo)`;
    
  const ltvCacStatus = metrics.ltvCacRatio >= 3 
    ? '✅ HEALTHY' 
    : '⚠️ NEEDS IMPROVEMENT';

  // ========== COMPUTED ANCHORS BLOCK ==========
  // These exact numbers MUST appear in AI output when referenced
  const anchors = `
## ══════════════════════════════════════════════════════════
## IMMUTABLE FINANCIAL ANCHORS (USE THESE EXACT NUMBERS)
## ══════════════════════════════════════════════════════════
## MRR: $${metrics.mrr.toLocaleString()}
## Net Profit: $${metrics.netProfit.toLocaleString()}
## LTV: $${metrics.ltv.toLocaleString()}
## CAC: $${metrics.cac}
## ROI Y1: ${metrics.roiYear1Percent}%
## Payback: ${metrics.paybackMonths === 999 ? 'N/A' : metrics.paybackMonths + ' months'}
## NPV 3yr: $${metrics.npv3Years.toLocaleString()}
## Break-Even: $${metrics.breakEvenRevenue.toLocaleString()}/mo
## ══════════════════════════════════════════════════════════
## DO NOT INVENT, ESTIMATE, OR MODIFY THESE NUMBERS.
## ══════════════════════════════════════════════════════════`;

  const confidenceNote = benchmarkConfidenceLabel && benchmarkConfidenceLabel !== 'high'
    ? `\n## ⚠️ BENCHMARK CONFIDENCE: ${benchmarkConfidenceLabel.toUpperCase()}\n${hedgingPrefix || 'Use hedging language when referencing industry benchmarks.'}\n`
    : '';

  return `${MASTER_PROMPT_DIRECTIVES}

## YOUR ROLE: NARRATOR & STRATEGIST (NOT CALCULATOR)

🚫 CRITICAL RULE: You are a NARRATOR. You do NOT compute financial numbers.
✅ All financial metrics below have been PRE-CALCULATED by a deterministic engine.
✅ Your job is to EXPLAIN, CONTEXTUALIZE, and provide STRATEGIC RECOMMENDATIONS.

${anchors}

## ABSOLUTE RULES (VIOLATION = SYSTEM FAILURE)
⛔ NEVER invent or calculate financial numbers
⛔ NEVER contradict the provided metrics  
⛔ NEVER include dollar amounts not listed below
⛔ NEVER say "I estimate" or "approximately" for financials
✅ Reference metrics by EXACT value: "the projected $${metrics.netProfit.toLocaleString()} monthly profit"
✅ Focus on QUALITATIVE analysis and STRATEGY
✅ Explain WHY the numbers matter
${confidenceNote}

## PRE-COMPUTED FINANCIAL METRICS (SOURCE OF TRUTH)

### Revenue & Profitability ${profitStatus}
| Metric | Value |
|--------|-------|
| Monthly Revenue (MRR) | $${metrics.mrr.toLocaleString()} |
| Annual Revenue (ARR) | $${metrics.arr.toLocaleString()} |
| Monthly Net Profit | $${metrics.netProfit.toLocaleString()} |
| Net Margin | ${metrics.netMarginPercent}% |
| Gross Profit | $${metrics.grossProfit.toLocaleString()} |
| Gross Margin | ${metrics.grossMarginPercent}% |

### Monthly Expenses (Total: $${metrics.totalExpenses.toLocaleString()})
| Category | Amount |
|----------|--------|
| COGS | $${metrics.expenses.cogs.toLocaleString()} |
| Salaries | $${metrics.expenses.salaries.toLocaleString()} |
| Rent | $${metrics.expenses.rent.toLocaleString()} |
| Utilities | $${metrics.expenses.utilities.toLocaleString()} |
| Marketing | $${metrics.expenses.marketing.toLocaleString()} |
| Other | $${metrics.expenses.other.toLocaleString()} |

### Unit Economics ${ltvCacStatus}
| Metric | Value |
|--------|-------|
| CAC | $${metrics.cac} |
| LTV | $${metrics.ltv.toLocaleString()} |
| LTV:CAC Ratio | ${metrics.ltvCacRatio}x |
| CAC Payback | ${metrics.cacPaybackMonths} months |

### Investment Returns
| Metric | Value |
|--------|-------|
| Initial Investment | $${metrics.startupInvestment.toLocaleString()} |
| Payback Period | ${metrics.paybackMonths === 999 ? 'N/A (unprofitable)' : metrics.paybackMonths + ' months'} |
| Year 1 ROI | ${metrics.roiYear1Percent}% |
| Year 3 ROI | ${metrics.roiYear3Percent}% |
| 3-Year NPV | $${metrics.npv3Years.toLocaleString()} |

### Break-Even Analysis
| Metric | Value |
|--------|-------|
| Break-Even Revenue | $${metrics.breakEvenRevenue.toLocaleString()}/mo |
| Break-Even Units | ${metrics.breakEvenUnits} transactions |
| Revenue for $45k Profit | $${metrics.revenueFor45kProfit.toLocaleString()}/mo |

### Customer Metrics
| Metric | Value |
|--------|-------|
| Active Clients | ${metrics.clientsActive} |
| Average Transaction | $${metrics.averageCheck} |
| New Clients Needed/Month | ${metrics.newClientsNeeded} |
| Monthly Transactions | ${metrics.ordersMonthly} |

### Scenario Analysis
| Scenario | Revenue | Net Profit | Net Margin |
|----------|---------|------------|------------|
| Pessimistic | $${metrics.scenarios.pessimistic.revenue.toLocaleString()} | $${metrics.scenarios.pessimistic.netProfit.toLocaleString()} | ${metrics.scenarios.pessimistic.netMargin}% |
| Base | $${metrics.scenarios.base.revenue.toLocaleString()} | $${metrics.scenarios.base.netProfit.toLocaleString()} | ${metrics.scenarios.base.netMargin}% |
| Optimistic | $${metrics.scenarios.optimistic.revenue.toLocaleString()} | $${metrics.scenarios.optimistic.netProfit.toLocaleString()} | ${metrics.scenarios.optimistic.netMargin}% |

## INDUSTRY CONTEXT: ${benchmarks.name}
- Typical Net Margin: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}% (reference range, not a prediction)
- Typical LTV:CAC: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x (reference range)
- Industry CAC Range: $${benchmarks.cac_min}-$${benchmarks.cac_max} (reference range)
- Customer Lifetime: ${benchmarks.client_lifetime_months} months (industry median)

${hasDocuments ? `
## DOCUMENT DATA
User uploaded business documents. Reference specific findings from documents in your analysis.
Document data has already been extracted and incorporated into the metrics above.
` : ''}

## OUTPUT REQUIREMENTS
1. **Executive Summary**: 2-3 paragraphs using EXACT metrics. Include viability verdict (VIABLE/MARGINALLY VIABLE/HIGH-RISK/NOT VIABLE) and whether analysis is data-informed or assumption-heavy.
2. **Investment Verdict**: Based on provided metrics using the verdict criteria above.
3. **Key Takeaways**: 3-5 strategic insights with percentile positioning where possible.
4. **Assumptions Panel**: ALL high-impact assumptions with source, sensitivity, and impact.
5. **Data Quality**: Honest assessment of input completeness and benchmark reliance.
6. **Business Plan**: Product, audience, advantages, operations, launch steps (reference cost from computed metrics), risks. Use industry-specific revenue logic.
7. **Marketing Plan**: Strategy and channels with budget as % of marketing spend.
8. **Market Analysis**: TAM/SAM/SOM must be dollar values with derivation methodology. Example: "TAM: $X.XB based on [source/logic]". SAM must narrow by geography. SOM must be capacity-constrained. Never output vague phrases. Trends must be industry and location specific with directional data. Competitors must be named real-world entities or specific archetypes with location context — NO generic placeholders.
9. **Action Plan**: Prioritized steps with timelines. First 30-90 days should focus on collecting missing data and de-risking key assumptions.

Remember: You EXPLAIN and STRATEGIZE. The engine COMPUTES. Never invent numbers.`;
}

// ========== BUILD USER PROMPT ==========

export function buildNarratorPrompt(
  businessIdea: string,
  location: string,
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  documentContext: string,
  userFinancialContext: string
): string {
  return `## BUSINESS IDEA TO ANALYZE
${businessIdea}

## LOCATION (PRIMARY MARKET)
${location}

## DETECTED INDUSTRY
${benchmarks.name}

${userFinancialContext ? `## USER-PROVIDED FINANCIAL CONTEXT
${userFinancialContext}` : ''}

${documentContext ? `## DOCUMENT INSIGHTS
${documentContext}` : ''}

## YOUR TASK
Provide a comprehensive strategic analysis using ONLY the pre-computed financial metrics from the system prompt. 

Focus on:
1. **Strategic Assessment**: What makes this business viable or risky given the computed metrics? Use the correct industry archetype for revenue logic.
2. **Competitive Positioning**: How should this business differentiate in ${location}? Position metrics against industry percentiles.
3. **Go-to-Market Strategy**: What's the optimal path to market given $${metrics.startupInvestment.toLocaleString()} investment?
4. **Risk Mitigation**: Key risks based on the ${metrics.isProfitable ? 'profitable' : 'currently unprofitable'} model. Highlight which assumptions, if moved to median benchmark values, would break the model.
5. **Action Plan**: Specific steps to ${metrics.isProfitable ? 'grow' : 'reach profitability'}. Prioritize data collection and assumption de-risking in the first 30-90 days.
6. **Assumptions Panel**: Declare every key assumption with source, sensitivity, and impact.
7. **Data Quality Assessment**: Rate completeness, consistency, assumption load, and volatility.

Use the EXACT financial metrics from the system prompt. Do not calculate or estimate new figures.`;
}

// ========== PARSE NARRATOR RESPONSE ==========

export function parseNarratorResponse(rawResponse: unknown): NarratorOutput | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  
  const r = rawResponse as Record<string, unknown>;
  
  try {
    const parseJson = (field: string, defaultVal: unknown) => {
      const val = r[field];
      if (!val) return defaultVal;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return defaultVal; }
      }
      return val;
    };
    
    const businessPlan = parseJson('business_plan_json', {});
    const marketingPlan = parseJson('marketing_plan_json', {});
    const marketAnalysis = parseJson('market_analysis_json', {});
    const actionPlan = parseJson('action_plan_json', []);
    const assumptionsPanel = parseJson('assumptions_panel_json', []);
    const dataQuality = parseJson('data_quality_json', {
      completeness_pct: 30,
      consistency_score: 3,
      assumption_load: 'HIGH',
      volatility_rating: 'MEDIUM',
      overall_label: 'EXPLORATORY',
      notes: 'Unable to parse data quality from AI response; defaults applied.'
    });

    const result: NarratorOutput = {
      executive_summary: String(r.executive_summary || ''),
      investment_verdict: (r.investment_verdict as NarratorOutput['investment_verdict']) || 'MEDIUM_RISK',
      key_takeaways: Array.isArray(r.key_takeaways) ? r.key_takeaways.map(String) : [],
      
      business_plan: {
        product_description: String(businessPlan.product_description || ''),
        target_audience: String(businessPlan.target_audience || ''),
        competitive_advantages: String(businessPlan.competitive_advantages || ''),
        operations: String(businessPlan.operations || ''),
        launch_steps: Array.isArray(businessPlan.launch_steps) ? businessPlan.launch_steps : [],
        risks: Array.isArray(businessPlan.risks) ? businessPlan.risks : [],
      },
      
      marketing_plan: {
        positioning: String(marketingPlan.positioning || ''),
        pricing_strategy: String(marketingPlan.pricing_strategy || ''),
        channels: Array.isArray(marketingPlan.channels) ? marketingPlan.channels : [],
        first_3_months_plan: String(marketingPlan.first_3_months_plan || ''),
      },
      
      market_analysis: {
        tam: String(marketAnalysis.tam || ''),
        sam: String(marketAnalysis.sam || ''),
        som: String(marketAnalysis.som || ''),
        trends: Array.isArray(marketAnalysis.trends) ? marketAnalysis.trends : [],
        competitors: Array.isArray(marketAnalysis.competitors) ? marketAnalysis.competitors : [],
        competitive_landscape: String(marketAnalysis.competitive_landscape || ''),
        market_gaps: String(marketAnalysis.market_gaps || ''),
        barriers_to_entry: String(marketAnalysis.barriers_to_entry || ''),
        growth_opportunities: String(marketAnalysis.growth_opportunities || ''),
      },
      
      action_plan: Array.isArray(actionPlan) ? actionPlan : [],
      
      // New master prompt fields
      assumptions_panel: Array.isArray(assumptionsPanel) ? assumptionsPanel : [],
      data_quality: typeof dataQuality === 'object' && dataQuality !== null ? dataQuality : {
        completeness_pct: 30,
        consistency_score: 3,
        assumption_load: 'HIGH',
        volatility_rating: 'MEDIUM',
        overall_label: 'EXPLORATORY',
        notes: 'Default data quality applied.'
      },
    };

    // QA HOOK: If data quality is weak but verdict is too optimistic, add a caveat
    if (result.data_quality) {
      const dq = result.data_quality as Record<string, unknown>;
      const completeness = Number(dq.completeness_pct) || 0;
      const assumptionLoad = String(dq.assumption_load || '');
      
      if ((completeness < 40 || assumptionLoad === 'HIGH') && result.investment_verdict === 'PROMISING') {
        // Downgrade executive summary with caveat
        result.executive_summary = result.executive_summary + 
          '\n\nNote: This analysis is provisionally VIABLE under heavy assumptions. More real-world data is needed to confirm these projections.';
      }
      
      // Force EXPLORATORY if completeness is very low
      if (completeness < 20) {
        dq.overall_label = 'EXPLORATORY';
      }
    }

    return result;
  } catch (e) {
    console.error('Failed to parse narrator response:', e);
    return null;
  }
}

// ========== FALLBACK NARRATOR (NO LLM NEEDED) ==========

export function generateFallbackNarrator(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks,
  businessIdea: string,
  location: string
): NarratorOutput {
  const profitStatus = metrics.isProfitable 
    ? `profitable with $${metrics.netProfit.toLocaleString()}/month net income`
    : `currently showing a loss of $${Math.abs(metrics.netProfit).toLocaleString()}/month`;
    
  const verdict = !metrics.isProfitable ? 'HIGH_RISK' 
    : metrics.ltvCacRatio < 2 ? 'HIGH_RISK'
    : metrics.paybackMonths > 36 ? 'MEDIUM_RISK'
    : metrics.ltvCacRatio >= 3 && metrics.paybackMonths <= 18 ? 'PROMISING'
    : 'LOW_RISK';

  // Guard against "General Business business" double-word when industry detection falls back
  const industryLabel = (benchmarks.name === 'General Business' || benchmarks.id === 'general')
    ? 'this business opportunity'
    : `this ${benchmarks.name}`;
  const industryLabelLower = (benchmarks.name === 'General Business' || benchmarks.id === 'general')
    ? 'the proposed business'
    : benchmarks.name.toLowerCase();

  return {
    executive_summary: `This analysis evaluates ${industryLabel} in ${location}. Based on our deterministic financial engine, the business is ${profitStatus}. The LTV:CAC ratio of ${metrics.ltvCacRatio}x ${metrics.ltvCacRatio >= 3 ? 'indicates healthy unit economics' : 'suggests customer acquisition costs need optimization'}. With an initial investment of $${metrics.startupInvestment.toLocaleString()}, the projected payback period is ${metrics.paybackMonths === 999 ? 'indeterminate until profitability is achieved' : `${metrics.paybackMonths} months`}. All financial projections are computed using industry benchmarks adjusted for the ${location} market.\n\nNote: This is an exploratory analysis. Key inputs were not provided by the user and have been filled with benchmark placeholders. Treat all projections as illustrative ranges, not predictions.`,
    
    investment_verdict: verdict as NarratorOutput['investment_verdict'],
    
    key_takeaways: [
      `Monthly revenue potential of $${metrics.mrr.toLocaleString()} with ${metrics.netMarginPercent}% net margin (benchmark-derived, not user-validated)`,
      `LTV:CAC ratio of ${metrics.ltvCacRatio}x ${metrics.ltvCacRatio >= 3 ? 'supports scalable growth' : 'requires optimization before scaling'} (based on industry reference range ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`,
      `Break-even requires $${metrics.breakEvenRevenue.toLocaleString()}/month in revenue`,
      metrics.isProfitable 
        ? `Year 1 ROI of ${metrics.roiYear1Percent}% — attractive if assumptions hold`
        : `Focus on reaching profitability before scaling operations`,
    ],

    // New master prompt fields
    assumptions_panel: [
      { assumption: 'Monthly revenue based on industry benchmark average check and estimated volume', category: 'demand', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Directly affects all profitability and payback metrics' },
      { assumption: `CAC of $${metrics.cac} based on industry range $${benchmarks.cac_min}-$${benchmarks.cac_max}`, category: 'cost', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Affects LTV:CAC ratio and unit economics viability' },
      { assumption: `Net margin of ${metrics.netMarginPercent}% within industry range ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%`, category: 'pricing', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Affects profitability timeline and payback period' },
      { assumption: `Initial investment of $${metrics.startupInvestment.toLocaleString()}`, category: 'financing', source: 'benchmark_placeholder', sensitivity: 'MEDIUM', impact: 'Affects payback period and ROI calculations' },
      { assumption: `Customer lifetime of ${benchmarks.client_lifetime_months} months (industry median)`, category: 'demand', source: 'benchmark_placeholder', sensitivity: 'MEDIUM', impact: 'Affects LTV and long-term revenue projections' },
      { assumption: 'Cost structure (rent, salaries, utilities) based on location-adjusted industry benchmarks', category: 'cost', source: 'benchmark_placeholder', sensitivity: 'HIGH', impact: 'Affects break-even point and net margin' },
    ],

    data_quality: {
      completeness_pct: 20,
      consistency_score: 3,
      assumption_load: 'HIGH',
      volatility_rating: 'MEDIUM',
      overall_label: 'EXPLORATORY',
      notes: 'Fallback mode: upstream model response incomplete. Most metrics are benchmark-derived placeholders. Outputs are illustrative only and must not be used for final decisions. Collect real user data to improve accuracy.',
    },
    
    business_plan: {
      product_description: `A business serving the ${location} market — focused on delivering value to target customers.`,
      target_audience: `Customers in ${location} seeking solutions from ${industryLabelLower}.`,
      competitive_advantages: `Focus on operational efficiency and customer retention to maintain margins.`,
      operations: `Standard ${benchmarks.name} operations with focus on ${metrics.isProfitable ? 'scaling' : 'cost optimization'}.`,
      launch_steps: [
        { step: 1, title: 'Market Validation', description: 'Validate demand in target market', duration: '1-2 weeks', cost_reference: '10% of marketing budget' },
        { step: 2, title: 'MVP Launch', description: 'Launch minimum viable product', duration: '4-8 weeks', cost_reference: '60% of initial investment' },
        { step: 3, title: 'Customer Acquisition', description: 'Begin systematic customer acquisition', duration: 'Ongoing', cost_reference: `$${metrics.cac} per customer` },
      ],
      risks: [
        { risk: 'Market competition', probability: 'medium' as const, impact: 'medium' as const, mitigation: 'Focus on differentiation and customer service' },
        { risk: 'Customer churn', probability: 'medium' as const, impact: 'high' as const, mitigation: 'Implement retention programs early' },
      ],
    },
    
    marketing_plan: {
      positioning: `Value-focused ${benchmarks.name} solution for ${location} market.`,
      pricing_strategy: `Average transaction of $${metrics.averageCheck} aligned with market expectations (industry range: $${benchmarks.average_check_min}-$${benchmarks.average_check_max}).`,
      channels: [
        { channel: 'Digital Marketing', description: 'Paid and organic digital channels', budget_percent: 60, expected_roi: `${metrics.ltvCacRatio}x LTV:CAC` },
        { channel: 'Referral Program', description: 'Customer referral incentives', budget_percent: 20, expected_roi: 'Lower CAC through word-of-mouth' },
        { channel: 'Content Marketing', description: 'Educational content for organic reach', budget_percent: 20, expected_roi: 'Long-term brand building' },
      ],
      first_3_months_plan: `Focus on acquiring first ${metrics.clientsActive} customers while optimizing CAC from current $${metrics.cac}.`,
    },
    
    market_analysis: {
      tam: (benchmarks as any).market_size_usd 
        ? `Estimated TAM: $${((benchmarks as any).market_size_usd / 1e9).toFixed(1)}B — ${benchmarks.name} market (benchmark-derived estimate, replace with actual market research).`
        : `Estimated TAM: $${((metrics.mrr * 12 * 500) / 1e6).toFixed(1)}M — derived from ${benchmarks.name} revenue potential × 500x market multiplier for ${location}. This is a benchmark-derived estimate requiring validation.`,
      sam: `Estimated SAM: $${((metrics.mrr * 12 * 50) / 1e6).toFixed(1)}M — ${benchmarks.name} serviceable market in ${location}, narrowed from TAM by geography and business format.`,
      som: `SOM: $${(metrics.mrr * 12).toLocaleString()} — first-year revenue target based on ${metrics.clientsActive} active customers at $${metrics.averageCheck} average transaction.`,
      trends: [
        `${benchmarks.name} demand patterns in ${location} — requires local market validation`,
        `Labor and operational cost trends for ${benchmarks.name} in ${location}`,
        `Customer acquisition dynamics in the ${location} ${benchmarks.name} market`,
      ],
      competitors: [
        { name: `Direct ${benchmarks.name} competitors in ${location}`, strengths: 'Established customer base and local reputation', weaknesses: 'Specific competitive data requires market research' },
      ],
      competitive_landscape: `The ${benchmarks.name} market in ${location} — specific competitive data not available without market research. This is a placeholder requiring validation with local surveys, foot traffic analysis, or industry reports.`,
      market_gaps: `Potential gaps in the ${location} ${benchmarks.name} market — requires primary research (customer interviews, competitor audits) to validate.`,
      barriers_to_entry: `Initial investment of $${metrics.startupInvestment.toLocaleString()}, customer acquisition costs (CAC: $${metrics.cac}), and time to build reputation in ${location}.`,
      growth_opportunities: metrics.isProfitable 
        ? `Scale ${benchmarks.name} operations in ${location} while maintaining unit economics (current LTV:CAC ${metrics.ltvCacRatio}x).`
        : `Reach profitability first (current monthly profit: $${((metrics as any).monthlyProfit ?? 0).toLocaleString()}), then scale ${benchmarks.name} operations in ${location}.`,
    },
    
    action_plan: [
      { step: 'Collect real demand data: track daily traffic, leads, or inquiries for 2-4 weeks', timeline: 'Week 1-4', priority: 'critical' as const },
      { step: 'Validate pricing with 10-20 pilot customers to replace benchmark assumptions', timeline: 'Week 1-4', priority: 'critical' as const },
      { step: metrics.isProfitable ? 'Measure actual CAC across channels to validate LTV:CAC' : 'Reduce costs to reach profitability', timeline: 'Week 1-8', priority: 'critical' as const },
      { step: 'Build customer acquisition system with tracked conversion funnel', timeline: 'Week 4-12', priority: 'high' as const },
      { step: 'Implement retention programs and measure actual churn', timeline: 'Week 8-16', priority: 'high' as const },
      { step: 'Re-run analysis with real data to get DATA_INFORMED rating', timeline: 'Month 3', priority: 'high' as const },
    ],
  };
}
