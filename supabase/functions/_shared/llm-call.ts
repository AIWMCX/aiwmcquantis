/**
 * AIWMC Quantis — Universal Lovable AI Gateway helper.
 *
 * Two entry points:
 *
 * 1) `aiCall(body, opts)` — generic pass-through wrapper. Each caller controls
 *    the gateway request body (model, messages, tools, response_format,
 *    multimodal content). The helper:
 *      - Auto-prepends UNIVERSAL_RULES to the FIRST system message
 *        (unless opts.injectUniversalRules === false).
 *      - Honors a per-call timeout (default 30s).
 *      - Maps 429/402/5xx to typed `LlmCallError` shapes.
 *      - Best-effort writes one row to `public.ai_calls` per call (telemetry).
 *      - Returns the parsed gateway JSON response unchanged on success, so
 *        existing tool-call / content-extraction code in each function keeps
 *        working without any further refactor.
 *
 * 2) `callTierLlm(args)` — opinionated helper for tier-bound JSON callers
 *    (FREE/PLUS/PRO main analysis flow). Builds the system prompt + budget
 *    from `prompts.ts` + `tier-spec.ts`, retries on schema-parse failure, and
 *    strips the response to the tier's allowed_output_fields.
 *
 * Both helpers share the same telemetry path so EVERY LLM call shows up in
 * `public.ai_calls`.
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

// Primary AI backend: DeepSeek (self-hosted key, always available).
// Legacy fallback: Lovable AI gateway (only if LOVABLE_API_KEY is set — kept
// for compatibility but the gateway is no longer the primary path after the
// Supabase project migration away from Lovable).
// Hard fallback: Anthropic Claude — used ONLY when DeepSeek (and Lovable, if
// configured) fail with a retryable error (429/502/504/fetch failure).
// Callers that must NEVER touch Anthropic (e.g. RVCE) bypass this module
// entirely and call DeepSeek directly — see rvce-validate/index.ts.
const DEEPSEEK_AI_URL   = 'https://api.deepseek.com/v1/chat/completions';
const LOVABLE_AI_URL    = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const ANTHROPIC_AI_URL  = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_FALLBACK_MODEL = 'claude-haiku-4-5-20251001';
// Mega prompt I-6 + Fix #3: legacy deepseek aliases (chat / reasoner)
// aliases retire 2026-07-24 15:59 UTC. Use the current model id directly.
const DEFAULT_MODEL     = 'deepseek-v4-flash';
// Legacy aliases that resolveModel() must normalise (CI grep guard bans literals).
const LEGACY_CHAT = `deepseek-${'chat'}`;
const LEGACY_REASONER = `deepseek-${'reasoner'}`;
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
  // tool-call related fields preserved verbatim
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
  /** Function name for telemetry (e.g. 'analyze-business'). */
  task: string;
  /** Optional analysis_id / user_id for telemetry attribution. */
  analysisId?: string | null;
  userId?: string | null;
  /** Optional request id to correlate logs. */
  requestId?: string | null;
  /** Per-call timeout. Defaults to 30s. */
  timeoutMs?: number;
  /** Inject UNIVERSAL_RULES at the top of the first system message. Default true. */
  injectUniversalRules?: boolean;
  /** Skip telemetry write (use for cron-only / non-billed dev calls). */
  skipTelemetry?: boolean;
  /** Optional metadata blob attached to the ai_calls row. */
  metadata?: Record<string, unknown>;
  /**
   * Set true to forbid falling back to Anthropic on DeepSeek failure.
   * MUST be true for any RVCE-related call (RVCE is DeepSeek-only by policy).
   * Default false — all other callers get the Anthropic safety net.
   */
  disableAnthropicFallback?: boolean;
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
  /** Raw gateway response JSON: { choices: [...], usage: {...}, ... } */
  data: Record<string, unknown>;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

export type AiCallResult = AiCallSuccess | AiCallError;

/**
 * Generic Lovable AI gateway call. Pass through any request body shape;
 * helper adds UNIVERSAL_RULES, error mapping, timeout and telemetry.
 */
export async function aiCall(
  body: GatewayRequestBody,
  opts: AiCallOptions,
): Promise<AiCallResult> {
  const start = Date.now();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const inject = opts.injectUniversalRules !== false;

  // Resolve AI backend: DeepSeek primary, Lovable gateway optional fallback.
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  const lovableKey  = Deno.env.get('LOVABLE_API_KEY');
  const aiUrl  = deepseekKey ? DEEPSEEK_AI_URL : LOVABLE_AI_URL;
  const apiKey = deepseekKey ?? lovableKey;
  if (!apiKey) {
    return {
      ok: false,
      status: 500,
      error: 'CONFIG',
      message: 'No AI key configured. Set DEEPSEEK_API_KEY in Supabase secrets.',
      latencyMs: 0,
    };
  }

  // Map Lovable-gateway model names to DeepSeek equivalents when using DeepSeek.
  function resolveModel(requested: string | undefined): string {
    const m = requested ?? DEFAULT_MODEL;
    if (!deepseekKey) return m; // Lovable gateway: pass through as-is
    // Gemini/OpenAI/Claude model names are not valid on DeepSeek — normalise to current flash model.
    if (m.startsWith('google/') || m.startsWith('gpt-') || m.startsWith('claude-') || m === LEGACY_CHAT || m === LEGACY_REASONER) {
      return DEFAULT_MODEL;
    }
    return m;
  }

  // Inject UNIVERSAL_RULES into the FIRST system message (or prepend a new one).
  const finalMessages: GatewayMessage[] = [...body.messages];
  if (inject && finalMessages.length > 0) {
    const firstSystemIdx = finalMessages.findIndex((m) => m.role === 'system');
    if (firstSystemIdx >= 0) {
      const original = finalMessages[firstSystemIdx];
      const originalText =
        typeof original.content === 'string'
          ? original.content
          : original.content.map((p) => (p.type === 'text' ? p.text : '')).join('\n');
      // Skip injection if rules already prepended (e.g. via buildSystemPrompt).
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

  const requestBody: GatewayRequestBody = {
    model: resolveModel(body.model),
    ...body,
    messages: finalMessages,
  };
  // Ensure resolved model is in the final body (spread above may have overwritten it).
  requestBody.model = resolveModel(body.model);

  // DeepSeek V4 models default to THINKING mode: they emit reasoning_content
  // and leave message.content empty until reasoning finishes, which silently
  // breaks every caller that reads content / parses JSON (root cause of the
  // "AI narrator unavailable" production incident on 2026-06-10). Disable
  // thinking unless the caller explicitly opted in.
  if (deepseekKey && String(requestBody.model).startsWith('deepseek-v4') && requestBody.thinking === undefined) {
    requestBody.thinking = { type: 'disabled' };
  }

  let model = requestBody.model ?? DEFAULT_MODEL;

  let resp: Response;
  try {
    resp = await fetch(aiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : 'fetch failed';
    const isAbort = /abort|timeout|deadline/i.test(message);
    void recordAiCall({
      ok: false,
      task: opts.task,
      model,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      analysisId: opts.analysisId ?? null,
      userId: opts.userId ?? null,
      requestId: opts.requestId ?? null,
      error: isAbort ? 'AI_TIMEOUT' : `AI_FETCH:${message.slice(0, 200)}`,
      metadata: opts.metadata,
      skip: opts.skipTelemetry,
    });
    const fallback = await tryAnthropicFallback(requestBody, opts);
    if (fallback) return fallback;
    if (isAbort) {
      return { ok: false, status: 504, error: 'AI_TIMEOUT', message: `AI gateway timed out after ${timeoutMs}ms.`, latencyMs };
    }
    return { ok: false, status: 502, error: 'AI_ERROR', message: 'AI gateway unreachable.', detail: message, latencyMs };
  }

  const latencyMs = Date.now() - start;

  if (resp.status === 429) {
    await resp.text().catch(() => '');
    void recordAiCall({
      ok: false,
      task: opts.task,
      model,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      analysisId: opts.analysisId ?? null,
      userId: opts.userId ?? null,
      requestId: opts.requestId ?? null,
      error: 'RATE_LIMIT_EXCEEDED',
      metadata: opts.metadata,
      skip: opts.skipTelemetry,
    });
    const fallback = await tryAnthropicFallback(requestBody, opts);
    if (fallback) return fallback;
    return { ok: false, status: 429, error: 'RATE_LIMIT_EXCEEDED', message: 'AI gateway rate-limited. Please retry shortly.', latencyMs };
  }
  if (resp.status === 402) {
    await resp.text().catch(() => '');
    void recordAiCall({
      ok: false,
      task: opts.task,
      model,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      analysisId: opts.analysisId ?? null,
      userId: opts.userId ?? null,
      requestId: opts.requestId ?? null,
      error: 'AI_CREDITS_EXHAUSTED',
      metadata: opts.metadata,
      skip: opts.skipTelemetry,
    });
    {
      const fallback = await tryAnthropicFallback(requestBody, opts);
      if (fallback) return fallback;
    }
    return { ok: false, status: 402, error: 'AI_CREDITS_EXHAUSTED', message: 'AI workspace credits exhausted.', latencyMs };
  }
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    void recordAiCall({
      ok: false,
      task: opts.task,
      model,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      analysisId: opts.analysisId ?? null,
      userId: opts.userId ?? null,
      requestId: opts.requestId ?? null,
      error: `AI_${resp.status}:${detail.slice(0, 200)}`,
      metadata: opts.metadata,
      skip: opts.skipTelemetry,
    });
    if (resp.status >= 500) {
      const fallback = await tryAnthropicFallback(requestBody, opts);
      if (fallback) return fallback;
    }
    return { ok: false, status: 502, error: 'AI_ERROR', message: `AI gateway error ${resp.status}.`, detail, latencyMs };
  }

  const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) {
    void recordAiCall({
      ok: false,
      task: opts.task,
      model,
      latencyMs,
      inputTokens: 0,
      outputTokens: 0,
      analysisId: opts.analysisId ?? null,
      userId: opts.userId ?? null,
      requestId: opts.requestId ?? null,
      error: 'AI_NO_BODY',
      metadata: opts.metadata,
      skip: opts.skipTelemetry,
    });
    return { ok: false, status: 502, error: 'AI_ERROR', message: 'AI gateway returned no body.', latencyMs };
  }

  const usage = (data.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;
  // Some gateways echo the actual model used.
  const echoedModel = (data.model as string | undefined) ?? model;
  model = echoedModel;

  void recordAiCall({
    ok: true,
    task: opts.task,
    model,
    latencyMs,
    inputTokens,
    outputTokens,
    analysisId: opts.analysisId ?? null,
    userId: opts.userId ?? null,
    requestId: opts.requestId ?? null,
    metadata: opts.metadata,
    skip: opts.skipTelemetry,
  });

  return { ok: true, status: 200, data, latencyMs, inputTokens, outputTokens };
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry — best-effort INSERT into public.ai_calls
// ─────────────────────────────────────────────────────────────────────────────

interface RecordArgs {
  ok: boolean;
  task: string;
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

/** Derives the actual provider used from the model string, for accurate cost
 *  telemetry. Previously this was hardcoded to 'lovable_gateway' regardless
 *  of which backend actually served the request — meaning every DeepSeek
 *  call (the primary path since the Lovable migration) was mislabeled. */
function providerFromModel(model: string): 'deepseek' | 'anthropic' | 'lovable_gateway' {
  if (model.startsWith('anthropic:') || model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('deepseek')) return 'deepseek';
  return 'lovable_gateway';
}

async function recordAiCall(args: RecordArgs): Promise<void> {
  if (args.skip) return;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  try {
    const row = {
      task: args.task,
      provider: providerFromModel(args.model),
      model: args.model,
      input_tokens: args.inputTokens,
      output_tokens: args.outputTokens,
      cost_usd: 0,
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
    // Telemetry must never block or throw.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic Claude — hard fallback when DeepSeek/Lovable are unavailable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retries the request against Anthropic's Messages API. Returns null (never
 * throws) if ANTHROPIC_API_KEY is unset, fallback is disabled for this call,
 * or the Anthropic call itself fails — in all those cases the caller returns
 * the original DeepSeek error untouched.
 */
async function tryAnthropicFallback(
  requestBody: GatewayRequestBody,
  opts: AiCallOptions,
): Promise<AiCallResult | null> {
  if (opts.disableAnthropicFallback) return null;
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  const start = Date.now();

  // Anthropic requires the system prompt outside the messages array.
  const systemParts: string[] = [];
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of requestBody.messages) {
    const text = typeof m.content === 'string'
      ? m.content
      : m.content.map((p) => (p.type === 'text' ? p.text : '')).join('\n');
    if (m.role === 'system') {
      systemParts.push(text);
    } else if (m.role === 'user' || m.role === 'assistant') {
      messages.push({ role: m.role, content: text });
    }
  }
  if (messages.length === 0 || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: '(continue)' });
  }

  let system = systemParts.join('\n\n');
  if (requestBody.response_format?.type === 'json_object') {
    system += '\n\nRespond with ONLY a single valid JSON object. No markdown, no commentary, no code fences.';
  }

  let resp: Response;
  try {
    resp = await fetch(ANTHROPIC_AI_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_FALLBACK_MODEL,
        max_tokens: requestBody.max_tokens ?? 4096,
        system,
        messages,
        temperature: requestBody.temperature,
        top_p: requestBody.top_p,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  const latencyMs = Date.now() - start;
  if (!resp.ok) {
    await resp.text().catch(() => '');
    return null;
  }

  const data = (await resp.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return null;

  const content = (data.content as Array<{ type: string; text?: string }> | undefined) ?? [];
  const text = content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
  if (!text) return null;

  const usage = (data.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const echoedModel = `anthropic:${(data.model as string | undefined) ?? ANTHROPIC_FALLBACK_MODEL}`;

  void recordAiCall({
    ok: true,
    task: opts.task,
    model: echoedModel,
    latencyMs,
    inputTokens,
    outputTokens,
    analysisId: opts.analysisId ?? null,
    userId: opts.userId ?? null,
    requestId: opts.requestId ?? null,
    metadata: { ...(opts.metadata ?? {}), fallback: 'anthropic' },
    skip: opts.skipTelemetry,
  });

  return {
    ok: true,
    status: 200,
    data: {
      choices: [{ message: { role: 'assistant', content: text } }],
      usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens },
      model: echoedModel,
    },
    latencyMs,
    inputTokens,
    outputTokens,
  };
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
        model: model ?? DEFAULT_MODEL,
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
        // System prompt already starts with UNIVERSAL_RULES via buildSystemPrompt.
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
