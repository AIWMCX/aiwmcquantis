/**
 * Revenue Shape Detector -- MODEL_UNSUPPORTED fail-closed check
 *
 * Domain 5 audit (Q41/Q45/Q165/Q179). This is a thin wrapper around the
 * canonical archetype registry (business-archetypes.ts): detects the
 * business's operating archetype from its free-text idea and, if that
 * archetype has a 'poor' engineFit, surfaces an honest
 * ModelApplicabilityWarning instead of hiding the mismatch.
 *
 * Originally (2026-07-21) this file carried its own inline RULES array
 * duplicating three phrase lists that also needed to exist in a
 * "canonical archetype registry" the audit separately called for --
 * exactly the "same fact hardcoded in two places" anti-pattern this whole
 * audit cycle has been finding and fixing elsewhere (BENCHMARK_COUNT,
 * TIER_PRICES, etc.). Refactored same-day to consume
 * business-archetypes.ts as the single source of truth instead.
 *
 * WARN, not BLOCK: the engine still runs and the report still displays --
 * false positives on the detector shouldn't hide a possibly-useful
 * analysis. Design bias in the underlying registry: HIGH PRECISION over
 * recall -- ambiguous ideas stay unclassified rather than risk a false
 * positive.
 */

import { detectArchetype, type ArchetypeId } from './business-archetypes.ts';

export type DetectedRevenueShape = ArchetypeId;

export interface ModelApplicabilityWarning {
  detected_shape: DetectedRevenueShape;
  engine_assumes: 'steady_monthly_transactions';
  severity: 'warn';
  matched_phrase: string;
  explanation: string;
}

/**
 * Detect the clearest archetype-fit mismatch on a free-text business idea.
 * Returns null if the idea is unclassified, or classified into an
 * archetype the engine fits ('good'/'partial') -- the engine's normal
 * output is safe to show without a warning in either case. Returns a
 * ModelApplicabilityWarning only for a 'poor' engineFit archetype.
 */
export function detectRevenueShapeMismatch(
  ideaText: string,
): ModelApplicabilityWarning | null {
  const archetype = detectArchetype(ideaText);
  if (!archetype || archetype.engineFit !== 'poor') return null;

  const lower = ideaText.toLowerCase();
  const matchedPhrase = archetype.detectionPhrases.find((p) => lower.includes(p)) ?? archetype.label;

  return {
    detected_shape: archetype.id,
    engine_assumes: 'steady_monthly_transactions',
    severity: 'warn',
    matched_phrase: matchedPhrase,
    explanation: archetype.engineFitNote,
  };
}
