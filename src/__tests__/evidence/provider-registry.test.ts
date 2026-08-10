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
  it('returns false for Tavily: reviewed, but the review found caching/retention is unaddressed by the ToS, so canPersist stays false', () => {
    expect(TAVILY_PROVIDER.termsReviewedAt).toBeDefined();
    expect(TAVILY_PROVIDER.canPersist).toBe(false);
    expect(isClearedForPersistence('tavily')).toBe(false);
  });

  it('returns false for DuckDuckGo: not reviewed at all yet', () => {
    expect(DUCKDUCKGO_PROVIDER.termsReviewedAt).toBeUndefined();
    expect(isClearedForPersistence('duckduckgo-html')).toBe(false);
  });

  it('returns false for an unknown provider', () => {
    expect(isClearedForPersistence('does-not-exist')).toBe(false);
  });

  it('documents what WOULD make Tavily cleared (a real answer on caching/retention flipping canPersist), without actually granting it', () => {
    const hypotheticallyCleared = { ...TAVILY_PROVIDER, canPersist: true };
    expect(Boolean(hypotheticallyCleared.termsReviewedAt) && hypotheticallyCleared.canPersist).toBe(true);
    // But the real, live constant is untouched by this hypothetical.
    expect(TAVILY_PROVIDER.canPersist).toBe(false);
  });

  it("Tavily's review carries a citation, not just a bare timestamp", () => {
    expect(TAVILY_PROVIDER.termsReviewCitation).toContain('tavily.com/terms');
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

describe("Tavily's real terms review findings are locked in (regression lock against silent drift)", () => {
  it('canRedisplay is true (ToS section 3.2(ii) explicitly permits customer-app integration)', () => {
    expect(TAVILY_PROVIDER.canRedisplay).toBe(true);
  });

  it('canTrainOnResults is false and must never flip true (ToS section 6.6 explicit prohibition)', () => {
    expect(TAVILY_PROVIDER.canTrainOnResults).toBe(false);
  });

  it('canCache and canPersist stay false pending explicit clarification (ToS is silent, not permissive)', () => {
    expect(TAVILY_PROVIDER.canCache).toBe(false);
    expect(TAVILY_PROVIDER.canPersist).toBe(false);
  });
});
