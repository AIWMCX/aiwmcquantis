/**
 * Quantis Evidence Service — core type contracts (PR E1).
 *
 * Pure types only. No logic, no Deno-only imports, no `fetch`/`Deno.env`.
 * This file is imported by every other module in `_shared/evidence/` and,
 * later, by edge functions. It is NOT imported by `analyze-business` or any
 * other live customer-facing path yet — this is contracts-only, per the
 * Predicta Evidence Service master prompt's PR sequencing (E0-E10, section
 * 40): "PR E1: Evidence types... Tests only."
 *
 * Naming and shapes follow the master prompt's own contracts (sections
 * 9, 11, 13, 14, 15, 16, 17) as closely as possible so the design doc and
 * the code stay in lockstep; deviations are commented inline where the real
 * repository's conventions took precedence (e.g. snake_case DB columns vs
 * camelCase TS fields is handled at the persistence boundary, not here).
 */

// ============================================================
// Source lenses (master prompt section 8)
// ============================================================

export const SOURCE_LENSES = [
  'OFFICIAL',
  'GOVERNMENT',
  'FINANCIAL_FILINGS',
  'COMPANY',
  'INDUSTRY',
  'ACADEMIC',
  'NEWS',
  'COMMUNITY',
  'DOCUMENTATION',
  'LOCAL_BUSINESS',
] as const;

export type SourceLens = (typeof SOURCE_LENSES)[number];

// ============================================================
// Provider Capability Registry (master prompt section 9)
// ============================================================

export const PROVIDER_STATUSES = ['ACTIVE', 'DEGRADED', 'DISABLED', 'RETIRED'] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const PROVIDER_INTEGRATION_TYPES = [
  'OFFICIAL_API',
  'LICENSED_API',
  'DIRECT_OPEN_DATA',
  'SELF_HOSTED_INDEX',
  'METASEARCH',
  'HTML_FETCH',
] as const;
export type ProviderIntegrationType = (typeof PROVIDER_INTEGRATION_TYPES)[number];

export interface ProviderCapability {
  providerId: string;

  status: ProviderStatus;
  integrationType: ProviderIntegrationType;

  supportedLenses: SourceLens[];

  supportedCountries?: string[];
  supportedLanguages?: string[];

  canRedisplay: boolean;
  canCache: boolean;
  canPersist: boolean;
  canTrainOnResults: boolean;

  timeoutMs: number;
  maxQps?: number;

  estimatedCostPerRequestUsd?: number;

  lastHealthCheckAt?: string;
  lastSuccessfulRequestAt?: string;

  termsReviewedAt?: string;

  enabledForQuantis: boolean;
}

// ============================================================
// Evidence sources, passages (master prompt sections 11, 13)
// ============================================================

export const SOURCE_TYPES = [
  'OFFICIAL',
  'GOVERNMENT',
  'FILING',
  'COMPANY',
  'LICENSED',
  'ACADEMIC',
  'NEWS',
  'COMMUNITY',
  'DOCUMENTATION',
  'LOCAL_BUSINESS',
  'OTHER',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const PRIMARY_STATUSES = ['PRIMARY', 'SECONDARY', 'UNKNOWN'] as const;
export type PrimaryStatus = (typeof PRIMARY_STATUSES)[number];

export const FRESHNESS_LEVELS = ['CURRENT', 'AGING', 'HISTORICAL', 'UNKNOWN'] as const;
export type Freshness = (typeof FRESHNESS_LEVELS)[number];

export const STORAGE_POLICIES = [
  'NO_STORE',
  'METADATA_ONLY',
  'PASSAGE_ALLOWED',
  'FULL_ALLOWED',
] as const;
export type StoragePolicy = (typeof STORAGE_POLICIES)[number];

export interface EvidenceSource {
  sourceId: string;
  canonicalUrl: string;

  publisher?: string;
  author?: string;

  publishedAt?: string;
  retrievedAt: string;

  contentHash: string;

  sourceType: SourceType;
  primaryStatus: PrimaryStatus;

  /** Set by dedupe.ts; sources sharing a cluster are NOT independent confirmations. */
  independenceCluster?: string;

  geography?: string;
  language?: string;

  freshness: Freshness;

  storagePolicy: StoragePolicy;

  providerId: string;
}

export interface EvidencePassage {
  passageId: string;
  sourceId: string;

  text: string;

  locator?: {
    heading?: string;
    page?: number;
    anchor?: string;
  };

  extractedAt: string;

  contentHash: string;
}

// ============================================================
// Evidence claims / graph (master prompt section 14)
// ============================================================

export const CLAIM_RELATIONS = ['SUPPORTS', 'CONTRADICTS', 'QUALIFIES'] as const;
export type ClaimRelation = (typeof CLAIM_RELATIONS)[number];

export const CLAIM_STATUSES = [
  'SUPPORTED',
  'CONTESTED',
  'SINGLE_SOURCE',
  'STALE',
  'INFERRED',
  'UNSUPPORTED',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export interface EvidenceClaimSupport {
  sourceId: string;
  passageId: string;
  relation: ClaimRelation;
}

export interface EvidenceClaim {
  claimId: string;
  statement: string;

  support: EvidenceClaimSupport[];

  status: ClaimStatus;
  freshness: Freshness;

  sourceIndependenceCount: number;
}

// ============================================================
// Numeric observation firewall (master prompt section 15)
// ============================================================

export const NUMERIC_OBSERVATION_STATUSES = ['OBSERVED', 'TRANSFORMED', 'ESTIMATE'] as const;
export type NumericObservationStatus = (typeof NUMERIC_OBSERVATION_STATUSES)[number];

export interface NumericObservation {
  observationId: string;

  value: string;
  unit: string;

  currency?: string;
  period?: string;
  geography?: string;
  statisticType?: string;

  sourceId: string;
  passageId: string;

  transformationIds: string[];

  status: NumericObservationStatus;
}

// ============================================================
// Assumption candidate (master prompt section 16)
// ============================================================

export const FIT_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'] as const;
export type FitLevel = (typeof FIT_LEVELS)[number];

export const MATERIALITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type MaterialityLevel = (typeof MATERIALITY_LEVELS)[number];

export const ASSUMPTION_CANDIDATE_STATUSES = [
  'PROPOSED',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
] as const;
export type AssumptionCandidateStatus = (typeof ASSUMPTION_CANDIDATE_STATUSES)[number];

export interface AssumptionCandidate {
  candidateId: string;
  variableId: string;

  proposedValue: string;
  unit: string;

  currentValue?: string;

  evidenceObservationIds: string[];

  comparability: {
    industryFit: FitLevel;
    geographyFit: FitLevel;
    periodFit: FitLevel;
    businessModelFit: FitLevel;
  };

  materiality: MaterialityLevel;

  status: AssumptionCandidateStatus;
}

// ============================================================
// Evidence request compiler output (master prompt section 7)
// ============================================================

export interface EvidenceQuestion {
  id: string;
  objective: string;
  query: string;
  geography?: string;
  preferredLenses: SourceLens[];
}

export interface EvidenceRequest {
  analysisRunId: string;
  riskClass: string;
  questions: EvidenceQuestion[];
}

// ============================================================
// Locked Quantis Evidence Packet (master prompt section 17)
// ============================================================

export interface QuantisEvidencePacket {
  evidencePacketId: string;
  analysisRunId: string;

  queryPlanVersion: string;
  providerSetVersion: string;
  rankingVersion: string;
  evidenceSchemaVersion: string;

  createdAt: string;

  sourceLenses: SourceLens[];

  sources: EvidenceSource[];
  passages: EvidencePassage[];
  claims: EvidenceClaim[];
  numericObservations: NumericObservation[];

  unresolvedQuestions: string[];
  contradictions: string[];

  degraded: boolean;

  retrievalLatencyMs: number;

  costUsd?: number;

  contentHash: string;
}

/** Current schema version. Bump on any breaking shape change to the types above. */
export const EVIDENCE_SCHEMA_VERSION = '0.1.0';
