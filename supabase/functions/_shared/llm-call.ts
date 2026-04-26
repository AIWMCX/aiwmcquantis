/**
 * AIWMC Quantis — Unified LLM call helper (Master Spec §02 + §11.1).
 *
 * Every edge function that calls the Lovable AI gateway should route through
 * this helper. It guarantees the four checklist invariants:
 *
 *   1. UNIVERSAL_RULES are prepended to the system prompt, regardless of tier.
 *   2. The tier's LLM_BUDGET (max_tokens, temperature, top_p, timeout, retry
 *      count) is applied verbatim — no per-function drift.
 *   3. JSON parsing is retried up to `budget.retry_on_schema_fail` times when
 *      the gateway returns malformed content. After exhausting retries the
 *      caller receives a typed `SCHEMA_PARSE` error.
 *   4. The successful response is passed through `stripToTierFields(tier)`
 *      so FREE callers never receive PLUS/PRO-only fields by accident.
 *
 * The helper is intentionally side-effect free (no DB writes, no logging
 * except a single edge log per call) so individual functions remain in
 * control of usage accounting and Sentry attribution.
 */

import {
  LLM_BUDGET,
  stripToTierFields,
  type Tier,
} from './tier-spec.ts';
import {
  buildSystemPrompt,
  type PromptModule,
} from './prompts.ts';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export interface LlmCallArgs {
  tier: Tier;
  module?: PromptModule;
  userMessage: string;
  /** Override gateway model (defaults to gemini-2.5-flash). */
  model?: string;
  /** Optional pre-baked system prompt. If omitted, buildSystemPrompt(tier, module) is used. */
  systemOverride?: string;
  /** When true, the response is NOT stripped to tier-allowed fields. Use for
   *  internal pipelines (PLUS Monte Carlo → PRO extension) where the caller
   *  needs the full JSON before later stripping. */
  skipFieldStrip?: boolean;
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

/**
 * Single source of truth for spec-compliant LLM calls. Prepends UNIVERSAL_RULES,
 * applies the tier's budget, retries on schema-parse failure, and strips the
 * payload to the tier's allowed_output_fields.
 */
export async function callTierLlm(args: LlmCallArgs): Promise<LlmCallResult> {
  const { tier, module = 'main', userMessage, model, systemOverride, skipFieldStrip } = args;

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) {
    return { ok: false, status: 500, error: 'CONFIG', message: 'LOVABLE_API_KEY missing.' };
  }

  // Always re-derive system + budget from the canonical builder so that any
  // future change to UNIVERSAL_RULES propagates to every call site for free.
  const built = buildSystemPrompt(tier, module);
  const system = systemOverride ?? built.system;
  const budget = LLM_BUDGET[tier];

  const body = {
    model: model ?? DEFAULT_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ],
    temperature: budget.temperature,
    top_p: budget.top_p,
    max_tokens: budget.max_tokens,
    response_format: { type: budget.response_format },
  };

  // Retry loop. We re-send the *same* request body — the model often returns
  // valid JSON on the second attempt because temperature=0.2 still has variance.
  const maxAttempts = Math.max(1, 1 + budget.retry_on_schema_fail);
  let lastParseError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let aiResp: Response;
    try {
      aiResp = await fetch(LOVABLE_AI_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(budget.timeout_ms),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'fetch failed';
      // Network / timeout errors are not retried by this helper — the caller
      // owns end-to-end retry strategy (it may want to fall back to a
      // deterministic engine instead of paying for another LLM call).
      return { ok: false, status: 502, error: 'AI_ERROR', message: 'AI gateway unreachable.', detail: message };
    }

    if (aiResp.status === 429) {
      await aiResp.text().catch(() => '');
      return { ok: false, status: 429, error: 'RATE_LIMIT_EXCEEDED', message: 'AI gateway rate-limited. Please retry shortly.' };
    }
    if (aiResp.status === 402) {
      await aiResp.text().catch(() => '');
      return { ok: false, status: 402, error: 'AI_CREDITS_EXHAUSTED', message: 'AI workspace credits exhausted.' };
    }
    if (!aiResp.ok) {
      const detail = await aiResp.text().catch(() => '');
      return { ok: false, status: 502, error: 'AI_ERROR', message: `AI gateway error ${aiResp.status}.`, detail };
    }

    const aiJson = await aiResp.json().catch(() => null);
    const rawContent: string = aiJson?.choices?.[0]?.message?.content ?? '';
    if (!rawContent) {
      lastParseError = 'empty content';
      continue;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch (err) {
      lastParseError = err instanceof Error ? err.message : 'parse failed';
      continue; // retry up to budget.retry_on_schema_fail
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
    message: 'Model returned invalid JSON after retries.',
    attempts: maxAttempts,
  };
}

/** Convenience: convert an LlmCallError into a JSON-ready Response payload. */
export function llmErrorToResponseBody(err: LlmCallError, requestId: string) {
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
