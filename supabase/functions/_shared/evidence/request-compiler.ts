/**
 * Quantis Evidence Service — Evidence Request Compiler (PR E1).
 *
 * Master prompt section 7: "Do not send the entire business description
 * blindly to a web-search API... Evidence planning must be deterministic
 * or tightly structured. Do not let an LLM arbitrarily rewrite financial
 * assumptions during this step."
 *
 * This module is a pure, deterministic lookup + template-fill. It takes
 * NO LLM call, has NO randomness, and the same input always produces
 * byte-identical output (verified by test). Extending the set of
 * objectives this compiler asks about is a deliberate, reviewed code
 * change to `EVIDENCE_OBJECTIVE_CATALOG` below -- never a runtime decision
 * made by a model.
 */
import type { EvidenceQuestion, EvidenceRequest, SourceLens } from './types.ts';

export interface CompileEvidenceRequestInput {
  analysisRunId: string;
  /** Free-text business idea/description, e.g. "Coffee shop". Used only for template substitution, never sent verbatim to a provider beyond the specific templated query for each objective. */
  idea: string;
  /** e.g. "Denver, Colorado". */
  location: string;
  riskClass?: string;
}

interface EvidenceObjectiveDefinition {
  objectiveId: string;
  /** {idea} and {location} are substituted; the resulting string is the ONLY thing sent to a retrieval provider for this objective. */
  queryTemplate: string;
  preferredLenses: SourceLens[];
}

/**
 * The fixed catalog of what the Evidence Service asks about for a
 * business/financial analysis. Mirrors the master prompt's own section 7
 * example (rent, wages, licensing) plus the section 23 V0 priority list
 * (benchmark provenance, local cost, market/industry evidence, regulatory
 * facts). Deliberately does NOT include demand/conversion/churn/CAC/LTV/
 * valuation/revenue-growth/success-probability objectives, per section 23's
 * explicit exclusion list -- those remain purely deterministic-engine
 * territory, never evidence-sourced in V0.
 */
export const EVIDENCE_OBJECTIVE_CATALOG: EvidenceObjectiveDefinition[] = [
  {
    objectiveId: 'LOCAL_COST_RENT',
    queryTemplate: '{location} commercial rent {idea}',
    preferredLenses: ['OFFICIAL', 'LOCAL_BUSINESS', 'INDUSTRY'],
  },
  {
    objectiveId: 'LABOR_COST',
    queryTemplate: '{location} wage data {idea}',
    preferredLenses: ['GOVERNMENT', 'OFFICIAL'],
  },
  {
    objectiveId: 'REGULATION',
    queryTemplate: '{location} {idea} business licensing requirements',
    preferredLenses: ['GOVERNMENT', 'OFFICIAL'],
  },
  {
    objectiveId: 'MARKET_INDUSTRY',
    queryTemplate: '{idea} industry benchmarks {location}',
    preferredLenses: ['INDUSTRY', 'ACADEMIC', 'NEWS'],
  },
];

function fillTemplate(template: string, idea: string, location: string): string {
  return template.replace('{idea}', idea).replace('{location}', location);
}

/** Slugifies idea/location into a stable id suffix so the same input always yields the same question ids. */
function slug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Compiles a business input into a structured, deterministic evidence
 * plan. Never calls an LLM. Never includes anything from the business
 * input beyond `idea` and `location` in the resulting query strings --
 * financial figures, customer PII, or other analysis inputs must never
 * reach this function's output (see privacy-gate.ts for the separate,
 * additional check applied before any question is actually sent out).
 */
export function compileEvidenceRequest(input: CompileEvidenceRequestInput): EvidenceRequest {
  const ideaSlug = slug(input.idea);
  const questions: EvidenceQuestion[] = EVIDENCE_OBJECTIVE_CATALOG.map((def) => ({
    id: `${def.objectiveId.toLowerCase()}-${ideaSlug}`,
    objective: def.objectiveId,
    query: fillTemplate(def.queryTemplate, input.idea, input.location),
    geography: input.location,
    preferredLenses: def.preferredLenses,
  }));

  return {
    analysisRunId: input.analysisRunId,
    riskClass: input.riskClass ?? 'FINANCIAL_BUSINESS',
    questions,
  };
}
