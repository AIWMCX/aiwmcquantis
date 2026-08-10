/**
 * Quantis Evidence Service — Evidence Graph / Locked Evidence Claims (PR E4).
 *
 * Master prompt section 14. Builds `EvidenceClaim` records from raw support
 * relations and enforces, as actual code rather than a comment, the two
 * rules the master prompt states as prose:
 *
 *   "Never silently transform CONTESTED -> SUPPORTED."
 *   "Never silently transform SINGLE_SOURCE -> VERIFIED."
 *
 * `reviseClaimStatus` is the ONLY sanctioned way to change a claim's status
 * after initial construction, and it throws on a disallowed transition
 * instead of applying it. Any future caller that wants to "fix" a claim's
 * status by writing to the field directly bypasses this guard -- code
 * review should treat direct `claim.status = ...` assignment outside this
 * file as a defect.
 */
import type { ClaimStatus, EvidenceClaim, EvidenceClaimSupport, EvidenceSource, Freshness } from './types.ts';
import { computeSourceIndependenceCount, computeContradictionIndependenceCount } from './independence.ts';

export interface DeriveClaimStatusOptions {
  /** If true, a claim whose freshness isn't CURRENT is forced to STALE regardless of support strength. */
  requiresCurrentFreshness?: boolean;
}

/**
 * Pure status derivation from support relations + independence clustering.
 * This is the single source of truth for "how confident should we say we
 * are" -- every other place in the codebase that touches claim status must
 * call through here or `buildEvidenceClaim`, never compute it ad hoc.
 */
export function deriveClaimStatus(
  support: EvidenceClaimSupport[],
  sources: EvidenceSource[],
  freshness: Freshness,
  options: DeriveClaimStatusOptions = {},
): ClaimStatus {
  if (support.length === 0) {
    return 'UNSUPPORTED';
  }

  if (options.requiresCurrentFreshness && freshness !== 'CURRENT') {
    return 'STALE';
  }

  const contradictionCount = computeContradictionIndependenceCount(support, sources);
  if (contradictionCount > 0) {
    return 'CONTESTED';
  }

  const supportIndependence = computeSourceIndependenceCount(support, sources);
  if (supportIndependence >= 2) {
    return 'SUPPORTED';
  }
  if (supportIndependence === 1) {
    return 'SINGLE_SOURCE';
  }

  // Support entries exist but none are SUPPORTS/CONTRADICTS (e.g. only
  // QUALIFIES) -- there's no confirming or disconfirming evidence, only
  // context. Treat as unsupported rather than guessing.
  return 'UNSUPPORTED';
}

export interface BuildEvidenceClaimInput {
  claimId: string;
  statement: string;
  support: EvidenceClaimSupport[];
  sources: EvidenceSource[];
  freshness: Freshness;
  options?: DeriveClaimStatusOptions;
}

export function buildEvidenceClaim(input: BuildEvidenceClaimInput): EvidenceClaim {
  const status = deriveClaimStatus(input.support, input.sources, input.freshness, input.options);
  const sourceIndependenceCount = computeSourceIndependenceCount(input.support, input.sources);

  return {
    claimId: input.claimId,
    statement: input.statement,
    support: input.support,
    status,
    freshness: input.freshness,
    sourceIndependenceCount,
  };
}

/**
 * Status transitions that would INCREASE apparent confidence without new
 * evidence being added are forbidden. Keyed by "fromStatus" -> set of
 * "toStatus" that are allowed. Anything not listed for a given "from" is
 * disallowed.
 *
 * Rationale for each row:
 *  - CONTESTED can only move to CONTESTED (re-derive, still contested) or
 *    UNSUPPORTED/STALE (evidence removed) -- never to SUPPORTED or
 *    SINGLE_SOURCE by fiat; a real re-derivation with new independent
 *    evidence must go through `buildEvidenceClaim` again with an updated
 *    `support` array, which naturally produces a fresh, honestly-earned
 *    status, not a manual override.
 *  - SINGLE_SOURCE can move to SUPPORTED only via re-derivation (not via
 *    this function) -- calling `reviseClaimStatus` to jump it straight to
 *    SUPPORTED is exactly the silent-upgrade this function exists to
 *    block.
 */
const ALLOWED_MANUAL_TRANSITIONS: Record<ClaimStatus, Set<ClaimStatus>> = {
  CONTESTED: new Set(['CONTESTED', 'STALE', 'UNSUPPORTED']),
  SINGLE_SOURCE: new Set(['SINGLE_SOURCE', 'STALE', 'UNSUPPORTED', 'CONTESTED']),
  SUPPORTED: new Set(['SUPPORTED', 'STALE', 'CONTESTED', 'UNSUPPORTED']),
  STALE: new Set(['STALE', 'UNSUPPORTED', 'CONTESTED']),
  INFERRED: new Set(['INFERRED', 'STALE', 'UNSUPPORTED', 'CONTESTED']),
  UNSUPPORTED: new Set(['UNSUPPORTED', 'STALE', 'CONTESTED', 'SINGLE_SOURCE', 'SUPPORTED', 'INFERRED']),
};

export class IllegalClaimStatusTransitionError extends Error {
  constructor(
    public readonly from: ClaimStatus,
    public readonly to: ClaimStatus,
  ) {
    super(
      `Illegal evidence-claim status transition ${from} -> ${to}: this would silently increase ` +
        `confidence without new evidence. Re-derive the claim via buildEvidenceClaim() with an ` +
        `updated support array instead of setting status directly.`,
    );
    this.name = 'IllegalClaimStatusTransitionError';
  }
}

/**
 * The only sanctioned way to move a claim's status after construction.
 * Throws `IllegalClaimStatusTransitionError` on a disallowed transition
 * instead of silently applying it.
 */
export function reviseClaimStatus(claim: EvidenceClaim, next: ClaimStatus): EvidenceClaim {
  const allowed = ALLOWED_MANUAL_TRANSITIONS[claim.status];
  if (!allowed || !allowed.has(next)) {
    throw new IllegalClaimStatusTransitionError(claim.status, next);
  }
  return { ...claim, status: next };
}
