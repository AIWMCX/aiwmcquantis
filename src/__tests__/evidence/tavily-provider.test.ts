/**
 * Quantis Evidence Service — TavilyEvidenceProvider regression suite (PR E2.1).
 *
 * Four test classes, per explicit founder direction:
 *   1. Contract tests
 *   2. Failure tests
 *   3. Security/privacy tests
 *   4. Opt-in integration test (real network, gated, never part of normal CI)
 *
 * All non-integration tests inject `fetchImpl` -- zero real network calls.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { TavilyEvidenceProvider } from '../../../supabase/functions/_shared/evidence/tavily-provider';
import type { ProviderExecutionContext } from '../../../supabase/functions/_shared/evidence/provider';

const CONTEXT: ProviderExecutionContext = { requestId: 'req-1', analysisRunId: 'run-1' };
const FAKE_KEY = 'tvly-test-key-do-not-use-1234567890';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ============================================================
// 1. Contract tests
// ============================================================
describe('TavilyEvidenceProvider — contract', () => {
  it('maps a well-formed Tavily response into typed ProviderResult[]', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { title: 'Denver rent report', content: 'Median rent is $X', url: 'https://example.com/a', published_date: '2026-01-01', score: 0.9 },
          { title: 'Second source', content: 'More detail', url: 'https://example.com/b', score: 0.7 },
        ],
      }),
    );
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'Denver commercial rent' }, CONTEXT);

    expect(result.providerId).toBe('tavily');
    expect(result.status).toBe('SUCCESS');
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({
      title: 'Denver rent report',
      content: 'Median rent is $X',
      url: 'https://example.com/a',
      publishedAt: '2026-01-01',
      score: 0.9,
    });
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('calls the real Tavily endpoint with the exact request shape rvce-validate already uses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    await provider.search({ query: 'test query', maxResults: 3 }, CONTEXT);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.tavily.com/search');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      api_key: FAKE_KEY,
      query: 'test query',
      search_depth: 'basic',
      max_results: 3,
      include_answer: false,
    });
  });

  it('isAvailable() reflects whether an API key is configured', () => {
    expect(new TavilyEvidenceProvider({ apiKey: FAKE_KEY }).isAvailable()).toBe(true);
    expect(new TavilyEvidenceProvider({ apiKey: undefined }).isAvailable()).toBe(false);
  });
});

// ============================================================
// 2. Failure tests
// ============================================================
describe('TavilyEvidenceProvider — failure handling', () => {
  it('timeout -> FAILED with errorCode TIMEOUT, never throws', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('TIMEOUT');
  });

  it('429 -> FAILED with errorCode HTTP_429', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('HTTP_429');
  });

  it('500 -> FAILED with errorCode HTTP_500', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('server error', { status: 500 }));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('HTTP_500');
  });

  it('malformed JSON -> FAILED with errorCode MALFORMED_RESPONSE, does not throw', async () => {
    // A fresh Response per call -- Response.json() can only be read once
    // per instance, and this test wants to prove the call resolves
    // (doesn't throw) via a single, real invocation.
    const fetchImpl = vi.fn().mockImplementation(
      async () => new Response('{not valid json', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('MALFORMED_RESPONSE');
  });

  it('zero results -> SUCCESS with an empty array, NOT a failure (a real "no matches" outcome)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('SUCCESS');
    expect(result.results).toEqual([]);
  });

  it('missing optional fields (no title/content) -> defaults gracefully, does not throw', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ results: [{ url: 'https://example.com/x' }] }));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('SUCCESS');
    expect(result.results[0]).toMatchObject({ url: 'https://example.com/x', title: '', content: '' });
  });

  it('unexpected response shape (results not an array) -> DEGRADED, not a crash', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ results: 'not-an-array' }));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('DEGRADED');
    expect(result.errorCode).toBe('UNEXPECTED_RESPONSE_SHAPE');
  });

  it('provider unavailable (no API key) -> FAILED without ever calling fetch', async () => {
    const fetchImpl = vi.fn();
    const provider = new TavilyEvidenceProvider({ apiKey: undefined, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('PROVIDER_UNAVAILABLE');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('a generic network error (not an AbortError) -> FAILED with errorCode NETWORK_ERROR', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('NETWORK_ERROR');
  });
});

// ============================================================
// 3. Security / privacy tests
// ============================================================
describe('TavilyEvidenceProvider — security / privacy', () => {
  it('never logs the API key to console.log or console.error', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ results: [] }));
      const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
      await provider.search({ query: 'x' }, CONTEXT);

      const allLoggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls, ...warnSpy.mock.calls]
        .flat()
        .map((v) => String(v))
        .join(' ');
      expect(allLoggedText).not.toContain(FAKE_KEY);
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('never re-fetches any URL returned in results -- fetchImpl is called exactly once, only against the Tavily endpoint itself', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { title: 'evil', content: 'x', url: 'http://169.254.169.254/latest/meta-data/' },
          { title: 'ok', content: 'y', url: 'https://example.com/fine' },
        ],
      }),
    );
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    await provider.search({ query: 'x' }, CONTEXT);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.tavily.com/search');
  });

  it('drops a result whose URL is a private/SSRF-target address rather than passing it downstream', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { title: 'evil', content: 'x', url: 'http://169.254.169.254/latest/meta-data/' },
          { title: 'ok', content: 'y', url: 'https://example.com/fine' },
        ],
      }),
    );
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);

    expect(result.status).toBe('DEGRADED');
    expect(result.errorCode).toBe('SOME_RESULTS_DROPPED_UNSAFE_URL');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].url).toBe('https://example.com/fine');
  });

  it('drops a result with a javascript: URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ results: [{ title: 'xss', content: 'x', url: 'javascript:alert(1)' }] }),
    );
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.results).toEqual([]);
  });

  it('never executes returned content -- script-like text is stored as an inert string, unmodified', async () => {
    const dangerous = '<script>alert(document.cookie)</script>';
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ results: [{ title: 'x', content: dangerous, url: 'https://example.com/a' }] }),
    );
    const provider = new TavilyEvidenceProvider({ apiKey: FAKE_KEY, fetchImpl });
    const result = await provider.search({ query: 'x' }, CONTEXT);
    expect(result.results[0].content).toBe(dangerous);
  });

  it('the source file contains no eval() or Function-constructor code execution', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, '../../../supabase/functions/_shared/evidence/tavily-provider.ts'),
      'utf-8',
    );
    expect(src).not.toContain('eval(');
    expect(src).not.toContain('new Function(');
  });
});

// ============================================================
// 4. Opt-in integration test -- real network, gated, never part of normal CI
// ============================================================
const runIntegration =
  process.env.EVIDENCE_PROVIDER_INTEGRATION_TESTS === 'true' && Boolean(process.env.TAVILY_API_KEY);

describe.skipIf(!runIntegration)('TavilyEvidenceProvider — opt-in live integration', () => {
  it('performs a real search against the live Tavily API', async () => {
    const provider = new TavilyEvidenceProvider({ apiKey: process.env.TAVILY_API_KEY });
    const result = await provider.search({ query: 'Denver Colorado commercial rent 2026' }, CONTEXT);
    expect(['SUCCESS', 'DEGRADED']).toContain(result.status);
    expect(Array.isArray(result.results)).toBe(true);
  });
});
