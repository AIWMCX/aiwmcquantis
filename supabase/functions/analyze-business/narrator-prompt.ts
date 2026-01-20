/**
 * QUANTIS LLM NARRATOR PROMPT
 * 
 * CRITICAL: The LLM is a NARRATOR only. It CANNOT compute numbers.
 * All financial data is provided by the deterministic engine.
 * The LLM's job is to EXPLAIN and CONTEXTUALIZE the computed results.
 */

import type { ComputedMetrics, NarratorOutput } from './schemas.ts';
import type { IndustryBenchmarks } from './financial-engine.ts';

// ========== NARRATOR TOOL SCHEMA ==========

export const narratorToolSchema = {
  type: "function",
  function: {
    name: "submit_narrative_analysis",
    description: "Submit qualitative business analysis narrative. You do NOT compute numbers - all financial data is provided. Your role is to explain, contextualize, and provide strategic recommendations based on the pre-computed financial metrics.",
    parameters: {
      type: "object",
      properties: {
        executive_summary: {
          type: "string",
          description: "2-3 paragraph executive summary explaining the business opportunity and key findings. Reference the provided metrics (e.g., 'With projected monthly profit of $X...')"
        },
        investment_verdict: {
          type: "string",
          enum: ["HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "PROMISING"],
          description: "Overall investment recommendation based on provided metrics"
        },
        key_takeaways: {
          type: "array",
          items: { type: "string" },
          description: "3-5 key strategic takeaways"
        },
        business_plan_json: {
          type: "string",
          description: "JSON with: product_description, target_audience, competitive_advantages, operations, launch_steps array, risks array"
        },
        marketing_plan_json: {
          type: "string",
          description: "JSON with: positioning, pricing_strategy, channels array, first_3_months_plan"
        },
        market_analysis_json: {
          type: "string",
          description: "JSON with: tam, sam, som, trends array, competitors array, competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities"
        },
        action_plan_json: {
          type: "string",
          description: "JSON array of action steps with: step, timeline, priority, metric_reference"
        }
      },
      required: [
        "executive_summary",
        "investment_verdict",
        "key_takeaways",
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
  hasDocuments: boolean
): string {
  return `You are a Senior Strategic Consultant at a top-tier management consulting firm (McKinsey, BCG, Bain) with 25+ years of experience.

## YOUR ROLE: NARRATOR & STRATEGIST
You are a NARRATOR. You do NOT compute financial numbers. All financial metrics have been pre-calculated by our deterministic financial engine. Your job is to:
1. EXPLAIN the business opportunity in strategic terms
2. CONTEXTUALIZE the financial metrics for the client
3. PROVIDE actionable recommendations based on the data
4. IDENTIFY risks and opportunities

## CRITICAL RULES
⛔ NEVER invent or calculate financial numbers
⛔ NEVER contradict the provided metrics
⛔ NEVER include numbers in your text that aren't in the provided data
✅ Reference metrics by name (e.g., "the projected monthly profit of $${metrics.netProfit.toLocaleString()}")
✅ Use the exact numbers provided below
✅ Focus on qualitative analysis, strategy, and actionable recommendations

## PRE-COMPUTED FINANCIAL METRICS (USE THESE EXACT VALUES)
### Revenue & Profitability
- Monthly Revenue (MRR): $${metrics.mrr.toLocaleString()}
- Annual Revenue (ARR): $${metrics.arr.toLocaleString()}
- Monthly Net Profit: $${metrics.netProfit.toLocaleString()} ${metrics.isProfitable ? '(PROFITABLE)' : '(LOSS)'}
- Net Margin: ${metrics.netMarginPercent}%
- Gross Profit: $${metrics.grossProfit.toLocaleString()}
- Gross Margin: ${metrics.grossMarginPercent}%

### Expenses (Total: $${metrics.totalExpenses.toLocaleString()}/month)
- COGS: $${metrics.expenses.cogs.toLocaleString()}
- Salaries: $${metrics.expenses.salaries.toLocaleString()}
- Rent: $${metrics.expenses.rent.toLocaleString()}
- Utilities: $${metrics.expenses.utilities.toLocaleString()}
- Marketing: $${metrics.expenses.marketing.toLocaleString()}
- Other: $${metrics.expenses.other.toLocaleString()}

### Unit Economics
- Customer Acquisition Cost (CAC): $${metrics.cac}
- Lifetime Value (LTV): $${metrics.ltv.toLocaleString()}
- LTV:CAC Ratio: ${metrics.ltvCacRatio}x ${metrics.ltvCacRatio >= 3 ? '(HEALTHY)' : '(NEEDS IMPROVEMENT)'}
- CAC Payback: ${metrics.cacPaybackMonths} months

### Investment Returns
- Initial Investment: $${metrics.startupInvestment.toLocaleString()}
- Payback Period: ${metrics.paybackMonths === 999 ? 'Never (unprofitable)' : metrics.paybackMonths + ' months'}
- Year 1 ROI: ${metrics.roiYear1Percent}%
- Year 3 ROI: ${metrics.roiYear3Percent}%
- 3-Year NPV: $${metrics.npv3Years.toLocaleString()}

### Break-Even Analysis
- Break-Even Revenue: $${metrics.breakEvenRevenue.toLocaleString()}/month
- Break-Even Units: ${metrics.breakEvenUnits} transactions
- Revenue for $45k Profit: $${metrics.revenueFor45kProfit.toLocaleString()}/month

### Customer Metrics
- Active Clients: ${metrics.clientsActive}
- Average Transaction: $${metrics.averageCheck}
- New Clients Needed Monthly: ${metrics.newClientsNeeded}
- Monthly Transactions: ${metrics.ordersMonthly}

### Scenario Analysis
| Scenario | Revenue | Net Profit | Net Margin |
|----------|---------|------------|------------|
| Pessimistic | $${metrics.scenarios.pessimistic.revenue.toLocaleString()} | $${metrics.scenarios.pessimistic.netProfit.toLocaleString()} | ${metrics.scenarios.pessimistic.netMargin}% |
| Base | $${metrics.scenarios.base.revenue.toLocaleString()} | $${metrics.scenarios.base.netProfit.toLocaleString()} | ${metrics.scenarios.base.netMargin}% |
| Optimistic | $${metrics.scenarios.optimistic.revenue.toLocaleString()} | $${metrics.scenarios.optimistic.netProfit.toLocaleString()} | ${metrics.scenarios.optimistic.netMargin}% |

## INDUSTRY CONTEXT: ${benchmarks.name}
- Typical Net Margin Range: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%
- Typical LTV:CAC Range: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x
- Industry CAC Range: $${benchmarks.cac_min}-$${benchmarks.cac_max}
- Customer Lifetime: ${benchmarks.client_lifetime_months} months

${hasDocuments ? `
## DOCUMENT ANALYSIS
The user has uploaded business documents. Reference specific findings from these documents in your analysis.
` : ''}

## OUTPUT REQUIREMENTS
1. Executive Summary: 2-3 paragraphs explaining the opportunity, using the exact metrics provided
2. Investment Verdict: Based on the metrics (HIGH_RISK if unprofitable or ROI<10%, MEDIUM_RISK if payback>24mo, LOW_RISK if healthy metrics, PROMISING if exceptional)
3. Key Takeaways: 3-5 strategic insights referencing specific metrics
4. Business Plan: Qualitative sections (product, audience, advantages, operations, launch steps, risks)
5. Marketing Plan: Strategy, channels, first 3 months plan
6. Market Analysis: TAM/SAM/SOM estimates, trends, competition, barriers, opportunities
7. Action Plan: Prioritized steps with timelines

Remember: You explain and strategize. The engine computes. Never invent numbers.`;
}

// ========== BUILD FULL PROMPT ==========

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

${userFinancialContext}

${documentContext}

## YOUR TASK
Provide a comprehensive strategic analysis using ONLY the pre-computed financial metrics provided in the system prompt. Do not calculate or invent any financial numbers. Focus on:

1. **Strategic Assessment**: What makes this business viable or risky?
2. **Competitive Positioning**: How should this business differentiate?
3. **Go-to-Market Strategy**: What's the optimal path to market?
4. **Risk Mitigation**: What are the key risks and how to address them?
5. **Action Plan**: What specific steps should the founder take?

Use the exact financial metrics from the system prompt when referencing numbers.`;
}

// ========== PARSE NARRATOR RESPONSE ==========

export function parseNarratorResponse(rawResponse: unknown): NarratorOutput | null {
  if (!rawResponse || typeof rawResponse !== 'object') return null;
  
  const r = rawResponse as Record<string, unknown>;
  
  try {
    const businessPlan = typeof r.business_plan_json === 'string' 
      ? JSON.parse(r.business_plan_json) 
      : r.business_plan_json || {};
      
    const marketingPlan = typeof r.marketing_plan_json === 'string' 
      ? JSON.parse(r.marketing_plan_json) 
      : r.marketing_plan_json || {};
      
    const marketAnalysis = typeof r.market_analysis_json === 'string' 
      ? JSON.parse(r.market_analysis_json) 
      : r.market_analysis_json || {};
      
    const actionPlan = typeof r.action_plan_json === 'string' 
      ? JSON.parse(r.action_plan_json) 
      : r.action_plan_json || [];
    
    return {
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
    };
  } catch (e) {
    console.error('Failed to parse narrator response:', e);
    return null;
  }
}
