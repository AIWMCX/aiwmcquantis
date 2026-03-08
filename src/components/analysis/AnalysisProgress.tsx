import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Loader2, AlertCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnalysisStage {
  id: string;
  label: string;
  completedLabel: string;
  startTime: number;
  endTime: number;
}

const ANALYSIS_STAGES: AnalysisStage[] = [
  { id: 'benchmarks', label: 'Loading industry benchmarks...', completedLabel: 'Industry benchmarks loaded', startTime: 0, endTime: 3 },
  { id: 'gpt', label: 'GPT-4o mini analysis in progress...', completedLabel: 'GPT-4o mini analysis complete', startTime: 3, endTime: 10 },
  { id: 'gemini', label: 'Gemini cross-validation in progress...', completedLabel: 'Gemini cross-validation complete', startTime: 10, endTime: 18 },
  { id: 'consensus', label: 'Running consensus scoring...', completedLabel: 'Consensus scoring complete', startTime: 18, endTime: 24 },
  { id: 'reconciliation', label: 'Running reconciliation check...', completedLabel: 'Reconciliation check passed', startTime: 24, endTime: 30 },
  { id: 'stressmap', label: 'Generating Stress Map...', completedLabel: 'Stress Map generated', startTime: 30, endTime: 36 },
  { id: 'report', label: 'Compiling report...', completedLabel: 'Report compiled', startTime: 36, endTime: 45 },
];

interface AnalysisProgressProps {
  isLoading: boolean;
  startTime?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const AnalysisProgress = React.memo(function AnalysisProgress({
  isLoading,
  startTime,
  onRetry,
  onCancel,
}: AnalysisProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      setShowTimeout(false);
      return;
    }
    const interval = setInterval(() => {
      const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      setElapsedSeconds(elapsed);
      if (elapsed >= 60) setShowTimeout(true);
    }, 100);
    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  const { overallProgress, completedStages, currentStageId } = useMemo(() => {
    if (!isLoading) return { overallProgress: 0, completedStages: [] as string[], currentStageId: null as string | null };
    const completed: string[] = [];
    let currentId: string | null = null;
    for (const stage of ANALYSIS_STAGES) {
      if (elapsedSeconds >= stage.endTime) {
        completed.push(stage.id);
      } else if (elapsedSeconds >= stage.startTime && !currentId) {
        currentId = stage.id;
      }
    }
    if (!currentId && completed.length < ANALYSIS_STAGES.length) currentId = ANALYSIS_STAGES[0].id;
    // Progress: smooth to 90% then holds
    let progress: number;
    const lastStage = ANALYSIS_STAGES[ANALYSIS_STAGES.length - 1];
    if (elapsedSeconds >= lastStage.endTime) {
      progress = Math.min(90 + ((elapsedSeconds - lastStage.endTime) / 15) * 9, 99);
    } else {
      progress = (elapsedSeconds / lastStage.endTime) * 90;
    }
    return { overallProgress: progress, completedStages: completed, currentStageId: currentId };
  }, [isLoading, elapsedSeconds]);

  const estimatedRemaining = useMemo(() => {
    const total = 45;
    const remaining = Math.max(0, total - elapsedSeconds);
    return remaining;
  }, [elapsedSeconds]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--q-gradient-accent, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%))' }}>
      <div className="absolute inset-0 q-grid-pattern opacity-40" />

      <div className="relative w-full max-w-[440px] mx-4 rounded-2xl border border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)] shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--q-accent-glow)]">
            <Zap className="w-5 h-5 text-[var(--q-accent-primary)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading, Sora, sans-serif)' }}>
            Running Dual-AI Analysis
          </h2>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded-full bg-[var(--q-bg-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${overallProgress}%`,
                background: 'linear-gradient(90deg, var(--q-accent-primary), var(--q-accent-hover))',
              }}
            />
          </div>
          <div className="flex justify-between text-xs tabular-nums">
            <span className="text-[var(--q-text-tertiary)]">{Math.round(overallProgress)}%</span>
          </div>
        </div>

        {/* Stage list */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--q-text-tertiary)] mb-2">Currently running:</p>
          {ANALYSIS_STAGES.map((stage) => {
            const isCompleted = completedStages.includes(stage.id);
            const isCurrent = currentStageId === stage.id && !isCompleted;
            return (
              <div key={stage.id} className={cn('flex items-center gap-2.5 py-1 text-sm transition-all duration-300', !isCompleted && !isCurrent && 'opacity-40')}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-[var(--q-status-green)] shrink-0 animate-scale-in" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[var(--q-accent-primary)] shrink-0 animate-spin" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-[var(--q-border-default)] shrink-0" />
                )}
                <span className={cn(
                  isCompleted ? 'text-[var(--q-text-secondary)] line-through decoration-[var(--q-status-green)]/30' :
                  isCurrent ? 'text-[var(--q-text-primary)] font-medium' :
                  'text-[var(--q-text-tertiary)]'
                )}>
                  {isCompleted ? stage.completedLabel : stage.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Estimated time */}
        {estimatedRemaining > 0 && !showTimeout && (
          <p className="text-xs text-[var(--q-text-tertiary)] tabular-nums">
            Estimated: {estimatedRemaining} seconds remaining
          </p>
        )}

        {/* Timeout warning */}
        {showTimeout && (
          <div className="p-3 rounded-lg bg-[var(--q-status-yellow-bg)] border border-[var(--q-status-yellow-border)]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--q-status-yellow)] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-[var(--q-text-primary)]">Taking longer than usual</p>
                <p className="text-xs text-[var(--q-text-tertiary)]">Complex analyses may take up to 90 seconds.</p>
                <div className="flex gap-2">
                  {onRetry && <Button size="sm" variant="outline" onClick={onRetry} className="text-xs h-7">Try Again</Button>}
                  {onCancel && <Button size="sm" variant="ghost" onClick={onCancel} className="text-xs h-7">Cancel</Button>}
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
    </div>
  );
});

const EDUCATIONAL_TIPS = [
  'Coffee shops average 12-18% net margins in the US.',
  'A healthy LTV:CAC ratio is 3:1 or higher.',
  'Location costs vary up to 4x between cities globally.',
  '82% of startups fail due to cash flow problems, not bad ideas.',
  'SaaS companies typically need 18-24 months to reach profitability.',
  'Customer acquisition cost drops 60% with referral programs.',
  'We analyze costs across 50+ cities with real cost indices.',
  'Average payback period for small businesses is 6-18 months.',
  'Our engine cross-checks your numbers against 1,000+ benchmarks.',
  'Businesses with a clear financial plan are 2.5x more likely to get funded.',
];

function EducationalTip({ elapsedSeconds }: { elapsedSeconds: number }) {
  const tipIndex = Math.floor(elapsedSeconds / 5) % EDUCATIONAL_TIPS.length;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-[var(--q-text-tertiary)] flex items-center gap-1.5">💡 While you wait:</p>
      <p className="text-sm text-[var(--q-text-secondary)] animate-fade-in" key={tipIndex}>
        {EDUCATIONAL_TIPS[tipIndex]}
      </p>
    </div>
  );
}
