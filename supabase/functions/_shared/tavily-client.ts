/**
 * One Tavily client for every Quantis caller (Phase 1, contract set item 4).
 *
 * Today three places talk to (or plan to talk to) Tavily, each with its own copy:
 *   - supabase/functions/rvce-validate/index.ts `tavilySearch()` (live, main)
 *   - System A `_shared/evidence/tavily-provider.ts` (branch feature/evidence-service, never merged)
 *   - Predicta `src/providers/types.ts` declares TAVILY_API_KEY but has no client yet
 * None of them is switched over in this change; see docs/phase1/financial-kernel-plan.md §7.
 *
 * The request body is the one RVCE already sends in production (api_key in the body,
 * search_depth 'basic', include_answer false, 8 s timeout), so switching a caller over
 * changes nothing on the wire.
 *
 * Pure module: no Deno-only imports, so Vitest can load it. The API key is never
 * logged and never returned; callers must not wrap fetchImpl with body logging.
 */

export const TAVILY_CLIENT_VERSION = 'tavily-client-v1';
export const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
export const TAVILY_DEFAULT_TIMEOUT_MS = 8000;
export const TAVILY_DEFAULT_MAX_RESULTS = 5;
export const TAVILY_MAX_RESULTS_CAP = 20;

export type TavilySearchDepth = 'basic' | 'advanced';

export interface TavilySearchOptions {
  maxResults?: number;
  searchDepth?: TavilySearchDepth;
  timeoutMs?: number;
}

export interface TavilyResult {
  url: string;
  title: string;
  /** Tavily's extracted page text (falls back to `snippet` on older responses). */
  content: string;
  publishedAt?: string;
  score?: number;
}

export type TavilyStatus = 'SUCCESS' | 'DEGRADED' | 'FAILED';

export type TavilyErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'EMPTY_QUERY'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'UNEXPECTED_RESPONSE_SHAPE'
  | 'SOME_RESULTS_DROPPED_UNSAFE_URL'
  | `HTTP_${number}`;

export interface TavilySearchOutcome {
  provider: 'tavily';
  clientVersion: typeof TAVILY_CLIENT_VERSION;
  status: TavilyStatus;
  results: TavilyResult[];
  latencyMs: number;
  /** When the response was received (ISO 8601); becomes Source.retrieved_at in aiwmc.evidence.v1. */
  retrievedAt: string;
  errorCode?: TavilyErrorCode;
  droppedCount: number;
}

export interface TavilyClientOptions {
  /** Defaults to TAVILY_API_KEY from Deno.env (undefined under Node/Vitest). */
  apiKey?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export interface TavilyClient {
  isAvailable(): boolean;
  search(query: string, options?: TavilySearchOptions): Promise<TavilySearchOutcome>;
}

function readDenoEnv(name: string): string | undefined {
  const denoGlobal = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno;
  return denoGlobal?.env?.get?.(name);
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata.goog']);
const BLOCKED_SUFFIXES = ['.local', '.internal', '.localdomain'];

/**
 * String-only check on a result URL (no DNS, no fetch). Tavily already fetched the page;
 * this only keeps obviously unsafe URLs (javascript:, file:, literal private IPs) out of
 * evidence. The full SSRF guard for direct fetches is System A's fetch-guard.ts, which
 * Phase 2 salvages (decision D4).
 */
export function isSafeResultUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || BLOCKED_HOSTNAMES.has(host)) return false;
  if (BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return false;
  if (host === '0.0.0.0' || host === '::' || host === '::1') return false;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 127 || a === 10 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  if (host.includes(':')) {
    if (/^f[cd][0-9a-f]{2}:/i.test(host)) return false;
    if (/^fe[89ab][0-9a-f]:/i.test(host)) return false;
    if (host.startsWith('::ffff:')) return false;
  }
  return true;
}

interface RawTavilyResult {
  title?: unknown;
  content?: unknown;
  snippet?: unknown;
  url?: unknown;
  published_date?: unknown;
  score?: unknown;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

export function createTavilyClient(options: TavilyClientOptions = {}): TavilyClient {
  const apiKey = options.apiKey ?? readDenoEnv('TAVILY_API_KEY');
  const fetchImpl = options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const now = options.now ?? Date.now;

  return {
    isAvailable: () => Boolean(apiKey),

    async search(query, searchOptions = {}) {
      const startedAt = now();
      const outcome = (
        status: TavilyStatus,
        results: TavilyResult[],
        errorCode?: TavilyErrorCode,
        droppedCount = 0,
      ): TavilySearchOutcome => {
        const end = now();
        return {
          provider: 'tavily',
          clientVersion: TAVILY_CLIENT_VERSION,
          status,
          results,
          latencyMs: end - startedAt,
          retrievedAt: new Date(end).toISOString(),
          ...(errorCode ? { errorCode } : {}),
          droppedCount,
        };
      };

      if (!apiKey) return outcome('FAILED', [], 'PROVIDER_UNAVAILABLE');
      const trimmed = query.trim();
      if (!trimmed) return outcome('FAILED', [], 'EMPTY_QUERY');

      const maxResults = Math.min(
        Math.max(1, Math.floor(searchOptions.maxResults ?? TAVILY_DEFAULT_MAX_RESULTS)),
        TAVILY_MAX_RESULTS_CAP,
      );

      let response: Response;
      try {
        response = await fetchImpl(TAVILY_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            query: trimmed,
            search_depth: searchOptions.searchDepth ?? 'basic',
            max_results: maxResults,
            include_answer: false,
          }),
          signal: AbortSignal.timeout(searchOptions.timeoutMs ?? TAVILY_DEFAULT_TIMEOUT_MS),
        });
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        return outcome('FAILED', [], name === 'AbortError' || name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR');
      }

      if (!response.ok) return outcome('FAILED', [], `HTTP_${response.status}`);

      let data: { results?: unknown };
      try {
        data = (await response.json()) as { results?: unknown };
      } catch {
        return outcome('FAILED', [], 'MALFORMED_RESPONSE');
      }
      if (!data || !Array.isArray(data.results)) return outcome('DEGRADED', [], 'UNEXPECTED_RESPONSE_SHAPE');

      const results: TavilyResult[] = [];
      let dropped = 0;
      for (const raw of (data.results as RawTavilyResult[]).slice(0, maxResults)) {
        const url = str(raw?.url);
        if (!isSafeResultUrl(url)) {
          dropped++;
          continue;
        }
        const publishedAt = str(raw.published_date);
        results.push({
          url,
          title: str(raw.title),
          content: str(raw.content) || str(raw.snippet),
          ...(publishedAt ? { publishedAt } : {}),
          ...(typeof raw.score === 'number' && Number.isFinite(raw.score) ? { score: raw.score } : {}),
        });
      }
      return dropped > 0
        ? outcome('DEGRADED', results, 'SOME_RESULTS_DROPPED_UNSAFE_URL', dropped)
        : outcome('SUCCESS', results);
    },
  };
}

/** RVCE's existing `SearchResult` shape, so rvce-validate can switch with a one-line change. */
export function toRvceSearchResults(outcome: TavilySearchOutcome): { title: string; snippet: string; url: string }[] {
  return outcome.results.map((r) => ({ title: r.title, snippet: r.content, url: r.url }));
}
