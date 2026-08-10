/**
 * Quantis Evidence Service — ProviderRouter (PR E2.1).
 *
 * Takes an injected set of live `EvidenceProvider` adapters (in this
 * slice: at most one, TavilyEvidenceProvider) and routes a search request
 * to whichever of them both (a) the registry says supports the requested
 * source lens, and (b) reports itself available (has a working API key,
 * etc.) right now. Never instantiates a provider itself -- callers own
 * construction (and therefore secret-injection) of each adapter.
 */
import type { EvidenceProvider, ProviderExecutionContext, ProviderSearchRequest, ProviderSearchResult } from './provider.ts';
import type { SourceLens } from './types.ts';
import { selectProvidersForLens } from './provider-registry.ts';

export class ProviderRouter {
  constructor(private readonly providers: EvidenceProvider[]) {}

  /** Providers that are both registry-eligible for this lens AND currently available. */
  providersForLens(lens: SourceLens): EvidenceProvider[] {
    const eligibleIds = new Set(selectProvidersForLens(lens).map((p) => p.providerId));
    return this.providers.filter((p) => eligibleIds.has(p.id) && p.isAvailable());
  }

  /** Fans out to every eligible provider for the request's lens (or every available provider if no lens given) and collects all results, even if some fail. */
  async searchAll(
    request: ProviderSearchRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderSearchResult[]> {
    const candidates = request.lens ? this.providersForLens(request.lens) : this.providers.filter((p) => p.isAvailable());
    return Promise.all(candidates.map((p) => p.search(request, context)));
  }
}
