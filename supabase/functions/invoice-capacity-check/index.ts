/**
 * AIWMC Quantis — Invoice & Capacity Check Edge Function
 * ------------------------------------------------------
 * Master Spec v1.0 §04.4. PLUS-tier sub-prompt: should the user accept a
 * new client engagement given current cash position + capacity?
 *
 * Returns one of: ACCEPT | ACCEPT_WITH_CONDITIONS | DECLINE
 * with cash-flow bridge, capacity assessment, and engagement economics.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { tierGate } from '../_shared/tier-gate.ts';
import { buildSystemPrompt } from '../_shared/prompts.ts';
import { ENDPOINTS } from '../_shared/tier-spec.ts';
import { aiCall } from '../_shared/llm-call.ts';

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

interface CapacityRequestBody {
  current_monthly_revenue_usd: number;
  current_monthly_costs_usd: number;
  current_team_capacity_pct: number;
  new_client_monthly_revenue_usd: number;
  new_client_setup_cost_usd: number;
  new_client_capacity_required_pct: number;
  new_client_payment_terms_days: number;
  current_cash_reserve_usd: number;
  parent_analysis_id?: string;
  model?: string;
}

const REQUIRED_FIELDS: (keyof CapacityRequestBody)[] = [
  'current_monthly_revenue_usd',
  'current_monthly_costs_usd',
  'current_team_capacity_pct',
  'new_client_monthly_revenue_usd',
  'new_client_setup_cost_usd',
  'new_client_capacity_required_pct',
  'new_client_payment_terms_days',
  'current_cash_reserve_usd',
];

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
    const gate = await tierGate(req, ENDPOINTS.TOOLS_CAPACITY_CHECK);
    if (gate.blocked) return json(gate.body, gate.status);

    const body = (await req.json().catch(() => ({}))) as Partial<CapacityRequestBody>;
    const missing = REQUIRED_FIELDS.filter((k) => typeof body[k] !== 'number');
    if (missing.length) {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Missing or non-numeric fields: ${missing.join(', ')}`,
        },
        400,
      );
    }

    // Bound checks (defensive: prevent absurd inputs from poisoning the LLM)
    if (body.current_team_capacity_pct! < 0 || body.current_team_capacity_pct! > 100) {
      return json(
        { success: false, error: 'VALIDATION_ERROR', message: 'current_team_capacity_pct must be 0-100.' },
        400,
      );
    }
    if (body.new_client_capacity_required_pct! < 0 || body.new_client_capacity_required_pct! > 100) {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'new_client_capacity_required_pct must be 0-100.',
        },
        400,
      );
    }
    if (body.new_client_payment_terms_days! < 0 || body.new_client_payment_terms_days! > 365) {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'new_client_payment_terms_days must be 0-365.',
        },
        400,
      );
    }

    const { system, budget } = buildSystemPrompt('PLUS', 'capacity_check');
    const userBlock = [
      `current_monthly_revenue_usd: ${body.current_monthly_revenue_usd}`,
      `current_monthly_costs_usd: ${body.current_monthly_costs_usd}`,
      `current_team_capacity_pct: ${body.current_team_capacity_pct}`,
      `new_client_monthly_revenue_usd: ${body.new_client_monthly_revenue_usd}`,
      `new_client_setup_cost_usd: ${body.new_client_setup_cost_usd}`,
      `new_client_capacity_required_pct: ${body.new_client_capacity_required_pct}`,
      `new_client_payment_terms_days: ${body.new_client_payment_terms_days}`,
      `current_cash_reserve_usd: ${body.current_cash_reserve_usd}`,
      body.parent_analysis_id ? `parent_analysis_id: ${body.parent_analysis_id}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const aiResult = await aiCall(
      {
        model: body.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userBlock },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: 2_400,
        response_format: { type: 'json_object' },
      },
      {
        task: 'invoice-capacity-check',
        timeoutMs: 30_000,
        injectUniversalRules: false,
        userId: gate.userId,
        requestId,
        metadata: { tier: gate.tier, endpoint: 'TOOLS_CAPACITY_CHECK' },
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

    parsed.module = 'INVOICE_CAPACITY_CHECK';

    return json({
      success: true,
      tier: gate.tier,
      request_id: requestId,
      data: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[invoice-capacity-check] fatal', message);
    return json({ success: false, error: 'INTERNAL', message, request_id: requestId }, 500);
  }
});
