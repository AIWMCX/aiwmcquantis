/**
 * AIWMC Quantis — PLUS Tier Main Analysis Edge Function
 * ----------------------------------------------------
 * Master Spec v1.0 §04.2. Entry point for the PLUS-tier full analysis.
 *
 * Pipeline:
 *   1. tierGate(ENDPOINTS.ANALYSE_MAIN) — enforce PLUS+ subscription.
 *   2. Validate + sanitize inputs (reuse analyze-business safety guardrails).
 *   3. Receive pre-computed MONTE_CARLO_DATA from the client (browser engine,
 *      src/lib/monte-carlo.ts). Spec calls for 95,500 scenarios; the client
 *      decides the actual count and the LLM only references what it sees.
 *   4. Build PLUS system prompt via buildSystemPrompt('PLUS', 'main').
 *   5. Lovable AI Gateway call (google/gemini-2.5-pro by default).
 *   6. Strip non-PLUS fields per FEATURE_MANIFEST.allowed_output_fields.
 *   7. Increment monthly usage and persist to ai_calls / analyses (best-effort).
 *
 * Returns: { success: true, data: PlusAnalysisJson, request_id, tier: 'PLUS' }
 *          or 402 TierGateBlock body on insufficient tier.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';
import { tierGate, incrementMonthlyUsage } from '../_shared/tier-gate.ts';
import { buildSystemPrompt } from '../_shared/prompts.ts';
import { ENDPOINTS, type FeatureManifest } from '../_shared/tier-spec.ts';
import { validateAndSanitizeInput } from '../_shared/ai-safety-guardrails.ts';
import { logAnalysisEvent } from '../_shared/analysis-event-logger.ts';
import { aiCall } from '../_shared/llm-call.ts';

const DEFAULT_MODEL = 'google/gemini-2.5-pro';

interface PlusRequestBody {
  idea: string;
  location: string;
  industry?: string;
  stage?: 'IDEA' | 'EARLY' | 'GROWTH' | 'ESTABLISHED';
  monte_carlo_data: unknown; // result from src/lib/monte-carlo.ts
  model?: string;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });

  try {
    // ── 1. Tier gate (PLUS+) ────────────────────────────────────────────────
    const gate = await tierGate(req, ENDPOINTS.ANALYSE_MAIN);
    if (gate.blocked) {
      return json(gate.body, gate.status);
    }
    // Even though FREE can hit ANALYSE_MAIN per manifest, the PLUS *prompt*
    // requires PLUS+. Hard-enforce here:
    if (gate.tier === 'FREE') {
      return json(
        {
          success: false,
          error: 'TIER_GATE',
          message: 'PLUS subscription required for full analysis.',
          required_tier: 'PLUS',
          upgrade_url: 'https://www.aiwmcquantis.com/pricing',
          cta: 'Upgrade to Plus — $17/mo',
        },
        402,
      );
    }

    // ── 2. Parse + validate body ────────────────────────────────────────────
    const body = (await req.json().catch(() => ({}))) as PlusRequestBody;
    if (!body.idea || !body.location) {
      return json(
        { success: false, error: 'VALIDATION_ERROR', message: 'idea and location are required.' },
        400,
      );
    }
    if (!body.monte_carlo_data || typeof body.monte_carlo_data !== 'object') {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message:
            'monte_carlo_data is required (run src/lib/monte-carlo.ts on the client first).',
        },
        400,
      );
    }
    const safety = validateAndSanitizeInput(body.idea, body.location, 5000, 200);
    if (safety.blocked) {
      return json(
        {
          success: false,
          error: 'INVALID_BUSINESS_IDEA',
          message: safety.blockReason ?? 'Input rejected by safety layer.',
        },
        400,
      );
    }

    // ── 3. Build system prompt + LLM payload ────────────────────────────────
    const { system, budget } = buildSystemPrompt('PLUS', 'main');
    const userBlock = [
      `BUSINESS_IDEA: ${safety.sanitizedIdea}`,
      `LOCATION: ${safety.sanitizedLocation}`,
      `USER_INDUSTRY: ${body.industry ?? 'unspecified'}`,
      `USER_STAGE: ${body.stage ?? 'IDEA'}`,
      `ANALYSIS_ID: ${requestId}`,
      ``,
      `MONTE_CARLO_DATA:`,
      JSON.stringify(body.monte_carlo_data, null, 2),
    ].join('\n');

    const aiResult = await aiCall(
      {
        model: body.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userBlock },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: budget.max_tokens,
        response_format: { type: 'json_object' },
      },
      {
        task: 'analyze-plus',
        timeoutMs: budget.timeout_ms,
        injectUniversalRules: false, // already prepended by buildSystemPrompt
        analysisId: requestId,
        userId: gate.userId,
        requestId,
        metadata: { tier: gate.tier, endpoint: 'ANALYSE_MAIN' },
      },
    );

    if (!aiResult.ok) {
      const code = aiResult.error;
      const status = aiResult.status;
      await logAnalysisEvent({
        analysis_id: requestId, user_id: gate.userId, event_type: 'engine_error',
        severity: 'error', payload: { code, status },
      });
      return json({ success: false, error: code, message: aiResult.message }, status);
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

    // ── 4. Strip fields per tier manifest (defence in depth) ────────────────
    const stripped = stripToManifest(parsed, gate.manifest);
    // Ensure spec invariants are present
    stripped.tier = 'PLUS';
    stripped.analysis_id = (stripped.analysis_id as string) || requestId;
    stripped.generated_at = (stripped.generated_at as string) || new Date().toISOString();

    // ── 5. Best-effort persistence + usage increment ────────────────────────
    if (gate.userId) {
      try {
        await incrementMonthlyUsage(gate.userId);
      } catch (e) {
        console.warn('[analyze-plus] usage increment failed', e);
      }
      try {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        await admin.from('analyses').insert({
          id: stripped.analysis_id as string,
          user_id: gate.userId,
          idea: safety.sanitizedIdea,
          location: safety.sanitizedLocation,
          result: stripped,
          tier_at_creation: 'plus',
          depth: 'full',
          confidence_score: typeof (stripped as any)?.confidence_score === 'number'
            ? (stripped as any).confidence_score : null,
        });
      } catch (e) {
        console.warn('[analyze-plus] persist failed', e);
      }
    }

    // Observability: success event
    const durationMs = Date.now() - startedAt;
    await logAnalysisEvent({
      analysis_id: stripped.analysis_id as string,
      user_id: gate.userId,
      event_type: 'analysis_complete',
      severity: 'info',
      payload: {
        durationMs,
        confidence: (stripped as any)?.confidence_score ?? null,
        depth: 'full',
        tier: 'PLUS',
        model: body.model ?? DEFAULT_MODEL,
        industry_detected: (stripped as any)?.industry_detected ?? null,
        reconciled: (stripped as any)?.validation?.reconciled ?? null,
      },
    });
    if (durationMs > 30_000) {
      await logAnalysisEvent({
        analysis_id: stripped.analysis_id as string,
        user_id: gate.userId,
        event_type: 'performance_warning',
        severity: 'warning',
        payload: { code: 'QE-PERF-001', durationMs, threshold: 30_000 },
      });
    }

    return json({
      success: true,
      tier: 'PLUS',
      request_id: requestId,
      data: stripped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-plus] fatal', message);
    await logAnalysisEvent({
      analysis_id: requestId,
      event_type: 'engine_error',
      severity: 'error',
      payload: { code: 'INTERNAL', message: message.slice(0, 500) },
    });
    // WS3: always HTTP 200 — client retries silently on ok:false
    return json({ ok: false, degraded: true, reason: 'internal', success: false,
      error: 'The analysis engine hit a transient error. Your inputs are preserved — please retry.',
      code: 'INTERNAL', request_id: requestId }, 200);
  }
});

/** Field-level allowlist enforcement per Master Spec §08. */
function stripToManifest(
  obj: Record<string, unknown>,
  manifest: FeatureManifest,
): Record<string, unknown> {
  if (manifest.allowed_output_fields === '__ALL__') return obj;
  const allow = new Set<string>(manifest.allowed_output_fields as readonly string[]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (allow.has(k)) out[k] = v;
  }
  return out;
}
