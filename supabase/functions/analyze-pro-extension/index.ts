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
import { aiCall } from '../_shared/llm-call.ts';
import {
  CANONICAL_DATA_SOURCES_PROMPT,
  canonicalDataSourcesAsStrings,
  mergeCanonicalDataSources,
} from '../_shared/canonical-data-sources.ts';

const DEFAULT_MODEL = 'deepseek-chat'; // llm-call.ts auto-routes to DeepSeek API

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

    const aiResult = await aiCall(
      {
        model: body.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: `${system}\n\n${CANONICAL_DATA_SOURCES_PROMPT}` },
          { role: 'user', content: userBlock },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: budget.max_tokens,
        response_format: { type: 'json_object' },
      },
      {
        task: 'analyze-pro-extension',
        timeoutMs: budget.timeout_ms,
        injectUniversalRules: false,
        userId: gate.userId,
        requestId,
        metadata: { tier: gate.tier, endpoint: 'ANALYSE_PRO_EXTENSION' },
      },
    );
    if (!aiResult.ok) {
      return json({ success: false, error: aiResult.error, message: aiResult.message }, aiResult.status);
    }
    const aiJson = aiResult.data as { choices?: Array<{ message?: { content?: string } }> };
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

    // Force canonical provenance into data_sources (merge, dedup) so PRO PDFs
    // cite the same ingested datasets as Free/Plus tiers.
    const incomingSources = Array.isArray(parsed.data_sources)
      ? (parsed.data_sources as unknown[]).filter((s): s is string => typeof s === 'string')
      : typeof parsed.sources === 'string'
        ? (parsed.sources as string).split(/[,;]\s*/).filter(Boolean)
        : [];
    parsed.data_sources = mergeCanonicalDataSources(incomingSources);
    parsed.sources = canonicalDataSourcesAsStrings().join('; ');

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
