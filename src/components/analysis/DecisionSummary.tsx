import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { SimpleMetricCard } from './SimpleMetricCard';
import { ContinueDecisionActions } from './ContinueDecisionActions';
import { IndependentReviewPanel } from './IndependentReviewPanel';
import { useAdmin } from '@/hooks/useAdmin';
import type { ScenarioAssumptionKey } from '@/services/scenario-sets-api';

/**
 * Phase E: maps a tornado/criticalPath assumption label (assumption-graph.ts's
 * TORNADO_TO_NODE node labels, the only vocabulary "what breaks first" ever
 * uses when source === 'assumption_graph') onto the Scenario Workspace's own
 * assumption keys. 'COGS %' has no scenario-assumption equivalent and is
 * deliberately left unmapped rather than guessed -- those items render
 * without a "Test this assumption" handoff.
 */
const TORNADO_LABEL_TO_SCENARIO_KEY: Partial<Record<string, ScenarioAssumptionKey>> = {
  'Price (Avg Check)': 'average_price',
  'Customer Count': 'expected_customers',
  'CAC': 'cac',
  'Churn Rate': 'churn_rate',
  'Fixed Costs': 'monthly_costs',
};
import type { BusinessAnalysisResult } from '@/types/analysis';
import { getMonthlyProfit, getPaybackMonths } from '@/types/analysis';
import { breakEvenMonthsLabel } from '@/lib/break-even';
import { computeVerdict } from '@/lib/verdict';
import { recordFunnelEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  normalizePercent,
  PROBABILITY_LABEL,
  selectCriticalAssumptions,
  selectWhatBreaksFirst,
  selectNextActions,
  computeRunwayLabel,
} from '@/lib/decision-memo-data';

/**
 * Activation-to-revenue Wave 5 (PR B): First Result Activation.
 *
 * A decision-first activation layer ABOVE the existing detailed report --
 * deliberately not a redesign of it. Every number here is read directly
 * from the real, locked BusinessAnalysisResult (confirmed field-by-field
 * via repo audit before writing this): nothing is computed by a second
 * financial engine, and nothing is invented when a field is genuinely
 * absent (older analyses predate assumption_graph, for example -- that
 * section renders a typed "not available" state instead of a fake one).
 *
 * "requiredToWork"/solveRequiredToWork (used by the First Decision
 * Experience demo) is NOT used here -- confirmed via audit that it only
 * exists against the demo fixture, never the real analyze-business
 * pipeline. "What breaks first" below uses the real
 * assumption_graph.criticalPath when present, falling back to the real
 * financial_analysis.risk_analysis scenarios otherwise.
 */

interface DecisionSummaryProps {
  result: BusinessAnalysisResult;
  analysisId?: string;
  /** Wired to AppDashboard's existing idea+location clone mechanism. See
   *  ContinueDecisionActions.tsx's header for why financial inputs are
   *  deliberately not auto-repopulated here. */
  onUpdateWithRealNumbers?: () => void;
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function DecisionSummary({ result, analysisId, onUpdateWithRealNumbers }: DecisionSummaryProps) {
  const verdict = useMemo(() => computeVerdict(result), [result]);
  const fa = result.financial_analysis;
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  function testAssumption(scenarioKey: ScenarioAssumptionKey, assumptionLabel: string) {
    recordFunnelEvent('decision_breakpoint_viewed', { analysis_id: analysisId, assumption: assumptionLabel });
    navigate(`/app/scenarios?analysisId=${analysisId}&focusAssumption=${scenarioKey}`);
  }

  // ── Telemetry: result_rendered (mount) + result_viewed (scrolled into view) ──
  const renderedFired = useRef(false);
  useEffect(() => {
    if (renderedFired.current) return;
    renderedFired.current = true;
    recordFunnelEvent('result_rendered', { analysis_id: analysisId, verdict_tone: verdict.tone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewedFired = useRef(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || viewedFired.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (viewedFired.current) return;
        if (entries[0]?.isIntersecting) {
          viewedFired.current = true;
          recordFunnelEvent('result_viewed', { analysis_id: analysisId, verdict_tone: verdict.tone });
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── B. What has to be true -- top 5 actionable insights by priority ──
  const drivers = useMemo(() => selectCriticalAssumptions(result, 5), [result]);

  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  function toggleDriver(id: string, metricName: string) {
    const opening = expandedDriver !== id;
    setExpandedDriver(opening ? id : null);
    if (opening) recordFunnelEvent('driver_inspected', { analysis_id: analysisId, metric_name: metricName });
  }

  // ── C. What breaks first -- real assumption_graph, else real risk_analysis ──
  const breaksFirst = useMemo(() => selectWhatBreaksFirst(result, 3), [result]);

  // ── D. Cash decision metrics -- real fields only; runway is derived, never invented as a fake precise number ──
  const monthlyProfit = getMonthlyProfit(fa);
  const paybackMonths = getPaybackMonths(fa);
  const requiredCapital = fa?.startup_investment?.total;
  const grossMarginPct = normalizePercent(fa?.scenarios?.base?.gross_margin);
  const runwayLabel = computeRunwayLabel(fa, monthlyProfit);

  // ── E. Test before committing capital -- grounded in the same real drivers, never generic filler ──
  const nextActions = useMemo(() => selectNextActions(result, breaksFirst, 3), [result, breaksFirst]);

  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  function toggleAction(index: number, action: string) {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else {
        next.add(index);
        recordFunnelEvent('next_action_selected', { analysis_id: analysisId, action });
      }
      return next;
    });
  }

  return (
    <div ref={rootRef} className="space-y-4 mb-6">
      {/* A. Decision */}
      <GlassCard className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">The decision</p>
        <div className="flex items-start gap-3 flex-wrap">
          <Badge style={{ color: verdict.toneColor, borderColor: verdict.toneColor }} variant="outline" className="text-xs">
            {verdict.toneLabel}
          </Badge>
        </div>
        <h2 className="text-xl md:text-2xl font-bold mt-2 leading-snug">{verdict.headline}</h2>
        <p className="text-sm text-muted-foreground mt-1">{verdict.subline}</p>
      </GlassCard>

      {/* B. What has to be true */}
      {drivers.length > 0 && (
        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">What has to be true</p>
          <div className="space-y-2">
            {drivers.map((d) => (
              <div key={d.id} className="border border-border rounded-md">
                <button
                  type="button"
                  onClick={() => toggleDriver(d.id, d.metric_name)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] shrink-0',
                        d.status === 'danger' && 'border-destructive text-destructive',
                        d.status === 'warning' && 'border-amber-500 text-amber-500',
                      )}
                    >
                      {d.priority}
                    </Badge>
                    <span className="text-sm font-medium truncate">{d.metric_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {d.current_value} → {d.target_value}
                    </span>
                  </div>
                  {expandedDriver === d.id ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                </button>
                {expandedDriver === d.id && (
                  <div className="px-3 pb-3 text-sm text-muted-foreground space-y-1">
                    <p>{d.explanation}</p>
                    <p className="text-xs italic">{d.why_it_matters}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* C. What breaks first */}
      <GlassCard className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">What breaks first</p>
        {breaksFirst ? (
          <ol className="space-y-2">
            {breaksFirst.items.map((item: any, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground mt-0.5">{i + 1}.</span>
                {breaksFirst.source === 'assumption_graph' ? (
                  <span className="flex-1">
                    <span className="font-medium">{item.assumption}</span> — breaks below{' '}
                    <span className="font-mono">{item.breakingThreshold}</span> (currently {item.currentValue})
                    {analysisId && TORNADO_LABEL_TO_SCENARIO_KEY[item.assumption] && (
                      <button
                        type="button"
                        onClick={() => testAssumption(TORNADO_LABEL_TO_SCENARIO_KEY[item.assumption]!, item.assumption)}
                        className="ml-2 text-xs text-primary hover:underline whitespace-nowrap"
                      >
                        Test this assumption →
                      </button>
                    )}
                  </span>
                ) : (
                  <span>
                    <span className="font-medium">{item.label}</span> → resulting profit {fmtUsd(item.resulting_profit)}
                    {item.probability && (
                      <span className="text-muted-foreground"> ({PROBABILITY_LABEL[item.probability] ?? item.probability} probability)</span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Not available for this analysis.</p>
        )}
      </GlassCard>

      {/* D. Cash decision metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SimpleMetricCard title="Payback" value={paybackMonths >= 999 ? 'Never' : `${Math.round(paybackMonths)} mo`} />
        <SimpleMetricCard title="Break-even" value={breakEvenMonthsLabel(fa, monthlyProfit)} />
        <SimpleMetricCard title="Capital required" value={requiredCapital != null ? fmtUsd(requiredCapital) : 'N/A'} />
        <SimpleMetricCard title="Gross margin" value={`${grossMarginPct.toFixed(0)}%`} />
      </div>
      <GlassCard className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-1">Runway</p>
        <p className="text-sm">{runwayLabel}</p>
      </GlassCard>

      {/* E. Test before committing capital */}
      {nextActions.length > 0 && (
        <GlassCard className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-3">Test before committing capital</p>
          <div className="space-y-2">
            {nextActions.map((action, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleAction(i, action)}
                className={cn(
                  'w-full text-left text-sm px-3 py-2 rounded-md border transition-colors',
                  selectedActions.has(i) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
                )}
              >
                {action}
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* F. Independent review -- founder/admin-only while decision_review_v1 is off */}
      {isAdmin && analysisId && <IndependentReviewPanel analysisId={analysisId} />}

      <ContinueDecisionActions analysisId={analysisId} onUpdateWithRealNumbers={onUpdateWithRealNumbers} />
    </div>
  );
}
