/**
 * LLM Router — central task → provider+model resolver.
 *
 * Decisions (locked, see plan):
 *  - DeepSeek is primary for high-volume / web-search / extraction / narrator / PRO reasoning.
 *  - Anthropic is primary for adversarial validator + ai-consensus second voice
 *    (diversity), and is universal fallback for Claude-eligible tasks.
 *  - Lovable Gateway is universal fallback for everything else.
 *  - In-memory circuit breaker per provider: 5 consecutive fails → 60s open.
 *  - If caller passes an explicit model prefix (claude-, deepseek-, google/, openai/),
 *    router honors it verbatim.
 *
 * Env flags:
 *   LLM_DEEPSEEK_ENABLED       (default: true)
 *   LLM_DEEPSEEK_TRAFFIC_PCT   (0–100, default: 100)
 *   LLM_PRIMARY_PROVIDER       (override default primary; default: deepseek)
 *   LLM_FALLBACK_CHAIN         (csv override of providers; advanced)
 */

export type Provider = 'deepseek' | 'lovable_gateway' | 'anthropic';

export interface RouteDecision {
  provider: Provider;
  model: string;
  fallback?: { provider: Provider; model: string };
  /** Diagnostic tag — why this route was chosen. */
  reason: string;
}

interface TaskRoute {
  primary: { provider: Provider; model: string };
  fallback?: { provider: Provider; model: string };
}

/**
 * Default task → route matrix.
 * Keys are `opts.task` strings used at call sites (function name or
 * function-name:subtask). Unknown tasks fall through to DEFAULT_ROUTE.
 */
const TASK_ROUTES: Record<string, TaskRoute> = {
  // ── Main analysis (FREE / PLUS) ─────────────────────────────────────
  'analyze-business': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'analyze-preview': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash-lite' },
  },
  'analyze-plus': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },

  // ── PRO deep reasoning ──────────────────────────────────────────────
  'analyze-pro-worker': {
    primary: { provider: 'deepseek', model: 'deepseek-reasoner' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },
  'analyze-pro-extension': {
    primary: { provider: 'deepseek', model: 'deepseek-reasoner' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },

  // ── Narrator → DeepSeek primary (locked decision) ───────────────────
  'ai-narrator': {
    primary: { provider: 'deepseek', model: 'deepseek-reasoner' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },

  // ── High-stakes reasoning kept on Anthropic ─────────────────────────
  'ai-consensus': {
    primary: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
    fallback: { provider: 'deepseek', model: 'deepseek-reasoner' },
  },
  'hybrid-validator': {
    primary: { provider: 'anthropic', model: 'claude-opus-4-5' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },

  // ── RVCE — DeepSeek for fan-out search & per-variable reasoning ─────
  'rvce-validate': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'rvce-validate:search': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'rvce-validate:reason': {
    primary: { provider: 'deepseek', model: 'deepseek-reasoner' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },
  'rvce-validate:reconcile': {
    primary: { provider: 'deepseek', model: 'deepseek-reasoner' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },

  // ── Document / content / extraction (cheap, structured) ─────────────
  'generate-document-content': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
  },
  'generate-document': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'parse-document': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'invoice-capacity-check': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'generate-idea': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'template-optimizer': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'autoposter-generate-content': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
  'industry-classification': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'anthropic', model: 'claude-haiku-4-5' },
  },
  'calculate-financials': {
    primary: { provider: 'deepseek', model: 'deepseek-chat' },
    fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
  },
};

const DEFAULT_ROUTE: TaskRoute = {
  primary: { provider: 'deepseek', model: 'deepseek-chat' },
  fallback: { provider: 'lovable_gateway', model: 'google/gemini-2.5-flash' },
};

// ───── Circuit breaker ────────────────────────────────────────────────

interface BreakerState {
  fails: number;
  openUntil: number;
}
const breakers = new Map<Provider, BreakerState>();
const BREAKER_THRESHOLD = 5;
const BREAKER_OPEN_MS = 60_000;

export function recordSuccess(provider: Provider): void {
  breakers.set(provider, { fails: 0, openUntil: 0 });
}

export function recordFailure(provider: Provider): void {
  const cur = breakers.get(provider) ?? { fails: 0, openUntil: 0 };
  cur.fails += 1;
  if (cur.fails >= BREAKER_THRESHOLD) {
    cur.openUntil = Date.now() + BREAKER_OPEN_MS;
    cur.fails = 0; // reset for next window
  }
  breakers.set(provider, cur);
}

export function isBreakerOpen(provider: Provider): boolean {
  const cur = breakers.get(provider);
  if (!cur) return false;
  return cur.openUntil > Date.now();
}

// ───── Provider inference from explicit model strings ─────────────────

function providerFromModel(model: string): Provider | null {
  const m = model.toLowerCase();
  if (m.startsWith('claude-')) return 'anthropic';
  if (m.startsWith('deepseek-') || m.startsWith('deepseek/')) return 'deepseek';
  if (m.startsWith('google/') || m.startsWith('openai/')) return 'lovable_gateway';
  return null;
}

// ───── Env helpers ────────────────────────────────────────────────────

function envBool(key: string, def: boolean): boolean {
  const v = Deno.env.get(key);
  if (v === undefined || v === null || v === '') return def;
  return /^(1|true|yes|on)$/i.test(v);
}

function envInt(key: string, def: number): number {
  const v = Deno.env.get(key);
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function deepseekEnabled(): boolean {
  return envBool('LLM_DEEPSEEK_ENABLED', true) && Boolean(Deno.env.get('DEEPSEEK_API_KEY'));
}

/**
 * Resolve the route for a given task.
 * Honors explicit model prefix on `requestedModel`.
 */
export function resolveRoute(task: string, requestedModel?: string): RouteDecision {
  // 1) Explicit model wins.
  if (requestedModel) {
    const inferred = providerFromModel(requestedModel);
    if (inferred) {
      return {
        provider: inferred,
        model: requestedModel,
        reason: `explicit_model:${inferred}`,
      };
    }
  }

  // 2) Look up task.
  const route = TASK_ROUTES[task] ?? DEFAULT_ROUTE;
  let primary = route.primary;
  let fallback = route.fallback;

  // 3) Honor traffic split + breaker for DeepSeek.
  if (primary.provider === 'deepseek') {
    const enabled = deepseekEnabled();
    const pct = Math.max(0, Math.min(100, envInt('LLM_DEEPSEEK_TRAFFIC_PCT', 100)));
    const breakerOpen = isBreakerOpen('deepseek');
    if (!enabled || breakerOpen || pct === 0) {
      // Fall back to declared fallback (or default)
      primary = fallback ?? DEFAULT_ROUTE.fallback!;
      fallback = undefined;
    } else if (pct < 100) {
      const sample = Math.random() * 100;
      if (sample > pct) {
        primary = fallback ?? DEFAULT_ROUTE.fallback!;
        fallback = undefined;
      }
    }
  }

  // 4) If primary breaker is open, skip to fallback.
  if (isBreakerOpen(primary.provider) && fallback) {
    return {
      provider: fallback.provider,
      model: fallback.model,
      reason: `breaker_open:${primary.provider}`,
    };
  }

  return {
    provider: primary.provider,
    model: primary.model,
    fallback,
    reason: `task:${task}`,
  };
}

/** Approx pricing $/1M tokens — used for cost estimation in telemetry. */
const PRICING: Record<string, { in: number; out: number }> = {
  // DeepSeek (Nov 2025 published rates; cache-miss pricing)
  'deepseek-chat': { in: 0.27, out: 1.1 },
  'deepseek-reasoner': { in: 0.55, out: 2.19 },
  // Anthropic (current 4.x rates)
  'claude-haiku-4-5': { in: 1, out: 5 },
  'claude-sonnet-4-5': { in: 3, out: 15 },
  'claude-opus-4-5': { in: 15, out: 75 },
  // Lovable Gateway (Gemini family — approx.)
  'google/gemini-2.5-pro': { in: 1.25, out: 10 },
  'google/gemini-2.5-flash': { in: 0.3, out: 2.5 },
  'google/gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
  'google/gemini-3-flash-preview': { in: 0.3, out: 2.5 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING[model.toLowerCase()];
  if (!p) return 0;
  return Number((((inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out)).toFixed(6));
}
