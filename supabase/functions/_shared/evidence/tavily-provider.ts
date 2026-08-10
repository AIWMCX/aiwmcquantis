/**
 * Quantis Evidence Service — TavilyEvidenceProvider (PR E2.1).
 *
 * Real adapter for the one provider explicitly authorized for this slice
 * (founder direction: "Use Tavily first, because it is already the
 * explicit authenticated provider in current RVCE. Do not treat the
 * DuckDuckGo HTML scraper as a production-grade first provider yet.").
 *
 * Endpoint, request shape, and secret-reading convention are copied
 * EXACTLY from the already-working, already-in-production
 * `tavilySearch()` in `supabase/functions/rvce-validate/index.ts` --
 * this is a genuinely new file, but not a genuinely new integration; it
 * reuses the same API key, the same endpoint, and the same request body
 * shape RVCE already has a working relationship with Tavily through,
 * per the master prompt's own "reuse existing permitted providers"
 * instruction (section 10).
 *
 * NOT wired into RVCE, analyze-business, QOC, or any customer-visible
 * path. NOT called anywhere outside its own tests in this PR. Persisting
 * NOTHING -- see provider-registry.ts's TAVILY_PROVIDER for why
 * (canPersist stays false pending real clarification on caching/
 * retention rights).
 */
import type { EvidenceProvider, ProviderExecutionContext, ProviderResult, ProviderSearchRequest, ProviderSearchResult } from './provider.ts';
import { validateOutboundUrl } from './fetch-guard.ts';

const TAVILY_ENDPOINT = 'https://api.tavily.com/search';
const DEFAULT_TIMEOUT_MS = 8000; // Matches rvce-validate/index.ts's existing Tavily timeout.
const DEFAULT_MAX_RESULTS = 5;

/** Reads Deno.env safely in a module that also needs to load under Vitest/Node, where `Deno` is undefined. */
function readDenoEnv(name: string): string | undefined {
  const denoGlobal = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno;
  return denoGlobal?.env?.get?.(name);
}

interface RawTavilyResult {
  title?: string;
  content?: string;
  snippet?: string;
  url?: string;
  published_date?: string;
  score?: number;
}

interface RawTavilyResponse {
  results?: RawTavilyResult[];
}

export interface TavilyEvidenceProviderOptions {
  /** Injectable for tests; defaults to reading TAVILY_API_KEY via Deno.env.get, matching rvce-validate's convention exactly. */
  apiKey?: string;
  /** Injectable for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export class TavilyEvidenceProvider implements EvidenceProvider {
  readonly id = 'tavily';

  private readonly apiKey: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: TavilyEvidenceProviderOptions = {}) {
    this.apiKey = options.apiKey ?? readDenoEnv('TAVILY_API_KEY');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async search(
    request: ProviderSearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResult> {
    const startedAt = Date.now();

    if (!this.isAvailable()) {
      return {
        providerId: this.id,
        status: 'FAILED',
        results: [],
        latencyMs: Date.now() - startedAt,
        errorCode: 'PROVIDER_UNAVAILABLE',
      };
    }

    const timeoutMs = context.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxResults = request.maxResults ?? DEFAULT_MAX_RESULTS;

    let response: Response;
    try {
      response = await this.fetchImpl(TAVILY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // NEVER log this body -- it contains the API key. Callers must not
        // wrap this.fetchImpl with logging middleware that dumps request bodies.
        body: JSON.stringify({
          api_key: this.apiKey,
          query: request.query,
          search_depth: 'basic',
          max_results: maxResults,
          include_answer: false,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return {
        providerId: this.id,
        status: 'FAILED',
        results: [],
        latencyMs: Date.now() - startedAt,
        errorCode: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      };
    }

    if (!response.ok) {
      return {
        providerId: this.id,
        status: 'FAILED',
        results: [],
        latencyMs: Date.now() - startedAt,
        errorCode: `HTTP_${response.status}`,
      };
    }

    let data: RawTavilyResponse;
    try {
      data = (await response.json()) as RawTavilyResponse;
    } catch {
      return {
        providerId: this.id,
        status: 'FAILED',
        results: [],
        latencyMs: Date.now() - startedAt,
        errorCode: 'MALFORMED_RESPONSE',
      };
    }

    if (!Array.isArray(data.results)) {
      // Got a 200 with valid JSON, but not the shape we expect -- degraded,
      // not failed: the request itself succeeded, the payload just wasn't
      // usable. Distinct from a genuine zero-results match (handled below).
      return {
        providerId: this.id,
        status: 'DEGRADED',
        results: [],
        latencyMs: Date.now() - startedAt,
        errorCode: 'UNEXPECTED_RESPONSE_SHAPE',
      };
    }

    const results: ProviderResult[] = [];
    let droppedCount = 0;

    for (const raw of data.results.slice(0, maxResults)) {
      const url = raw.url ?? '';
      // Cheap, synchronous, no-network safety check at the provider
      // boundary -- an obviously malformed or dangerous URL (javascript:,
      // a literal private IP, etc.) is dropped here rather than silently
      // propagated into the normalization/dedup pipeline. This does NOT
      // fetch the URL (Tavily already gave us the content) -- it only
      // validates the URL string itself.
      const urlCheck = validateOutboundUrl(url);
      if (!urlCheck.ok) {
        droppedCount++;
        continue;
      }
      results.push({
        url,
        title: raw.title ?? '',
        content: raw.content ?? raw.snippet ?? '',
        publishedAt: raw.published_date,
        score: raw.score,
      });
    }

    return {
      providerId: this.id,
      status: droppedCount > 0 ? 'DEGRADED' : 'SUCCESS',
      results,
      latencyMs: Date.now() - startedAt,
      errorCode: droppedCount > 0 ? 'SOME_RESULTS_DROPPED_UNSAFE_URL' : undefined,
      // costUsd deliberately omitted: this session did not verify Tavily's
      // current per-request pricing against a live billing page, and a
      // fabricated number would be worse than none (see llm-call.ts's own
      // COST_PRICING table, which the earlier repository inspection
      // flagged as "not independently reconfirmed" -- do not repeat that
      // pattern here without the same honest caveat, or better, without
      // fabricating at all until it's actually looked up).
    };
  }
}
