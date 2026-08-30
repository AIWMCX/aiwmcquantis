import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react';
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

function buildStages(
  location?: string,
  selectedOutputs?: { biReport: boolean; preMortem: boolean; invoiceCapacity: boolean }
): AnalysisStage[] {
  const geoLabel = location ? `Applying ${location} geo calibration` : 'Applying geo calibration';
  const stages: AnalysisStage[] = [
    {
      id: 'benchmarks',
      label: 'Loading industry benchmarks...',
      completedLabel: 'Industry benchmarks loaded',
      startTime: 0,
      endTime: 3,
    },
    {
      id: 'geo',
      label: `${geoLabel}...`,
      completedLabel: `${geoLabel} ✓`,
      startTime: 3,
      endTime: 6,
    },
    {
      id: 'gpt',
      label: 'DeepSeek primary analysis in progress...',
      completedLabel: 'DeepSeek primary analysis complete',
      startTime: 6,
      endTime: 14,
    },
    {
      id: 'gemini',
      label: 'AI cross-validation in progress...',
      completedLabel: 'AI cross-validation complete',
      startTime: 14,
      endTime: 22,
    },
    {
      id: 'consensus',
      label: 'Running consensus scoring...',
      completedLabel: 'Consensus scoring complete',
      startTime: 22,
      endTime: 28,
    },
    {
      id: 'reconciliation',
      label: 'Running reconciliation check...',
      completedLabel: 'Reconciliation check passed',
      startTime: 28,
      endTime: 34,
    },
    {
      id: 'stressmap',
      label: 'Generating Stress Map...',
      completedLabel: 'Stress Map generated',
      startTime: 34,
      endTime: 42,
    },
  ];

  if (selectedOutputs?.preMortem) {
    stages.push({
      id: 'premortem',
      label: 'Running pre-mortem failure scenarios...',
      completedLabel: 'Pre-mortem scenarios generated',
      startTime: 42,
      endTime: 50,
    });
  }
  if (selectedOutputs?.invoiceCapacity) {
    const start = selectedOutputs?.preMortem ? 50 : 42;
    stages.push({
      id: 'invoice',
      label: 'Checking invoice capacity and credit risk...',
      completedLabel: 'Invoice capacity check complete',
      startTime: start,
      endTime: start + 8,
    });
  }

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
  const [completionPhase, setCompletionPhase] = useState<
    'none' | 'filling' | 'checkmarks' | 'done'
  >('none');
  // Callers don't always pass startTime — without this fallback elapsed stays
  // 0 forever and the overlay sits at "0% · ~45s remaining" for the whole run.
  const [mountTime] = useState(() => Date.now());
  const effectiveStart = startTime ?? mountTime;

  const stages = useMemo(() => buildStages(location, selectedOutputs), [location, selectedOutputs]);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      setShowTimeout(false);
      setCompletionPhase('none');
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - effectiveStart) / 1000);
      setElapsedSeconds(elapsed);
      // The backend's own AI narration call has a documented 60s budget on a
      // slow-provider day (supabase/functions/analyze-business/index.ts,
      // AI_TIMEOUT_MS) — firing our "taking longer" warning at exactly 60s
      // meant we alarmed the user at the precise moment the backend was
      // still comfortably inside its own normal, expected budget. Wait past
      // that budget plus response-shaping overhead before showing it.
      if (elapsed >= 70) setShowTimeout(true);
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading, effectiveStart]);

  // Completion animation sequence
  useEffect(() => {
    if (!isComplete || completionPhase !== 'none') return;
    setCompletionPhase('filling');
    const t1 = setTimeout(() => setCompletionPhase('checkmarks'), 200);
    const t2 = setTimeout(() => setCompletionPhase('done'), 200 + stages.length * 80 + 500);
    const t3 = setTimeout(() => onComplete?.(), 200 + stages.length * 80 + 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isComplete, completionPhase, stages.length, onComplete]);

  const { overallProgress, completedStages, currentStageId } = useMemo(() => {
    if (isComplete || completionPhase !== 'none') {
      return {
        overallProgress: 100,
        completedStages: stages.map((s) => s.id),
        currentStageId: null as string | null,
      };
    }
    if (!isLoading)
      return {
        overallProgress: 0,
        completedStages: [] as string[],
        currentStageId: null as string | null,
      };
    const completed: string[] = [];
    let currentId: string | null = null;
    for (const stage of stages) {
      if (elapsedSeconds >= stage.endTime) {
        completed.push(stage.id);
      } else if (elapsedSeconds >= stage.startTime && !currentId) {
        currentId = stage.id;
      }
    }
    if (!currentId && completed.length < stages.length) currentId = stages[0].id;
    const lastStage = stages[stages.length - 1];
    let progress: number;
    if (elapsedSeconds >= lastStage.endTime) {
      // Was a fixed 15s climb from 90% to 99%, then flat for as long as the
      // backend kept running — the exact "frozen at 99%" complaint. The
      // real backend budget (AI_TIMEOUT_MS + overhead) runs to ~65-70s on a
      // slow day, so spread the climb over that full realistic window
      // instead of capping out 30-40s before the backend could legitimately
      // still be working.
      progress = Math.min(90 + ((elapsedSeconds - lastStage.endTime) / 35) * 9, 99);
    } else {
      progress = (elapsedSeconds / lastStage.endTime) * 90;
    }
    return { overallProgress: progress, completedStages: completed, currentStageId: currentId };
  }, [isLoading, isComplete, completionPhase, elapsedSeconds, stages]);

  const estimatedRemaining = useMemo(() => {
    // Was 45 — well under the backend's real 60s AI-call budget, so
    // "~Xs remaining" hit 0 and vanished up to 15-25s before a normal
    // request actually finished, leaving a silent dead zone with no
    // status text at all before the (also premature) timeout warning.
    const total = 65;
    return Math.max(0, total - elapsedSeconds);
  }, [elapsedSeconds]);

  if (!isLoading) return null;

  const subtitle = [businessType, location].filter(Boolean).join(' · ');

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      style={{
        background:
          'var(--q-gradient-hero, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%))',
      }}
    >
      <div className="absolute inset-0 q-grid-pattern opacity-40" />

      <div className="relative w-full max-w-[480px] mx-4 rounded-[var(--q-radius-xl)] border border-[var(--q-border-default)] bg-[var(--q-bg-elevated)] shadow-[var(--q-shadow-elevated)] p-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="p-3 rounded-xl bg-[var(--q-accent-glow)] animate-[q-icon-rotate_3s_ease-in-out_infinite]">
            <Zap className="w-6 h-6 text-[var(--q-accent-primary)]" />
          </div>
          <div>
            <h2
              className="text-xl font-bold text-[var(--q-text-primary)]"
              style={{ fontFamily: 'var(--q-font-heading, Sora, sans-serif)' }}
            >
              {completionPhase === 'done' ? 'Complete!' : 'Analyzing your business'}
            </h2>
            {subtitle && (
              <p
                className="mt-1 text-sm text-[var(--q-text-secondary)]"
                style={{ fontFamily: 'var(--q-font-body)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded-[3px] bg-[var(--q-bg-overlay)] overflow-hidden">
            <div
              className="h-full rounded-[3px] transition-all duration-700 ease-out"
              style={{
                width: `${overallProgress}%`,
                background:
                  'var(--q-gradient-accent, linear-gradient(90deg, var(--q-accent-primary), var(--q-accent-hover)))',
              }}
            />
          </div>
          <div className="flex justify-between text-xs tabular-nums">
            <span className="text-[var(--q-text-tertiary)]">{Math.round(overallProgress)}%</span>
          </div>
        </div>

        {/* Stage list */}
        <div className="space-y-1.5">
          {stages.map((stage, idx) => {
            const isCompleted = completedStages.includes(stage.id);
            const isCurrent = currentStageId === stage.id && !isCompleted;
            // Staggered checkmark delay during completion
            const staggerDelay =
              completionPhase === 'checkmarks' || completionPhase === 'done'
                ? `${idx * 80}ms`
                : '0ms';
            return (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center gap-2.5 py-1 text-sm transition-all duration-300',
                  !isCompleted && !isCurrent && 'opacity-40'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2
                    className="w-4 h-4 text-[var(--q-status-green)] shrink-0 animate-scale-in"
                    style={{ animationDelay: staggerDelay }}
                  />
                ) : isCurrent ? (
                  <span className="w-3 h-3 rounded-full bg-[var(--q-accent-primary)] animate-pulse shrink-0 ml-0.5" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-[var(--q-border-default)] shrink-0 text-[var(--q-text-tertiary)]" />
                )}
                <span
                  className={cn(
                    isCompleted
                      ? 'text-[var(--q-text-secondary)] line-through decoration-[var(--q-status-green)]/30'
                      : isCurrent
                        ? 'text-[var(--q-text-primary)] font-medium'
                        : 'text-[var(--q-text-tertiary)]'
                  )}
                >
                  {isCompleted ? stage.completedLabel : stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        {estimatedRemaining > 0 && !showTimeout && completionPhase === 'none' && (
          <p className="text-sm text-center text-[var(--q-text-tertiary)] tabular-nums">
            ~{estimatedRemaining}s remaining
          </p>
        )}

        {/* Bridge state: estimate has run out but we're not into the real
            "slow" window yet (showTimeout) — without this the status line
            goes blank for several seconds, which reads as frozen even
            though the request is progressing completely normally. */}
        {estimatedRemaining === 0 && !showTimeout && completionPhase === 'none' && (
          <p className="text-sm text-center text-[var(--q-text-tertiary)]">
            Almost there — finishing your analysis...
          </p>
        )}

        {/* Timeout warning */}
        {showTimeout && (
          <div className="p-3 rounded-lg bg-[var(--q-status-yellow-bg)] border border-[var(--q-status-yellow-border)]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--q-status-yellow)] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-[var(--q-text-primary)]">
                  Still working — this one's detailed
                </p>
                <p className="text-xs text-[var(--q-text-tertiary)]">
                  Full analyses take a bit longer to compute. Your results are on the way.
                </p>
                <div className="flex gap-2">
                  {onRetry && (
                    <Button size="sm" variant="outline" onClick={onRetry} className="text-xs h-7">
                      Try Again
                    </Button>
                  )}
                  {onCancel && (
                    <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Separator + Rotating tip */}
        <div className="border-t border-[var(--q-border-subtle)] pt-4">
          <EducationalTip elapsedSeconds={elapsedSeconds} />
        </div>
      </div>

      <style>{`
        @keyframes q-icon-rotate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(8deg); }
          75% { transform: rotate(-8deg); }
        }
      `}</style>
    </div>
  );
});

const EDUCATIONAL_TIPS = [
  '💡 Coffee shops average 12-18% net margins in the US.',
  '💡 A healthy LTV:CAC ratio is 3:1 or higher.',
  '💡 Location costs vary up to 4x between cities globally.',
  '💡 82% of startups fail due to cash flow problems, not bad ideas.',
  '💡 SaaS companies typically need 18-24 months to reach profitability.',
  '💡 Customer acquisition cost drops 60% with referral programs.',
  '💡 We analyze costs across 50+ cities with real cost indices.',
  '💡 Average payback period for small businesses is 6-18 months.',
  '💡 Our engine cross-checks your numbers against 97,500 benchmarks.',
  '💡 Businesses with a clear financial plan are 2.5x more likely to get funded.',
];

function EducationalTip({ elapsedSeconds }: { elapsedSeconds: number }) {
  const tipIndex = Math.floor(elapsedSeconds / 6) % EDUCATIONAL_TIPS.length;
  return (
    <div className="bg-[var(--q-bg-overlay)] rounded-[var(--q-radius-md)] p-3">
      <p className="text-sm text-[var(--q-text-secondary)] animate-fade-in" key={tipIndex}>
        {EDUCATIONAL_TIPS[tipIndex]}
      </p>
    </div>
  );
}
