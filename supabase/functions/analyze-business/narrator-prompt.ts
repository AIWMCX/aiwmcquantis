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
 */

import type { ComputedMetrics, NarratorOutput } from './schemas.ts';
import type { IndustryBenchmarks } from './financial-engine.ts';

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
          description: "2-3 paragraph executive summary explaining the business opportunity. MUST reference the exact metrics provided (e.g., 'With projected monthly profit of $X...'). Do NOT invent numbers."
        },
        investment_verdict: {
          type: "string",
          enum: ["HIGH_RISK", "MEDIUM_RISK", "LOW_RISK", "PROMISING"],
          description: "Overall investment recommendation based on PROVIDED metrics only"
        },
        key_takeaways: {
          type: "array",
          items: { type: "string" },
          description: "3-5 key strategic takeaways referencing specific metrics"
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
          description: "JSON: tam, sam, som, trends array, competitors array (name, strengths, weaknesses), competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities"
        },
        action_plan_json: {
          type: "string",
          description: "JSON array: step, timeline, priority (critical/high/medium/low), metric_reference"
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
  const profitStatus = metrics.isProfitable 
    ? `✅ PROFITABLE (+$${metrics.netProfit.toLocaleString()}/mo)`
    : `❌ LOSS (-$${Math.abs(metrics.netProfit).toLocaleString()}/mo)`;
    
  const ltvCacStatus = metrics.ltvCacRatio >= 3 
    ? '✅ HEALTHY' 
    : '⚠️ NEEDS IMPROVEMENT';

  return `You are a Senior Strategic Consultant at McKinsey & Company with 25+ years of experience advising Fortune 500 companies and high-growth startups.

## YOUR ROLE: NARRATOR & STRATEGIST (NOT CALCULATOR)

🚫 CRITICAL RULE: You are a NARRATOR. You do NOT compute financial numbers.
✅ All financial metrics below have been PRE-CALCULATED by a deterministic engine.
✅ Your job is to EXPLAIN, CONTEXTUALIZE, and provide STRATEGIC RECOMMENDATIONS.

## ABSOLUTE RULES (VIOLATION = SYSTEM FAILURE)
⛔ NEVER invent or calculate financial numbers
⛔ NEVER contradict the provided metrics  
⛔ NEVER include dollar amounts not listed below
⛔ NEVER say "I estimate" or "approximately" for financials
✅ Reference metrics by EXACT value: "the projected $${metrics.netProfit.toLocaleString()} monthly profit"
✅ Focus on QUALITATIVE analysis and STRATEGY
✅ Explain WHY the numbers matter

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
- Typical Net Margin: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%
- Typical LTV:CAC: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x
- Industry CAC Range: $${benchmarks.cac_min}-$${benchmarks.cac_max}
- Customer Lifetime: ${benchmarks.client_lifetime_months} months

${hasDocuments ? `
## DOCUMENT DATA
User uploaded business documents. Reference specific findings from documents in your analysis.
Document data has already been extracted and incorporated into the metrics above.
` : ''}

## OUTPUT REQUIREMENTS
1. **Executive Summary**: 2-3 paragraphs using EXACT metrics from above
2. **Investment Verdict**: Based on provided metrics:
   - HIGH_RISK: Unprofitable OR ROI < 10% OR LTV:CAC < 2
   - MEDIUM_RISK: Payback > 24mo OR margin below industry
   - LOW_RISK: All metrics within healthy ranges
   - PROMISING: Profitable with strong unit economics
3. **Key Takeaways**: 3-5 strategic insights referencing specific metrics
4. **Business Plan**: Product, audience, advantages, operations, launch steps (reference cost from computed metrics), risks
5. **Marketing Plan**: Strategy and channels with budget as % of marketing spend
6. **Market Analysis**: TAM/SAM/SOM, trends, competition
7. **Action Plan**: Prioritized steps with timelines

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
1. **Strategic Assessment**: What makes this business viable or risky given the computed metrics?
2. **Competitive Positioning**: How should this business differentiate in ${location}?
3. **Go-to-Market Strategy**: What's the optimal path to market given $${metrics.startupInvestment.toLocaleString()} investment?
4. **Risk Mitigation**: Key risks based on the ${metrics.isProfitable ? 'profitable' : 'currently unprofitable'} model
5. **Action Plan**: Specific steps to ${metrics.isProfitable ? 'grow' : 'reach profitability'}

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

  return {
    executive_summary: `This analysis evaluates a ${benchmarks.name} business opportunity in ${location}. Based on our deterministic financial engine, the business is ${profitStatus}. The LTV:CAC ratio of ${metrics.ltvCacRatio}x ${metrics.ltvCacRatio >= 3 ? 'indicates healthy unit economics' : 'suggests customer acquisition costs need optimization'}. With an initial investment of $${metrics.startupInvestment.toLocaleString()}, the projected payback period is ${metrics.paybackMonths === 999 ? 'indeterminate until profitability is achieved' : `${metrics.paybackMonths} months`}. All financial projections are computed using industry benchmarks for ${benchmarks.name} adjusted for the ${location} market.`,
    
    investment_verdict: verdict as NarratorOutput['investment_verdict'],
    
    key_takeaways: [
      `Monthly revenue potential of $${metrics.mrr.toLocaleString()} with ${metrics.netMarginPercent}% net margin`,
      `LTV:CAC ratio of ${metrics.ltvCacRatio}x ${metrics.ltvCacRatio >= 3 ? 'supports scalable growth' : 'requires optimization before scaling'}`,
      `Break-even requires $${metrics.breakEvenRevenue.toLocaleString()}/month in revenue`,
      metrics.isProfitable 
        ? `Year 1 ROI of ${metrics.roiYear1Percent}% makes this an attractive investment`
        : `Focus on reaching profitability before scaling operations`,
    ],
    
    business_plan: {
      product_description: `A ${benchmarks.name} business serving the ${location} market.`,
      target_audience: `Customers in ${location} seeking ${benchmarks.name.toLowerCase()} solutions.`,
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
      pricing_strategy: `Average transaction of $${metrics.averageCheck} aligned with market expectations.`,
      channels: [
        { channel: 'Digital Marketing', description: 'Paid and organic digital channels', budget_percent: 60, expected_roi: `${metrics.ltvCacRatio}x LTV:CAC` },
        { channel: 'Referral Program', description: 'Customer referral incentives', budget_percent: 20, expected_roi: 'Lower CAC through word-of-mouth' },
        { channel: 'Content Marketing', description: 'Educational content for organic reach', budget_percent: 20, expected_roi: 'Long-term brand building' },
      ],
      first_3_months_plan: `Focus on acquiring first ${metrics.clientsActive} customers while optimizing CAC from current $${metrics.cac}.`,
    },
    
    market_analysis: {
      tam: `Total addressable market for ${benchmarks.name} in the region.`,
      sam: `Serviceable market in ${location} and surrounding areas.`,
      som: `Initial target of ${metrics.clientsActive} active customers.`,
      trends: ['Digital transformation', 'Increasing customer expectations', 'Cost optimization focus'],
      competitors: [],
      competitive_landscape: `Competitive ${benchmarks.name} market requiring differentiation.`,
      market_gaps: 'Opportunity for superior customer experience and operational efficiency.',
      barriers_to_entry: 'Initial investment and customer acquisition costs.',
      growth_opportunities: metrics.isProfitable 
        ? 'Scale operations while maintaining unit economics.'
        : 'Reach profitability, then scale systematically.',
    },
    
    action_plan: [
      { step: 'Validate market demand with 10-20 pilot customers', timeline: 'Week 1-4', priority: 'critical' as const },
      { step: metrics.isProfitable ? 'Optimize CAC to improve LTV:CAC' : 'Reduce costs to reach profitability', timeline: 'Week 1-8', priority: 'critical' as const },
      { step: 'Build customer acquisition system', timeline: 'Week 4-12', priority: 'high' as const },
      { step: 'Implement retention programs', timeline: 'Week 8-16', priority: 'high' as const },
      { step: 'Scale operations', timeline: 'Month 4-6', priority: 'medium' as const },
    ],
  };
}
