/**
 * Quantis Evidence Service — Provider Capability Registry (PR E2).
 *
 * Master prompt sections 9-10: a machine-readable registry, not a
 * hardcoded "N search engines" claim, and reuse of existing permitted
 * providers before adding new ones.
 *
 * Seeded with exactly the two providers this session's repository
 * inspection confirmed are ALREADY in live use, inside RVCE
 * (`supabase/functions/rvce-validate/index.ts`):
 *
 *   - Tavily (official API, key-gated via TAVILY_API_KEY)
 *   - DuckDuckGo (unofficial HTML scrape, no key, RVCE's default/fallback)
 *
 * HONESTY NOTE, per master prompt section 9's explicit instruction ("Never
 * infer these from historical Predicta documentation" -- verify current
 * redistribution/storage/caching rights before trusting a provider): this
 * pass did NOT perform a legal/terms-of-service review for either
 * provider. `termsReviewedAt` is left `undefined` for both, honestly
 * reflecting that no such review has occurred under THIS registry's
 * discipline, even though both providers are already de facto in
 * production use via RVCE today (a pre-existing fact, not something this
 * registry is introducing). `enabledForQuantis: true` reflects that
 * existing reality -- it is not this module's place to silently disable
 * something already shipping -- but the compliance-sensitive booleans
 * (`canRedisplay`, `canCache`, `canPersist`, `canTrainOnResults`) are set
 * conservatively to `false` pending an actual review, since RVCE's current
 * behavior (it does persist to `rvce_observations`) is existing practice,
 * not evidence that persistence rights were ever actually confirmed.
 * Anyone promoting either provider to a materially larger role (e.g. the
 * Evidence Service's own persistence layer, rather than RVCE's existing
 * narrow use) MUST perform that review first and update this record with
 * a real `termsReviewedAt` date and honestly-assessed booleans.
 */
import type { ProviderCapability, SourceLens } from './types';

export const TAVILY_PROVIDER: ProviderCapability = {
  providerId: 'tavily',
  status: 'ACTIVE',
  integrationType: 'OFFICIAL_API',
  supportedLenses: ['NEWS', 'COMPANY', 'INDUSTRY', 'GOVERNMENT', 'OFFICIAL', 'LOCAL_BUSINESS'],
  canRedisplay: false,
  canCache: false,
  canPersist: false,
  canTrainOnResults: false,
  timeoutMs: 15000,
  termsReviewedAt: undefined,
  enabledForQuantis: true,
};

export const DUCKDUCKGO_PROVIDER: ProviderCapability = {
  providerId: 'duckduckgo-html',
  status: 'ACTIVE',
  integrationType: 'HTML_FETCH',
  supportedLenses: ['NEWS', 'COMMUNITY', 'DOCUMENTATION', 'COMPANY', 'LOCAL_BUSINESS'],
  canRedisplay: false,
  canCache: false,
  canPersist: false,
  canTrainOnResults: false,
  timeoutMs: 15000,
  termsReviewedAt: undefined,
  enabledForQuantis: true,
};

const REGISTRY: ProviderCapability[] = [TAVILY_PROVIDER, DUCKDUCKGO_PROVIDER];

export function listProviders(): ProviderCapability[] {
  return [...REGISTRY];
}

export function getProvider(providerId: string): ProviderCapability | undefined {
  return REGISTRY.find((p) => p.providerId === providerId);
}

/** Providers that are ACTIVE, enabled, and support the requested lens. */
export function selectProvidersForLens(lens: SourceLens): ProviderCapability[] {
  return REGISTRY.filter(
    (p) => p.status === 'ACTIVE' && p.enabledForQuantis && p.supportedLenses.includes(lens),
  );
}

/**
 * A provider is safe to use for persisted (not merely ephemeral/in-memory)
 * evidence only if it has both been reviewed AND cleared for persistence.
 * This is the check the Evidence Service's persistence layer (E5) must
 * call before writing any provider-derived content to `evidence_sources`
 * beyond metadata -- it will currently return `false` for every provider
 * in this registry, by design, until a real terms review happens.
 */
export function isClearedForPersistence(providerId: string): boolean {
  const provider = getProvider(providerId);
  if (!provider) return false;
  return Boolean(provider.termsReviewedAt) && provider.canPersist;
}
