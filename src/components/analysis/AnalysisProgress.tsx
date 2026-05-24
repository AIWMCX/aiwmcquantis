import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Zap, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnalysisStage {
  id: string;
  label: string;
  completedLabel: string;
  startTime: number;
  endTime: number;
}

interface AnalysisProgressProps {
  isLoading: boolean;
  startTime?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
  businessType?: string;
  location?: string;
  isComplete?: boolean;
  className?: string;
  selectedOutputs?: { biReport: boolean; preMortem: boolean; invoiceCapacity: boolean };
}

function buildStages(location?: string, selectedOutputs?: { biReport: boolean; preMortem: boolean; invoiceCapacity: boolean }): AnalysisStage[] {
  const geoLabel = location ? `Applying ${location} geo calibration` : 'Applying geo calibration';
  const stages: AnalysisStage[] = [
    { id: 'benchmarks', label: 'Loading industry benchmarks…', completedLabel: 'Industry benchmarks loaded', startTime: 0, endTime: 3 },
    { id: 'geo', label: `${geoLabel}…`, completedLabel: `${geoLabel} ✓`, startTime: 3, endTime: 6 },
    { id: 'model', label: 'Parsing business model & revenue engine…', completedLabel: 'Business model parsed', startTime: 6, endTime: 11 },
    { id: 'unit', label: 'Running deep unit economics analysis…', completedLabel: 'Unit economics analyzed', startTime: 11, endTime: 18 },
    { id: 'rvce', label: 'Cross-validating with external data sources (RVCE)…', completedLabel: 'External validation complete', startTime: 18, endTime: 26 },
    { id: 'consensus', label: 'Running dual-LLM consensus scoring…', completedLabel: 'Consensus scoring complete', startTime: 26, endTime: 32 },
    { id: 'reconciliation', label: 'Running reconciliation & sanity checks…', completedLabel: 'Reconciliation passed', startTime: 32, endTime: 36 },
    { id: 'stressmap', label: 'Running risk & stress tests…', completedLabel: 'Stress map generated', startTime: 36, endTime: 42 },
    { id: 'scenarios', label: 'Generating scenarios & levers…', completedLabel: 'Scenarios & levers ready', startTime: 42, endTime: 48 },
  ];

  if (selectedOutputs?.preMortem) {
    stages.push({ id: 'premortem', label: 'Running pre-mortem failure scenarios…', completedLabel: 'Pre-mortem scenarios generated', startTime: 48, endTime: 54 });
  }
  if (selectedOutputs?.invoiceCapacity) {
    const start = selectedOutputs?.preMortem ? 54 : 48;
    stages.push({ id: 'invoice', label: 'Checking invoice capacity & credit risk…', completedLabel: 'Invoice capacity check complete', startTime: start, endTime: start + 6 });
  }

  stages.push({
    id: 'report',
    label: 'Preparing your executive report…',
    completedLabel: 'Executive report ready',
    startTime: stages[stages.length - 1].endTime,
    endTime: stages[stages.length - 1].endTime + 4,
  });

  return stages;
}

export const AnalysisProgress = React.memo(function AnalysisProgress({
  isLoading,
  startTime,
  onRetry,
  onCancel,
  onComplete,
  businessType,
  location,
  isComplete = false,
  selectedOutputs,
}: AnalysisProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);
  const [completionPhase, setCompletionPhase] = useState<'none' | 'filling' | 'checkmarks' | 'done'>('none');

  const stages = useMemo(() => buildStages(location, selectedOutputs), [location, selectedOutputs]);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      setShowTimeout(false);
      setCompletionPhase('none');
      return;
    }
    const interval = setInterval(() => {
      const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      setElapsedSeconds(elapsed);
      if (elapsed >= 60) setShowTimeout(true);
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  useEffect(() => {
    if (!isComplete || completionPhase !== 'none') return;
    setCompletionPhase('filling');
    const t1 = setTimeout(() => setCompletionPhase('checkmarks'), 200);
    const t2 = setTimeout(() => setCompletionPhase('done'), 200 + stages.length * 80 + 500);
    const t3 = setTimeout(() => onComplete?.(), 200 + stages.length * 80 + 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isComplete, completionPhase, stages.length, onComplete]);

  const { overallProgress, completedStages, currentStageId } = useMemo(() => {
    if (isComplete || completionPhase !== 'none') {
      return { overallProgress: 100, completedStages: stages.map(s => s.id), currentStageId: null as string | null };
    }
    if (!isLoading) return { overallProgress: 0, completedStages: [] as string[], currentStageId: null as string | null };
    const completed: string[] = [];
    let currentId: string | null = null;
    for (const stage of stages) {
      if (elapsedSeconds >= stage.endTime) {
        completed.push(stage.id);
      } else if (elapsedSeconds >= stage.startTime && !currentId) {
        currentId = stage.id;
      }
    }
    if (!currentId && completed.length < stages.length) currentId = stages[Math.min(completed.length, stages.length - 1)].id;
    const lastStage = stages[stages.length - 1];
    let progress: number;
    if (elapsedSeconds >= lastStage.endTime) {
      // Ease toward 95% then hold for backend
      progress = Math.min(92 + ((elapsedSeconds - lastStage.endTime) / 20) * 6, 98);
    } else {
      progress = (elapsedSeconds / lastStage.endTime) * 92;
    }
    return { overallProgress: progress, completedStages: completed, currentStageId: currentId };
  }, [isLoading, isComplete, completionPhase, elapsedSeconds, stages]);

  const estimatedRemaining = useMemo(() => {
    const lastStage = stages[stages.length - 1];
    return Math.max(0, lastStage.endTime + 3 - elapsedSeconds);
  }, [elapsedSeconds, stages]);

  if (!isLoading) return null;

  const subtitle = [businessType, location].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden" style={{ background: 'var(--q-gradient-hero, linear-gradient(135deg, #0a1224 0%, #0f1b3d 50%, #0a1a36 100%))' }}>
      {/* Animated grid + shimmer */}
      <div className="absolute inset-0 q-grid-pattern opacity-30" />
      <div className="absolute inset-0 q-shimmer pointer-events-none" />
      <div className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[80vw] h-[80vw] max-w-[900px] max-h-[900px] rounded-full blur-3xl opacity-20 q-pulse-glow" style={{ background: 'radial-gradient(closest-side, var(--q-accent-primary, #4f8cff), transparent)' }} />

      <div className="relative w-full max-w-[520px] mx-4 rounded-[var(--q-radius-xl)] border border-[var(--q-border-default)] bg-[var(--q-bg-elevated)]/90 backdrop-blur-xl shadow-[var(--q-shadow-elevated)] p-8 sm:p-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative p-3 rounded-xl bg-[var(--q-accent-glow)]">
            <div className="absolute inset-0 rounded-xl q-pulse-ring" />
            <Zap className="w-6 h-6 text-[var(--q-accent-primary)] animate-[q-icon-rotate_3s_ease-in-out_infinite]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--q-text-primary)] tracking-tight" style={{ fontFamily: 'var(--q-font-heading, Sora, sans-serif)' }}>
              {completionPhase === 'done' ? 'Complete!' : 'Analyzing your business'}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-body)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="relative h-1.5 w-full rounded-[3px] bg-[var(--q-bg-overlay)] overflow-hidden">
            <div
              className="h-full rounded-[3px] transition-all duration-[1200ms] ease-out"
              style={{
                width: `${overallProgress}%`,
                background: 'var(--q-gradient-accent, linear-gradient(90deg, var(--q-accent-primary), var(--q-accent-hover)))',
                boxShadow: '0 0 12px var(--q-accent-primary, #4f8cff)',
              }}
            />
            <div
              className="absolute top-0 h-full w-12 q-bar-sheen pointer-events-none"
              style={{ left: `calc(${overallProgress}% - 48px)` }}
            />
          </div>
          <div className="flex justify-between text-xs tabular-nums">
            <span className="text-[var(--q-text-tertiary)]">{Math.round(overallProgress)}%</span>
            {estimatedRemaining > 0 && !showTimeout && completionPhase === 'none' && (
              <span className="text-[var(--q-text-tertiary)]">~{estimatedRemaining}s remaining</span>
            )}
          </div>
        </div>

        {/* Stage list */}
        <div className="space-y-1.5 max-h-[280px] overflow-hidden">
          {stages.map((stage, idx) => {
            const isCompleted = completedStages.includes(stage.id);
            const isCurrent = currentStageId === stage.id && !isCompleted;
            const staggerDelay = completionPhase === 'checkmarks' || completionPhase === 'done'
              ? `${idx * 80}ms` : '0ms';
            return (
              <div key={stage.id} className={cn('flex items-center gap-2.5 py-1 text-sm transition-all duration-500', !isCompleted && !isCurrent && 'opacity-35')}>
                {isCompleted ? (
                  <CheckCircle2
                    className="w-4 h-4 text-[var(--q-status-green)] shrink-0 animate-scale-in"
                    style={{ animationDelay: staggerDelay }}
                  />
                ) : isCurrent ? (
                  <span className="relative w-3 h-3 ml-0.5 shrink-0">
                    <span className="absolute inset-0 rounded-full bg-[var(--q-accent-primary)] animate-ping opacity-75" />
                    <span className="absolute inset-0 rounded-full bg-[var(--q-accent-primary)]" />
                  </span>
                ) : (
                  <span className="w-4 h-4 rounded-full border border-[var(--q-border-default)] shrink-0" />
                )}
                <span className={cn(
                  'transition-colors',
                  isCompleted ? 'text-[var(--q-text-secondary)]' :
                  isCurrent ? 'text-[var(--q-text-primary)] font-medium' :
                  'text-[var(--q-text-tertiary)]'
                )}>
                  {isCompleted ? stage.completedLabel : stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Timeout warning */}
        {showTimeout && (
          <div className="p-3 rounded-lg bg-[var(--q-status-yellow-bg)] border border-[var(--q-status-yellow-border)]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--q-status-yellow)] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-[var(--q-text-primary)]">Taking longer than usual</p>
                <p className="text-xs text-[var(--q-text-tertiary)]">Complex analyses may take up to 90 seconds. Your idea is safe.</p>
                <div className="flex gap-2">
                  {onRetry && <Button size="sm" variant="outline" onClick={onRetry} className="text-xs h-7">Try Again</Button>}
                  {onCancel && <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">Cancel</Button>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Insight ticker */}
        <div className="border-t border-[var(--q-border-subtle)] pt-4">
          <InsightTicker />
        </div>
      </div>

      <style>{`
        @keyframes q-icon-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(8deg); }
          75% { transform: rotate(-8deg); }
        }
        @keyframes q-grid-drift {
          0% { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
        @keyframes q-shimmer-move {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes q-pulse-ring-kf {
          0% { box-shadow: 0 0 0 0 rgba(79,140,255,0.45); }
          70% { box-shadow: 0 0 0 14px rgba(79,140,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(79,140,255,0); }
        }
        @keyframes q-bar-sheen-kf {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes q-pulse-glow-kf {
          0%, 100% { opacity: 0.18; transform: translate(-50%, 0) scale(1); }
          50% { opacity: 0.28; transform: translate(-50%, 0) scale(1.05); }
        }
        .q-grid-pattern {
          background-image:
            linear-gradient(rgba(79,140,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,140,255,0.08) 1px, transparent 1px);
          background-size: 60px 60px;
          animation: q-grid-drift 30s linear infinite;
        }
        .q-shimmer {
          background: linear-gradient(115deg, transparent 40%, rgba(79,140,255,0.05) 50%, transparent 60%);
          animation: q-shimmer-move 8s ease-in-out infinite;
        }
        .q-pulse-ring { animation: q-pulse-ring-kf 2s ease-out infinite; }
        .q-bar-sheen {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: q-bar-sheen-kf 1.6s ease-in-out infinite;
        }
        .q-pulse-glow { animation: q-pulse-glow-kf 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
});

const INSIGHTS: string[] = [
  "Great ideas die more often from no testing than from bad markets.",
  "AGI won't fix unit economics — CAC and churn still win.",
  "A 'no' from the numbers today is cheaper than a 'no' from investors later.",
  "Benchmarks don't predict the future; they bound your delusions.",
  "In B2B, 5 paying customers beat 5,000 newsletter subscribers.",
  "Founders overestimate TAM and underestimate payback period.",
  "If your LTV:CAC is below 3, you're buying revenue, not building a business.",
  "Pre-revenue valuations are stories. Post-revenue valuations are math.",
  "Churn compounds faster than growth. Fix retention before scaling spend.",
  "Most pivots are admissions that the first pricing was wrong.",
  "An MVP that takes 6 months is not minimum and not viable.",
  "If you can't explain your unit economics in one breath, neither can your investor.",
  "Cash runway is the only metric that decides whether you finish the race.",
  "AI features don't create moats. Distribution and data still do.",
  "A ten-customer interview round beats a hundred-page market report.",
  "Gross margin under 40% turns every growth dollar into a slow leak.",
  "The cheapest market research is a paid landing page and a $50 ad budget.",
  "Forecasts without assumptions are fiction with a spreadsheet attached.",
  "Founders die from ten small bets, not one big one.",
  "Your CAC is wrong if it doesn't include the salaries running ads.",
  "B2C virality without retention is a bucket with a hole at the bottom.",
  "Every 1% of churn shaved is worth 10% in new sales.",
  "The riskiest assumption is usually the one you didn't write down.",
  "Investors fund traction, not vision. Vision sells the round price.",
  "If competitors are profitable and you're not, the issue is execution, not market.",
  "Margin tells you if the business model works. Cash tells you if you survive.",
  "Pricing is a product feature, not a finance decision.",
  "The TAM you can reach this year matters more than the TAM in the deck.",
  "Burn is a strategy only when growth outpaces the discount rate.",
  "If onboarding takes 30 minutes, your activation rate is the bottleneck.",
  "Founders ship features. Operators ship outcomes.",
  "A model that survives stress tests survives the next downturn.",
  "Two paying pilots beat ten signed LOIs every quarter of the year.",
  "The right answer to 'what's our moat?' is rarely 'we move fast'.",
  "Customer concentration above 30% is a single point of failure.",
  "Discounts buy logos, not loyalty. Loyalty is built in the product.",
  "Forecasting demand is hard. Forecasting your own discipline is harder.",
  "Hiring before product-market fit is borrowing speed at 200% interest.",
  "The cheapest growth lever is usually a 5% price increase, tested honestly.",
  "If your sales cycle doubled, your ICP probably halved.",
  "AI agents don't sell themselves. Buyers still buy outcomes.",
  "A clean P&L is a brutal honesty test most founders fail.",
];

function InsightTicker() {
  const [order] = useState(() => {
    const arr = INSIGHTS.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [pos, setPos] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeOut = setInterval(() => setVisible(false), 3000);
    return () => clearInterval(fadeOut);
  }, []);

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => {
      setPos(p => (p + 1) % order.length);
      setVisible(true);
    }, 350);
    return () => clearTimeout(t);
  }, [visible, order.length]);

  const text = INSIGHTS[order[pos]];

  return (
    <div className="bg-[var(--q-bg-overlay)] rounded-[var(--q-radius-md)] p-3 min-h-[52px] flex items-center gap-2.5 border border-[var(--q-border-subtle)]">
      <Lightbulb className="w-4 h-4 shrink-0 text-[var(--q-accent-primary)]" />
      <p
        key={pos}
        className={cn(
          'text-sm text-[var(--q-text-secondary)] transition-all duration-300',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        )}
      >
        {text}
      </p>
    </div>
  );
}
