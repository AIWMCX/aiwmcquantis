/**
 * DeepSeek client — OpenAI-compatible chat completions.
 * Endpoint: https://api.deepseek.com/v1/chat/completions
 * Models:
 *   - deepseek-chat      (V3, general JSON / structured / web-search workloads)
 *   - deepseek-reasoner  (R1, reasoning; we strip `reasoning_content` so
 *                         downstream JSON parsers don't break)
 *
 * Returns Lovable/OpenAI-shaped responses ({ choices, usage, model }) so
 * existing aiCall() consumers work unchanged.
 */

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export type DeepseekModel = 'deepseek-chat' | 'deepseek-reasoner';

export interface DeepseekCallBody {
  model: string;
  messages: Array<{ role: string; content: unknown; [k: string]: unknown }>;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
  tools?: unknown[];
  tool_choice?: unknown;
  [k: string]: unknown;
}

export interface DeepseekDispatchResult {
  ok: boolean;
  status: number;
  /** Lovable/OpenAI-shape body */
  data?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

export function isDeepseekConfigured(): boolean {
  return Boolean(Deno.env.get('DEEPSEEK_API_KEY'));
}

/**
 * Map model alias to DeepSeek's expected name.
 * Accepts: deepseek-chat, deepseek-reasoner, deepseek/deepseek-chat, etc.
 */
export function resolveDeepseekModel(model?: string): DeepseekModel {
  const m = (model ?? '').toLowerCase();
  if (m.includes('reasoner') || m.includes('r1')) return 'deepseek-reasoner';
  return 'deepseek-chat';
}

export async function callDeepseek(
  body: DeepseekCallBody,
  timeoutMs: number,
): Promise<DeepseekDispatchResult> {
  const key = Deno.env.get('DEEPSEEK_API_KEY');
  if (!key) {
    return { ok: false, status: 500, error: 'DEEPSEEK_KEY_MISSING' };
  }

  const requestModel = resolveDeepseekModel(body.model);
  const requestBody: Record<string, unknown> = { ...body, model: requestModel };

  // DeepSeek-reasoner does not support `temperature`/`top_p` officially;
  // strip to avoid 400s.
  if (requestModel === 'deepseek-reasoner') {
    delete requestBody.temperature;
    delete requestBody.top_p;
    // reasoner also doesn't support response_format=json_object reliably
    delete requestBody.response_format;
  }

  let resp: Response;
  try {
    resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'fetch failed';
    const isAbort = /abort|timeout|deadline/i.test(message);
    return {
      ok: false,
      status: isAbort ? 504 : 502,
      error: isAbort ? 'AI_TIMEOUT' : 'AI_ERROR',
      detail: message,
    };
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

  // Strip reasoning_content from R1 responses so JSON parsers downstream
  // never see the chain-of-thought.
  const choices = (data.choices as Array<Record<string, unknown>> | undefined) ?? [];
  for (const c of choices) {
    const msg = c.message as Record<string, unknown> | undefined;
    if (msg && 'reasoning_content' in msg) delete msg.reasoning_content;
  }

  return { ok: true, status: 200, data };
}
