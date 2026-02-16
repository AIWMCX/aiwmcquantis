import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Loader2, Brain, Database, Calculator, Lightbulb, FileText, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnalysisStage {
  id: string;
  label: string;
  icon: React.ElementType;
  startTime: number; // seconds when this stage starts
  endTime: number; // seconds when this stage ends
}

const ANALYSIS_STAGES: AnalysisStage[] = [
  { id: 'context', label: 'Analyzing business context...', icon: Brain, startTime: 0, endTime: 3 },
  { id: 'market', label: 'Gathering market data...', icon: Database, startTime: 3, endTime: 8 },
  { id: 'financial', label: 'Calculating financial metrics...', icon: Calculator, startTime: 8, endTime: 15 },
  { id: 'recommendations', label: 'Generating recommendations...', icon: Lightbulb, startTime: 15, endTime: 25 },
  { id: 'finalizing', label: 'Finalizing your report...', icon: FileText, startTime: 25, endTime: 45 },
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
  className,
}: AnalysisProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTimeout, setShowTimeout] = useState(false);

  // Calculate elapsed time
  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      setShowTimeout(false);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
      setElapsedSeconds(elapsed);

      // Show timeout after 45 seconds
      if (elapsed >= 45) {
        setShowTimeout(true);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  // Calculate current stage and progress
  const { currentStage, overallProgress, completedStages } = useMemo(() => {
    if (!isLoading) {
      return { currentStage: null, overallProgress: 0, completedStages: [] as string[] };
    }

    let current: AnalysisStage | null = null;
    const completed: string[] = [];

    for (const stage of ANALYSIS_STAGES) {
      if (elapsedSeconds >= stage.endTime) {
        completed.push(stage.id);
      } else if (elapsedSeconds >= stage.startTime && !current) {
        current = stage;
      }
    }

    // If past all stages, stay on last
    if (!current && completed.length === ANALYSIS_STAGES.length) {
      current = ANALYSIS_STAGES[ANALYSIS_STAGES.length - 1];
    } else if (!current) {
      current = ANALYSIS_STAGES[0];
    }

    // Non-linear progress curve: fast start, slow middle, fast finish
    // This creates more perceived activity
    let progress: number;
    if (elapsedSeconds <= 3) {
      // 0-3s: 0-20% (fast start)
      progress = (elapsedSeconds / 3) * 20;
    } else if (elapsedSeconds <= 15) {
      // 3-15s: 20-60% (medium pace)
      progress = 20 + ((elapsedSeconds - 3) / 12) * 40;
    } else if (elapsedSeconds <= 25) {
      // 15-25s: 60-90% (slower)
      progress = 60 + ((elapsedSeconds - 15) / 10) * 30;
    } else {
      // 25s+: 90-99% (very slow, never hits 100 until done)
      progress = Math.min(90 + ((elapsedSeconds - 25) / 20) * 9, 99);
    }

    return { currentStage: current, overallProgress: progress, completedStages: completed };
  }, [isLoading, elapsedSeconds]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className={cn('p-6 rounded-xl bg-primary/5 border border-primary/20', className)}>
      {/* Header with elapsed time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Running AI Analysis</p>
            <p className="text-xs text-muted-foreground">
              {formatTime(elapsedSeconds)} elapsed
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={overallProgress} className="h-2 mb-6" />

      {/* Stage indicators */}
      <div className="space-y-3">
        {ANALYSIS_STAGES.map((stage) => {
          const isCompleted = completedStages.includes(stage.id);
          const isCurrent = currentStage?.id === stage.id && !isCompleted;
          const Icon = stage.icon;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-all duration-300',
                isCompleted && 'bg-success/10',
                isCurrent && 'bg-primary/10 animate-pulse',
                !isCompleted && !isCurrent && 'opacity-50'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isCompleted ? 'bg-success/20' : isCurrent ? 'bg-primary/20' : 'bg-muted'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : isCurrent ? (
                  <Icon className="w-4 h-4 text-primary animate-pulse" />
                ) : (
                  <Icon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span
                className={cn(
                  'text-sm transition-colors',
                  isCompleted ? 'text-success font-medium' : isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Timeout warning */}
      {showTimeout && (
        <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Taking longer than usual</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complex analyses may take up to 60 seconds. You can wait or try again.
              </p>
              <div className="flex items-center gap-2 mt-3">
                {onRetry && (
                  <Button size="sm" variant="outline" onClick={onRetry}>
                    Try Again
                  </Button>
                )}
                {onCancel && (
                  <Button size="sm" variant="ghost" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Educational micro-content — rotating industry insights */}
      <EducationalTip elapsedSeconds={elapsedSeconds} />
    </div>
  );
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `${secs}s`;
}

const EDUCATIONAL_TIPS = [
  { emoji: '☕', text: 'Coffee shops average 12-18% net margins in the US.' },
  { emoji: '📊', text: 'A healthy LTV:CAC ratio is 3:1 or higher.' },
  { emoji: '🏪', text: 'Location costs vary up to 4x between cities globally.' },
  { emoji: '💡', text: '82% of startups fail due to cash flow problems, not bad ideas.' },
  { emoji: '📈', text: 'SaaS companies typically need 18-24 months to reach profitability.' },
  { emoji: '🎯', text: 'Customer acquisition cost drops 60% with referral programs.' },
  { emoji: '🌍', text: 'We analyze costs across 50+ cities with real cost indices.' },
  { emoji: '⏱️', text: 'Average payback period for small businesses is 6-18 months.' },
  { emoji: '🤖', text: 'Our engine cross-checks your numbers against 1,000+ benchmarks.' },
  { emoji: '💰', text: 'Businesses with a clear financial plan are 2.5x more likely to get funded.' },
];

function EducationalTip({ elapsedSeconds }: { elapsedSeconds: number }) {
  // Rotate tips every 5 seconds
  const tipIndex = Math.floor(elapsedSeconds / 5) % EDUCATIONAL_TIPS.length;
  const tip = EDUCATIONAL_TIPS[tipIndex];

  return (
    <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border transition-all duration-500">
      <p className="text-xs font-medium text-muted-foreground mb-1">Did you know?</p>
      <p className="text-sm text-foreground animate-fade-in" key={tipIndex}>
        <span className="mr-1.5">{tip.emoji}</span>
        {tip.text}
      </p>
    </div>
  );
}
