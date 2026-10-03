import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { recordFunnelEvent } from '@/lib/analytics';
import { requestDecisionReview, type ConsensusResult, type ReviewDecisionResponse } from '@/services/decision-review-api';

/**
 * JEV decision-intelligence Phase D. Founder/admin-only for now (gated by
 * the caller, see DecisionSummary.tsx) -- decision_review_v1 is off in
 * production until TYPESAFE_API_KEY is provisioned (see
 * docs/decision-intelligence/JEV_IMPLEMENTATION_DECISION.md), so a real
 * click here will honestly show "temporarily unavailable" rather than a
 * fabricated result. This panel exists to prove the shadow-mode wiring
 * end-to-end and collect founder-visible agreement/disagreement data
 * before any wider rollout (contract §23).
 *
 * Explicit button, not auto-fired on mount: the reviewer call is metered
 * once a real key exists, and contract §10 requires never re-invoking it
 * for an unchanged analysis -- an explicit action keeps that invariant
 * visible to whoever is testing this, rather than hiding it behind a
 * silent effect.
 */

const CONSENSUS_LABEL: Record<ConsensusResult['consensusState'], string> = {
  DECISION_READY: 'Decision ready',
  CONDITIONAL: 'Conditional',
  REVIEW_REQUIRED: 'Review required',
  DEFER_AND_VALIDATE: 'Defer and validate',
  BLOCKED: 'Blocked',
  INDEPENDENT_REVIEW_UNAVAILABLE: 'Independent review unavailable',
};

const CONSENSUS_COLOR: Record<ConsensusResult['consensusState'], string> = {
  DECISION_READY: '#22c55e',
  CONDITIONAL: '#f59e0b',
  REVIEW_REQUIRED: '#f59e0b',
  DEFER_AND_VALIDATE: '#ef4444',
  BLOCKED: '#ef4444',
  INDEPENDENT_REVIEW_UNAVAILABLE: 'var(--muted-foreground)',
};

export function IndependentReviewPanel({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ReviewDecisionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewed, setViewed] = useState(false);

  const consensus = response && 'consensus' in response ? response.consensus : undefined;

  function markViewed() {
    if (viewed) return;
    setViewed(true);
    recordFunnelEvent('independent_review_viewed', { analysis_id: analysisId });
    if (consensus) {
      recordFunnelEvent('decision_consensus_viewed', { analysis_id: analysisId, consensus_state: consensus.consensusState });
    }
  }

  async function runReview() {
    setLoading(true);
    setError(null);
    try {
      const result = await requestDecisionReview(analysisId);
      setResponse(result);
      markViewed();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Independent review failed');
    } finally {
      setLoading(false);
    }
  }

  const unavailableDetail =
    response && 'status' in response && response.status === 'unavailable' ? response.detail : null;
  const reviewRow = response && 'review' in response ? response.review : null;

  return (
    <GlassCard className="p-6 border-dashed">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Independent review <span className="opacity-60">(founder-only preview)</span>
        </p>
        <Button size="sm" variant="outline" onClick={runReview} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
          {response ? 'Re-check' : 'Run independent review'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mt-3">{error}</p>}

      {consensus && (
        <div className="mt-3 space-y-2">
          <Badge
            style={{ color: CONSENSUS_COLOR[consensus.consensusState], borderColor: CONSENSUS_COLOR[consensus.consensusState] }}
            variant="outline"
            className="text-xs"
          >
            {CONSENSUS_LABEL[consensus.consensusState]}
          </Badge>
          {reviewRow?.rationale && <p className="text-sm text-muted-foreground">{reviewRow.rationale}</p>}
          {consensus.nextValidationAction && (
            <p className="text-sm">
              <span className="font-medium">Next:</span> {consensus.nextValidationAction}
            </p>
          )}
          {consensus.agreement === false && (
            <p className="text-xs text-destructive">Quantis and the independent review disagree.</p>
          )}
        </div>
      )}

      {!consensus && unavailableDetail && (
        <p className="text-sm text-muted-foreground mt-3">Independent review temporarily unavailable — {unavailableDetail}</p>
      )}
    </GlassCard>
  );
}
