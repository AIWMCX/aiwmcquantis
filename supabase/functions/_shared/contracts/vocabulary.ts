/**
 * One vocabulary for claim status and assumption origin (Phase 1, contract set item 3).
 *
 * Dependency-free so the browser, Deno and Vitest can all import it. Every older
 * vocabulary is mapped here and nowhere else; adapters call these maps. A mapping
 * that loses information says so (`lossy: true`) and keeps the detail in a
 * `qualifier`, so nothing is silently collapsed. Values with no honest target
 * (e.g. UNKNOWN) map to null rather than to a guess.
 *
 * Inventory of the old vocabularies: docs/phase1/financial-kernel-plan.md §8.
 */

export const VOCABULARY_VERSION = 'aiwmc.vocab.v1';

// ── Claim status ─────────────────────────────────────────────────────────

export const CLAIM_STATUSES = [
  'supported',
  'partially_supported',
  'contested',
  'single_source',
  'stale',
  'inferred',
  'unsupported',
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  supported: 'Supported by two or more independent sources',
  partially_supported: 'Partly supported; the sources back only part of the claim',
  contested: 'Contested; at least one independent source contradicts it',
  single_source: 'One source only',
  stale: 'Evidence is older than the claim needs',
  inferred: 'Inferred, not stated by any source',
  unsupported: 'No supporting evidence',
};

// ── Assumption origin ────────────────────────────────────────────────────

export const ASSUMPTION_ORIGINS = [
  'customer_input',
  'source_estimate',
  'benchmark',
  'analyst_assumption',
  'derived_calculation',
] as const;
export type AssumptionOrigin = (typeof ASSUMPTION_ORIGINS)[number];

export const ASSUMPTION_ORIGIN_LABELS: Record<AssumptionOrigin, string> = {
  customer_input: 'Customer input',
  source_estimate: 'Estimate taken from a cited source',
  benchmark: 'Industry or location benchmark',
  analyst_assumption: 'Analyst assumption (human or AI), not evidenced',
  derived_calculation: 'Calculated from other values',
};

/** Detail kept when a source value is narrower than its target. */
export const ORIGIN_QUALIFIERS = [
  'ai_extracted',        // an AI read the number out of the customer's description
  'placeholder_default', // a hard-coded default with no evidence (e.g. 50 000 revenue)
  'benchmark_derived',   // calculated, but from a benchmark cost structure
  'system_override',     // the system replaced the customer's value
  'customer_document',   // taken from a document the customer uploaded
  'value_not_in_passage',// proposed number not found verbatim in its passage
  'official_series',     // a public observation from an official statistical series
] as const;
export type OriginQualifier = (typeof ORIGIN_QUALIFIERS)[number];

export const CLAIM_QUALIFIERS = [
  'insufficient_evidence', // ontology/decision-review "insufficient": unsupported or thin
  'fact_without_count',    // commercial FACT: has an evidence ref but no corroboration count
  'unknown_status',        // commercial UNKNOWN
] as const;
export type ClaimQualifier = (typeof CLAIM_QUALIFIERS)[number];

export interface Mapped<T, Q> {
  value: T;
  lossy: boolean;
  qualifier?: Q;
}

const exact = <T, Q>(value: T): Mapped<T, Q> => ({ value, lossy: false });
const lossy = <T, Q>(value: T, qualifier?: Q): Mapped<T, Q> => (qualifier ? { value, lossy: true, qualifier } : { value, lossy: true });

type ClaimMap<K extends string> = Record<K, Mapped<ClaimStatus, ClaimQualifier> | null>;
type OriginMap<K extends string> = Record<K, Mapped<AssumptionOrigin, OriginQualifier> | null>;

/** Analytica analytica.evidence.v1 ClaimStatus and Predicta search.v1 claim status (same 7 values). */
export const LEGACY_UPPER_CLAIM_STATUS: ClaimMap<
  'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTESTED' | 'SINGLE_SOURCE' | 'STALE' | 'INFERRED' | 'UNSUPPORTED'
> = {
  SUPPORTED: exact('supported'),
  PARTIALLY_SUPPORTED: exact('partially_supported'),
  CONTESTED: exact('contested'),
  SINGLE_SOURCE: exact('single_source'),
  STALE: exact('stale'),
  INFERRED: exact('inferred'),
  UNSUPPORTED: exact('unsupported'),
};

/** Quantis System A (feature/evidence-service) CLAIM_STATUSES: 6 values, no PARTIALLY_SUPPORTED. */
export const SYSTEM_A_CLAIM_STATUS: ClaimMap<'SUPPORTED' | 'CONTESTED' | 'SINGLE_SOURCE' | 'STALE' | 'INFERRED' | 'UNSUPPORTED'> = {
  SUPPORTED: exact('supported'),
  CONTESTED: exact('contested'),
  SINGLE_SOURCE: exact('single_source'),
  STALE: exact('stale'),
  INFERRED: exact('inferred'),
  UNSUPPORTED: exact('unsupported'),
};

/** Ontology addendum ont_assertion.status and founder spec §8 ClaimRecord.status. */
export const ONTOLOGY_CLAIM_STATUS: ClaimMap<'supported' | 'conflicting' | 'insufficient' | 'stale'> = {
  supported: exact('supported'),
  conflicting: exact('contested'),
  insufficient: lossy('unsupported', 'insufficient_evidence'),
  stale: exact('stale'),
};

/** Quantis decision-review EvidenceSummary.strength / CriticalAssumption.evidenceStrength. */
export const DECISION_REVIEW_EVIDENCE_STRENGTH: ClaimMap<'supported' | 'partial' | 'insufficient' | 'contradicted' | 'unknown'> = {
  supported: exact('supported'),
  partial: exact('partially_supported'),
  insufficient: lossy('unsupported', 'insufficient_evidence'),
  contradicted: exact('contested'),
  unknown: null,
};

/**
 * Quantis commercial ClaimStatus (FACT/ASSUMPTION/INFERENCE/UNKNOWN). ASSUMPTION is an
 * origin, not a status, so it has no claim-status target; see COMMERCIAL_CLAIM_ORIGIN.
 */
export const COMMERCIAL_CLAIM_STATUS: ClaimMap<'FACT' | 'ASSUMPTION' | 'INFERENCE' | 'UNKNOWN'> = {
  FACT: lossy('single_source', 'fact_without_count'),
  ASSUMPTION: null,
  INFERENCE: exact('inferred'),
  UNKNOWN: lossy('unsupported', 'unknown_status'),
};

/** Commercial FACT with a known count of independent sources is no longer lossy. */
export function mapCommercialFact(independentSourceCount: number | null): Mapped<ClaimStatus, ClaimQualifier> {
  if (independentSourceCount == null) return COMMERCIAL_CLAIM_STATUS.FACT!;
  if (independentSourceCount >= 2) return exact('supported');
  if (independentSourceCount === 1) return exact('single_source');
  return exact('unsupported');
}

/** Quantis _shared/assumption-origin.ts AssumptionOriginClass (the canonical one on main). */
export const QUANTIS_ASSUMPTION_ORIGIN: OriginMap<'USER_ACTUAL' | 'DERIVED' | 'MODELED_BENCHMARK_PRIOR' | 'SYSTEM_ASSUMPTION' | 'PLACEHOLDER'> = {
  USER_ACTUAL: exact('customer_input'),
  // Label is "AI-extracted from your description": an AI estimate, not a calculation.
  DERIVED: lossy('analyst_assumption', 'ai_extracted'),
  MODELED_BENCHMARK_PRIOR: exact('benchmark'),
  // Label is "System-derived from your other inputs", computed from the benchmark cost structure.
  SYSTEM_ASSUMPTION: lossy('derived_calculation', 'benchmark_derived'),
  PLACEHOLDER: lossy('analyst_assumption', 'placeholder_default'),
};

/** decision-review CriticalAssumption.provenance: the above plus UNKNOWN. */
export const DECISION_REVIEW_PROVENANCE: OriginMap<keyof typeof QUANTIS_ASSUMPTION_ORIGIN | 'UNKNOWN'> = {
  ...QUANTIS_ASSUMPTION_ORIGIN,
  UNKNOWN: null,
};

/** analyze-business/engine-inputs.ts InputOrigin ("Inputs this report used"). */
export const QUANTIS_INPUT_ORIGIN: OriginMap<'your_input' | 'ai_estimate' | 'industry_default' | 'calculated' | 'assumption'> = {
  your_input: exact('customer_input'),
  ai_estimate: lossy('analyst_assumption', 'ai_extracted'),
  industry_default: exact('benchmark'),
  calculated: exact('derived_calculation'),
  // Catch-all that includes PLACEHOLDER values.
  assumption: lossy('analyst_assumption'),
};

/** ai-safety-guardrails.ts TruthLabel.source. */
export const QUANTIS_TRUTH_LABEL_SOURCE: OriginMap<'computed' | 'benchmark' | 'ai_estimate' | 'user_provided' | 'document'> = {
  computed: exact('derived_calculation'),
  benchmark: exact('benchmark'),
  ai_estimate: lossy('analyst_assumption', 'ai_extracted'),
  user_provided: exact('customer_input'),
  document: lossy('customer_input', 'customer_document'),
};

/** analyze-business/assumption-graph.ts AssumptionNode.source (coarse; prefer `origin`). */
export const QUANTIS_ASSUMPTION_NODE_SOURCE: OriginMap<'user' | 'benchmark' | 'calculated' | 'unknown'> = {
  user: exact('customer_input'),
  benchmark: exact('benchmark'),
  // Coarsening puts DERIVED, SYSTEM_ASSUMPTION and PLACEHOLDER here, so this is lossy.
  calculated: lossy('derived_calculation'),
  unknown: null,
};

/** Quantis revenueSource / expenseSource flags. */
export const QUANTIS_VALUE_SOURCE: OriginMap<'user' | 'provided' | 'calculated' | 'corrected'> = {
  user: exact('customer_input'),
  provided: exact('customer_input'),
  calculated: exact('derived_calculation'),
  corrected: lossy('derived_calculation', 'system_override'),
};

/** Analytica AssumptionOrigin (evidence.py: 4 values) and AssumptionRegisterItem.origin (domain.py: 5). */
export const ANALYTICA_ASSUMPTION_ORIGIN: OriginMap<'CUSTOMER_INPUT' | 'SOURCE_ESTIMATE' | 'BENCHMARK' | 'ANALYST_ASSUMPTION' | 'DERIVED_CALCULATION'> = {
  CUSTOMER_INPUT: exact('customer_input'),
  SOURCE_ESTIMATE: exact('source_estimate'),
  BENCHMARK: exact('benchmark'),
  ANALYST_ASSUMPTION: exact('analyst_assumption'),
  DERIVED_CALCULATION: exact('derived_calculation'),
};

/** Ontology Assumption.origin. */
export const ONTOLOGY_ASSUMPTION_ORIGIN: OriginMap<'public_observation' | 'user_provided' | 'calculated'> = {
  public_observation: lossy('source_estimate', 'official_series'),
  user_provided: exact('customer_input'),
  calculated: exact('derived_calculation'),
};

/** Ontology ont_assertion.method. */
export const ONTOLOGY_ASSERTION_METHOD: OriginMap<'extracted' | 'api_structured' | 'calculated' | 'user_provided' | 'inferred'> = {
  extracted: exact('source_estimate'),
  api_structured: lossy('source_estimate', 'official_series'),
  calculated: exact('derived_calculation'),
  user_provided: exact('customer_input'),
  inferred: lossy('analyst_assumption'),
};

/** System A NumericObservation.status, read as an origin. */
export const SYSTEM_A_NUMERIC_STATUS: OriginMap<'OBSERVED' | 'TRANSFORMED' | 'ESTIMATE'> = {
  OBSERVED: exact('source_estimate'),
  TRANSFORMED: exact('derived_calculation'),
  ESTIMATE: lossy('analyst_assumption', 'value_not_in_passage'),
};

/** Commercial ClaimStatus ASSUMPTION read as an origin. */
export const COMMERCIAL_CLAIM_ORIGIN: OriginMap<'ASSUMPTION'> = {
  ASSUMPTION: exact('analyst_assumption'),
};

/** Looks a value up in a map; throws on a value the map does not know (vocabulary drift). */
export function mapVocabulary<K extends string, T>(table: Record<K, T>, raw: string, vocabularyName: string): T {
  if (!Object.prototype.hasOwnProperty.call(table, raw)) {
    throw new Error(`Unknown ${vocabularyName} value: ${JSON.stringify(raw)}`);
  }
  return table[raw as K];
}

export const isClaimStatus = (v: unknown): v is ClaimStatus => (CLAIM_STATUSES as readonly unknown[]).includes(v);
export const isAssumptionOrigin = (v: unknown): v is AssumptionOrigin => (ASSUMPTION_ORIGINS as readonly unknown[]).includes(v);
