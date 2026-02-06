import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GenerateContentRequest {
  section_type: 'executive_summary' | 'market_analysis' | 'risk_assessment' | 'value_proposition' | 'testimonial';
  context: {
    business_name: string;
    industry: string;
    target_market: string;
    revenue?: number;
    roi?: number;
    payback_months?: number;
    location?: string;
    [key: string]: unknown;
  };
  current_content?: string;
  count?: number;
}

const SECTION_PROMPTS: Record<string, (ctx: GenerateContentRequest['context']) => string> = {
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
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify Plus subscription (Docs Studio is Plus-only)
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

    // Parse request
    const body: GenerateContentRequest = await req.json();
    const { section_type, context, current_content, count = 3 } = body;

    if (!section_type || !SECTION_PROMPTS[section_type]) {
      return new Response(
        JSON.stringify({ error: 'Invalid section type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate prompt
    const basePrompt = SECTION_PROMPTS[section_type](context);
    const prompt = current_content 
      ? `${basePrompt}\n\nCurrent content for reference (improve upon this):\n"${current_content.substring(0, 500)}"`
      : basePrompt;

    // Call Lovable AI (uses OpenRouter internally)
    const suggestions: string[] = [];
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a professional business writer specializing in creating compelling, data-driven business documents. Write clearly and professionally. Do not use markdown formatting - provide plain text only.'
            },
            {
              role: 'user',
              content: prompt + (i > 0 ? `\n\nProvide a different variation (alternative ${i + 1}).` : '')
            }
          ],
          max_tokens: 800,
          temperature: 0.7 + (i * 0.1), // Slight variation in temperature for diversity
        }),
      });

      if (!response.ok) {
        console.error(`AI API error for suggestion ${i}:`, await response.text());
        continue;
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content?.trim();
      
      if (content) {
        suggestions.push(content);
      }
    }

    if (suggestions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log usage for analytics
    console.log(`[generate-document-content] User ${user.id} generated ${suggestions.length} suggestions for ${section_type}`);

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
    console.error('[generate-document-content] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
