/**
 * Quantis Evidence Service — provider abstraction (PR E2.1).
 *
 * The narrow interface every retrieval provider adapter implements. Kept
 * deliberately small: a provider's only job is "given a query, return raw
 * results" -- normalization, dedup, passage extraction, the evidence
 * graph, and the numeric firewall all live in their own modules and never
 * need to know which provider a result came from beyond `providerId`.
 */
import type { SourceLens } from './types';

export interface ProviderSearchRequest {
  query: string;
  lens?: SourceLens;
  maxResults?: number;
}

export interface ProviderExecutionContext {
  requestId: string;
  analysisRunId: string;
  timeoutMs?: number;
}

export interface ProviderResult {
  url: string;
  title?: string;
  /** The provider's own returned snippet/body text -- this IS the passage source text, not re-fetched separately in this slice. */
  content?: string;
  publishedAt?: string;
  score?: number;
}

export type ProviderSearchStatus = 'SUCCESS' | 'DEGRADED' | 'FAILED';

export interface ProviderSearchResult {
  providerId: string;
  status: ProviderSearchStatus;
  results: ProviderResult[];
  latencyMs: number;
  costUsd?: string;
  errorCode?: string;
}

export interface EvidenceProvider {
  readonly id: string;
  /** Synchronous, cheap capability check (e.g. "is an API key configured") -- never makes a network call. */
  isAvailable(): boolean;
  search(request: ProviderSearchRequest, context: ProviderExecutionContext): Promise<ProviderSearchResult>;
}
