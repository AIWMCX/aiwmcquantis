/**
 * Quantis Evidence Service — pipeline.ts regression suite (PR E2.1).
 *
 * End-to-end, but entirely mocked -- no real network calls. Proves the
 * full wiring from raw business input through to a QuantisEvidencePacket
 * without touching RVCE/analyze-business/QOC/the database.
 */
import { describe, it, expect, vi } from 'vitest';
import { runEvidencePipeline } from '../../../supabase/functions/_shared/evidence/pipeline';
import { TavilyEvidenceProvider } from '../../../supabase/functions/_shared/evidence/tavily-provider';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function deterministicIds() {
  let n = 0;
  return () => `id-${n++}`;
}

describe('runEvidencePipeline — happy path', () => {
  it('produces a well-formed QuantisEvidencePacket from a mocked Tavily response', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () =>
      jsonResponse({
        results: [
          { title: 'Denver commercial rent report', content: 'Median rent is $28/sqft in 2026.', url: 'https://example.com/rent', published_date: '2026-01-01' },
          { title: 'Denver rent, secondary source', content: 'Rent averages around $27-29/sqft.', url: 'https://another-example.com/rent2' },
        ],
      }),
    );
    const tavily = new TavilyEvidenceProvider({ apiKey: 'test-key', fetchImpl });

    const { packet, request, providerResults, privacyFindings } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop',
      location: 'Denver, Colorado',
      providers: [tavily],
      idGenerator: deterministicIds(),
      clock: () => '2026-08-10T00:00:00Z',
    });

    expect(privacyFindings).toEqual([]);
    expect(providerResults.length).toBeGreaterThan(0);
    expect(request.analysisRunId).toBe('run-1');
    expect(request.questions.length).toBeGreaterThan(0);
    expect(packet.analysisRunId).toBe('run-1');
    expect(packet.degraded).toBe(false);
    expect(packet.sources.length).toBeGreaterThan(0);
    expect(packet.passages.length).toBe(packet.sources.length);
    expect(packet.claims.length).toBeGreaterThan(0);
    expect(packet.contentHash).toMatch(/^[0-9a-f]{64}$/);
    // Honesty note enforcement: this slice never extracts numeric observations or contradictions.
    expect(packet.numericObservations).toEqual([]);
    expect(packet.contradictions).toEqual([]);
  });

  it('the two rent sources cluster independently (different content) and produce a SUPPORTED claim, not SINGLE_SOURCE', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () =>
      jsonResponse({
        results: [
          { title: 'A', content: 'Rent is $28/sqft.', url: 'https://a.example.com/1' },
          { title: 'B', content: 'Rent is roughly $27/sqft, differently worded.', url: 'https://b.example.com/2' },
        ],
      }),
    );
    const tavily = new TavilyEvidenceProvider({ apiKey: 'test-key', fetchImpl });
    const { packet } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop',
      location: 'Denver',
      providers: [tavily],
    });
    const rentClaim = packet.claims.find((c) => c.statement.includes('commercial rent'));
    expect(rentClaim?.status).toBe('SUPPORTED');
    expect(rentClaim?.sourceIndependenceCount).toBe(2);
  });
});

describe('runEvidencePipeline — privacy gate integration', () => {
  it('redacts an email embedded in the idea BEFORE it ever reaches the provider query', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () => jsonResponse({ results: [] }));
    const tavily = new TavilyEvidenceProvider({ apiKey: 'test-key', fetchImpl });

    const { privacyFindings } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop, contact me at founder@example.com',
      location: 'Denver',
      providers: [tavily],
    });

    expect(privacyFindings.some((f) => f.category === 'EMAIL')).toBe(true);

    // Inspect every actual outbound request body sent to Tavily -- none may contain the raw email.
    for (const call of fetchImpl.mock.calls) {
      const body = JSON.parse(call[1].body as string);
      expect(body.query).not.toContain('founder@example.com');
    }
  });
});

describe('runEvidencePipeline — degraded/failure handling', () => {
  it('sets packet.degraded = true when a provider call fails, without throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('network down'));
    const tavily = new TavilyEvidenceProvider({ apiKey: 'test-key', fetchImpl });

    const { packet } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop',
      location: 'Denver',
      providers: [tavily],
    });

    expect(packet.degraded).toBe(true);
    expect(packet.sources).toEqual([]);
  });

  it('records unresolvedQuestions when no provider is available at all', async () => {
    const { packet } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop',
      location: 'Denver',
      providers: [], // no providers injected
    });

    expect(packet.unresolvedQuestions.length).toBeGreaterThan(0);
    expect(packet.sources).toEqual([]);
    // Absence of coverage is a different signal from an active failure.
    expect(packet.degraded).toBe(false);
  });

  it('drops results with unsafe URLs before they ever reach the packet (defense-in-depth already in TavilyEvidenceProvider)', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () =>
      jsonResponse({ results: [{ title: 'evil', content: 'x', url: 'http://169.254.169.254/secret' }] }),
    );
    const tavily = new TavilyEvidenceProvider({ apiKey: 'test-key', fetchImpl });
    const { packet } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop',
      location: 'Denver',
      providers: [tavily],
    });
    expect(packet.sources.every((s) => !s.canonicalUrl.includes('169.254.169.254'))).toBe(true);
  });
});

describe('runEvidencePipeline — storage policy conservatism', () => {
  it('every Tavily-sourced EvidenceSource gets storagePolicy METADATA_ONLY, matching the unresolved caching-rights finding in provider-registry.ts', async () => {
    const fetchImpl = vi.fn().mockImplementation(async () =>
      jsonResponse({ results: [{ title: 'x', content: 'y', url: 'https://example.com/x' }] }),
    );
    const tavily = new TavilyEvidenceProvider({ apiKey: 'test-key', fetchImpl });
    const { packet } = await runEvidencePipeline({
      analysisRunId: 'run-1',
      idea: 'Coffee shop',
      location: 'Denver',
      providers: [tavily],
    });
    expect(packet.sources.every((s) => s.storagePolicy === 'METADATA_ONLY')).toBe(true);
  });
});
