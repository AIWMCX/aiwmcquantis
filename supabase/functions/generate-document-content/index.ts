import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { aiCall } from '../_shared/llm-call.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'generate-document-content';
const FUNCTION_VERSION = '1.0.0';

type SectionType =
  | 'executive_summary'
  | 'market_analysis'
  | 'risk_assessment'
  | 'value_proposition'
  | 'testimonial'
  | 'market_description'
  | 'competitive_advantage'
  | 'market_trends'
  | 'partnership_objective';

interface GenerateContentRequest {
  section_type: SectionType;
  context: {
    business_name?: string;
    industry?: string;
    target_market?: string;
    revenue?: number;
    roi?: number;
    payback_months?: number;
    location?: string;
    [key: string]: unknown;
  };
  current_content?: string;
  count?: number;
}

function getStringField(ctx: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = ctx[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return fallback;
}

function getNumberField(ctx: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = ctx[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
}

function normalizeContext(rawContext: GenerateContentRequest['context']): GenerateContentRequest['context'] {
  const ctx = (rawContext ?? {}) as Record<string, unknown>;

  return {
    ...ctx,
    business_name: getStringField(ctx, ['business_name', 'company_name', 'your_company_name', 'market_name'], 'The Business'),
    industry: getStringField(ctx, ['industry', 'sector'], 'technology'),
    target_market: getStringField(
      ctx,
      ['target_market', 'target_customer_description', 'geographic_focus', 'territory'],
      'small and medium businesses'
    ),
    location: getStringField(ctx, ['location', 'geographic_focus', 'territory']),
    revenue: getNumberField(ctx, ['revenue', 'monthly_revenue', 'mrr']) ?? 0,
    roi: getNumberField(ctx, ['roi']) ?? 0,
    payback_months: getNumberField(ctx, ['payback_months', 'break_even_months']) ?? 0,
  };
}

const SECTION_PROMPTS: Record<SectionType, (ctx: GenerateContentRequest['context']) => string> = {
  executive_summary: (ctx) => `
Generate a compelling executive summary for a business plan.

Business: ${ctx.business_name}
Industry: ${ctx.industry}
Target Market: ${ctx.target_market}
${ctx.revenue ? `Monthly Revenue: $${ctx.revenue.toLocaleString()}` : ''}
${ctx.roi ? `ROI: ${ctx.roi}%` : ''}
${ctx.payback_months ? `Payback Period: ${ctx.payback_months} months` : ''}

Write a 200-300 word executive summary that:
1. Opens with the business opportunity and problem being solved
2. Highlights key financial metrics and market potential
3. Shows competitive advantages and unique value proposition
4. Closes with growth potential and investment opportunity

Tone: Professional, confident, data-driven. Avoid hype, focus on substance.
`,

  market_analysis: (ctx) => `
Generate a market analysis section for a business document.

Industry: ${ctx.industry}
Target Market: ${ctx.target_market}
Business: ${ctx.business_name}
${ctx.location ? `Location: ${ctx.location}` : ''}

Write a 250-350 word market analysis that includes:
1. Market overview and current trends
2. Target customer profile and pain points
3. Competitive landscape overview
4. Market opportunity and growth drivers

Use specific, realistic details. Avoid generic statements.
`,

  risk_assessment: (ctx) => `
Generate a risk assessment section for a business plan.

Business Type: ${ctx.business_name}
Industry: ${ctx.industry}
Target Market: ${ctx.target_market}

Identify and describe:
1. Top 5 business risks (operational, financial, market, regulatory, competitive)
2. Brief mitigation strategy for each risk
3. Overall risk level assessment

Be realistic and balanced. Investors appreciate honest risk acknowledgment.
Length: 200-300 words.
`,

  value_proposition: (ctx) => `
Generate a compelling value proposition statement.

Business: ${ctx.business_name}
Industry: ${ctx.industry}
Target Market: ${ctx.target_market}

Create a clear, compelling value proposition that:
1. Identifies the primary customer problem
2. Explains how the solution addresses it
3. Highlights key differentiators
4. States the measurable benefit

Length: 100-150 words. Be specific and avoid jargon.
`,

  testimonial: (ctx) => `
Generate a realistic customer testimonial draft.

Business: ${ctx.business_name}
Industry: ${ctx.industry}
Target Market: ${ctx.target_market}

Create a believable customer testimonial that:
1. Mentions a specific problem they faced
2. Describes how the solution helped
3. Includes a quantifiable result if possible
4. Feels authentic and natural

Length: 50-100 words. Include a placeholder name and title.
`,

  market_description: (ctx) => `
Generate a market description paragraph for a market analysis report.

Market: ${ctx.market_name || ctx.industry || 'Target Market'}
Industry: ${ctx.industry}
Geographic Focus: ${ctx.location || ctx.target_market}

Write 180-260 words covering:
1. What this market includes
2. Current market dynamics and demand patterns
3. Typical buyer behavior and decision criteria
4. Why this market is strategically relevant now

Use precise, realistic language and avoid vague generic claims.
`,

  competitive_advantage: (ctx) => `
Generate a strong competitive advantage section for a business document.

Business: ${ctx.business_name}
Industry: ${ctx.industry}
Target Market: ${ctx.target_market}

Write 140-220 words that clearly states:
1. The top 3 defensible advantages
2. Why competitors struggle to replicate them
3. How these advantages improve customer outcomes
4. How the business will sustain the edge over time

Make it concrete and specific, not buzzword-heavy.
`,

  market_trends: (ctx) => `
Generate a market trends section.

Industry: ${ctx.industry}
Market Focus: ${ctx.target_market}
Location: ${ctx.location || 'Global'}

Write 170-250 words describing:
1. 3-5 major trends shaping the market
2. Which trends are tailwinds vs risks
3. How these trends impact pricing, demand, and competition
4. Which trends the business should prioritize in execution

Keep it actionable and specific.
`,

  partnership_objective: (ctx) => `
Generate a partnership objective section for a partnership proposal.

Your Company: ${ctx.your_company_name || ctx.business_name || 'Our Company'}
Partner Company: ${ctx.partner_company_name || 'Partner Company'}
Partnership Type: ${ctx.partnership_type || 'Strategic Partnership'}

Write 140-220 words that defines:
1. The strategic objective of the partnership
2. The mutual value each side should receive
3. The measurable outcomes expected in 12-24 months
4. Why this partnership is timely and strategically aligned

Use formal business language and clear strategic intent.
`,
};

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('generate-document-content', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', user.id)
      .single();

    const isPlusUser = subscription &&
      subscription.plan_id === 'plus' &&
      (subscription.status === 'active' || subscription.status === 'trialing');

    if (!isPlusUser) {
      return new Response(
        JSON.stringify({ error: 'Plus subscription required for AI document generation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: GenerateContentRequest = await req.json();
    const { section_type, current_content, count = 3 } = body;
    const context = normalizeContext(body.context ?? {});

    if (!section_type || !SECTION_PROMPTS[section_type]) {
      return new Response(
        JSON.stringify({ error: 'Invalid section type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    const basePrompt = SECTION_PROMPTS[section_type](context);
    const prompt = current_content
      ? `${basePrompt}\n\nCurrent content for reference (improve upon this):\n"${current_content.substring(0, 500)}"`
      : basePrompt;

    const suggestions: string[] = [];
    const safeCount = Math.max(1, Math.min(Number(count) || 3, 3));

    for (let i = 0; i < safeCount; i++) {
      const result = await aiCall(
        {
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a professional business writer specializing in compelling, data-driven business documents. Write clearly, concisely, and in plain text only. No markdown.'
            },
            {
              role: 'user',
              content: prompt + (i > 0 ? `\n\nProvide a substantially different variation (alternative ${i + 1}).` : '')
            }
          ],
          max_tokens: 800,
          temperature: 0.65 + (i * 0.1),
        },
        { task: 'generate-document-content', userId: user.id, metadata: { section_type, variation: i + 1 } },
      );

      if (!result.ok) {
        log.error(`[generate-document-content] AI error ${result.status} for suggestion ${i + 1}: ${result.error}`);

        if (result.status === 429) {
          return new Response(
            JSON.stringify({
              error: 'AI suggestion generation is temporarily rate-limited. Please retry in a moment.',
              code: 'AI_RATE_LIMIT',
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (result.status === 402) {
          return new Response(
            JSON.stringify({
              error: 'AI credits are currently unavailable. Please top up workspace usage and retry.',
              code: 'AI_PAYMENT_REQUIRED',
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        continue;
      }

      const choices = result.data.choices as Array<{ message?: { content?: string } }> | undefined;
      const content = choices?.[0]?.message?.content?.trim();
      if (content) suggestions.push(content);
    }

    if (suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions from AI service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log.info(`[generate-document-content] User ${user.id} generated ${suggestions.length} suggestions for ${section_type}`);

    return new Response(
      JSON.stringify({
        success: true,
        section_type,
        suggestions,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    log.error('[generate-document-content] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});