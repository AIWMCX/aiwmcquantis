/**
 * Free-Tier Model Router
 * ======================
 * Lovable AI Gateway (Gemini Flash) → DeepSeek v4 Flash → deterministic fallback.
 *
 * Rules:
 *  - Only writes prose (narrative, classification, action plan).
 *  - Never touches deterministic financial numbers.
 *  - Always returns a result — worst case is the deterministic prose fallback.
 *  - Plus tier keeps Claude (see analyze-business/index.ts routing branch).
 */

export type FreeTierProvider = 'lovable' | 'deepseek';

interface OpenAIProvider {
  name: FreeTierProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}

/** Build provider list at call time so secrets are read fresh per invocation. */
const FREE_PROVIDERS = (): OpenAIProvider[] => [
  {
    name: 'lovable',
    baseUrl: 'https://ai.gateway.lovable.dev/v1',
    apiKey: Deno.env.get('LOVABLE_API_KEY') ?? '',
    model: 'google/gemini-2.5-flash',   // stable & cheap; upgrade to gemini-3-flash when GA
  },
  {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: Deno.env.get('DEEPSEEK_API_KEY') ?? '',
    model: 'deepseek-chat',             // deepseek-v4-flash alias; OpenAI-compatible
  },
];

/**
 * Single OpenAI-compatible call with timeout.
 * Throws on HTTP error, timeout, missing key, or empty completion.
 * Defensive JSON fence stripper handles both providers.
 */
async function callOpenAICompatible(
  p: OpenAIProvider,
  system: string,
  user: string,
  maxTokens: number,
  jsonMode = false,
  timeoutMs = 20_000,
): Promise<string> {
  if (!p.apiKey) throw new Error(`${p.name}: missing API key`);

  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${p.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: maxTokens,
      temperature: 0.4,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: jsonMode
            ? `${system}\n\nRespond with STRICT JSON only — no markdown fences, no prose.`
            : system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${p.name} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error(`${p.name}: empty completion`);

  // Strip markdown JSON fences if provider ignored json_mode instruction
  const cleaned = text.replace(/^```json\s*/m, '').replace(/\s*```$/m, '').trim();

  return cleaned;
}

/**
 * Try providers in order. First success wins.
 * One in-provider retry (800ms backoff) before falling through to next provider.
 * Throws `all_free_providers_failed` if every provider fails.
 */
export async function callFreeTierModel(
  system: string,
  user: string,
  maxTokens: number,
  jsonMode = false,
): Promise<{ text: string; providerUsed: FreeTierProvider; promptTokens: number; completionTokens: number }> {
  const providers = FREE_PROVIDERS();
  let lastErr = 'no providers configured';

  for (const p of providers) {
    // Single retry per provider before falling through
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 800));
        }
        const text = await callOpenAICompatible(p, system, user, maxTokens, jsonMode);
        return { text, providerUsed: p.name, promptTokens: 0, completionTokens: 0 };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        lastErr = msg;
        // 429 → always retry within the same provider
        if (!msg.includes('429') || attempt > 0) {
          console.warn(`[free-router] ${p.name} attempt ${attempt + 1} failed:`, msg);
          break; // fall through to next provider
        }
        console.warn(`[free-router] ${p.name} 429 → backing off 800ms`);
      }
    }
  }

  throw new Error(`all_free_providers_failed: ${lastErr}`);
}

/**
 * Source label shown in the report — transparent about which engine wrote the prose.
 */
export function providerLabel(used: FreeTierProvider | 'claude' | 'deterministic'): string {
  switch (used) {
    case 'lovable':       return 'AI narrative — Gemini Flash (Lovable AI Gateway)';
    case 'deepseek':      return 'AI narrative — DeepSeek v4 Flash';
    case 'claude':        return 'AI narrative — Claude Sonnet 4.6';
    case 'deterministic': return 'Deterministic fallback narrative (no AI model available)';
  }
}
