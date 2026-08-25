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
import {
  dahlChatCompletion,
  isDahlEnabled,
  isDahlFallbackEnabled,
  defaultAlias as dahlDefaultAlias,
  type DahlAlias,
  type DahlChatMessage,
} from './dahl-adapter.ts';
import { isDahlEligible } from './dahl-canary.ts';

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
  /**
   * Which internal Dahl task alias to use when Dahl is the active backend
   * (DAHL_ENABLED=true). Ignored entirely on the legacy DeepSeek/Lovable/
   * Anthropic path. Defaults to 'general'.
   */
  dahlAlias?: DahlAlias;
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
 * Generic AI gateway call. Pass through any request body shape; helper adds
 * UNIVERSAL_RULES, error mapping, timeout and telemetry.
 *
 * Dispatch: Dahl is only attempted when BOTH gates pass --
 *   1. DAHL_ENABLED=true (the master switch), AND
 *   2. isDahlEligible() (see dahl-canary.ts) says THIS request qualifies
 *      under the current rollout stage (off / admin_only / a stable
 *      percentage of users) -- flipping DAHL_ENABLED alone must never route
 *      100% of production traffic instantly.
 * On a retryable Dahl failure, falls through to the legacy DeepSeek/Lovable/
 * Anthropic chain only if DAHL_FALLBACK_ENABLED=true — otherwise returns the
 * sanitized Dahl error directly. When DAHL_ENABLED is false, or the canary
 * gate says this request isn't eligible, behavior is byte-for-byte identical
 * to before this change.
 */
export async function aiCall(
  body: GatewayRequestBody,
  opts: AiCallOptions,
): Promise<AiCallResult> {
  if (isDahlEnabled() && (await isDahlEligible({ userId: opts.userId, requestId: opts.requestId }))) {
    const dahlResult = await callDahlGateway(body, opts);
    if (dahlResult.ok) return dahlResult.result;
    if (dahlResult.unsupported) {
      // A known capability gap (tools/tool_choice/non-text content/tool-role
      // messages), not a live failure -- Dahl's tool-calling and vision
      // behavior haven't been contract-tested yet (per the integration's
      // own Phase 3 rule: never assume "OpenAI-compatible" covers every
      // OpenAI field). Always defer to the legacy chain for these, whether
      // or not DAHL_FALLBACK_ENABLED is set, rather than risk silently
      // dropping a tool call or an image and returning a semantically
      // different response as if it were a normal success.
    } else if (!isDahlFallbackEnabled() || !dahlResult.retryable) {
      return dahlResult.result;
    }
  }
  return callLegacyGateway(body, opts);
}

/**
 * Routes a request through the Dahl adapter and maps its result into the
 * exact same AiCallResult shape every existing caller already expects, so
 * zero call sites need to change to pick up Dahl once it's enabled.
 */
async function callDahlGateway(
  body: GatewayRequestBody,
  opts: AiCallOptions,
): Promise<
  | { ok: true; result: AiCallSuccess }
  | { ok: false; result: AiCallError; retryable: boolean; unsupported?: false }
  | { ok: false; result: AiCallError; retryable: false; unsupported: true }
> {
  // Detect request shapes Dahl's live behavior hasn't been contract-tested
  // against yet: tool/function calling, tool-role messages, and non-text
  // (e.g. image_url) content parts. Several existing callers (ai-narrator,
  // generate-idea, template-optimizer, ai-consensus, parse-document) use
  // one or more of these. Translating them away silently would let Dahl
  // return a successful-looking response that is semantically wrong (a
  // dropped tool call, a vision request answered as if it had no image).
  const usesTools = body.tools !== undefined || body.tool_choice !== undefined;
  const hasToolMessage = body.messages.some((m) => m.role === 'tool');
  const hasNonTextContent = body.messages.some(
    (m) => Array.isArray(m.content) && m.content.some((p) => p.type !== 'text'),
  );
  if (usesTools || hasToolMessage || hasNonTextContent) {
    return {
      ok: false,
      unsupported: true,
      retryable: false,
      result: {
        ok: false,
        status: 502,
        error: 'AI_ERROR',
        // This result is never actually returned to a caller -- aiCall()
        // always falls through to callLegacyGateway() when unsupported is
        // true. It only exists to satisfy AiCallError's shape.
        message: 'This request uses a capability Dahl has not been verified for; served by the legacy provider instead.',
        latencyMs: 0,
      },
    };
  }

  const messages: DahlChatMessage[] = body.messages
    .map((m) => {
      const text = typeof m.content === 'string'
        ? m.content
        : m.content.map((p) => (p.type === 'text' ? p.text : '')).join('\n');
      if (m.role === 'system' || m.role === 'user' || m.role === 'assistant') {
        return { role: m.role, content: text };
      }
      return null;
    })
    .filter((m): m is DahlChatMessage => m !== null);

  if (opts.injectUniversalRules !== false) {
    const firstSystemIdx = messages.findIndex((m) => m.role === 'system');
    if (firstSystemIdx >= 0) {
      if (!messages[firstSystemIdx].content.startsWith('=== QUANTIS UNIVERSAL RULES')) {
        messages[firstSystemIdx] = { ...messages[firstSystemIdx], content: `${UNIVERSAL_RULES}\n\n${messages[firstSystemIdx].content}` };
      }
    } else {
      messages.unshift({ role: 'system', content: UNIVERSAL_RULES });
    }
  }

  // Two-phase telemetry (P0, 2026-08-25): write a 'pending' row BEFORE
  // calling Dahl, then finalize it once dahlChatCompletion() resolves (it's
  // documented to never throw, so a plain sequential finalize after the
  // await is sufficient -- no try/finally needed for that half). Previously
  // recordAiCall() was only ever invoked once, post-hoc, after
  // dahlChatCompletion() already returned -- if the edge function's own
  // process were killed mid-request (platform wall-clock limit, OOM, an
  // uncaught exception upstream of this line), there would be NO row at all
  // for that call, silently erasing exactly the catastrophic-failure case
  // telemetry most needs to catch. A pending row that's never finalized is
  // now itself diagnostic signal instead of producing silence.
  const pendingId = await recordAiCallPending({
    task: opts.task,
    analysisId: opts.analysisId ?? null,
    userId: opts.userId ?? null,
    requestId: opts.requestId ?? null,
    metadata: opts.metadata,
    skip: opts.skipTelemetry,
  });

  // dahlChatCompletion() is documented to never throw (always resolves to a
  // typed success/error result), so no try/finally is needed here -- the
  // pending row written above is what covers the one failure mode a
  // finally block couldn't anyway (the process being killed outright before
  // this line resumes).
  const dahl = await dahlChatCompletion({
    alias: opts.dahlAlias ?? dahlDefaultAlias(),
    messages,
    temperature: body.temperature,
    maxTokens: body.max_tokens,
    jsonMode: body.response_format?.type === 'json_object',
    timeoutMs: opts.timeoutMs,
  });

  if (dahl.ok) {
    void finalizeAiCallDahl(pendingId, {
      ok: true,
      task: opts.task,
      model: `dahl:${dahl.model}`,
      latencyMs: dahl.latencyMs,
      inputTokens: dahl.inputTokens,
      outputTokens: dahl.outputTokens,
      analysisId: opts.analysisId ?? null,
      userId: opts.userId ?? null,
      requestId: opts.requestId ?? null,
      metadata: opts.metadata,
      skip: opts.skipTelemetry,
      retryCount: Math.max(0, dahl.attempts - 1),
      repairAttempted: dahl.repairAttempted,
    });
    return {
      ok: true,
      result: {
        ok: true,
        status: 200,
        data: {
          choices: [{ message: { role: 'assistant', content: dahl.content }, finish_reason: dahl.finishReason ?? null }],
          usage: { prompt_tokens: dahl.inputTokens, completion_tokens: dahl.outputTokens },
          model: `dahl:${dahl.model}`,
        },
        latencyMs: dahl.latencyMs,
        inputTokens: dahl.inputTokens,
        outputTokens: dahl.outputTokens,
      },
    };
  }

  void finalizeAiCallDahl(pendingId, {
    ok: false,
    task: opts.task,
    model: 'dahl:unresolved',
    latencyMs: dahl.latencyMs,
    inputTokens: 0,
    outputTokens: 0,
    analysisId: opts.analysisId ?? null,
    userId: opts.userId ?? null,
    requestId: opts.requestId ?? null,
    error: `DAHL_${dahl.kind.toUpperCase()}`,
    metadata: opts.metadata,
    skip: opts.skipTelemetry,
    retryCount: Math.max(0, dahl.attempts - 1),
    repairAttempted: dahl.repairAttempted,
  });

  const statusByKind: Record<typeof dahl.kind, AiCallError['status']> = {
    config: 500,
    auth: 500,
    exhausted: 402,
    rate_limit: 429,
    unsupported_model: 502,
    timeout: 504,
    unavailable: 502,
    invalid_response: 502,
  };
  const errorByKind: Record<typeof dahl.kind, AiCallError['error']> = {
    config: 'CONFIG',
    auth: 'CONFIG',
    exhausted: 'AI_CREDITS_EXHAUSTED',
    rate_limit: 'RATE_LIMIT_EXCEEDED',
    unsupported_model: 'AI_ERROR',
    timeout: 'AI_TIMEOUT',
    unavailable: 'AI_ERROR',
    invalid_response: 'AI_ERROR',
  };

  const status = statusByKind[dahl.kind];
  const errorCode = errorByKind[dahl.kind];
  const base = { message: dahl.message, latencyMs: dahl.latencyMs };
  const result: AiCallError =
    status === 402 ? { ok: false, status: 402, error: 'AI_CREDITS_EXHAUSTED', ...base }
    : status === 429 ? { ok: false, status: 429, error: 'RATE_LIMIT_EXCEEDED', ...base }
    : status === 504 ? { ok: false, status: 504, error: 'AI_TIMEOUT', ...base }
    : status === 500 ? { ok: false, status: 500, error: 'CONFIG', ...base }
    : { ok: false, status: 502, error: errorCode as 'AI_ERROR', ...base };

  return { ok: false, result, retryable: dahl.retryable };
}

async function callLegacyGateway(
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
function providerFromModel(model: string): 'deepseek' | 'anthropic' | 'lovable_gateway' | 'dahl' {
  if (model.startsWith('dahl:')) return 'dahl';
  if (model.startsWith('anthropic:') || model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('deepseek')) return 'deepseek';
  return 'lovable_gateway';
}

/** Pricing snapshot (USD per 1M tokens, cache-miss input rate). Publicly
 *  published provider rates as of this session -- not independently
 *  reconfirmed against each provider's live pricing page. Verify before
 *  relying on this for financial reporting; update here if a provider
 *  changes pricing. Matched by substring since `model` strings vary
 *  (e.g. "deepseek-v4-flash" vs "deepseek:deepseek-v4-flash").
 *  Previously this ledger hardcoded cost_usd: 0 unconditionally even though
 *  inputTokens/outputTokens were already being captured correctly -- gross
 *  margin (Domain 11 Q108, 2026-07-20 profitability audit) was uncomputable
 *  purely because this multiplication was never done. */
const COST_PRICING: Array<{ match: string; in: number; out: number }> = [
  { match: 'deepseek', in: 0.27, out: 1.10 },
  { match: 'claude-haiku', in: 1, out: 5 },
  { match: 'claude-sonnet', in: 3, out: 15 },
  { match: 'claude-opus', in: 15, out: 75 },
  { match: 'gemini-2.5-flash-lite', in: 0.1, out: 0.4 },
  { match: 'gemini', in: 1.25, out: 10 },
];

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const lower = model.toLowerCase();
  // Dahl calls (model strings prefixed "dahl:") always cost 0: the owner
  // pre-paid a fixed token pool, so there's no incremental per-call USD cost.
  // This MUST be an explicit guard, not a fall-through: COST_PRICING matches
  // on substrings, and Dahl can serve "deepseek-ai/DeepSeek-V4-Flash-0731",
  // whose lowercased model string contains "deepseek" and would otherwise
  // silently match DeepSeek's direct-API rate below -- corrupting every
  // cost/margin dashboard that reads ai_calls.cost_usd for a Dahl call.
  if (lower.startsWith('dahl:')) return 0;
  const rate = COST_PRICING.find((p) => lower.includes(p.match));
  if (!rate) return 0;
  const cost = (inputTokens / 1_000_000) * rate.in + (outputTokens / 1_000_000) * rate.out;
  return Math.round(cost * 1_000_000) / 1_000_000;
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
      cost_usd: estimateCostUsd(args.model, args.inputTokens, args.outputTokens),
      latency_ms: Math.round(args.latencyMs),
      ok: args.ok,
      error: args.error ?? null,
      analysis_id: args.analysisId,
      user_id: args.userId,
      request_id: args.requestId,
      metadata: args.metadata ?? null,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_calls`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    // FIXED (2026-08-01): this fetch's response was never checked, so a
    // PostgREST 400 (e.g. PGRST204 "unknown column") silently discarded
    // every single row -- exactly what happened for months when `row`
    // included `request_id` before that column existed (see migration
    // ai_calls_add_request_id_column). Telemetry still never throws or
    // blocks the caller, but a schema-drift failure now at least surfaces
    // in function logs instead of vanishing with zero trace.
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.warn(`[ai_calls] insert failed (${resp.status}): ${detail.slice(0, 300)}`);
    }
  } catch {
    // Telemetry must never block or throw.
  }
}

interface PendingArgs {
  task: string;
  analysisId: string | null;
  userId: string | null;
  requestId: string | null;
  metadata?: Record<string, unknown>;
  skip?: boolean;
}

/**
 * Writes a 'pending' ai_calls row BEFORE the provider call starts, returning
 * its id (or null if the write was skipped/failed/telemetry is disabled --
 * finalizeAiCallDahl() treats a null id as "nothing to update" and falls
 * back to a plain insert, so a pending-write failure never loses the final
 * outcome, only the pre-execution safety net for THIS one call).
 *
 * Only used for the Dahl path today (dahl-adapter.ts is the only caller with
 * a real crash-mid-request exposure worth covering this way -- the legacy
 * gateway chain's own retry/fallback layers are a separate, already-covered
 * concern). Awaited synchronously (not `void`-fired) precisely because the
 * whole point is for the row to exist BEFORE the risky call, not racing it.
 */
async function recordAiCallPending(args: PendingArgs): Promise<string | null> {
  if (args.skip) return null;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  try {
    const row = {
      task: args.task,
      provider: 'dahl',
      model: 'dahl:pending',
      status: 'pending',
      ok: false, // placeholder; overwritten by finalizeAiCallDahl's PATCH
      analysis_id: args.analysisId,
      user_id: args.userId,
      request_id: args.requestId,
      metadata: args.metadata ?? null,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_calls`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.warn(`[ai_calls] pending insert failed (${resp.status}): ${detail.slice(0, 300)}`);
      return null;
    }
    const inserted = (await resp.json().catch(() => null)) as Array<{ id?: unknown }> | null;
    const id = inserted?.[0]?.id;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

interface DahlFinalizeArgs extends RecordArgs {
  retryCount: number;
  repairAttempted: boolean;
}

/**
 * Finalizes a Dahl telemetry row: PATCHes the matching pending row (written
 * by recordAiCallPending) to status='completed'/'failed' with the real
 * outcome, or falls back to a plain INSERT if there was no pending row id
 * (telemetry disabled, or the pending write itself failed) so a call's
 * outcome is never dropped just because its pre-execution write was.
 */
async function finalizeAiCallDahl(pendingId: string | null, args: DahlFinalizeArgs): Promise<void> {
  if (args.skip) return;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return;
  const finalFields = {
    status: args.ok ? 'completed' : 'failed',
    provider: providerFromModel(args.model),
    model: args.model,
    input_tokens: args.inputTokens,
    output_tokens: args.outputTokens,
    cost_usd: estimateCostUsd(args.model, args.inputTokens, args.outputTokens),
    latency_ms: Math.round(args.latencyMs),
    ok: args.ok,
    error: args.error ?? null,
    retry_count: args.retryCount,
    repair_attempted: args.repairAttempted,
    metadata: args.metadata ?? null,
  };
  try {
    if (pendingId) {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_calls?id=eq.${encodeURIComponent(pendingId)}`, {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(finalFields),
      });
      if (!resp.ok) {
        const detail = await resp.text().catch(() => '');
        console.warn(`[ai_calls] finalize PATCH failed (${resp.status}): ${detail.slice(0, 300)}`);
      }
      return;
    }
    // No pending row to update -- fall back to a plain insert so the
    // outcome still lands somewhere, matching the pre-two-phase behavior.
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/ai_calls`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        task: args.task,
        analysis_id: args.analysisId,
        user_id: args.userId,
        request_id: args.requestId,
        ...finalFields,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.warn(`[ai_calls] fallback insert failed (${resp.status}): ${detail.slice(0, 300)}`);
    }
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
