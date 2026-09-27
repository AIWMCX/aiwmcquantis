import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { useAnalysisHistory } from '@/hooks/useAnalysisHistory';
import { recordFunnelEvent } from '@/lib/analytics';
import type { BusinessAnalysisResult } from '@/types/analysis';

/**
 * Activation-to-revenue Wave 6 (PR C): return-experience.
 *
 * "Do not fake this using localStorage alone" -- this reads the same real,
 * server-persisted `analyses` row every other history surface in this app
 * already reads (via the existing useAnalysisHistory() hook, confirmed via
 * repo audit to be the exact query this needs -- no new table). Renders
 * nothing when there's no real prior analysis, so it never fabricates a
 * decision to continue.
 */

interface ReturningDecisionBannerProps {
  onOpenReport: (result: BusinessAnalysisResult, analysisId: string) => void;
}

export function ReturningDecisionBanner({ onOpenReport }: ReturningDecisionBannerProps) {
  const { history, isLoaded, isAuthenticated } = useAnalysisHistory();
  const navigate = useNavigate();

  if (!isAuthenticated || !isLoaded || history.length === 0) return null;
  const last = history[0];
  const result = last.result as BusinessAnalysisResult | undefined;

  const criticalAssumption =
    result?.assumption_graph?.criticalPath?.[0] ??
    (result?.actionable_insights?.insights?.[0]
      ? {
          assumption: result.actionable_insights.insights[0].metric_name,
          currentValue: result.actionable_insights.insights[0].current_value,
        }
      : null);

  function goToScenarios(action: string) {
    recordFunnelEvent('next_action_selected', { analysis_id: last.id, action, context: 'return_banner' });
    navigate(`/app/scenarios?analysisId=${encodeURIComponent(last.id)}&intent=return`);
  }

  function openReport() {
    recordFunnelEvent('next_action_selected', { analysis_id: last.id, action: 'Open report', context: 'return_banner' });
    if (result) onOpenReport(result, last.id);
  }

  return (
    <GlassCard className="p-5 mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Continue your decision</p>
      <h3 className="text-lg font-semibold truncate">{last.idea}</h3>
      <p className="text-sm text-muted-foreground mt-1">Last modeled: {format(new Date(last.created_at), 'MMM d')}</p>
      {criticalAssumption && (
        <p className="text-sm mt-1">
          Critical assumption: <span className="font-medium">{criticalAssumption.assumption}</span> ={' '}
          {criticalAssumption.currentValue}
        </p>
      )}
      <div className="flex gap-2 mt-3 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => goToScenarios('Update assumption')}>
          Update assumption
        </Button>
        <Button size="sm" variant="outline" onClick={() => goToScenarios('Compare downside')}>
          Compare downside
        </Button>
        <Button size="sm" disabled={!result} onClick={openReport}>
          Open report
        </Button>
      </div>
    </GlassCard>
  );
}
