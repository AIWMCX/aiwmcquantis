/**
 * AIWMC Quantis — PRO Tier Extension Edge Function
 * ------------------------------------------------
 * Master Spec v1.0 §05.2. Extends a completed PLUS analysis with
 * investor-grade modules (5-year model, TAM/SAM/SOM, pitch deck data,
 * 12-week strategic roadmap).
 *
 * Pipeline:
 *   1. tierGate(ENDPOINTS.ANALYSE_PRO_EXTENSION) — PRO-only.
 *   2. Validate plus_analysis (must contain a valid PLUS JSON).
 *   3. Build PRO extension prompt.
 *   4. Lovable AI Gateway call.
 *   5. Strip output to PRO manifest (which is __ALL__ — pass-through).
 *
 * Returns: { success: true, data: ProExtensionJson, request_id, tier: 'PRO' }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { tierGate } from '../_shared/tier-gate.ts';
import { buildSystemPrompt } from '../_shared/prompts.ts';
import { ENDPOINTS } from '../_shared/tier-spec.ts';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-pro';

interface ProRequestBody {
  plus_analysis: Record<string, unknown>;
  market_data?: Record<string, unknown>;
  model?: string;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const requestId = crypto.randomUUID();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });

  try {
    const gate = await tierGate(req, ENDPOINTS.ANALYSE_PRO_EXTENSION);
    if (gate.blocked) return json(gate.body, gate.status);

    const body = (await req.json().catch(() => ({}))) as ProRequestBody;
    if (!body.plus_analysis || typeof body.plus_analysis !== 'object') {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'plus_analysis is required (run /analyze-plus first).',
        },
        400,
      );
    }
    if (body.plus_analysis.tier !== 'PLUS' && body.plus_analysis.tier !== 'PRO') {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'plus_analysis.tier must be "PLUS" (or "PRO" for refresh).',
        },
        400,
      );
    }

    const { system, budget } = buildSystemPrompt('PRO', 'pro_extension');
    const userBlock = [
      `PARENT_ANALYSIS_ID: ${(body.plus_analysis.analysis_id as string) ?? requestId}`,
      ``,
      `PLUS_ANALYSIS_CONTEXT:`,
      JSON.stringify(body.plus_analysis, null, 2),
      ``,
      `MARKET_DATA_CONTEXT:`,
      JSON.stringify(body.market_data ?? {}, null, 2),
    ].join('\n');

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      return json({ success: false, error: 'CONFIG', message: 'AI gateway key missing.' }, 500);
    }

    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userBlock },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: budget.max_tokens,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(budget.timeout_ms),
    });

    if (aiResp.status === 429) {
      return json({ success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'AI rate-limited.' }, 429);
    }
    if (aiResp.status === 402) {
      return json(
        { success: false, error: 'AI_CREDITS_EXHAUSTED', message: 'AI workspace out of credits.' },
        402,
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text().catch(() => '');
      console.error('[analyze-pro-extension] AI error', aiResp.status, t);
      return json({ success: false, error: 'AI_ERROR', message: 'AI extension failed.' }, 502);
    }

    const aiJson = await aiResp.json();
    const rawContent = aiJson.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch {
      return json(
        { success: false, error: 'SCHEMA_PARSE', message: 'Model returned invalid JSON.' },
        502,
      );
    }

    parsed.tier = 'PRO';
    parsed.parent_analysis_id =
      (parsed.parent_analysis_id as string) ||
      (body.plus_analysis.analysis_id as string) ||
      requestId;
    parsed.pro_generated_at = (parsed.pro_generated_at as string) || new Date().toISOString();

    return json({
      success: true,
      tier: 'PRO',
      request_id: requestId,
      data: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-pro-extension] fatal', message);
    return json({ success: false, error: 'INTERNAL', message, request_id: requestId }, 500);
  }
});
