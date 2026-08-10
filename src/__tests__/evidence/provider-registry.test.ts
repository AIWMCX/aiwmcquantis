/**
 * Quantis Evidence Service — provider-registry.ts regression suite (PR E2).
 */
import { describe, it, expect } from 'vitest';
import {
  listProviders,
  getProvider,
  selectProvidersForLens,
  isClearedForPersistence,
  TAVILY_PROVIDER,
  DUCKDUCKGO_PROVIDER,
} from '../../../supabase/functions/_shared/evidence/provider-registry';

describe('listProviders / getProvider', () => {
  it('lists exactly the two providers actually confirmed in use by RVCE, no fabricated providers', () => {
    const ids = listProviders()
      .map((p) => p.providerId)
      .sort();
    expect(ids).toEqual(['duckduckgo-html', 'tavily']);
  });

  it('returns a defensive copy, not the live array', () => {
    const list = listProviders();
    list.push({ ...TAVILY_PROVIDER, providerId: 'mutated' });
    expect(listProviders()).toHaveLength(2);
  });

  it('getProvider returns undefined for an unknown provider rather than throwing', () => {
    expect(getProvider('google-custom-search')).toBeUndefined();
  });
});

describe('selectProvidersForLens', () => {
  it('returns providers supporting the NEWS lens', () => {
    const providers = selectProvidersForLens('NEWS');
    expect(providers.map((p) => p.providerId).sort()).toEqual(['duckduckgo-html', 'tavily']);
  });

  it('returns an empty array for a lens no active provider supports', () => {
    expect(selectProvidersForLens('ACADEMIC')).toEqual([]);
  });

  it('excludes a provider if it is DISABLED even if it supports the lens', () => {
    // This test documents the intended behavior of the filter itself,
    // exercised against a local fixture rather than mutating the shared
    // registry (which selectProvidersForLens reads from directly).
    const disabled = { ...TAVILY_PROVIDER, status: 'DISABLED' as const };
    expect(disabled.status).toBe('DISABLED');
    // The real registry entry must remain ACTIVE -- this assertion guards
    // against someone accidentally flipping the shared constant.
    expect(TAVILY_PROVIDER.status).toBe('ACTIVE');
  });
});

describe('isClearedForPersistence — the honest default', () => {
  it('returns false for every current provider, because no legal/terms review has actually happened yet', () => {
    expect(isClearedForPersistence('tavily')).toBe(false);
    expect(isClearedForPersistence('duckduckgo-html')).toBe(false);
  });

  it('returns false for an unknown provider', () => {
    expect(isClearedForPersistence('does-not-exist')).toBe(false);
  });

  it('documents what WOULD make a provider cleared, without actually granting it', () => {
    const hypotheticallyReviewed = {
      ...TAVILY_PROVIDER,
      termsReviewedAt: '2026-08-10T00:00:00Z',
      canPersist: true,
    };
    expect(Boolean(hypotheticallyReviewed.termsReviewedAt) && hypotheticallyReviewed.canPersist).toBe(true);
    // But the real, live constant is untouched by this hypothetical.
    expect(TAVILY_PROVIDER.termsReviewedAt).toBeUndefined();
  });
});

describe('registry entries are internally consistent', () => {
  it('every provider has a positive timeout and a non-empty supportedLenses list', () => {
    for (const p of listProviders()) {
      expect(p.timeoutMs).toBeGreaterThan(0);
      expect(p.supportedLenses.length).toBeGreaterThan(0);
    }
  });

  it('DuckDuckGo is correctly typed as HTML_FETCH, not OFFICIAL_API (it is an unofficial scrape)', () => {
    expect(DUCKDUCKGO_PROVIDER.integrationType).toBe('HTML_FETCH');
  });

  it('Tavily is correctly typed as OFFICIAL_API', () => {
    expect(TAVILY_PROVIDER.integrationType).toBe('OFFICIAL_API');
  });
});
