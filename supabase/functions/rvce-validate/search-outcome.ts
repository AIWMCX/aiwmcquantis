/**
 * RVCE web search with an explicit outcome for every provider call.
 *
 * F1 in docs/predicta/2026-11-06-phase2-governed-evidence-plan.md §1.4: the old
 * tavilySearch()/duckDuckGoSearch() in index.ts returned [] on any HTTP error,
 * timeout or exception, and webSearch() then fell back to DuckDuckGo silently.
 * A provider outage looked exactly like "the web has no numbers for this
 * metric" and was persisted as no_external_evidence_found. Charter invariant:
 * a provider failure must degrade, never fabricate.
 *
 * Now every call records success / degraded / failed (with a reason), results
 * carry the provider that returned them, a metric that needed the fallback is
 * degraded, and a metric whose providers all failed is a failure, never
 * "no evidence".
 *
 * Pure module (no Deno-only imports) so Vitest can load it.
 */

import { toRvceSearchResults, type TavilyClient, type TavilySearchOutcome } from '../_shared/tavily-client.ts';

export type SearchProviderId = 'tavily' | 'duckduckgo';
export type ProviderOutcome = 'success' | 'degraded' | 'failed';
export type ProviderFailureReason = 'rate_limited' | 'timed_out' | 'unavailable_credentials' | 'upstream_error';

export interface ProviderAttempt {
  provider: SearchProviderId;
  outcome: ProviderOutcome;
  /** Set only when outcome is 'failed'. */
  reason: ProviderFailureReason | null;
  /** The provider's own code (HTTP_429, TIMEOUT, ...), kept so the reason can be audited. */
  error_code: string | null;
  result_count: number;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface LabeledSearchResult extends SearchResult {
  provider: SearchProviderId;
}

export interface SearchCallOutcome {
  /** Results from exactly one provider (the one named in `provider`). */
  results: LabeledSearchResult[];
  provider: SearchProviderId | null;
  attempts: ProviderAttempt[];
}

/**
 * Tavily documents 401 as a missing or invalid key, 429 as a rate limit and
 * 432/433 as plan or pay-as-you-go usage limits (docs.tavily.com, checked
 * 2026-11-06). 403 is not documented for search; it is read as a key problem,
 * as in the Phase 2 plan §3.3 (decision O4). Anything else is upstream_error,
 * with the raw code kept in error_code.
 */
export function failureReasonFor(code: string): ProviderFailureReason {
  if (code === 'PROVIDER_UNAVAILABLE' || code === 'HTTP_401' || code === 'HTTP_403') return 'unavailable_credentials';
  if (code === 'HTTP_429' || code === 'HTTP_432' || code === 'HTTP_433') return 'rate_limited';
  if (code === 'TIMEOUT') return 'timed_out';
  return 'upstream_error';
}

const failed = (provider: SearchProviderId, code: string): ProviderAttempt => ({
  provider,
  outcome: 'failed',
  reason: failureReasonFor(code),
  error_code: code,
  result_count: 0,
});

export function classifyTavilyOutcome(o: TavilySearchOutcome): ProviderAttempt {
  if (o.status === 'SUCCESS') {
    return { provider: 'tavily', outcome: 'success', reason: null, error_code: null, result_count: o.results.length };
  }
  // A degraded answer with nothing usable is a failure (Phase 2 plan §3.3).
  if (o.status === 'DEGRADED' && o.results.length > 0) {
    return { provider: 'tavily', outcome: 'degraded', reason: null, error_code: o.errorCode ?? null, result_count: o.results.length };
  }
  return failed('tavily', o.errorCode ?? 'UNMAPPED');
}

function errorCodeFor(err: unknown): string {
  const name = err instanceof Error ? err.name : '';
  return name === 'AbortError' || name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
}

export function parseDuckDuckGoHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Accept both layouts:
  //   • html.duckduckgo.com → class="result__a" / class="result__snippet"
  //   • lite.duckduckgo.com → class='result-link' / class='result-snippet'
  const linkRegex =
    /<a[^>]+class=['"](?:result__a|result-link)['"][^>]+href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex =
    /<(?:a|td)[^>]+class=['"](?:result__snippet|result-snippet)['"][^>]*>([\s\S]*?)<\/(?:a|td)>/gi;

  const links    = [...html.matchAll(linkRegex)];
  const snippets = [...html.matchAll(snippetRegex)];

  const unwrap = (href: string): string => {
    try {
      const abs = href.startsWith('//') ? `https:${href}` : href;
      const u = new URL(abs);
      const uddg = u.searchParams.get('uddg');
      return uddg ? decodeURIComponent(uddg) : abs;
    } catch {
      return href;
    }
  };

  for (let i = 0; i < links.length && results.length < 5; i++) {
    const url   = unwrap(links[i][1]);
    const title = links[i][2].replace(/<[^>]+>/g, '').trim();
    const snippet = snippets[i]
      ? snippets[i][1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';
    if (url && title && /^https?:\/\//.test(url) && !/duckduckgo\.com/.test(url)) {
      results.push({ title, snippet, url });
    }
  }

  // Last-ditch fallback: any external link with visible anchor text
  if (results.length === 0) {
    const fallbackLinks = [...html.matchAll(/href=['"](https?:\/\/[^'"]+)['"][^>]*>([^<]{5,80})<\/a>/g)];
    for (const m of fallbackLinks.slice(0, 5)) {
      if (/duckduckgo\.com/.test(m[1])) continue;
      results.push({ url: m[1], title: m[2].trim(), snippet: '' });
    }
  }

  return results;
}

export async function duckDuckGoSearch(
  query: string,
  fetchImpl: typeof fetch = (...args: Parameters<typeof fetch>) => fetch(...args),
): Promise<{ results: LabeledSearchResult[]; attempt: ProviderAttempt }> {
  let html: string;
  try {
    // Use the POST form on html.duckduckgo.com — more permissive for non-browser clients
    // than lite.duckduckgo.com (which 200s but returns an empty results page when it
    // detects a non-standard User-Agent like ours).
    const form = new URLSearchParams({ q: query, kl: 'us-en' });
    const resp = await fetchImpl('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return { results: [], attempt: failed('duckduckgo', `HTTP_${resp.status}`) };
    html = await resp.text();
  } catch (err) {
    return { results: [], attempt: failed('duckduckgo', errorCodeFor(err)) };
  }

  const results = parseDuckDuckGoHtml(html).map((r) => ({ ...r, provider: 'duckduckgo' as const }));
  return {
    results,
    attempt: { provider: 'duckduckgo', outcome: 'success', reason: null, error_code: null, result_count: results.length },
  };
}

/** Tavily first; DuckDuckGo only when Tavily failed or returned nothing. */
export async function searchWithFallback(
  query: string,
  deps: {
    tavily: TavilyClient;
    duckDuckGo: (query: string) => Promise<{ results: LabeledSearchResult[]; attempt: ProviderAttempt }>;
  },
): Promise<SearchCallOutcome> {
  const tavilyOutcome = await deps.tavily.search(query);
  const tavilyAttempt = classifyTavilyOutcome(tavilyOutcome);
  if (tavilyAttempt.outcome !== 'failed' && tavilyOutcome.results.length > 0) {
    return {
      results: toRvceSearchResults(tavilyOutcome).map((r) => ({ ...r, provider: 'tavily' as const })),
      provider: 'tavily',
      attempts: [tavilyAttempt],
    };
  }
  const ddg = await deps.duckDuckGo(query);
  return {
    results: ddg.results,
    provider: ddg.results.length > 0 ? 'duckduckgo' : null,
    attempts: [tavilyAttempt, ddg.attempt],
  };
}

/**
 * success: every call succeeded. degraded: at least one call answered and at
 * least one did not (or answered degraded). failed: no call answered, which
 * includes a metric that recorded no call at all.
 */
export function summarizeAttempts(attempts: ProviderAttempt[]): ProviderOutcome {
  if (!attempts.some((a) => a.outcome !== 'failed')) return 'failed';
  return attempts.every((a) => a.outcome === 'success') ? 'success' : 'degraded';
}

const REASON_TEXT: Record<ProviderFailureReason, string> = {
  rate_limited: 'rate limited',
  timed_out: 'timed out',
  unavailable_credentials: 'credentials unavailable',
  upstream_error: 'upstream error',
};

function failureList(attempts: ProviderAttempt[]): Array<{ provider: SearchProviderId; reason: ProviderFailureReason }> {
  const seen = new Set<string>();
  const out: Array<{ provider: SearchProviderId; reason: ProviderFailureReason }> = [];
  for (const a of attempts) {
    if (a.outcome !== 'failed' || !a.reason) continue;
    const key = `${a.provider}=${a.reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ provider: a.provider, reason: a.reason });
  }
  return out;
}

/** "tavily rate limited; duckduckgo timed out" */
export function describeFailures(attempts: ProviderAttempt[]): string {
  return failureList(attempts).map((f) => `${f.provider} ${REASON_TEXT[f.reason]}`).join('; ');
}

/** The NO_DATA note: says "no results" only when the providers actually answered. */
export function noDataNote(input: { webSearchFired: boolean; attempts: ProviderAttempt[] }): string {
  const outcome = summarizeAttempts(input.attempts);
  if (outcome === 'failed') {
    const why = describeFailures(input.attempts) || 'no search call completed';
    return `Search providers failed (${why}). External validation unavailable; this is a provider failure, not a finding that no data exists.`;
  }
  const base = input.webSearchFired
    ? 'Web search ran but found insufficient numeric data for this metric.'
    : 'No web results found. External validation unavailable.';
  const why = describeFailures(input.attempts);
  return outcome === 'degraded' && why ? `${base} Search was degraded (${why}).` : base;
}

/** rvce_observations.rejection_reason for a metric with no evidence rows. */
export function noEvidenceRejectionReason(attempts: ProviderAttempt[]): string {
  // No call recorded: the metric errored before or during search.
  if (attempts.length === 0) return 'search_not_completed';
  if (summarizeAttempts(attempts) !== 'failed') return 'no_external_evidence_found';
  return `search_provider_failed:${failureList(attempts).map((f) => `${f.provider}=${f.reason}`).join(',')}`;
}

export interface ProviderOutcomeCount {
  success: number;
  degraded: number;
  failed: number;
  failure_reasons: Partial<Record<ProviderFailureReason, number>>;
}

export function providerOutcomeCounts(attempts: ProviderAttempt[]): Partial<Record<SearchProviderId, ProviderOutcomeCount>> {
  const out: Partial<Record<SearchProviderId, ProviderOutcomeCount>> = {};
  for (const a of attempts) {
    const c = (out[a.provider] ??= { success: 0, degraded: 0, failed: 0, failure_reasons: {} });
    c[a.outcome] += 1;
    if (a.outcome === 'failed' && a.reason) c.failure_reasons[a.reason] = (c.failure_reasons[a.reason] ?? 0) + 1;
  }
  return out;
}
