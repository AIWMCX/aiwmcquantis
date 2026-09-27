import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { recordFunnelEvent } from '@/lib/analytics';

/**
 * Activation-to-revenue Wave 6 (PR C): "Continue this decision" -- the
 * user's next step after a result is never just an implicit "go to
 * dashboard". Every destination here is a real, already-built route --
 * confirmed via repo audit before writing this:
 *   - /app/scenarios?analysisId=X already exists (the same route
 *     AppDashboard's own "Open Compare Outcomes" banner uses) and already
 *     supports assumption editing + scenario comparison + downside
 *     testing in one workspace -- "Change an assumption", "Compare
 *     downside", and "Compare another scenario" are three honest framings
 *     of that same real capability, not three fabricated destinations.
 *     `intent` is passed only for analytics (which framing drives clicks),
 *     ScenarioWorkspace ignores unknown params safely.
 *   - /app/new-decision is the real PR A intent-capture route.
 *   - "Update with real numbers" reuses the exact existing clone
 *     mechanism (idea + location only -- see onUpdateWithRealNumbers'
 *     caller in AppDashboard.tsx). Financial inputs are deliberately NOT
 *     auto-repopulated: the only stored bundle close to the original raw
 *     inputs (analyses.scenario_base_input) is frozen for the
 *     deterministic engine's own re-run path, not confirmed to map
 *     field-for-field onto the human-facing form -- attempting that
 *     mapping under uncertainty risked silently mismatched numbers,
 *     which is worse than asking the user to re-type them.
 */

interface ContinueDecisionActionsProps {
  analysisId?: string;
  onUpdateWithRealNumbers?: () => void;
}

export function ContinueDecisionActions({ analysisId, onUpdateWithRealNumbers }: ContinueDecisionActionsProps) {
  const navigate = useNavigate();

  function goToScenarios(intent: string, action: string) {
    recordFunnelEvent('next_action_selected', { analysis_id: analysisId, action, context: 'continue_decision' });
    if (!analysisId) return;
    navigate(`/app/scenarios?analysisId=${encodeURIComponent(analysisId)}&intent=${intent}`);
  }

  function startRelatedDecision() {
    recordFunnelEvent('next_action_selected', { analysis_id: analysisId, action: 'Start a related decision', context: 'continue_decision' });
    navigate('/app/new-decision');
  }

  function updateWithRealNumbers() {
    recordFunnelEvent('next_action_selected', { analysis_id: analysisId, action: 'Update with real numbers', context: 'continue_decision' });
    onUpdateWithRealNumbers?.();
  }

  return (
    <GlassCard className="p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Continue this decision</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Button variant="outline" size="sm" disabled={!analysisId} onClick={() => goToScenarios('assumption', 'Change an assumption')}>
          Change an assumption
        </Button>
        <Button variant="outline" size="sm" disabled={!analysisId} onClick={() => goToScenarios('downside', 'Compare downside')}>
          Compare downside
        </Button>
        <Button variant="outline" size="sm" disabled={!analysisId} onClick={() => goToScenarios('scenario', 'Compare another scenario')}>
          Compare another scenario
        </Button>
        <Button variant="outline" size="sm" disabled={!onUpdateWithRealNumbers} onClick={updateWithRealNumbers}>
          Update with real numbers
        </Button>
        <Button variant="outline" size="sm" onClick={startRelatedDecision}>
          Start a related decision
        </Button>
      </div>
    </GlassCard>
  );
}
