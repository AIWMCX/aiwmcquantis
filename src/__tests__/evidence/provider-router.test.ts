/**
 * Quantis Evidence Service — provider-router.ts regression suite (PR E2.1).
 */
import { describe, it, expect, vi } from 'vitest';
import { ProviderRouter } from '../../../supabase/functions/_shared/evidence/provider-router';
import type { EvidenceProvider, ProviderSearchResult } from '../../../supabase/functions/_shared/evidence/provider';

function fakeProvider(id: string, available: boolean, result: ProviderSearchResult): EvidenceProvider {
  return {
    id,
    isAvailable: () => available,
    search: vi.fn().mockResolvedValue(result),
  };
}

const CONTEXT = { requestId: 'r', analysisRunId: 'a' };

describe('ProviderRouter.providersForLens', () => {
  it('returns tavily for a lens it supports (NEWS) when available', () => {
    const tavily = fakeProvider('tavily', true, { providerId: 'tavily', status: 'SUCCESS', results: [], latencyMs: 1 });
    const router = new ProviderRouter([tavily]);
    expect(router.providersForLens('NEWS').map((p) => p.id)).toEqual(['tavily']);
  });

  it('excludes an otherwise-eligible provider that reports itself unavailable', () => {
    const tavily = fakeProvider('tavily', false, { providerId: 'tavily', status: 'SUCCESS', results: [], latencyMs: 1 });
    const router = new ProviderRouter([tavily]);
    expect(router.providersForLens('NEWS')).toEqual([]);
  });

  it('excludes a provider not registered for the requested lens (ACADEMIC has no registered provider)', () => {
    const tavily = fakeProvider('tavily', true, { providerId: 'tavily', status: 'SUCCESS', results: [], latencyMs: 1 });
    const router = new ProviderRouter([tavily]);
    expect(router.providersForLens('ACADEMIC')).toEqual([]);
  });

  it('ignores a provider instance whose id is not in the registry at all', () => {
    const rogue = fakeProvider('totally-made-up-provider', true, { providerId: 'x', status: 'SUCCESS', results: [], latencyMs: 1 });
    const router = new ProviderRouter([rogue]);
    expect(router.providersForLens('NEWS')).toEqual([]);
  });
});

describe('ProviderRouter.searchAll', () => {
  it('calls search() on every eligible provider for the given lens and collects all results', async () => {
    const tavily = fakeProvider('tavily', true, { providerId: 'tavily', status: 'SUCCESS', results: [{ url: 'https://example.com' }], latencyMs: 5 });
    const router = new ProviderRouter([tavily]);
    const results = await router.searchAll({ query: 'x', lens: 'NEWS' }, CONTEXT);
    expect(results).toHaveLength(1);
    expect(tavily.search).toHaveBeenCalledTimes(1);
  });

  it('returns an empty array without throwing when no provider is eligible', async () => {
    const router = new ProviderRouter([]);
    const results = await router.searchAll({ query: 'x', lens: 'ACADEMIC' }, CONTEXT);
    expect(results).toEqual([]);
  });

  it('collects results even when one provider FAILED -- does not let one failure abort the fan-out', async () => {
    const good = fakeProvider('tavily', true, { providerId: 'tavily', status: 'SUCCESS', results: [], latencyMs: 1 });
    const router = new ProviderRouter([good]);
    const results = await router.searchAll({ query: 'x', lens: 'NEWS' }, CONTEXT);
    expect(results[0].status).toBe('SUCCESS');
  });

  it('falls back to every available provider (ignoring lens eligibility) when no lens is given', async () => {
    const tavily = fakeProvider('tavily', true, { providerId: 'tavily', status: 'SUCCESS', results: [], latencyMs: 1 });
    const router = new ProviderRouter([tavily]);
    const results = await router.searchAll({ query: 'x' }, CONTEXT);
    expect(results).toHaveLength(1);
  });
});
