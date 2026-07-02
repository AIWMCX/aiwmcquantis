/**
 * Anthropic Claude API — Shared Client
 * ------------------------------------
 * Server-only wrapper around the Messages API.
 * Reads ANTHROPIC_API_KEY from Edge Function secrets — never exposed to the client.
 *
 * Models (real, current Anthropic IDs):
 *   - claude-opus-4-5    → adversarial validator / consensus reviewer
 *   - claude-sonnet-4-5  → narrative + risk interpretation (3rd consensus voice)
 *   - claude-haiku-4-5   → industry classification, cheap structured tasks
 *
 * FINANCIAL FIREWALL:
 *   Claude is interpretive only. `stripFinancialFields()` removes any numeric
 *   field that could overwrite engine output (revenue, margins, CAC, LTV, etc.).
 *   Always run Claude responses through this sanitizer before merging into
 *   the analysis result.
 */

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// Prompt-caching beta gate. When cacheSystem is true, this header is sent
// and the system prompt is uploaded as a cache_control:ephemeral content
// block — the same prompt reused within 5 minutes bills at ~10% of the
// original input cost. Safe to send unconditionally; the API ignores the
// beta header when no cache_control blocks are present.
const ANTHROPIC_BETA = 'prompt-caching-2024-07-31';

export type ClaudeModel =
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5';

export interface ClaudeCallOptions {
  model: ClaudeModel;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  /** When true, instructs Claude to return strict JSON and parses it. */
  json?: boolean;
  /**
   * When true, marks the system prompt as prompt-cache eligible. The FIRST
   * call within a 5-min window pays a ~25% cache-write premium; subsequent
   * calls with the SAME system prompt bill input at ~10% of normal.
   * Use for hot paths that fan out multiple LLM calls sharing a stable
   * system prompt (e.g. deterministicResult narration → variants → verify).
   * See F14 from the 2026-07-01 audit — the ~5,400 duplicated input tokens
   * per analysis identified there.
   */
  cacheSystem?: boolean;
}

export interface ClaudeCallResult<T = unknown> {
  ok: boolean;
  text: string;
  parsed?: T;
  inputTokens: number;
  outputTokens: number;
  /** Cache-write tokens (billed at ~1.25x input cost). Undefined when caching off. */
  cacheCreationTokens?: number;
  /** Cache-read tokens (billed at ~0.10x input cost). Undefined when caching off. */
  cacheReadTokens?: number;
  latencyMs: number;
  model: string;
  error?: string;
}

// Serialize the system prompt as either a raw string (legacy) or an
// ephemeral-cached content block (F14). The Anthropic API accepts both;
// only the array form supports cache_control.
function buildSystemField(prompt: string, cache: boolean) {
  if (!cache) return prompt;
  return [{ type: 'text', text: prompt, cache_control: { type: 'ephemeral' } }];
}

export function isAnthropicConfigured(): boolean {
  return Boolean(ANTHROPIC_API_KEY);
}

/**
 * Call Claude via the Messages API. Returns a structured result.
 * Never throws — caller decides how to fail-open.
 */
export async function callClaude<T = unknown>(
  opts: ClaudeCallOptions
): Promise<ClaudeCallResult<T>> {
  const start = Date.now();
  const baseResult = {
    ok: false,
    text: '',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 0,
    model: opts.model,
  };

  if (!ANTHROPIC_API_KEY) {
    return { ...baseResult, error: 'ANTHROPIC_API_KEY missing' };
  }

  const systemPrompt = opts.json
    ? `${opts.system}\n\nRespond with STRICT JSON only — no markdown fences, no prose.`
    : opts.system;

  const headers: Record<string, string> = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': ANTHROPIC_VERSION,
    'content-type': 'application/json',
  };
  if (opts.cacheSystem) headers['anthropic-beta'] = ANTHROPIC_BETA;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.2,
        system: buildSystemField(systemPrompt, opts.cacheSystem === true),
        messages: [{ role: 'user', content: opts.user }],
      }),
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return {
        ...baseResult,
        latencyMs,
        error: `anthropic_${res.status}: ${errBody.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const text: string =
      data?.content?.[0]?.text?.toString().trim() ?? '';
    const inputTokens = Number(data?.usage?.input_tokens ?? 0);
    const outputTokens = Number(data?.usage?.output_tokens ?? 0);
    const cacheCreationTokens = data?.usage?.cache_creation_input_tokens
      ? Number(data.usage.cache_creation_input_tokens)
      : undefined;
    const cacheReadTokens = data?.usage?.cache_read_input_tokens
      ? Number(data.usage.cache_read_input_tokens)
      : undefined;

    let parsed: T | undefined;
    if (opts.json && text) {
      try {
        const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
        parsed = JSON.parse(cleaned) as T;
      } catch {
        // Retry once with explicit instruction. Note: the retry system
        // prompt is different (appends the parse-fail hint), so it MUST
        // NOT reuse the ephemeral cache breakpoint — a different prompt
        // string cannot benefit from the earlier cache write anyway.
        const retry = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: opts.model,
            max_tokens: opts.maxTokens ?? 1024,
            temperature: 0,
            system: `${systemPrompt}\n\nYour previous response failed JSON parsing. Return ONLY valid JSON, no other characters.`,
            messages: [{ role: 'user', content: opts.user }],
          }),
        });
        if (retry.ok) {
          const retryData = await retry.json();
          const retryText: string =
            retryData?.content?.[0]?.text?.toString().trim() ?? '';
          try {
            parsed = JSON.parse(
              retryText.replace(/```json\s*|```\s*/g, '').trim()
            ) as T;
          } catch {
            return {
              ok: false,
              text,
              inputTokens,
              outputTokens,
              latencyMs: Date.now() - start,
              model: opts.model,
              error: 'json_parse_failed_after_retry',
            };
          }
        }
      }
    }

    return {
      ok: true,
      text,
      parsed,
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
      latencyMs,
      model: opts.model,
    };
  } catch (err) {
    return {
      ...baseResult,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'unknown_error',
    };
  }
}

/* ============================================================
 *  FINANCIAL FIREWALL
 *  ------------------------------------------------------------
 *  Claude must NEVER overwrite engine-computed financial figures.
 *  This sanitizer strips any field whose key matches a numeric/
 *  financial concept the deterministic engine owns.
 * ============================================================ */

const FORBIDDEN_FIELD_PATTERNS: RegExp[] = [
  /^revenue/i,
  /^cogs/i,
  /margin$/i,
  /^gross_margin/i,
  /^net_margin/i,
  /^op_margin/i,
  /^ebitda/i,
  /^cac/i,
  /^ltv/i,
  /^arpu/i,
  /^churn/i,
  /^payback/i,
  /^break_?even/i,
  /^startup_?investment/i,
  /^monthly_(revenue|profit|burn|expenses|cogs)/i,
  /^opex/i,
  /^capex/i,
  /^p10$/i,
  /^p25$/i,
  /^p50$/i,
  /^p75$/i,
  /^p90$/i,
  /^scenarios?$/i,
  /^financials?$/i,
  /^unit_economics$/i,
  /^monte_?carlo/i,
];

const FINANCIAL_KEY_BLOCKLIST = new Set<string>([
  'revenue',
  'cogs',
  'opex',
  'capex',
  'cac',
  'ltv',
  'arpu',
  'churn',
  'gross_margin',
  'net_margin',
  'op_margin',
  'ebitda',
  'payback_months',
  'break_even_month',
  'breakeven_month',
  'startup_investment',
  'monthly_revenue',
  'monthly_profit',
  'monthly_burn',
  'monthly_expenses',
  'ltv_cac_ratio',
  'p10',
  'p25',
  'p50',
  'p75',
  'p90',
  'scenarios',
  'scenario',
  'financials',
  'financial_analysis',
  'unit_economics',
  'monte_carlo',
  'monte_carlo_runs',
]);

function isForbiddenKey(key: string): boolean {
  if (FINANCIAL_KEY_BLOCKLIST.has(key.toLowerCase())) return true;
  return FORBIDDEN_FIELD_PATTERNS.some((re) => re.test(key));
}

/**
 * Recursively remove any field that could overwrite engine-owned financials.
 * Use on EVERY Claude response before merging into the analysis result.
 */
export function stripFinancialFields<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => stripFinancialFields(item)) as unknown as T;
  }
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (isForbiddenKey(k)) continue;
      out[k] = stripFinancialFields(v);
    }
    return out as unknown as T;
  }
  return input;
}

/** Pricing snapshot (USD per 1M tokens) — used for cost estimation/logging. */
const PRICING: Record<ClaudeModel, { in: number; out: number }> = {
  'claude-opus-4-5': { in: 15, out: 75 },
  'claude-sonnet-4-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};

export function estimateCostUsd(
  model: ClaudeModel,
  inputTokens: number,
  outputTokens: number
): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (
    Math.round(
      ((inputTokens / 1_000_000) * p.in +
        (outputTokens / 1_000_000) * p.out) *
        1_000_000
    ) / 1_000_000
  );
}
