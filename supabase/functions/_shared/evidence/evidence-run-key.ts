/**
 * Quantis Evidence Service — semantic run identity (PR E6.2).
 *
 * The queue's PENDING->PROCESSING row claim (evidence-shadow-worker's
 * existing UPDATE...WHERE status='PENDING') prevents two concurrent
 * worker invocations from double-processing the SAME queue row. It does
 * NOT prevent a semantically duplicate evidence run: if the same analysis
 * is somehow enqueued twice (a duplicate trigger fire, a retried queue
 * item after a crash mid-persistence, a future second enqueue path), each
 * enqueue gets its own queue row, its own successful claim, and its own
 * freshly-generated evidence_packets.id -- nothing today stops that from
 * producing two independent, fully-persisted packets for the same
 * analysis under the same evidence plan.
 *
 * evidenceRunKey closes that gap at the content level, not the queue-row
 * level: it identifies WHAT was being researched (which analysis, under
 * which plan/schema version), not WHICH queue row asked for it. Two
 * queue rows that resolve to the same key are the same semantic request
 * and must converge to one packet -- enforced by a real unique constraint
 * in 20260811000000_evidence_run_key.sql, not just this function.
 *
 * A new evidencePlanVersion or evidenceSchemaVersion legitimately
 * produces a new key -- re-running research under an upgraded pipeline is
 * a new run, not a duplicate of the old one.
 */
import { sha256Hex } from './packet.ts';

export interface EvidenceRunIdentity {
  analysisRunId: string;
  evidencePlanVersion: string;
  evidenceSchemaVersion: string;
}

export function computeEvidenceRunKey(identity: EvidenceRunIdentity): Promise<string> {
  const canonical = `${identity.analysisRunId}:${identity.evidencePlanVersion}:${identity.evidenceSchemaVersion}`;
  return sha256Hex(canonical);
}
