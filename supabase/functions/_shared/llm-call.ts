/**
 * AIWMC Quantis — Universal LLM call helper.
 *
 * `aiCall()` is now multi-provider. Public signature is unchanged; callers
 * pass a Lovable/OpenAI-shaped body and `opts.task`. The router picks the
 * actual provider+model (DeepSeek primary by default; Anthropic/Lovable
 * Gateway as fallbacks). On primary failure the router's fallback is tried
 * once before bubbling the error to the caller.
 *
 * Telemetry (`public.ai_calls`) records the *actual* provider/model used,
 * fallback usage, latency, tokens and an estimated cost.
 *
 * `callTierLlm()` is unchanged externally — it composes via `aiCall()`.
 */

import {
  LLM_BUDGET,
  stripToTierFields,
  type Tier,
} from './tier-spec.ts';
import {
  buildSystemPrompt,
  type PromptModule,
  UNIVERSAL_RULES,
} from './prompts.ts';
import {
  resolveRoute,
  recordSuccess,
  recordFailure,
  estimateCost,
  type Provider,
  type RouteDecision,
} from './llm-router.ts';
import { callDeepseek } from './deepseek.ts';
import { callClaude, type ClaudeModel } from './anthropic.ts';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 30_000;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ─────────────────────────────────────────────────────────────────────────────
// Generic wrapper: aiCall
// ─────────────────────────────────────────────────────────────────────────────

export type GatewayMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface GatewayMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | GatewayMessageContentPart[];
  [k: string]: unknown;
}

export interface GatewayRequestBody {
  model?: string;
  messages: GatewayMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
  tools?: unknown[];
  tool_choice?: unknown;
  [k: string]: unknown;
}

export interface AiCallOptions {
  task: string;
  analysisId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  timeoutMs?: number;
  injectUniversalRules?: boolean;
  skipTelemetry?: boolean;
  metadata?: Record<string, unknown>;
}

export type AiCallError =
  | { ok: false; status: 402; error: 'AI_CREDITS_EXHAUSTED'; message: string; latencyMs: number }
  | { ok: false; status: 429; error: 'RATE_LIMIT_EXCEEDED'; message: string; latencyMs: number }
  | { ok: false; status: 502; error: 'AI_ERROR'; message: string; detail?: string; latencyMs: number }
  | { ok: false; status: 504; error: 'AI_TIMEOUT'; message: string; latencyMs: number }
  | { ok: false; status: 500; error: 'CONFIG'; message: string; latencyMs: number };

export interface AiCallSuccess {
  ok: true;
  status: 200;
  data: Record<string, unknown>;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export type AiCallResult = AiCallSuccess | AiCallError;

// ── aiCall — router-aware ─────────────────────────────────────────────

export async function aiCall(
  body: GatewayRequestBody,
  opts: AiCallOptions,
): Promise<AiCallResult> {
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const inject = opts.injectUniversalRules !== false;

  // Inject UNIVERSAL_RULES into first system message
  const finalMessages: GatewayMessage[] = [...body.messages];
  if (inject && finalMessages.length > 0) {
    const firstSystemIdx = finalMessages.findIndex((m) => m.role === 'system');
    if (firstSystemIdx >= 0) {
      const original = finalMessages[firstSystemIdx];
      const originalText =
        typeof original.content === 'string'
          ? original.content
          : original.content.map((p) => (p.type === 'text' ? p.text : '')).join('\n');
      if (!originalText.startsWith('=== QUANTIS UNIVERSAL RULES')) {
        finalMessages[firstSystemIdx] = {
          ...original,
          content: `${UNIVERSAL_RULES}\n\n${originalText}`,
        };
      }
    } else {
      finalMessages.unshift({ role: 'system', content: UNIVERSAL_RULES });
    }
  }

  const baseBody: GatewayRequestBody = { ...body, messages: finalMessages };
  const route = resolveRoute(opts.task, body.model);

  // Try primary
  const primaryResult = await dispatch(route.provider, route.model, baseBody, timeoutMs);

  if (primaryResult.ok) {
    recordSuccess(route.provider);
    return finalize({
      result: primaryResult,
      route,
      providerUsed: route.provider,
      modelUsed: route.model,
      fallbackUsed: false,
      start,
      opts,
    });
  }

  // Hard errors — don't retry on credits exhausted (cost protection)
  if (primaryResult.status === 402) {
    recordFailure(route.provider);
    return finalize({
      result: primaryResult,
      route,
      providerUsed: route.provider,
      modelUsed: route.model,
      fallbackUsed: false,
      start,
      opts,
    });
  }

  recordFailure(route.provider);

  // Try fallback if defined
  if (route.fallback) {
    const fb = route.fallback;
    const fbResult = await dispatch(fb.provider, fb.model, baseBody, timeoutMs);
    if (fbResult.ok) {
      recordSuccess(fb.provider);
      return finalize({
        result: fbResult,
        route,
        providerUsed: fb.provider,
        modelUsed: fb.model,
        fallbackUsed: true,
        start,
        opts,
        primaryError: primaryResult,
      });
    }
    recordFailure(fb.provider);
    return finalize({
      result: fbResult,
      route,
      providerUsed: fb.provider,
      modelUsed: fb.model,
      fallbackUsed: true,
      start,
      opts,
      primaryError: primaryResult,
    });
  }

  return finalize({
    result: primaryResult,
    route,
    providerUsed: route.provider,
    modelUsed: route.model,
    fallbackUsed: false,
    start,
    opts,
  });
}

// ── Dispatcher ────────────────────────────────────────────────────────

interface DispatchResult {
  ok: boolean;
  status: number;
  data?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

async function dispatch(
  provider: Provider,
  model: string,
  body: GatewayRequestBody,
  timeoutMs: number,
): Promise<DispatchResult> {
  if (provider === 'deepseek') {
    return callDeepseek({ ...body, model }, timeoutMs);
  }
  if (provider === 'anthropic') {
    return callAnthropicShim(model, body, timeoutMs);
  }
  return callLovableGateway(model, body, timeoutMs);
}

async function callLovableGateway(
  model: string,
  body: GatewayRequestBody,
  timeoutMs: number,
): Promise<DispatchResult> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) return { ok: false, status: 500, error: 'CONFIG' };

  let resp: Response;
  try {
    resp = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, model }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed';
    const isAbort = /abort|timeout|deadline/i.test(message);
    return { ok: false, status: isAbort ? 504 : 502, error: isAbort ? 'AI_TIMEOUT' : 'AI_ERROR', detail: message };
  }

  if (resp.status === 429) {
    await resp.text().catch(() => '');
    return { ok: false, status: 429, error: 'RATE_LIMIT_EXCEEDED' };
  }
  if (resp.status === 402) {
    await resp.text().catch(() => '');
    return { ok: false, status: 402, error: 'AI_CREDITS_EXHAUSTED' };
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    return { ok: false, status: 502, error: 'AI_ERROR', detail: detail.slice(0, 400) };
  }
  const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return { ok: false, status: 502, error: 'AI_NO_BODY' };
  return { ok: true, status: 200, data };
}

/**
 * Anthropic shim — converts OpenAI-shaped body → Claude Messages call,
 * and returns a Lovable/OpenAI-shaped response.
 *
 * Limitations (Phase 0a):
 *  - If body has `tools` or multimodal image_url content, returns 502
 *    so the router tries fallback. Anthropic tool-use shape is different
 *    and not worth shimming for tool-bound callers.
 */
async function callAnthropicShim(
  model: string,
  body: GatewayRequestBody,
  timeoutMs: number,
): Promise<DispatchResult> {
  if (body.tools || body.tool_choice) {
    return { ok: false, status: 502, error: 'AI_ERROR', detail: 'anthropic_shim_no_tools' };
  }

  // Concatenate all system messages, the rest become user/assistant turns.
  const systemParts: string[] = [];
  const userParts: string[] = [];
  for (const m of body.messages) {
    const text =
      typeof m.content === 'string'
        ? m.content
        : m.content
            .map((p) => (p.type === 'text' ? p.text : ''))
            .filter(Boolean)
            .join('\n');
    if (m.role === 'system') systemParts.push(text);
    else if (m.role === 'assistant') userParts.push(`[assistant]\n${text}`);
    else userParts.push(text);
  }

  const claudeModel = (model as ClaudeModel) || 'claude-sonnet-4-5';
  const start = Date.now();
  const _ = timeoutMs; // callClaude has its own internal timing; honored by Deno fetch defaults

  const result = await callClaude({
    model: claudeModel,
    system: systemParts.join('\n\n') || 'You are a helpful assistant.',
    user: userParts.join('\n\n'),
    maxTokens: body.max_tokens ?? 1024,
    temperature: body.temperature ?? 0.2,
    json: body.response_format?.type === 'json_object',
  });

  if (!result.ok) {
    return { ok: false, status: 502, error: 'AI_ERROR', detail: result.error ?? 'anthropic_failed' };
  }

  // Re-shape to Lovable/OpenAI response so downstream parsers work.
  const data: Record<string, unknown> = {
    model: result.model,
    choices: [{ message: { role: 'assistant', content: result.text } }],
    usage: {
      prompt_tokens: result.inputTokens,
      completion_tokens: result.outputTokens,
    },
    _latencyMs: Date.now() - start,
  };
  return { ok: true, status: 200, data };
}

// ── Finalize: error mapping, telemetry, return shape ─────────────────

interface FinalizeArgs {
  result: DispatchResult;
  route: RouteDecision;
  providerUsed: Provider;
  modelUsed: string;
  fallbackUsed: boolean;
  start: number;
  opts: AiCallOptions;
  primaryError?: DispatchResult;
}

function finalize(args: FinalizeArgs): AiCallResult {
  const latencyMs = Date.now() - args.start;
  const r = args.result;

  // Map error → AiCallError
  if (!r.ok) {
    const meta = {
      ...(args.opts.metadata ?? {}),
      route_reason: args.route.reason,
      provider: args.providerUsed,
      model: args.modelUsed,
      fallback_used: args.fallbackUsed,
      primary_error: args.primaryError?.error,
    };
    void recordAiCall({
      ok: false,
      task: args.opts.task,
      provider: args.providerUsed,
      model: args.modelUsed,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      analysisId: args.opts.analysisId ?? null,
      userId: args.opts.userId ?? null,
      requestId: args.opts.requestId ?? null,
      error: r.error ?? `STATUS_${r.status}`,
      metadata: meta,
      skip: args.opts.skipTelemetry,
    });

    if (r.status === 402) {
      return { ok: false, status: 402, error: 'AI_CREDITS_EXHAUSTED', message: 'AI workspace credits exhausted.', latencyMs };
    }
    if (r.status === 429) {
      return { ok: false, status: 429, error: 'RATE_LIMIT_EXCEEDED', message: 'AI gateway rate-limited. Please retry shortly.', latencyMs };
    }
    if (r.status === 504) {
      return { ok: false, status: 504, error: 'AI_TIMEOUT', message: `AI gateway timed out.`, latencyMs };
    }
    if (r.status === 500 && r.error === 'CONFIG') {
      return { ok: false, status: 500, error: 'CONFIG', message: 'LLM provider not configured.', latencyMs };
    }
    return {
      ok: false,
      status: 502,
      error: 'AI_ERROR',
      message: `AI provider error (${args.providerUsed}).`,
      detail: r.detail,
      latencyMs,
    };
  }

  // Success
  const data = r.data ?? {};
  const usage = (data.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;

  void recordAiCall({
    ok: true,
    task: args.opts.task,
    provider: args.providerUsed,
    model: args.modelUsed,
    latencyMs,
    inputTokens,
    outputTokens,
    analysisId: args.opts.analysisId ?? null,
    userId: args.opts.userId ?? null,
    requestId: args.opts.requestId ?? null,
    metadata: {
      ...(args.opts.metadata ?? {}),
      route_reason: args.route.reason,
      fallback_used: args.fallbackUsed,
      primary_error: args.primaryError?.error,
    },
    skip: args.opts.skipTelemetry,
  });

  return { ok: true, status: 200, data, latencyMs, inputTokens, outputTokens };
}

// ── Telemetry ─────────────────────────────────────────────────────────

interface RecordArgs {
  ok: boolean;
  task: string;
  provider: Provider;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  analysisId: string | null;
  userId: string | null;
  requestId: string | null;
  error?: string;
  metadata?: Record<string, unknown>;
  skip?: boolean;
}

async function recordAiCall(args: RecordArgs): Promise<void> {
  if (args.skip) return;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  try {
    const cost = args.ok ? estimateCost(args.model, args.inputTokens, args.outputTokens) : 0;
    const row = {
      task: args.task,
      provider: args.provider,
      model: args.model,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      cost_usd: cost,
      latency_ms: Math.round(args.latencyMs),
      ok: args.ok,
      error: args.error ?? null,
      analysis_id: args.analysisId,
      user_id: args.userId,
      request_id: args.requestId,
      metadata: args.metadata ?? null,
    };
    await fetch(`${SUPABASE_URL}/rest/v1/ai_calls`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
  } catch {
    /* telemetry must never throw */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier-bound helper (kept from previous version)
// ─────────────────────────────────────────────────────────────────────────────

export interface LlmCallArgs {
  tier: Tier;
  module?: PromptModule;
  userMessage: string;
  model?: string;
  systemOverride?: string;
  skipFieldStrip?: boolean;
  task?: string;
  analysisId?: string | null;
  userId?: string | null;
  requestId?: string | null;
}

export type LlmCallError =
  | { ok: false; status: 402; error: 'AI_CREDITS_EXHAUSTED'; message: string }
  | { ok: false; status: 429; error: 'RATE_LIMIT_EXCEEDED'; message: string }
  | { ok: false; status: 502; error: 'AI_ERROR'; message: string; detail?: string }
  | { ok: false; status: 502; error: 'SCHEMA_PARSE'; message: string; attempts: number }
  | { ok: false; status: 500; error: 'CONFIG'; message: string };

export type LlmCallSuccess = {
  ok: true;
  data: Record<string, unknown>;
  attempts: number;
  raw_content: string;
};

export type LlmCallResult = LlmCallSuccess | LlmCallError;

export async function callTierLlm(args: LlmCallArgs): Promise<LlmCallResult> {
  const { tier, module = 'main', userMessage, model, systemOverride, skipFieldStrip } = args;

  const built = buildSystemPrompt(tier, module);
  const system = systemOverride ?? built.system;
  const budget = LLM_BUDGET[tier];

  const maxAttempts = Math.max(1, 1 + budget.retry_on_schema_fail);
  let lastParseError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await aiCall(
      {
        // model passthrough — router will resolve based on task if no prefix
        ...(model ? { model } : {}),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMessage },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: budget.max_tokens,
        response_format: { type: budget.response_format },
      },
      {
        task: args.task ?? `tier:${tier}:${module}`,
        timeoutMs: budget.timeout_ms,
        injectUniversalRules: false,
        analysisId: args.analysisId ?? null,
        userId: args.userId ?? null,
        requestId: args.requestId ?? null,
        metadata: { tier, module, attempt },
      },
    );

    if (!result.ok) {
      if (result.error === 'AI_TIMEOUT') {
        return { ok: false, status: 502, error: 'AI_ERROR', message: 'AI gateway timed out.', detail: result.message };
      }
      return result as LlmCallError;
    }

    const choices = result.data.choices as Array<{ message?: { content?: string } }> | undefined;
    const rawContent = choices?.[0]?.message?.content ?? '';
    if (!rawContent) {
      lastParseError = 'empty content';
      continue;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch (err) {
      lastParseError = err instanceof Error ? err.message : 'parse failed';
      continue;
    }
    const data = skipFieldStrip
      ? parsed
      : (stripToTierFields(parsed, tier) as Record<string, unknown>);
    return { ok: true, data, attempts: attempt, raw_content: rawContent };
  }

  return {
    ok: false,
    status: 502,
    error: 'SCHEMA_PARSE',
    message: `Model returned invalid JSON after retries (${lastParseError}).`,
    attempts: maxAttempts,
  };
}

export function llmErrorToResponseBody(err: LlmCallError | AiCallError, requestId: string) {
  return {
    body: {
      success: false as const,
      error: err.error,
      message: err.message,
      request_id: requestId,
    },
    status: err.status,
  };
}
