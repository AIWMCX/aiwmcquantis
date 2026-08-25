/**
 * Dahl adapter — private, server-only OpenAI-compatible inference client.
 * ---------------------------------------------------------------------------
 * This module is the ONLY place in the codebase allowed to construct a
 * request to inference.dahl.global. Every other caller (llm-call.ts,
 * content-studio-generate, rvce-validate, hybrid-validator, ...) must go
 * through `dahlChatCompletion()` / `isDahlEnabled()` rather than building
 * its own fetch to Dahl. This keeps the origin allowlist, auth header
 * construction, retry policy, and error sanitization in exactly one place.
 *
 * Contract (verified live against the real endpoints on 2026-08-24, not
 * assumed from docs alone):
 *   GET  {base}/models              -> { data: [{ id, object, created, owned_by }], object: "list" }
 *   GET  {base}/status?window=24h   -> { models: [{ id, operational, uptime }], last_check_at, updated_at, window }
 *   GET  {origin}/health             -> { status: "ok" }
 *   POST {base}/chat/completions    -> Authorization: Bearer <key>, OpenAI-compatible body/response
 *   GET  {origin}/tokens/current    -> authenticated per-key balance (never called from Quantis app code —
 *                                       see Phase 6/8 of the integration spec: balance checks are an
 *                                       access-restricted admin/monitoring concern, not a request-path one)
 * All three documented models (MiniMaxAI/MiniMax-M2.7, moonshotai/Kimi-K2.6,
 * deepseek-ai/DeepSeek-V4-Flash-0731) were confirmed present via live
 * GET /v1/models and reported operational via GET /v1/status?window=24h at
 * verification time. Model IDs can rotate — this module NEVER hardcodes an
 * ID as safe to call without checking it against the live catalog first.
 */

const DAHL_ORIGIN = 'https://inference.dahl.global';
const DAHL_DEFAULT_BASE = `${DAHL_ORIGIN}/v1`;

/** Internal, stable task aliases. Callers never pass a raw Dahl model ID. */
export type DahlAlias = 'general' | 'long_reasoning' | 'fast_reasoning';

/**
 * Preference order per alias. This is a PREFERENCE, not a guarantee — at
 * request time only IDs actually present in the live GET /v1/models catalog
 * (and not reported non-operational by GET /v1/status) are eligible.
 */
const ALIAS_PREFERENCE: Record<DahlAlias, string[]> = {
  general: [
    'MiniMaxAI/MiniMax-M2.7',
    'deepseek-ai/DeepSeek-V4-Flash-0731',
    'moonshotai/Kimi-K2.6',
  ],
  long_reasoning: [
    'moonshotai/Kimi-K2.6',
    'MiniMaxAI/MiniMax-M2.7',
    'deepseek-ai/DeepSeek-V4-Flash-0731',
  ],
  fast_reasoning: [
    'deepseek-ai/DeepSeek-V4-Flash-0731',
    'MiniMaxAI/MiniMax-M2.7',
    'moonshotai/Kimi-K2.6',
  ],
};

/**
 * Hard allowlist, checked against the PARSED origin/hostname — never a
 * string prefix. A prefix check (`configured.startsWith(DAHL_ORIGIN)`) would
 * wrongly admit lookalike hosts such as
 * "https://inference.dahl.global.evil.example/v1" or
 * "https://inference.dahl.global@evil.example/v1", both of which start with
 * the right characters but are a different, attacker-controlled origin that
 * would receive the real Bearer key. Also rejects embedded userinfo
 * (`user:pass@host`), a classic origin-check bypass vector.
 *
 * The loopback branch exists solely for dahl-adapter.test.ts's local mock
 * server. It's not a production security hole: a plain-HTTP loopback address
 * can only ever reach a process on the SAME machine, so there is nothing an
 * external attacker or misconfigured value could redirect this to.
 */
function isAllowedDahlBase(configured: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    return false;
  }
  if (parsed.username || parsed.password) return false;
  if (parsed.origin === DAHL_ORIGIN) return true;
  return parsed.protocol === 'http:' && (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost');
}

function dahlBaseUrl(): string {
  const configured = Deno.env.get('DAHL_BASE_URL')?.trim();
  if (!configured) return DAHL_DEFAULT_BASE;
  if (isAllowedDahlBase(configured)) return configured;
  return DAHL_DEFAULT_BASE;
}

/**
 * Test-only: clears the in-memory catalog/status caches. Production code
 * never calls this — the caches are meant to persist for their TTL across
 * requests within one warm function instance. Exported (not module-private)
 * only so dahl-adapter.test.ts can assert cache-miss/refresh behavior
 * deterministically between test cases without relying on Deno's dynamic
 * import cache semantics for isolation.
 */
export function __resetDahlCachesForTests(): void {
  catalogCache = null;
  statusCache = null;
}

/** Test-only re-export of the allowlist predicate so dahl-adapter.test.ts
 *  can assert on it directly and precisely, without the DNS/TLS confounds
 *  of routing a fake external hostname through a real fetch. */
export const __isAllowedDahlBaseForTests = isAllowedDahlBase;

/** Test-only re-export of the resolved base URL so dahl-adapter.test.ts can
 *  assert a rejected DAHL_BASE_URL falls back to DAHL_DEFAULT_BASE without
 *  actually making the live network call that using it would trigger. */
export const __dahlBaseUrlForTests = dahlBaseUrl;
export const __DAHL_DEFAULT_BASE_FOR_TESTS = DAHL_DEFAULT_BASE;

export function isDahlEnabled(): boolean {
  return Deno.env.get('DAHL_ENABLED') === 'true';
}

export function isDahlFallbackEnabled(): boolean {
  return Deno.env.get('DAHL_FALLBACK_ENABLED') === 'true';
}

// ─────────────────────────────────────────────────────────────────────────────
// Model catalog — cached live discovery, never a hardcoded "trust me" list
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogEntry {
  id: string;
}

interface CatalogCache {
  data: CatalogEntry[];
  fetchedAt: number;
}

let catalogCache: CatalogCache | null = null;
let statusCache: { data: Record<string, boolean>; fetchedAt: number } | null = null;

const CATALOG_TTL_MS = 10 * 60 * 1000; // 10 minutes, per integration spec Phase 3
const STATUS_TTL_MS = 5 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 8_000;

/** GET {base}/models with a short cache. Falls back to the last known-good
 *  cache on a transient failure; NEVER falls back to a hardcoded model list
 *  the live service hasn't actually confirmed. */
async function fetchModelCatalog(): Promise<CatalogEntry[]> {
  if (catalogCache && Date.now() - catalogCache.fetchedAt < CATALOG_TTL_MS) {
    return catalogCache.data;
  }
  try {
    const resp = await fetch(`${dahlBaseUrl()}/models`, {
      signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`models endpoint returned ${resp.status}`);
    const json = (await resp.json()) as { data?: Array<{ id?: unknown }> };
    const data: CatalogEntry[] = Array.isArray(json?.data)
      ? json.data
          .map((m) => (typeof m?.id === 'string' ? { id: m.id } : null))
          .filter((m): m is CatalogEntry => m !== null)
      : [];
    if (data.length === 0) throw new Error('model catalog was empty');
    catalogCache = { data, fetchedAt: Date.now() };
    return data;
  } catch {
    if (catalogCache) return catalogCache.data; // stale-but-known-good
    return [];
  }
}

/** GET {base}/status?window=24h — health-aware selection. Best-effort: an
 *  empty/failed result means "no operational data available", which callers
 *  treat as neutral (not proof of failure), never as proof of health. */
async function fetchModelStatus(): Promise<Record<string, boolean>> {
  if (statusCache && Date.now() - statusCache.fetchedAt < STATUS_TTL_MS) {
    return statusCache.data;
  }
  try {
    const resp = await fetch(`${dahlBaseUrl()}/status?window=24h`, {
      signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`status endpoint returned ${resp.status}`);
    const json = (await resp.json()) as { models?: Array<{ id?: unknown; operational?: unknown }> };
    const map: Record<string, boolean> = {};
    for (const m of json?.models ?? []) {
      if (typeof m?.id === 'string') map[m.id] = m.operational === true;
    }
    statusCache = { data: map, fetchedAt: Date.now() };
    return map;
  } catch {
    return statusCache?.data ?? {};
  }
}

/**
 * Resolves an internal alias to a live, catalog-confirmed Dahl model ID.
 * Returns null only when the live catalog is completely unavailable AND no
 * cached catalog exists — callers must treat null as "Dahl unusable right
 * now", never substitute an undocumented model ID of their own.
 */
export async function resolveDahlModel(alias: DahlAlias): Promise<string | null> {
  const catalog = await fetchModelCatalog();
  if (catalog.length === 0) return null;
  const known = new Set(catalog.map((c) => c.id));
  const status = await fetchModelStatus();

  for (const candidate of ALIAS_PREFERENCE[alias]) {
    if (known.has(candidate) && status[candidate] !== false) return candidate;
  }
  // Alias preference exhausted (e.g. all 3 preferred IDs rotated away or are
  // reported down) — fall back to any other live, operational catalog entry
  // rather than failing outright, since the catalog itself is real.
  for (const entry of catalog) {
    if (status[entry.id] !== false) return entry.id;
  }
  // Every known model is reported non-operational; still prefer a real,
  // catalog-confirmed ID over refusing to attempt the call.
  return catalog[0].id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat completion
// ─────────────────────────────────────────────────────────────────────────────

export interface DahlChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DahlChatArgs {
  alias: DahlAlias;
  messages: DahlChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** Default 60_000ms per integration spec (small extraction/chat tasks). */
  timeoutMs?: number;
}

export interface DahlChatSuccess {
  ok: true;
  content: string;
  /** The exact live model ID that actually served the request. */
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  finishReason?: string;
  /** How many POSTs to /chat/completions this call made (1 = succeeded on
   *  the first try, no retry). Exists so callers/telemetry can distinguish
   *  "worked immediately" from "worked after retrying" instead of losing
   *  that signal the moment the call succeeds. */
  attempts: number;
  /** True only when the local JSON-repair network round-trip
   *  (repairJsonViaDahl) actually ran and its output is what's being
   *  returned. Never true for a jsonMode:false call or a response that was
   *  valid JSON on the first try -- callers must never infer "repair
   *  fixed it" without this flag being true. */
  repairAttempted: boolean;
}

export type DahlErrorKind =
  | 'config'
  | 'auth'
  | 'exhausted'
  | 'rate_limit'
  | 'unsupported_model'
  | 'timeout'
  | 'unavailable'
  | 'invalid_response';

export interface DahlChatError {
  ok: false;
  kind: DahlErrorKind;
  /** Sanitized, first-party-safe message. Never contains raw upstream body,
   *  headers, request IDs, or the Dahl hostname. */
  message: string;
  latencyMs: number;
  retryable: boolean;
  /** How many POSTs to /chat/completions were actually attempted before
   *  giving up (0 for failures that never reached the network call at all,
   *  e.g. missing API key or model-resolution failure). Answers "was the
   *  retry loop actually exercised, or did this fail on the very first
   *  attempt" without having to guess from latency alone. */
  attempts: number;
  /** True only when the bounded JSON-repair round-trip was attempted (it
   *  may still have failed -- this only means it was REACHED, not that it
   *  succeeded). Always false for non-jsonMode calls and for any failure
   *  that occurred before a response body was ever parsed. */
  repairAttempted: boolean;
}

export type DahlChatResult = DahlChatSuccess | DahlChatError;

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_MAX_RETRIES = 2; // integration spec: "Maximum two retries"

/** DAHL_MAX_RETRIES, capped at the spec's hard maximum of 2. An operator can
 *  set it lower (e.g. 0 or 1) but never higher — "maximum two retries" is a
 *  cost/latency ceiling, not merely a suggested default. */
function maxRetries(): number {
  const raw = Deno.env.get('DAHL_MAX_RETRIES');
  if (!raw) return DEFAULT_MAX_RETRIES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_MAX_RETRIES;
  return Math.min(Math.floor(n), DEFAULT_MAX_RETRIES);
}

/** DAHL_DEFAULT_ALIAS: the alias used when a caller doesn't pass one
 *  explicitly. Falls back to 'general' for any unrecognized value so a
 *  typo in config can never select a nonexistent alias. */
export function defaultAlias(): DahlAlias {
  const raw = Deno.env.get('DAHL_DEFAULT_ALIAS');
  if (raw === 'general' || raw === 'long_reasoning' || raw === 'fast_reasoning') return raw;
  return 'general';
}

/** DAHL_REQUEST_TIMEOUT_MS: the per-call deadline used when a caller doesn't
 *  pass its own timeoutMs (most callers do, via a tier's timeout budget). */
function defaultTimeoutMs(): number {
  const raw = Deno.env.get('DAHL_REQUEST_TIMEOUT_MS');
  if (!raw) return 60_000;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

/**
 * "Extract the JSON safely" (integration spec Phase 3): strips a markdown
 * code fence and any leading/trailing prose, then verifies the remaining
 * substring actually parses. Returns the cleaned substring on success, or
 * null if no valid JSON could be recovered locally — costs no extra network
 * round-trip, so it's always tried before the bounded repair request.
 */
function extractJsonSafely(text: string): string | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const candidate = cleaned.slice(start, end + 1);
  if (!isValidJsonObjectString(candidate)) return null;
  return candidate;
}

/**
 * True only for a JSON string that parses to a plain object -- never an
 * array, string, number, boolean, or null. `response_format: json_object`
 * implies an object; `JSON.parse` alone accepts any valid JSON value
 * (`"[]"`, `"42"`, `"null"` all parse successfully), which would let a
 * non-object response slip past validation and reach a caller (e.g.
 * callTierLlm) that assumes a record to index into.
 */
function isValidJsonObjectString(text: string): boolean {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return false;
  }
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
}

/**
 * "At most one bounded repair attempt" (integration spec Phase 3): asks the
 * SAME model, in a fresh single request, to correct its own malformed
 * output into valid JSON. Only invoked once local extraction has already
 * failed, and only when there's still meaningful time left in the caller's
 * deadline. Returns the corrected content string on success, or null if the
 * repair attempt itself failed or also didn't produce valid JSON — in
 * either case the caller falls back to reporting invalid_response.
 */
interface RepairSuccess {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

async function repairJsonViaDahl(
  apiKey: string,
  url: string,
  model: string,
  originalMessages: DahlChatMessage[],
  badContent: string,
  remainingMs: number,
  maxTokens: number | undefined,
): Promise<RepairSuccess | null> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          ...originalMessages,
          { role: 'assistant', content: badContent },
          {
            role: 'user',
            content: 'That response was not valid JSON. Reply again with ONLY a single valid JSON object — no markdown fences, no commentary, no text before or after it.',
          },
        ],
        stream: false,
        response_format: { type: 'json_object' },
        // Preserve the caller's own output-length/cost budget on the repair
        // request too -- without this it would fall through to the
        // provider's own default, silently exceeding whatever limit the
        // caller originally asked for.
        ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
      }),
      signal: AbortSignal.timeout(remainingMs),
    });
    if (!resp.ok) return null;
    const json = (await resp.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: unknown } }>; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }; model?: unknown }
      | null;
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) return null;

    const recovered = isValidJsonObjectString(content) ? content : extractJsonSafely(content);
    if (!recovered) return null;

    const usage = json?.usage ?? {};
    return {
      content: recovered,
      model: typeof json?.model === 'string' ? json.model : model,
      inputTokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0,
      outputTokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0,
    };
  } catch {
    return null;
  }
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds * 1000, 10_000);
}

/** Sleeps for the backoff duration, but never past `deadline` — otherwise a
 *  retry near the end of the call's timeout budget could sleep up to ~10s
 *  (the retry-after cap) beyond it before the next loop iteration's
 *  deadline check ever runs. */
async function backoff(attempt: number, retryAfterMs: number | null, deadline: number): Promise<void> {
  const base = retryAfterMs ?? Math.min(500 * 2 ** attempt, 4_000);
  const jitter = Math.random() * 250;
  const capped = Math.max(0, Math.min(base + jitter, deadline - Date.now()));
  await new Promise((resolve) => setTimeout(resolve, capped));
}

/**
 * The only function in the codebase permitted to POST to Dahl's
 * /chat/completions endpoint. Never throws — always resolves to a typed
 * success/error result.
 */
export async function dahlChatCompletion(args: DahlChatArgs): Promise<DahlChatResult> {
  const start = Date.now();
  const apiKey = Deno.env.get('DAHL_API_KEY');
  if (!apiKey) {
    return { ok: false, kind: 'config', message: 'Dahl is not configured.', latencyMs: 0, retryable: false, attempts: 0, repairAttempted: false };
  }

  const model = await resolveDahlModel(args.alias);
  if (!model) {
    return {
      ok: false,
      kind: 'unsupported_model',
      message: 'No live Dahl model is currently available for this task.',
      latencyMs: Date.now() - start,
      retryable: false,
      attempts: 0,
      repairAttempted: false,
    };
  }

  const timeoutMs = args.timeoutMs ?? defaultTimeoutMs();
  const retries = maxRetries();
  const url = `${dahlBaseUrl()}/chat/completions`;
  // A single deadline for the WHOLE call, not per-attempt: with a fresh
  // AbortSignal.timeout(timeoutMs) on every retry, 3 attempts could each
  // take the full timeout, tripling the caller's intended deadline (a real
  // problem since callTierLlm forwards a tier's timeout_ms budget straight
  // through here). Each attempt gets whatever time remains, never a fresh
  // full allowance.
  const deadline = start + timeoutMs;

  let lastError: DahlChatError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return lastError ?? { ok: false, kind: 'timeout', message: 'Dahl request timed out.', latencyMs: Date.now() - start, retryable: true, attempts: attempt, repairAttempted: false };
    }
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: args.messages,
          stream: false,
          ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
          ...(args.maxTokens !== undefined ? { max_tokens: args.maxTokens } : {}),
          ...(args.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(remainingMs),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'network error';
      const isAbort = /abort|timeout|deadline/i.test(msg);
      lastError = {
        ok: false,
        kind: isAbort ? 'timeout' : 'unavailable',
        message: isAbort ? 'Dahl request timed out.' : 'Dahl is temporarily unreachable.',
        latencyMs: Date.now() - start,
        retryable: true,
        attempts: attempt + 1,
        repairAttempted: false,
      };
      if (attempt < retries) {
        await backoff(attempt, null, deadline);
        continue;
      }
      return lastError;
    }

    if (resp.status === 401) {
      await resp.text().catch(() => '');
      return { ok: false, kind: 'auth', message: 'Dahl authentication failed.', latencyMs: Date.now() - start, retryable: false, attempts: attempt + 1, repairAttempted: false };
    }
    if (resp.status === 402) {
      await resp.text().catch(() => '');
      return {
        ok: false,
        kind: 'exhausted',
        message: 'Dahl key balance is exhausted.',
        latencyMs: Date.now() - start,
        retryable: false,
        attempts: attempt + 1,
        repairAttempted: false,
      };
    }
    if (resp.status === 429) {
      await resp.text().catch(() => '');
      const retryAfterMs = parseRetryAfterMs(resp.headers.get('retry-after'));
      lastError = { ok: false, kind: 'rate_limit', message: 'Dahl rate-limited the request.', latencyMs: Date.now() - start, retryable: true, attempts: attempt + 1, repairAttempted: false };
      if (attempt < retries) {
        await backoff(attempt, retryAfterMs, deadline);
        continue;
      }
      return lastError;
    }
    if (RETRYABLE_STATUS.has(resp.status)) {
      await resp.text().catch(() => '');
      lastError = {
        ok: false,
        kind: 'unavailable',
        message: 'Dahl is temporarily unavailable.',
        latencyMs: Date.now() - start,
        retryable: true,
        attempts: attempt + 1,
        repairAttempted: false,
      };
      if (attempt < retries) {
        await backoff(attempt, null, deadline);
        continue;
      }
      return lastError;
    }
    if (!resp.ok) {
      await resp.text().catch(() => '');
      // A non-retryable, non-enumerated status. Never expose the raw status
      // text or body to the caller — surface a sanitized, generic failure.
      return {
        ok: false,
        kind: 'unsupported_model',
        message: 'Dahl rejected the request.',
        latencyMs: Date.now() - start,
        retryable: false,
        attempts: attempt + 1,
        repairAttempted: false,
      };
    }

    const json = (await resp.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }>; usage?: { prompt_tokens?: unknown; completion_tokens?: unknown }; model?: unknown }
      | null;
    if (!json) {
      return { ok: false, kind: 'invalid_response', message: 'Dahl returned an unreadable response.', latencyMs: Date.now() - start, retryable: false, attempts: attempt + 1, repairAttempted: false };
    }
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      // Missing choices[0].message.content is a failure, not success — per
      // integration spec: never treat this as a usable completion.
      return { ok: false, kind: 'invalid_response', message: 'Dahl returned no usable content.', latencyMs: Date.now() - start, retryable: false, attempts: attempt + 1, repairAttempted: false };
    }

    const usage = json.usage ?? {};
    const inputTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0;
    const outputTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0;
    const finishReason = typeof json.choices?.[0]?.finish_reason === 'string' ? json.choices[0].finish_reason : undefined;
    const resolvedModel = typeof json.model === 'string' ? json.model : model;

    if (!args.jsonMode) {
      return { ok: true, content, model: resolvedModel, inputTokens, outputTokens, latencyMs: Date.now() - start, finishReason, attempts: attempt + 1, repairAttempted: false };
    }

    // jsonMode was requested: dahlChatCompletion guarantees the returned
    // content is genuinely valid JSON, or returns a typed error -- callers
    // must never have to independently guess whether "ok:true" content is
    // actually parseable. Root-caused by the 2026-08-24 canary incident,
    // where a caller had to discover on its own that an "ok:true" Dahl
    // response wasn't valid JSON.
    if (isValidJsonObjectString(content)) {
      return { ok: true, content, model: resolvedModel, inputTokens, outputTokens, latencyMs: Date.now() - start, finishReason, attempts: attempt + 1, repairAttempted: false };
    }
    {
      // Not a valid JSON object as-is (either malformed, or a valid JSON
      // value that isn't an object -- an array/string/number/null would
      // otherwise slip past a bare JSON.parse check even though
      // response_format: json_object implies an object). Try safe local
      // extraction first (no network cost).
      const extracted = extractJsonSafely(content);
      if (extracted) {
        return { ok: true, content: extracted, model: resolvedModel, inputTokens, outputTokens, latencyMs: Date.now() - start, finishReason, attempts: attempt + 1, repairAttempted: false };
      }
      // Local extraction failed too. One bounded network repair attempt,
      // only if there's meaningful time left in the caller's deadline.
      const remainingForRepair = deadline - Date.now();
      const repairEligible = remainingForRepair > 5_000;
      if (repairEligible) {
        const repaired = await repairJsonViaDahl(apiKey, url, model, args.messages, content, remainingForRepair, args.maxTokens);
        if (repaired) {
          // Use the REPAIR request's own model/usage metadata -- it's the
          // request that actually produced the returned content, so
          // reporting the original (failed) request's usage here would
          // under-count real spend for every repaired completion.
          return {
            ok: true,
            content: repaired.content,
            model: repaired.model,
            inputTokens: repaired.inputTokens,
            outputTokens: repaired.outputTokens,
            latencyMs: Date.now() - start,
            finishReason: 'repaired',
            attempts: attempt + 1,
            repairAttempted: true,
          };
        }
      }
      return {
        ok: false,
        kind: 'invalid_response',
        message: 'Dahl did not return valid JSON, and the bounded repair attempt did not recover it.',
        latencyMs: Date.now() - start,
        retryable: false,
        attempts: attempt + 1,
        // True whenever repair was reachable and invoked, even if it then
        // failed to recover valid JSON -- "repair was reached" and "repair
        // succeeded" are different claims, and this field only answers the
        // former (repairAttempted alone, without ok:true, means it was
        // tried and did NOT work).
        repairAttempted: repairEligible,
      };
    }
  }

  return lastError ?? { ok: false, kind: 'unavailable', message: 'Dahl request failed.', latencyMs: Date.now() - start, retryable: true, attempts: retries + 1, repairAttempted: false };
}
